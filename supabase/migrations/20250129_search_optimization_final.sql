-- ============================================
-- SEARCH PERFORMANCE OPTIMIZATION
-- Story 9.2.5: Search Performance Optimization
-- FINAL VERSION: Correctly targets 'profiles' table
-- ============================================

-- 1. Indexes for profiles table
-- Composite index for name search (GIN for full-text)
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext_name 
ON public.profiles USING GIN (to_tsvector('english', full_name || ' ' || username));

-- Index for location (lat/long)
CREATE INDEX IF NOT EXISTS idx_profiles_lat_lng 
ON public.profiles (latitude, longitude);

-- Index for created_at (for sorting/filtering)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
ON public.profiles (created_at DESC);

-- 2. Indexes for friendships (if table exists)
CREATE INDEX IF NOT EXISTS idx_friendships_user_ids 
ON public.friendships (user_id, friend_id) 
WHERE status = 'active';

-- 3. Indexes for other tables
CREATE INDEX IF NOT EXISTS idx_contact_hashes_hash 
ON public.contact_hashes (phone_hash);

CREATE INDEX IF NOT EXISTS idx_deals_category_active 
ON public.deals (category);

CREATE INDEX IF NOT EXISTS idx_favorite_deals_composite 
ON public.favorite_deals (user_id, deal_id);

-- ============================================
-- QUERY OPTIMIZATION: Rewrite search_users function
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
  mutual_friends_count BIGINT,
  distance_km NUMERIC,
  relevance_score NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_lat NUMERIC;
  current_user_lng NUMERIC;
  current_user_geog GEOGRAPHY;
BEGIN
  -- Get current user's location
  SELECT latitude, longitude 
  INTO current_user_lat, current_user_lng
  FROM profiles 
  WHERE id = current_user_id;

  -- Create geography point if coordinates exist
  IF current_user_lat IS NOT NULL AND current_user_lng IS NOT NULL THEN
    current_user_geog := ST_MakePoint(current_user_lng, current_user_lat)::geography;
  END IF;

  RETURN QUERY
  WITH matching_profiles AS (
    -- Use full-text search index
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.location, -- Assuming location text column exists
      p.latitude,
      p.longitude,
      -- Text search ranking (0-1)
      ts_rank(
        to_tsvector('english', p.full_name || ' ' || p.username),
        plainto_tsquery('english', search_query)
      ) AS text_rank
    FROM profiles p
    WHERE 
      p.id != current_user_id
      AND to_tsvector('english', p.full_name || ' ' || p.username) @@ plainto_tsquery('english', search_query)
    LIMIT 100 -- Limit early for performance
  ),
  profile_scores AS (
    SELECT
      mp.id,
      mp.full_name,
      mp.username,
      mp.avatar_url,
      mp.location,
      -- Mutual friends count
      (
        SELECT COUNT(*)::BIGINT
        FROM friendships f1
        JOIN friendships f2 ON f1.friend_id = f2.user_id
        WHERE f1.user_id = current_user_id
          AND f2.friend_id = mp.id
          AND f1.status = 'active'
          AND f2.status = 'active'
      ) AS mutual_friends_count,
      -- Distance calculation
      CASE 
        WHEN current_user_geog IS NOT NULL AND mp.latitude IS NOT NULL AND mp.longitude IS NOT NULL
        THEN (ST_Distance(current_user_geog, ST_MakePoint(mp.longitude, mp.latitude)::geography) / 1000.0)::NUMERIC
        ELSE NULL
      END AS distance_km,
      mp.text_rank
    FROM matching_profiles mp
  )
  SELECT
    ps.id,
    ps.full_name,
    ps.username,
    ps.avatar_url,
    ps.location,
    ps.mutual_friends_count,
    ps.distance_km,
    -- Relevance scoring
    (
      -- Text match (50% weight)
      (ps.text_rank * 50) +
      -- Mutual friends bonus (30% weight, max 10 friends)
      (LEAST(ps.mutual_friends_count, 10) * 3) +
      -- Location proximity bonus (20% weight, max 50km)
      CASE 
        WHEN ps.distance_km IS NOT NULL
        THEN GREATEST(0, 20 - (ps.distance_km / 2.5))
        ELSE 0
      END
    )::NUMERIC AS relevance_score
  FROM profile_scores ps
  ORDER BY relevance_score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Success message
SELECT 'Search optimization completed successfully' AS status;
