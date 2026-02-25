-- Migration: Add media dimension columns and update RPCs
-- Date: 2026-02-25
-- Story: 8.12.5 (Media Placeholders & Zero Layout Shift)

-- 1. Add columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS media_width INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_height INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_duration INTEGER DEFAULT NULL;

-- 2. Drop existing functions due to signature changes
DROP FUNCTION IF EXISTS get_messages_v2(UUID, INT, UUID);
DROP FUNCTION IF EXISTS send_message(UUID, TEXT, TEXT, TEXT[], TEXT, JSONB, UUID, UUID, UUID);

-- 3. Recreate get_messages_v2 with new return fields AND parent_message
CREATE OR REPLACE FUNCTION get_messages_v2(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  type TEXT,
  media_urls TEXT[],
  media_width INTEGER,
  media_height INTEGER,
  media_duration INTEGER,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  is_deleted BOOLEAN,
  deleted_at TIMESTAMPTZ,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ,
  reply_to_id UUID,
  is_forwarded BOOLEAN,
  original_message_id UUID,
  forward_count INTEGER,
  link_previews JSONB,
  read_by UUID[],
  viewer_has_reported BOOLEAN,
  parent_message JSONB
) AS $$
DECLARE
  v_user_id UUID;
  v_before_ts TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF p_before_id IS NOT NULL THEN
    SELECT m.created_at INTO v_before_ts FROM messages m WHERE m.id = p_before_id;
  END IF;
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.type,
    m.media_urls,
    m.media_width,
    m.media_height,
    m.media_duration,
    m.thumbnail_url,
    m.created_at,
    m.updated_at,
    NULL::TIMESTAMPTZ as read_at, 
    m.is_deleted,
    m.deleted_at,
    m.is_edited,
    m.edited_at,
    m.reply_to_id,
    m.is_forwarded,
    m.original_message_id,
    m.forward_count,
    m.link_preview AS link_previews,
    COALESCE(
      ARRAY(
        SELECT rr.user_id 
        FROM message_read_receipts rr 
        WHERE rr.message_id = m.id
        AND rr.user_id != m.sender_id
      ), 
      ARRAY[]::UUID[]
    ) AS read_by,
    EXISTS (
      SELECT 1 
      FROM message_reports mr 
      WHERE mr.message_id = m.id 
      AND mr.reporter_id = v_user_id
    ) AS viewer_has_reported,
    (
      SELECT jsonb_build_object(
        'id', pm.id,
        'content', pm.content,
        'type', pm.type,
        'sender_id', pm.sender_id,
        'sender_name', COALESCE(p.full_name, 'User'),
        'created_at', pm.created_at
      )
      FROM messages pm
      LEFT JOIN profiles p ON p.id = pm.sender_id
      WHERE pm.id = m.reply_to_id
    ) AS parent_message
  FROM messages m
  WHERE 
    m.conversation_id = p_conversation_id
    AND (p_before_id IS NULL OR m.created_at < v_before_ts)
    AND NOT EXISTS (
      SELECT 1 
      FROM message_hides mh 
      WHERE mh.message_id = m.id 
      AND mh.user_id = v_user_id
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_messages_v2(UUID, INT, UUID) TO authenticated;

-- 4. Recreate send_message with new input fields
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type TEXT DEFAULT 'text',
  p_media_urls TEXT[] DEFAULT NULL,
  p_media_width INTEGER DEFAULT NULL,
  p_media_height INTEGER DEFAULT NULL,
  p_media_duration INTEGER DEFAULT NULL,
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
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = v_sender_id
      AND blocked_id = v_other_participant
  ) THEN
    RAISE EXCEPTION 'Cannot send message to blocked user';
  END IF;
  
  -- CASE 2: Sender is the BLOCKED (other user blocked them)
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = v_other_participant
      AND blocked_id = v_sender_id
  ) THEN
    -- Return a random UUID so client thinks message was sent
    RETURN gen_random_uuid();
  END IF;
  
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
    media_width,
    media_height,
    media_duration,
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
    p_media_width,
    p_media_height,
    p_media_duration,
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

COMMENT ON FUNCTION send_message IS 'Sends a message. Includes media dimension tracking.';
