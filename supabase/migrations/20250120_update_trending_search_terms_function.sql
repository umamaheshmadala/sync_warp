-- Migration: Update get_trending_search_terms function to handle missing table
-- Created: 2025-01-20
-- Purpose: Fix 400 error by making function resilient to missing search_analytics table

-- Drop the old function
DROP FUNCTION IF EXISTS get_trending_search_terms(integer, integer);

-- Create a simpler version that returns empty results if table doesn't exist
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
  -- Check if search_analytics table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'search_analytics'
  ) THEN
    -- Table exists, return actual data
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
  ELSE
    -- Table doesn't exist, return empty result
    -- The frontend will use fallback trending terms
    RETURN;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trending_search_terms(integer, integer) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_trending_search_terms IS 'Returns trending search terms based on search analytics. Returns empty if table does not exist.';
