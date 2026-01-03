-- Migration: Fix blocked conversations visibility in conversation_list view
-- Date: 2025-12-28
-- Purpose: Remove the accidentally re-added blocked users filter to restore "Blocked" tab functionality
-- This reverses the regression from 20251227_fix_conversation_list_preview.sql
-- 
-- Original fix in 20251211_remove_blocked_filter_conversation_list.sql intentionally removed this filter
-- so blocked conversations appear in the view and frontend can filter them into "Blocked" tab

DROP VIEW IF EXISTS conversation_list;

CREATE OR REPLACE VIEW conversation_list AS
SELECT
  c.id AS conversation_id,
  c.type,
  c.participants,
  COALESCE(cp.is_archived, false) AS is_archived,
  -- Check if conversation is muted (from conversation_mutes table)
  EXISTS(
    SELECT 1 FROM conversation_mutes cm
    WHERE cm.conversation_id = c.id
      AND cm.user_id = auth.uid()
      AND (cm.muted_until IS NULL OR cm.muted_until > NOW())
  ) AS is_muted,
  -- Get mute expiry time
  (
    SELECT cm.muted_until
    FROM conversation_mutes cm
    WHERE cm.conversation_id = c.id
      AND cm.user_id = auth.uid()
    LIMIT 1
  ) AS muted_until,
  COALESCE(cp.is_pinned, false) AS is_pinned,
  c.created_at,
  -- Use last message timestamp if available, else conversation created_at
  COALESCE(lm.created_at, c.created_at) AS last_message_at,
  
  lm.id AS last_message_id,
  lm.content AS last_message_content,
  lm.type AS last_message_type,
  lm.sender_id AS last_message_sender_id,
  lm.created_at AS last_message_timestamp,
  lm.status AS last_message_status,
  
  sender.full_name AS last_message_sender_name,
  sender.avatar_url AS last_message_sender_avatar,
  
  CASE
    WHEN c.type = 'direct' THEN (
      SELECT id
      FROM unnest(c.participants) AS id
      WHERE id <> auth.uid()
      LIMIT 1
    )
    ELSE NULL
  END AS other_participant_id,
  
  other_profile.full_name AS other_participant_name,
  other_profile.avatar_url AS other_participant_avatar,
  other_profile.is_online AS other_participant_online,
  
  (
    SELECT COUNT(*)
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
      -- Also respect cleared history for unread count
      AND (cp.cleared_history_at IS NULL OR m.created_at > cp.cleared_history_at)
  ) AS unread_count

FROM conversations c

-- JOIN participants FIRST to get access to cleared_history_at
JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = auth.uid()

-- JOIN LATERAL for last message, respecting cleared_history_at
LEFT JOIN LATERAL (
  SELECT m.*
  FROM messages m
  WHERE m.conversation_id = c.id
    AND m.is_deleted = false
    AND (cp.cleared_history_at IS NULL OR m.created_at > cp.cleared_history_at)
  ORDER BY m.created_at DESC
  LIMIT 1
) lm ON true

LEFT JOIN profiles sender ON sender.id = lm.sender_id

LEFT JOIN LATERAL (
  SELECT *
  FROM profiles
  WHERE id = (
    SELECT id
    FROM unnest(c.participants) AS id
    WHERE id <> auth.uid()
    LIMIT 1
  )
) other_profile ON c.type = 'direct'

WHERE auth.uid() = ANY(c.participants)
  -- ✅ REMOVED: Blocked users filter - handled by frontend is_blocked field
  -- This allows blocked conversations to appear in the view for the "Blocked" tab
  AND (cp.deleted_for_user IS NULL OR cp.deleted_for_user = false);

COMMENT ON VIEW conversation_list IS 'Conversation list view with cleared_history_at support. Blocked conversations are visible and filtered by frontend.';
