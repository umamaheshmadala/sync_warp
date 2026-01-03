-- supabase/migrations/20251206_add_message_search.sql
-- Story 8.5.4: Message Search - Full-text search for messages
-- Features:
--   - GIN index for fast full-text search
--   - Partial index excluding deleted messages
--   - search_messages RPC with highlighting

-- ============================================
-- GIN Index for Full-Text Search
-- ============================================

-- Create GIN index for full-text search on message content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
ON messages
USING GIN (to_tsvector('english', COALESCE(content, '')));

-- Create partial index excluding deleted messages (optimization)
CREATE INDEX IF NOT EXISTS idx_messages_content_fts_active
ON messages
USING GIN (to_tsvector('english', COALESCE(content, '')))
WHERE is_deleted = false;

-- ============================================
-- Search Messages RPC Function
-- ============================================

-- Drop existing function if exists (to allow updates)
DROP FUNCTION IF EXISTS search_messages(TEXT, UUID, UUID, INT);

-- Create search function with highlighting
CREATE OR REPLACE FUNCTION search_messages(
  p_query TEXT,
  p_conversation_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  highlighted_content TEXT,
  conversation_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user_id or get from auth context
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Return empty if query is empty
  IF TRIM(p_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    ts_headline(
      'english',
      COALESCE(m.content, ''),
      plainto_tsquery('english', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20, HighlightAll=false'
    ) as highlighted_content,
    m.conversation_id,
    m.sender_id,
    COALESCE(p.username, p.full_name, 'Unknown')::TEXT as sender_name,
    p.avatar_url::TEXT as sender_avatar,
    m.created_at,
    ts_rank(to_tsvector('english', COALESCE(m.content, '')), plainto_tsquery('english', p_query))::REAL as rank
  FROM messages m
  LEFT JOIN profiles p ON p.id = m.sender_id
  WHERE
    m.is_deleted = false
    AND to_tsvector('english', COALESCE(m.content, '')) @@ plainto_tsquery('english', p_query)
    -- Filter by conversation if provided
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    -- Only search in conversations the user is part of
    AND m.conversation_id IN (
      SELECT cp.conversation_id
      FROM conversation_participants cp
      WHERE cp.user_id = v_user_id
    )
  ORDER BY rank DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_messages(TEXT, UUID, UUID, INT) TO authenticated;

-- ============================================
-- Comment
-- ============================================
COMMENT ON FUNCTION search_messages IS 'Full-text search for messages with highlighting. Returns messages matching query with sender details.';
