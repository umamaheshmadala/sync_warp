-- Create get_messages_v2 function to consolidate message fetching
-- Combines messages, read receipts, report status, and hidden filtering
-- Story: 8.11.2 - Query Waterfall Consolidation

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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ, -- Keeping signature for compatibility, will return NULL
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
  viewer_has_reported BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_before_ts TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF p_before_id IS NOT NULL THEN
    SELECT created_at INTO v_before_ts FROM messages WHERE id = p_before_id;
  END IF;
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.type,
    m.media_urls,
    m.created_at,
    m.updated_at,
    NULL::TIMESTAMPTZ as read_at, -- Fixed: Column does not exist, return NULL
    m.is_deleted,
    m.deleted_at,
    m.is_edited,
    m.edited_at,
    m.reply_to_id,
    m.is_forwarded,
    m.original_message_id,
    m.forward_count,
    m.link_previews,
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
    ) AS viewer_has_reported
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_messages_v2 TO authenticated;
