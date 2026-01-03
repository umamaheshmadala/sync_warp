-- Migration: Remove blocked users filter from conversation_list view
-- Date: 2025-12-11
-- Purpose: Allow blocked conversations to be visible in the UI so they can appear in "Blocked" tab

-- Drop existing view to avoid dependency issues
DROP VIEW IF EXISTS conversation_list CASCADE;

CREATE VIEW conversation_list AS
SELECT 
  c.id AS conversation_id,
  c.type,
  c.participants,
  COALESCE(cp.is_archived, false) AS is_archived,
  -- Check muted_conversations table with expiration logic
  COALESCE(
    EXISTS(
      SELECT 1 FROM muted_conversations mc
      WHERE mc.user_id = auth.uid()
        AND mc.conversation_id = c.id
        AND (mc.muted_until IS NULL OR mc.muted_until > NOW())
    ),
    false
  ) AS is_muted,
  COALESCE(cp.is_pinned, false) AS is_pinned,
  c.created_at,
  c.last_message_at,
  
  -- Last message details
  lm.id AS last_message_id,
  lm.content AS last_message_content,
  lm.type AS last_message_type,
  lm.sender_id AS last_message_sender_id,
  lm.created_at AS last_message_timestamp,
  
  -- Sender profile
  sender.full_name AS last_message_sender_name,
  sender.avatar_url AS last_message_sender_avatar,
  
  -- Other participant info (for direct messages)
  CASE 
    WHEN c.type = 'direct' THEN
      (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
  END AS other_participant_id,
  
  other_profile.full_name AS other_participant_name,
  other_profile.avatar_url AS other_participant_avatar,
  other_profile.is_online AS other_participant_online,
  
  -- Unread count
  (
    SELECT COUNT(*)
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  ) AS unread_count
  
FROM conversations c

-- Last message
LEFT JOIN LATERAL (
  SELECT * FROM messages 
  WHERE conversation_id = c.id 
    AND is_deleted = false
  ORDER BY created_at DESC 
  LIMIT 1
) lm ON true

-- Last message sender
LEFT JOIN profiles sender ON sender.id = lm.sender_id

-- Other participant (for 1:1)
LEFT JOIN LATERAL (
  SELECT * FROM profiles
  WHERE id = (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
) other_profile ON c.type = 'direct'

-- Conversation participants (for soft delete check)
LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = auth.uid()

WHERE auth.uid() = ANY(c.participants)
  -- ✅ REMOVED: Filter for blocked users (now handled in frontend with is_blocked field)
  -- Filter out soft-deleted conversations
  AND (cp.deleted_for_user IS NULL OR cp.deleted_for_user = false);

COMMENT ON VIEW conversation_list IS 'Conversation list view with soft-deleted conversations filtered. Blocked conversations are now visible and handled in frontend.';
