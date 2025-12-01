-- Update conversation_list view to exclude muted conversations from unread count

DROP VIEW IF EXISTS conversation_list;

CREATE VIEW conversation_list AS
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
  c.last_message_at,
  lm.id AS last_message_id,
  lm.content AS last_message_content,
  lm.type AS last_message_type,
  lm.sender_id AS last_message_sender_id,
  lm.created_at AS last_message_timestamp,
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
  -- Unread count: ONLY count if conversation is NOT muted
  CASE
    WHEN EXISTS(
      SELECT 1 FROM conversation_mutes cm
      WHERE cm.conversation_id = c.id
        AND cm.user_id = auth.uid()
        AND (cm.muted_until IS NULL OR cm.muted_until > NOW())
    ) THEN 0  -- Return 0 if muted
    ELSE (
      SELECT COUNT(*)
      FROM messages m
      LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
      WHERE m.conversation_id = c.id
        AND m.sender_id <> auth.uid()
        AND mrr.read_at IS NULL
        AND m.is_deleted = false
    )
  END AS unread_count
FROM conversations c
LEFT JOIN LATERAL (
  SELECT *
  FROM messages
  WHERE conversation_id = c.id
    AND is_deleted = false
  ORDER BY created_at DESC
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
LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = auth.uid()
WHERE auth.uid() = ANY(c.participants)
  AND NOT EXISTS (
    SELECT 1
    FROM blocked_users bu
    WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = ANY(c.participants))
       OR (bu.blocked_id = auth.uid() AND bu.blocker_id = ANY(c.participants))
  )
  AND (cp.deleted_for_user IS NULL OR cp.deleted_for_user = false);
