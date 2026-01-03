-- Migration: Optimized Database Views for Messaging
-- Story: 8.1.5 - Optimized Database Views
-- Description: Creates views and indexes to optimize conversation list,
--              message search, and conversation statistics queries
-- Date: 2025-02-05

-- ============================================================================
-- VIEW 1: conversation_list
-- ============================================================================
-- Purpose: Optimized view for displaying conversation list with all needed data
-- Benefits:
--   - Single query instead of multiple JOINs
--   - Pre-calculates unread counts
--   - Includes last message and participant details
--   - Reduces N+1 query problems on mobile

CREATE OR REPLACE VIEW conversation_list AS
SELECT 
  c.id AS conversation_id,
  c.type,
  c.participants,
  c.group_name,
  c.group_avatar,
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
  
  -- Unread count (optimized subquery)
  (
    SELECT COUNT(*)
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  )::INTEGER AS unread_count
  
FROM conversations c

-- Last message (LATERAL for efficiency)
LEFT JOIN LATERAL (
  SELECT * FROM messages 
  WHERE conversation_id = c.id 
    AND is_deleted = false
  ORDER BY created_at DESC 
  LIMIT 1
) lm ON true

-- Last message sender
LEFT JOIN profiles sender ON sender.id = lm.sender_id

-- Other participant (for 1:1) - LATERAL for efficiency
LEFT JOIN LATERAL (
  SELECT * FROM profiles
  WHERE id = (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
) other_profile ON c.type = 'direct'

WHERE auth.uid() = ANY(c.participants);

-- Grant access to authenticated users
GRANT SELECT ON conversation_list TO authenticated;

-- Add comment
COMMENT ON VIEW conversation_list IS 'Optimized view for conversation list with last message, unread count, and participant details';

-- ============================================================================
-- FULL-TEXT SEARCH: Add tsvector column and GIN index
-- ============================================================================
-- Purpose: Enable fast full-text search on message content
-- Benefits:
--   - Search performance < 200ms on 100K+ messages
--   - Supports phrase search, proximity, ranking
--   - Auto-updated via GENERATED column

-- Add tsvector column (auto-generated from content)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(content_tsv);

-- Add comment
COMMENT ON COLUMN messages.content_tsv IS 'Full-text search vector auto-generated from message content';

-- ============================================================================
-- FUNCTION: search_messages
-- ============================================================================
-- Purpose: Full-text search helper function with ranking and filtering
-- Features:
--   - Search across all user's conversations or specific conversation
--   - Results ranked by relevance
--   - Respects RLS (only searches user's conversations)
--   - Excludes deleted messages

CREATE OR REPLACE FUNCTION search_messages(
  p_search_query TEXT,
  p_conversation_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  content TEXT,
  sender_id UUID,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.sender_id,
    m.created_at,
    ts_rank(m.content_tsv, to_tsquery('english', p_search_query)) AS rank
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE 
    m.content_tsv @@ to_tsquery('english', p_search_query)
    AND auth.uid() = ANY(c.participants)
    AND m.is_deleted = false
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_messages TO authenticated;

-- Add comment
COMMENT ON FUNCTION search_messages IS 'Full-text search messages with ranking (searches user conversations only)';

-- ============================================================================
-- MATERIALIZED VIEW: conversation_stats
-- ============================================================================
-- Purpose: Pre-calculated conversation statistics for analytics
-- Benefits:
--   - Fast queries for conversation insights
--   - Refreshed periodically (no real-time overhead)
--   - Supports concurrent refresh

CREATE MATERIALIZED VIEW IF NOT EXISTS conversation_stats AS
SELECT 
  c.id AS conversation_id,
  COUNT(m.id) AS total_messages,
  COUNT(DISTINCT m.sender_id) AS active_participants,
  MAX(m.created_at) AS last_activity,
  COUNT(CASE WHEN m.type = 'image' THEN 1 END) AS image_count,
  COUNT(CASE WHEN m.type = 'video' THEN 1 END) AS video_count,
  COUNT(CASE WHEN m.type = 'link' THEN 1 END) AS link_count,
  COUNT(CASE WHEN m.shared_coupon_id IS NOT NULL THEN 1 END) AS shared_coupons_count,
  COUNT(CASE WHEN m.shared_deal_id IS NOT NULL THEN 1 END) AS shared_deals_count,
  COUNT(CASE WHEN m.is_edited THEN 1 END) AS edited_messages_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id AND m.is_deleted = false
GROUP BY c.id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_stats_id ON conversation_stats(conversation_id);

-- Grant access
GRANT SELECT ON conversation_stats TO authenticated;

-- Add comment
COMMENT ON MATERIALIZED VIEW conversation_stats IS 'Pre-calculated conversation statistics (refreshed periodically)';

-- ============================================================================
-- FUNCTION: refresh_conversation_stats
-- ============================================================================
-- Purpose: Refresh materialized view (can be scheduled)
-- Note: Uses CONCURRENTLY to avoid blocking queries during refresh

CREATE OR REPLACE FUNCTION refresh_conversation_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_stats;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission (for automated refresh jobs)
GRANT EXECUTE ON FUNCTION refresh_conversation_stats TO authenticated;

-- Add comment
COMMENT ON FUNCTION refresh_conversation_stats IS 'Refresh conversation statistics (non-blocking)';

-- ============================================================================
-- ADDITIONAL INDEXES for Performance
-- ============================================================================

-- Optimize conversation list query (already exists from 8.1.1, but verify)
-- CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC NULLS LAST);

-- Optimize message queries by conversation and timestamp (for pagination)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC) WHERE is_deleted = false;

-- Optimize unread count calculation
CREATE INDEX IF NOT EXISTS idx_message_receipts_unread ON message_read_receipts(user_id, message_id) WHERE read_at IS NULL;

-- Optimize sender profile lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id) WHERE is_deleted = false;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these manually to verify migration success:

-- 1. Verify conversation_list view exists
-- SELECT * FROM conversation_list LIMIT 5;

-- 2. Verify full-text search index
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'messages' AND indexname = 'idx_messages_content_search';

-- 3. Test search function
-- SELECT * FROM search_messages('test');

-- 4. Verify materialized view
-- SELECT * FROM conversation_stats LIMIT 5;

-- 5. Test materialized view refresh
-- SELECT refresh_conversation_stats();

-- 6. Check all new indexes
-- SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE 'idx_messages_%' OR indexname LIKE 'idx_message_receipts_%' ORDER BY tablename, indexname;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
--
-- Expected Query Times (with 1K conversations, 100K messages):
-- - conversation_list: < 100ms
-- - search_messages: < 200ms
-- - conversation_stats query: < 50ms (materialized)
--
-- Maintenance:
-- - Refresh conversation_stats daily or on-demand
-- - Monitor GIN index size (can grow large with many messages)
-- - Consider VACUUM ANALYZE on messages table after bulk operations
--
-- Mobile Optimization:
-- - Use pagination: .range(0, 19) for conversation_list
-- - Limit search results to 20-50 on mobile
-- - Pre-load conversation_list on app start (fast query)
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
