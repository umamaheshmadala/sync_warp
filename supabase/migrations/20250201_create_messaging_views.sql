-- Migration: Create Messaging Views
-- Epic: 8.1 Messaging Foundation
-- Date: 2025-02-01

-- 1. Conversation List View
CREATE OR REPLACE VIEW conversation_list AS
SELECT 
  c.id AS conversation_id,
  c.type,
  c.participants,
  c.is_archived,
  c.is_muted,
  c.is_pinned,
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
  
  -- Other participant (for 1:1 conversations)
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

WHERE auth.uid() = ANY(c.participants);

-- 2. Full-Text Search Index
-- Add generated column for search
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(content_tsv);

-- 3. Conversation Stats Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS conversation_stats AS
SELECT 
  c.id AS conversation_id,
  COUNT(m.id) AS total_messages,
  COUNT(DISTINCT m.sender_id) AS active_participants,
  MAX(m.created_at) AS last_activity,
  COUNT(CASE WHEN m.type = 'image' THEN 1 END) AS image_count,
  COUNT(CASE WHEN m.type = 'video' THEN 1 END) AS video_count,
  COUNT(CASE WHEN m.shared_coupon_id IS NOT NULL THEN 1 END) AS shared_coupons_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id AND m.is_deleted = false
GROUP BY c.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_stats_id ON conversation_stats(conversation_id);

-- Refresh stats function
CREATE OR REPLACE FUNCTION refresh_conversation_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_stats;
END;
$$ LANGUAGE plpgsql;
