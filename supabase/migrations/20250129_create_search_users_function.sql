-- ============================================
-- CREATE OPTIMIZED search_users FUNCTION
-- Story 9.2.5: Search Performance Optimization
-- Uses profiles table with GIN full-text index
-- ============================================

CREATE OR REPLACE FUNCTION public.search_users(
  search_query TEXT,
  current_user_id UUID,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  location TEXT,
  mutual_friends_count INT,
  distance_km FLOAT,
  relevance_score FLOAT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    COALESCE(p.email, '') AS username,  -- Use email as username since profiles table doesn't have username
    p.avatar_url,
    p.location,
    0 AS mutual_friends_count,  -- Placeholder until friendships table exists
    NULL::FLOAT AS distance_km,  -- Placeholder until coordinates field exists
    -- Simple relevance scoring based on text match
    ts_rank(
      to_tsvector('english', p.full_name),
      plainto_tsquery('english', search_query)
    ) AS relevance_score
  FROM public.profiles p
  WHERE 
    p.id != current_user_id
    AND p.full_name IS NOT NULL
    -- Use GIN index for fast full-text search
    AND to_tsvector('english', p.full_name) @@ plainto_tsquery('english', search_query)
  ORDER BY relevance_score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_users(TEXT, UUID, INT, INT) TO authenticated;

SELECT 'search_users function created successfully' AS status;
