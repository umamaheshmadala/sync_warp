-- Fix clear_chat_history to handle missing participant rows (legacy data)
CREATE OR REPLACE FUNCTION clear_chat_history(
  p_conversation_id UUID
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_is_participant BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is a participant in the conversation (via conversations table array)
  SELECT EXISTS(
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id
      AND v_user_id = ANY(participants)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'User not a participant in this conversation';
  END IF;

  -- Ensure participant row exists (UPSERT) and update timestamp
  INSERT INTO conversation_participants (conversation_id, user_id, joined_at, cleared_history_at)
  VALUES (p_conversation_id, v_user_id, NOW(), NOW())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET cleared_history_at = NOW();

  RAISE NOTICE 'Cleared chat history for user % in conversation %', v_user_id, p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
