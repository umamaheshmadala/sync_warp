-- Add forwarding columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS forward_count INT DEFAULT 0;

-- Create table to track message forwards
CREATE TABLE IF NOT EXISTS message_forwards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  forwarded_message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  forwarded_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  forwarded_to_conversation UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_forwards_original
  ON message_forwards(original_message_id);
CREATE INDEX IF NOT EXISTS idx_message_forwards_user
  ON message_forwards(forwarded_by);

-- Enable RLS on message_forwards
ALTER TABLE message_forwards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view forwards they created"
  ON message_forwards FOR SELECT
  USING (forwarded_by = auth.uid());

CREATE POLICY "Users can create forwards"
  ON message_forwards FOR INSERT
  WITH CHECK (forwarded_by = auth.uid());

-- RPC: Forward message to multiple conversations
CREATE OR REPLACE FUNCTION forward_message_to_conversations(
  p_message_id UUID,
  p_conversation_ids UUID[]
)
RETURNS TABLE(forwarded_message_id UUID, conversation_id UUID) AS $$
DECLARE
  v_user_id UUID;
  v_original_message RECORD;
  v_conversation_id UUID;
  v_new_message_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get original message
  SELECT * INTO v_original_message
  FROM messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Forward to each conversation
  FOREACH v_conversation_id IN ARRAY p_conversation_ids
  LOOP
    -- Insert forwarded message
    INSERT INTO messages (
      conversation_id,
      sender_id,
      content,
      type,
      media_urls,
      is_forwarded,
      original_message_id
    )
    VALUES (
      v_conversation_id,
      v_user_id,
      v_original_message.content,
      v_original_message.type,
      v_original_message.media_urls,
      true,
      p_message_id
    )
    RETURNING id INTO v_new_message_id;

    -- Track forward
    INSERT INTO message_forwards (
      original_message_id,
      forwarded_message_id,
      forwarded_by,
      forwarded_to_conversation
    )
    VALUES (
      p_message_id,
      v_new_message_id,
      v_user_id,
      v_conversation_id
    );

    -- Increment forward count
    UPDATE messages
    SET forward_count = forward_count + 1
    WHERE id = p_message_id;

    -- Return result
    RETURN QUERY SELECT v_new_message_id, v_conversation_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
