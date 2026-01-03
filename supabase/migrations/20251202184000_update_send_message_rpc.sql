-- Update send_message RPC to support link_previews array
-- Story 8.3.3: Link Preview Generation

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
BEGIN
  -- Get conversation participants
  SELECT participants INTO v_recipients
  FROM conversations
  WHERE id = p_conversation_id;
  
  IF v_recipients IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Verify sender is a participant
  IF NOT (auth.uid() = ANY(v_recipients)) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;
  
  -- Check if sender is blocked by any recipient (bidirectional)
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (
      (blocker_id = auth.uid() AND blocked_id = ANY(v_recipients))
      OR
      (blocked_id = auth.uid() AND blocker_id = ANY(v_recipients))
    )
  ) THEN
    RAISE EXCEPTION 'Cannot send message: blocked user';
  END IF;
  
  -- Un-delete conversation for ALL participants (sender and recipients)
  -- This ensures the conversation reappears for anyone who deleted it
  UPDATE conversation_participants
  SET deleted_for_user = false,
      deleted_at = NULL
  WHERE conversation_id = p_conversation_id
    AND user_id = ANY(v_recipients);
  
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
    auth.uid(),
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
