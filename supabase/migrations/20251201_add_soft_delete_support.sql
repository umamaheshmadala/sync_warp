-- Migration: Add Soft Delete Support for Conversations
-- Story: 8.10.3 - Delete Chat & Clear History
-- Description: Adds soft delete support with 10-second undo window
-- Date: 2025-12-01

-- ============================================================================
-- SCHEMA: Add soft delete columns
-- ============================================================================

-- Add deleted_for_user flag to conversation_participants
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS deleted_for_user BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_deleted
  ON conversation_participants(user_id, deleted_for_user)
  WHERE deleted_for_user = true;

COMMENT ON COLUMN conversation_participants.deleted_for_user IS 'Soft delete flag - conversation deleted for this user only';
COMMENT ON COLUMN conversation_participants.deleted_at IS 'Timestamp when conversation was deleted for this user';

-- ============================================================================
-- RPC: Delete conversation for current user (soft delete)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_conversation_for_user(
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

  -- Check if user is a participant in the conversation
  SELECT EXISTS(
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id
      AND v_user_id = ANY(participants)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Conversation not found or user not a participant';
  END IF;

  -- Ensure conversation_participants row exists (create if missing)
  INSERT INTO conversation_participants (conversation_id, user_id, deleted_for_user, deleted_at)
  VALUES (p_conversation_id, v_user_id, true, NOW())
  ON CONFLICT (conversation_id, user_id) 
  DO UPDATE SET 
    deleted_for_user = true,
    deleted_at = NOW();

  RAISE NOTICE 'Conversation % soft deleted for user %', p_conversation_id, v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_conversation_for_user TO authenticated;

COMMENT ON FUNCTION delete_conversation_for_user IS 'Soft delete conversation for current user (can undo within 10 seconds)';

-- ============================================================================
-- RPC: Undo delete conversation (within 10 seconds)
-- ============================================================================

CREATE OR REPLACE FUNCTION undo_delete_conversation(
  p_conversation_id UUID
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_deleted_at TIMESTAMPTZ;
  v_is_participant BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is a participant
  SELECT EXISTS(
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id
      AND v_user_id = ANY(participants)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Conversation not found or user not a participant';
  END IF;

  -- Get deleted_at timestamp
  SELECT deleted_at INTO v_deleted_at
  FROM conversation_participants
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id
    AND deleted_for_user = true;

  -- Check if conversation was deleted
  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Conversation not deleted';
  END IF;

  -- Check if within 10-second window
  IF NOW() - v_deleted_at > INTERVAL '10 seconds' THEN
    RAISE EXCEPTION 'Undo window expired (10 seconds)';
  END IF;

  -- Restore conversation
  UPDATE conversation_participants
  SET deleted_for_user = false,
      deleted_at = NULL
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;

  RAISE NOTICE 'Conversation % restored for user %', p_conversation_id, v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION undo_delete_conversation TO authenticated;

COMMENT ON FUNCTION undo_delete_conversation IS 'Undo soft delete within 10-second window';

-- ============================================================================
-- RPC: Clear chat history (soft delete all messages)
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_chat_history(
  p_conversation_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INT;
  v_is_participant BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a participant
  SELECT EXISTS(
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id
      AND v_user_id = ANY(participants)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'User not a participant in this conversation';
  END IF;

  -- Soft delete all messages in conversation
  UPDATE messages
  SET is_deleted = true,
      deleted_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND is_deleted = false;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleared % messages from conversation %', v_deleted_count, p_conversation_id;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clear_chat_history TO authenticated;

COMMENT ON FUNCTION clear_chat_history IS 'Soft delete all messages in a conversation';
