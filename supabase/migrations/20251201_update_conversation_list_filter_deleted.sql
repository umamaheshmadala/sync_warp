-- Migration: Update conversation_list view to filter deleted conversations
-- Story: 8.10.3 - Delete Chat & Clear History
-- Description: Adds filter to exclude conversations marked as deleted_for_user
-- Date: 2025-12-01

CREATE OR REPLACE VIEW conversation_list AS
SELECT 
  c.id AS conversation_id,
  c.type,
  c.participants,
  COALESCE(cp.is_archived, false) AS is_archived,
  COALESCE(cp.is_muted, false) AS is_muted,
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
  -- Filter out conversations with blocked users
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users bu
    WHERE (
      (bu.blocker_id = auth.uid() AND bu.blocked_id = ANY(c.participants))
      OR
      (bu.blocked_id = auth.uid() AND bu.blocker_id = ANY(c.participants))
    )
  )
  -- Filter out soft-deleted conversations
  AND (cp.deleted_for_user IS NULL OR cp.deleted_for_user = false);

COMMENT ON VIEW conversation_list IS 'STORY 8.10.3: Conversation list view with blocked users and soft-deleted conversations filtered';
