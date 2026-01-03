-- Migration: Fix send_message - blocker cannot send to blocked user
-- Date: 2025-12-28
-- Purpose: 
--   1. Blocker (who initiated block) should NOT be able to send messages - show error
--   2. Blocked user can send messages but they're silently dropped (doesn't know blocked)

CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type TEXT DEFAULT 'text',
  p_media_urls TEXT[] DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_link_previews JSONB DEFAULT NULL,
  p_shared_coupon_id UUID DEFAULT NULL,
  p_shared_deal_id UUID DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_recipients UUID[];
  v_sender_id UUID := auth.uid();
  v_other_participant UUID;
BEGIN
  -- Get conversation participants
  SELECT participants INTO v_recipients
  FROM conversations
  WHERE id = p_conversation_id;
  
  IF v_recipients IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Verify sender is a participant
  IF NOT (v_sender_id = ANY(v_recipients)) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;
  
  -- Determine the other participant (for 1:1 chats)
  SELECT id INTO v_other_participant
  FROM unnest(v_recipients) AS id
  WHERE id != v_sender_id
  LIMIT 1;
  
  -- CASE 1: Sender is the BLOCKER (they blocked the other user)
  -- They should NOT be able to send - show error
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = v_sender_id
      AND blocked_id = v_other_participant
  ) THEN
    RAISE EXCEPTION 'Cannot send message to blocked user';
  END IF;
  
  -- CASE 2: Sender is the BLOCKED (other user blocked them)
  -- Silently drop - they don't know they're blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = v_other_participant
      AND blocked_id = v_sender_id
  ) THEN
    -- Return a random UUID so client thinks message was sent
    RETURN gen_random_uuid();
  END IF;
  
  -- Un-delete conversation for ALL participants
  -- Preserve history by updating cleared_history_at
  UPDATE conversation_participants
  SET 
    cleared_history_at = GREATEST(
      COALESCE(cleared_history_at, '-infinity'::timestamptz),
      COALESCE(deleted_at, '-infinity'::timestamptz)
    ),
    deleted_for_user = false,
    deleted_at = NULL
  WHERE conversation_id = p_conversation_id
    AND user_id = ANY(v_recipients)
    AND deleted_for_user = true;

  -- Insert message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type,
    media_urls,
    thumbnail_url,
    link_previews,
    shared_coupon_id,
    shared_deal_id,
    reply_to_id
  )
  VALUES (
    p_conversation_id,
    v_sender_id,
    p_content,
    p_type,
    p_media_urls,
    p_thumbnail_url,
    p_link_previews,
    p_shared_coupon_id,
    p_shared_deal_id,
    p_reply_to_id
  )
  RETURNING id INTO v_message_id;
  
  -- Update conversation last_message_at
  UPDATE conversations
  SET last_message_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_message IS 'Sends a message. Blocker cannot send to blocked user (error). Blocked user can send but message is silently dropped.';
