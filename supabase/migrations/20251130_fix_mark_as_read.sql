-- Migration: Fix Mark Conversation As Read
-- Story: Bug Fix - Unread Count Persistence
-- Description: Adds a robust RPC to mark all messages in a conversation as read,
--              handling cases where read receipt rows might be missing.
-- Date: 2025-11-30

-- ============================================================================
-- FUNCTION: mark_conversation_as_read
-- ============================================================================
-- Purpose: Mark all messages in a conversation as read for the current user
-- Features:
--   - Handles missing read receipt rows (inserts them)
--   - Updates existing unread receipt rows
--   - Atomic operation
--   - More efficient than client-side loop

CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_conversation_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- 1. Insert receipts for any messages that don't have them yet
  --    (and mark them as read immediately)
  INSERT INTO message_read_receipts (message_id, user_id, read_at, delivered_at)
  SELECT 
    m.id, 
    v_user_id, 
    now(), 
    now() -- Assume delivered if we are reading it
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != v_user_id
    AND m.is_deleted = false
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET 
    read_at = now(),
    delivered_at = COALESCE(message_read_receipts.delivered_at, now());

  -- 2. Update message statuses to 'read' if all participants have read
  --    (Optional optimization, can be done via trigger or separate process, 
  --     but good to keep consistent with mark_message_as_read logic)
  
  -- We'll leave the message status update to the existing triggers or 
  -- individual message logic to avoid complex locking here. 
  -- The primary goal is to fix the unread count for the user.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_conversation_as_read TO authenticated;

-- Add comment
COMMENT ON FUNCTION mark_conversation_as_read IS 'Robustly mark conversation as read, handling missing receipts';
