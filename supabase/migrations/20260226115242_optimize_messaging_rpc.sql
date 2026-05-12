-- Migration: Optimize Messaging RPC Performance
-- Date: 2026-02-26
-- Story: 8.12.5 (Performance Fixes)

-- 1. Create essential indexes for messaging latency
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at 
ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_reports_message_id_reporter 
ON public.message_reports (message_id, reporter_id);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message 
ON public.message_read_receipts (message_id);

CREATE INDEX IF NOT EXISTS idx_message_hides_message_user
ON public.message_hides (message_id, user_id);

-- 2. Drop existing function to recreate signature
DROP FUNCTION IF EXISTS get_messages_v2(UUID, INT, UUID);

-- 3. Recreate get_messages_v2 with optimized JOINs instead of inline subqueries
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
    COALESCE(rr.read_by, ARRAY[]::UUID[]) AS read_by,
    COALESCE(rep.has_reported, FALSE) AS viewer_has_reported,
    CASE WHEN pm.id IS NOT NULL THEN
      jsonb_build_object(
        'id', pm.id,
        'content', pm.content,
        'type', pm.type,
        'sender_id', pm.sender_id,
        'sender_name', COALESCE(pm_prof.full_name, 'User'),
        'created_at', pm.created_at
      )
    ELSE NULL END AS parent_message
  FROM (
      -- Primary filtered messages set
      SELECT * FROM messages m1
      WHERE 
        m1.conversation_id = p_conversation_id
        AND (p_before_id IS NULL OR m1.created_at < v_before_ts)
        AND NOT EXISTS (
          SELECT 1 FROM message_hides mh 
          WHERE mh.message_id = m1.id AND mh.user_id = v_user_id
        )
      ORDER BY m1.created_at DESC
      LIMIT p_limit
  ) m
  LEFT JOIN LATERAL (
      -- Batch grab read receipts
      SELECT array_agg(user_id) as read_by
      FROM message_read_receipts
      WHERE message_id = m.id AND user_id != m.sender_id
  ) rr ON true
  LEFT JOIN (
      -- Batch grab reports
      SELECT message_id, TRUE as has_reported
      FROM message_reports
      WHERE reporter_id = v_user_id
  ) rep ON rep.message_id = m.id
  LEFT JOIN messages pm ON pm.id = m.reply_to_id
  LEFT JOIN profiles pm_prof ON pm_prof.id = pm.sender_id
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_messages_v2(UUID, INT, UUID) TO authenticated;
