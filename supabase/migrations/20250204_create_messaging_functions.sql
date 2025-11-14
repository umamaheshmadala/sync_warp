-- Migration: Core Messaging Database Functions
-- Story: 8.1.4 - Message Sending & Receiving Core Logic
-- Description: Implements atomic operations for sending messages, marking as read,
--              getting unread counts, and managing conversations
-- Date: 2025-02-04

-- ============================================================================
-- FUNCTION 1: send_message
-- ============================================================================
-- Purpose: Atomically send a message with auto-receipt generation
-- Features:
--   - Creates message record
--   - Auto-generates read receipts for all participants (except sender)
--   - Updates conversation timestamp
--   - Tracks coupon/deal shares in shares table
--   - Validates sender is a participant

CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type TEXT DEFAULT 'text',
  p_media_urls TEXT[] DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_link_preview JSONB DEFAULT NULL,
  p_shared_coupon_id UUID DEFAULT NULL,
  p_shared_deal_id UUID DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_conversation conversations%ROWTYPE;
  v_participant UUID;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation 
  FROM conversations 
  WHERE id = p_conversation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Verify sender is participant
  IF NOT (auth.uid() = ANY(v_conversation.participants)) THEN
    RAISE EXCEPTION 'User is not a conversation participant';
  END IF;
  
  -- Create message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type,
    media_urls,
    thumbnail_url,
    link_preview,
    shared_coupon_id,
    shared_deal_id,
    reply_to_id,
    status
  ) VALUES (
    p_conversation_id,
    auth.uid(),
    p_content,
    p_type,
    p_media_urls,
    p_thumbnail_url,
    p_link_preview,
    p_shared_coupon_id,
    p_shared_deal_id,
    p_reply_to_id,
    'sent'
  )
  RETURNING id INTO v_message_id;
  
  -- Create read receipt entries for all participants except sender
  FOREACH v_participant IN ARRAY v_conversation.participants LOOP
    IF v_participant != auth.uid() THEN
      INSERT INTO message_read_receipts (message_id, user_id, delivered_at)
      VALUES (v_message_id, v_participant, now());
    END IF;
  END LOOP;
  
  -- Update conversation last_message_at
  UPDATE conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_conversation_id;
  
  -- If sharing coupon/deal, record in shares table
  IF p_shared_coupon_id IS NOT NULL THEN
    INSERT INTO shares (sharer_id, coupon_id, share_method, shared_at)
    VALUES (auth.uid(), p_shared_coupon_id, 'message', now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF p_shared_deal_id IS NOT NULL THEN
    INSERT INTO shares (sharer_id, offer_id, share_method, shared_at)
    VALUES (auth.uid(), p_shared_deal_id, 'message', now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_message TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION send_message IS 'Atomically send a message with auto-receipt generation and share tracking';

-- ============================================================================
-- FUNCTION 2: mark_message_as_read
-- ============================================================================
-- Purpose: Mark a message as read and update message status if all recipients read
-- Features:
--   - Updates read receipt timestamp
--   - Updates message status to "read" if all recipients have read
--   - Validates user is in conversation
--   - Prevents marking own messages as read

CREATE OR REPLACE FUNCTION mark_message_as_read(
  p_message_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_message messages%ROWTYPE;
BEGIN
  -- Get message details
  SELECT * INTO v_message FROM messages WHERE id = p_message_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Verify user is in conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = v_message.conversation_id 
      AND auth.uid() = ANY(c.participants)
  ) THEN
    RAISE EXCEPTION 'User not in conversation';
  END IF;
  
  -- Don't mark own messages as read
  IF v_message.sender_id = auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Update read receipt
  UPDATE message_read_receipts
  SET read_at = now()
  WHERE message_id = p_message_id 
    AND user_id = auth.uid() 
    AND read_at IS NULL;
  
  -- Update message status if all recipients have read
  UPDATE messages m
  SET status = 'read', updated_at = now()
  WHERE m.id = p_message_id
    AND m.status != 'read'
    AND NOT EXISTS (
      SELECT 1 FROM message_read_receipts mrr
      WHERE mrr.message_id = m.id AND mrr.read_at IS NULL
    );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_message_as_read TO authenticated;

-- Add comment
COMMENT ON FUNCTION mark_message_as_read IS 'Mark a message as read and update status if all recipients have read';

-- ============================================================================
-- FUNCTION 3: get_unread_message_count
-- ============================================================================
-- Purpose: Get total unread message count for current user
-- Features:
--   - Counts unread messages across all conversations
--   - Excludes user's own messages
--   - Excludes deleted messages
--   - Optimized with STABLE for caching

CREATE OR REPLACE FUNCTION get_unread_message_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT m.id)
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE auth.uid() = ANY(c.participants)
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  )::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_unread_message_count IS 'Get total unread message count for current user across all conversations';

-- ============================================================================
-- FUNCTION 4: create_or_get_conversation
-- ============================================================================
-- Purpose: Create a new direct conversation or return existing one (prevents duplicates)
-- Features:
--   - Checks for existing direct conversation
--   - Validates friendship between users
--   - Validates no blocking exists
--   - Creates conversation with participants
--   - Creates participant entries

CREATE OR REPLACE FUNCTION create_or_get_conversation(p_participant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_participants UUID[];
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'direct'
    AND participants @> ARRAY[auth.uid(), p_participant_id]
    AND array_length(participants, 1) = 2
  LIMIT 1;
  
  IF FOUND THEN
    RETURN v_conversation_id;
  END IF;
  
  -- Verify users are friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE (
      (f.user1_id = auth.uid() AND f.user2_id = p_participant_id) OR
      (f.user2_id = auth.uid() AND f.user1_id = p_participant_id)
    )
  ) THEN
    RAISE EXCEPTION 'Users must be friends to create conversation';
  END IF;
  
  -- Verify no blocking
  IF EXISTS (
    SELECT 1 FROM blocked_users b
    WHERE (
      (b.blocker_id = auth.uid() AND b.blocked_id = p_participant_id) OR
      (b.blocker_id = p_participant_id AND b.blocked_id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation with blocked user';
  END IF;
  
  -- Create conversation
  v_participants := ARRAY[auth.uid(), p_participant_id];
  
  INSERT INTO conversations (type, participants)
  VALUES ('direct', v_participants)
  RETURNING id INTO v_conversation_id;
  
  -- Create participant entries
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, auth.uid()),
    (v_conversation_id, p_participant_id);
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_or_get_conversation TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_or_get_conversation IS 'Create new direct conversation or return existing (prevents duplicates, validates friendship)';

-- ============================================================================
-- TRIGGER: Update conversation timestamp on new message
-- ============================================================================
-- Purpose: Automatically update conversation's last_message_at when new message is created
-- Note: This trigger is redundant with send_message function update, but provides
--       safety for direct INSERTs and ensures consistency

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS messages_update_conversation_trigger ON messages;
CREATE TRIGGER messages_update_conversation_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Add comment
COMMENT ON TRIGGER messages_update_conversation_trigger ON messages IS 'Auto-update conversation timestamp when new message is created';

-- ============================================================================
-- NOTIFICATION TYPE EXTENSIONS
-- ============================================================================
-- Purpose: Add messaging-related notification types to existing enum
-- Note: These enable push notifications for messaging events

-- Add messaging notification types (IF NOT EXISTS for idempotency)
DO $$
BEGIN
  -- message_received: New message in any conversation
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'message_received' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'message_received';
  END IF;
  
  -- message_reply: Reply to user's message
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'message_reply' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'message_reply';
  END IF;
  
  -- coupon_shared_message: Coupon shared via message
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'coupon_shared_message' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'coupon_shared_message';
  END IF;
  
  -- deal_shared_message: Deal/offer shared via message
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'deal_shared_message' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'deal_shared_message';
  END IF;
END
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these manually to verify migration success:

-- 1. Verify all functions exist
-- SELECT proname, proargtypes::regtype[] 
-- FROM pg_proc 
-- WHERE proname IN ('send_message', 'mark_message_as_read', 'get_unread_message_count', 'create_or_get_conversation')
-- ORDER BY proname;

-- 2. Verify trigger exists
-- SELECT tgname, tgrelid::regclass 
-- FROM pg_trigger 
-- WHERE tgname = 'messages_update_conversation_trigger';

-- 3. Verify notification types added
-- SELECT enumlabel 
-- FROM pg_enum 
-- WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
-- ORDER BY enumlabel;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
