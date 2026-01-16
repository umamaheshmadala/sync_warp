-- Migration: Fix get_conversation_messages link_previews column name
-- Date: 2026-01-16
-- Failure Analysis: Previous version selected 'link_preview' (singular) instead of 'link_previews' (plural)
-- This caused fetched messages to have undefined link_previews, overwriting optimistic updates.

-- DROP function first because return type signature changes (column name)
DROP FUNCTION IF EXISTS get_conversation_messages(uuid,integer,uuid);

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
  link_previews JSONB,
  thumbnail_url TEXT,
  parent_message JSONB
) AS $$
DECLARE
  v_user_id UUID;
  v_cleared_at TIMESTAMPTZ;
  v_deleted_at TIMESTAMPTZ;
  v_before_ts TIMESTAMPTZ;
  v_effective_min_ts TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get cleared_history_at AND deleted_at for the user
  SELECT 
    cp.cleared_history_at,
    cp.deleted_at 
  INTO 
    v_cleared_at,
    v_deleted_at
  FROM conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id = v_user_id;

  -- Calculate effective minimum timestamp
  -- Messages must be newer than BOTH cleared_at and deleted_at (if they exist)
  v_effective_min_ts := GREATEST(
    COALESCE(v_cleared_at, '-infinity'::TIMESTAMPTZ),
    COALESCE(v_deleted_at, '-infinity'::TIMESTAMPTZ)
  );

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
    false AS is_read,
    NULL::TIMESTAMPTZ AS read_at,
    m.created_at,
    m.updated_at,
    m.reply_to_id,
    m.is_deleted,
    m.deleted_at,
    m.is_edited,
    m.edited_at,
    m.shared_coupon_id,
    m.shared_deal_id,
    m.link_previews, -- FIX: Plural
    m.thumbnail_url,
    -- Parent message data (if reply_to_id exists)
    CASE 
      WHEN m.reply_to_id IS NOT NULL THEN
        (
          SELECT jsonb_build_object(
            'id', pm.id,
            'content', pm.content,
            'type', pm.type,
            'sender_id', pm.sender_id,
            'sender_name', p.full_name,
            'created_at', pm.created_at
          )
          FROM messages pm
          JOIN profiles p ON p.id = pm.sender_id
          WHERE pm.id = m.reply_to_id
            AND pm.is_deleted = false
        )
      ELSE NULL
    END AS parent_message
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.is_deleted = false
    -- Filter by effective minimum timestamp
    AND m.created_at > v_effective_min_ts
    -- Pagination cursor
    AND (p_before_id IS NULL OR m.created_at < v_before_ts)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_conversation_messages IS 'Fetch messages with visibility filtered by deleted_at and cleared_history_at. Fixed link_previews column name.';
