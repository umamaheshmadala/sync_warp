-- Fix get_conversation_messages RPC to handle missing is_read/read_at columns
CREATE OR REPLACE FUNCTION get_conversation_messages(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  type TEXT,
  media_urls TEXT[],
  is_read BOOLEAN,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  reply_to_id UUID,
  is_deleted BOOLEAN,
  deleted_at TIMESTAMPTZ,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ,
  shared_coupon_id UUID,
  shared_deal_id UUID,
  link_preview JSONB,
  thumbnail_url TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_cleared_at TIMESTAMPTZ;
  v_before_ts TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get cleared_history_at for the user
  SELECT cp.cleared_history_at INTO v_cleared_at
  FROM conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id = v_user_id;

  -- Get timestamp of cursor message if provided
  IF p_before_id IS NOT NULL THEN
    SELECT m.created_at INTO v_before_ts
    FROM messages m
    WHERE m.id = p_before_id;
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.type,
    m.media_urls,
    false AS is_read, -- Return false as column doesn't exist
    NULL::TIMESTAMPTZ AS read_at, -- Return NULL as column doesn't exist
    m.created_at,
    m.updated_at,
    m.reply_to_id,
    m.is_deleted,
    m.deleted_at,
    m.is_edited,
    m.edited_at,
    m.shared_coupon_id,
    m.shared_deal_id,
    m.link_preview,
    m.thumbnail_url
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.is_deleted = false
    -- Filter by cleared history timestamp
    AND (v_cleared_at IS NULL OR m.created_at > v_cleared_at)
    -- Pagination cursor
    AND (p_before_id IS NULL OR m.created_at < v_before_ts)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
