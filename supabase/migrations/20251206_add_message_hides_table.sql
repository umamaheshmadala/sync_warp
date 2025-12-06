-- Migration: Add message_hides table for "Delete for me" functionality
-- Story: 8.5.3 - Delete Messages (WhatsApp-style)
-- This table tracks which messages are hidden for which users (per-user delete)
-- Allows users to hide messages from their view without affecting other participants

-- Create message_hides junction table
CREATE TABLE IF NOT EXISTS message_hides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_message_hides_user_id ON message_hides(user_id);
CREATE INDEX IF NOT EXISTS idx_message_hides_message_id ON message_hides(message_id);
CREATE INDEX IF NOT EXISTS idx_message_hides_user_message ON message_hides(user_id, message_id);

-- Enable RLS
ALTER TABLE message_hides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (in case of re-run)
DROP POLICY IF EXISTS "Users can view own hidden messages" ON message_hides;
DROP POLICY IF EXISTS "Users can hide messages in their conversations" ON message_hides;
DROP POLICY IF EXISTS "Users can unhide own messages" ON message_hides;

-- RLS Policy: Users can only see their own hidden messages
CREATE POLICY "Users can view own hidden messages"
  ON message_hides FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can hide messages from conversations they participate in
CREATE POLICY "Users can hide messages in their conversations"
  ON message_hides FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_id AND cp.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can unhide their own hidden messages
CREATE POLICY "Users can unhide own messages"
  ON message_hides FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment explaining the table
COMMENT ON TABLE message_hides IS 'Tracks messages hidden by users (Delete for me functionality). Each row represents a user hiding a specific message from their view.';
COMMENT ON COLUMN message_hides.message_id IS 'The message that is hidden';
COMMENT ON COLUMN message_hides.user_id IS 'The user who hid the message';
COMMENT ON COLUMN message_hides.hidden_at IS 'Timestamp when the message was hidden';

-- Create RPC function for hiding a message (Delete for me)
CREATE OR REPLACE FUNCTION hide_message_for_user(p_message_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Verify user is a participant in the conversation
  IF NOT EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE m.id = p_message_id AND cp.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot hide message from conversation you are not in');
  END IF;
  
  -- Insert or ignore if already hidden
  INSERT INTO message_hides (message_id, user_id)
  VALUES (p_message_id, v_user_id)
  ON CONFLICT (message_id, user_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create RPC function for unhiding a message
CREATE OR REPLACE FUNCTION unhide_message_for_user(p_message_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Delete the hide record
  DELETE FROM message_hides
  WHERE message_id = p_message_id AND user_id = v_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create RPC function to check if a message is hidden
CREATE OR REPLACE FUNCTION is_message_hidden(p_message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM message_hides
    WHERE message_id = p_message_id AND user_id = v_user_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION hide_message_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unhide_message_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_message_hidden(UUID) TO authenticated;
