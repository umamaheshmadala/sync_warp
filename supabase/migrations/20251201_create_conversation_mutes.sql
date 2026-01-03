-- Create conversation_mutes table and RPC functions for Story 8.10.4

-- Table to track muted conversations
CREATE TABLE IF NOT EXISTS conversation_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  muted_until TIMESTAMPTZ,  -- NULL = muted forever
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- Index for checking mute status
CREATE INDEX IF NOT EXISTS idx_conversation_mutes_lookup
  ON conversation_mutes(conversation_id, user_id);

-- Index for auto-unmute cleanup
CREATE INDEX IF NOT EXISTS idx_conversation_mutes_expiry
  ON conversation_mutes(muted_until) WHERE muted_until IS NOT NULL;

-- RLS Policies
ALTER TABLE conversation_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mutes"
  ON conversation_mutes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own mutes"
  ON conversation_mutes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mutes"
  ON conversation_mutes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own mutes"
  ON conversation_mutes FOR DELETE
  USING (user_id = auth.uid());

-- RPC: Mute conversation
CREATE OR REPLACE FUNCTION mute_conversation(
  p_conversation_id UUID,
  p_duration_hours INT DEFAULT NULL  -- NULL = forever
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_muted_until TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate muted_until
  IF p_duration_hours IS NOT NULL THEN
    v_muted_until := NOW() + (p_duration_hours || ' hours')::INTERVAL;
  ELSE
    v_muted_until := NULL;  -- Muted forever
  END IF;

  -- Insert or update mute
  INSERT INTO conversation_mutes (conversation_id, user_id, muted_until)
  VALUES (p_conversation_id, v_user_id, v_muted_until)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    muted_until = v_muted_until,
    updated_at = NOW();

  RAISE NOTICE 'Conversation % muted until %', p_conversation_id, v_muted_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Unmute conversation
CREATE OR REPLACE FUNCTION unmute_conversation(
  p_conversation_id UUID
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM conversation_mutes
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;

  RAISE NOTICE 'Conversation % unmuted', p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Check if conversation is muted
CREATE OR REPLACE FUNCTION is_conversation_muted(
  p_conversation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_is_muted BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  SELECT EXISTS(
    SELECT 1 FROM conversation_mutes
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id
      AND (muted_until IS NULL OR muted_until > NOW())
  ) INTO v_is_muted;

  RETURN v_is_muted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
