-- Migration: Add get_trending_search_terms function
-- Created: 2025-01-20
-- Purpose: Fix 404 error for trending search terms RPC endpoint

-- Function: get_trending_search_terms
-- Returns the most popular search terms from the last N days
CREATE OR REPLACE FUNCTION get_trending_search_terms(
  days_back integer DEFAULT 7,
  term_limit integer DEFAULT 10
)
RETURNS TABLE (
  search_term text,
  search_count bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.search_term,
    COUNT(*) as search_count
  FROM search_analytics sa
  WHERE 
    sa.search_term IS NOT NULL
    AND sa.search_term != ''
    AND sa.searched_at >= NOW() - (days_back || ' days')::interval
  GROUP BY sa.search_term
  ORDER BY search_count DESC, sa.search_term
  LIMIT term_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trending_search_terms(integer, integer) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_trending_search_terms IS 'Returns trending search terms based on search analytics from the last N days';
