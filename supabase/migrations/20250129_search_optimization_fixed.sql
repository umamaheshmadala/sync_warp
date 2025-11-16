-- ============================================
-- SEARCH PERFORMANCE OPTIMIZATION
-- Story 9.2.5: Search Performance Optimization
-- FIXED VERSION: Removed CONCURRENTLY for Supabase Dashboard execution
-- ============================================

-- Composite index for name search (GIN for full-text)
CREATE INDEX IF NOT EXISTS idx_users_fulltext_name 
ON users USING GIN (to_tsvector('english', full_name || ' ' || username));

-- Composite index for location + timestamp
CREATE INDEX IF NOT EXISTS idx_users_location_created 
ON users (location, created_at DESC);

-- Partial index for active users only (reduces index size)
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users (id, full_name, username) 
WHERE deleted_at IS NULL;

-- Index for mutual friends count (used in sorting)
CREATE INDEX IF NOT EXISTS idx_friendships_user_ids 
ON friendships (user1_id, user2_id) 
WHERE status = 'accepted';

-- Index for PYMK scoring factors
CREATE INDEX IF NOT EXISTS idx_users_location_interests 
ON users (location, interests) 
WHERE deleted_at IS NULL;

-- Index for contact sync
CREATE INDEX IF NOT EXISTS idx_contact_hashes_hash 
ON contact_hashes (contact_hash);

-- Index for deal categories (used in shared interests filter)
CREATE INDEX IF NOT EXISTS idx_deals_category_active 
ON deals (category) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_favorite_deals_composite 
ON favorite_deals (user_id, deal_id, created_at DESC);

-- ============================================
-- QUERY OPTIMIZATION: Rewrite search_users function with better performance
-- ============================================

CREATE OR REPLACE FUNCTION search_users(
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
DECLARE
  current_user_location GEOGRAPHY;
BEGIN
  -- Get current user's location once (performance optimization)
  SELECT coordinates INTO current_user_location
  FROM users
  WHERE id = current_user_id;

  RETURN QUERY
  WITH matching_users AS (
    -- Use full-text search index (much faster than ILIKE)
    SELECT 
      u.id,
      u.full_name,
      u.username,
      u.avatar_url,
      u.location,
      -- Text search ranking (0-1)
      ts_rank(
        to_tsvector('english', u.full_name || ' ' || u.username),
        plainto_tsquery('english', search_query)
      ) AS text_rank
    FROM users u
    WHERE 
      u.id != current_user_id
      AND u.deleted_at IS NULL
      AND to_tsvector('english', u.full_name || ' ' || u.username) @@ plainto_tsquery('english', search_query)
    LIMIT 100 -- Limit early for performance
  ),
  user_scores AS (
    SELECT
      mu.id,
      mu.full_name,
      mu.username,
      mu.avatar_url,
      mu.location,
      -- Mutual friends count (subquery optimized with index)
      (
        SELECT COUNT(*)::INT
        FROM friendships f1
        JOIN friendships f2 ON f1.user2_id = f2.user2_id
        WHERE f1.user1_id = current_user_id
          AND f2.user1_id = mu.id
          AND f1.status = 'accepted'
          AND f2.status = 'accepted'
      ) AS mutual_friends_count,
      -- Distance calculation (uses PostGIS)
      CASE 
        WHEN current_user_location IS NOT NULL AND u2.coordinates IS NOT NULL
        THEN ST_Distance(current_user_location, u2.coordinates) / 1000.0 -- meters to km
        ELSE NULL
      END AS distance_km,
      -- Relevance scoring
      (
        -- Text match (50% weight)
        (mu.text_rank * 50) +
        -- Mutual friends bonus (30% weight, max 10 friends)
        (LEAST((
          SELECT COUNT(*)::INT
          FROM friendships f1
          JOIN friendships f2 ON f1.user2_id = f2.user2_id
          WHERE f1.user1_id = current_user_id
            AND f2.user1_id = mu.id
            AND f1.status = 'accepted'
            AND f2.status = 'accepted'
        ), 10) * 3) +
        -- Location proximity bonus (20% weight, max 50km)
        CASE 
          WHEN current_user_location IS NOT NULL AND u2.coordinates IS NOT NULL
          THEN GREATEST(0, 20 - (ST_Distance(current_user_location, u2.coordinates) / 2500.0))
          ELSE 0
        END
      ) AS relevance_score
    FROM matching_users mu
    LEFT JOIN users u2 ON u2.id = mu.id
  )
  SELECT *
  FROM user_scores
  ORDER BY relevance_score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MONITORING: Create slow query logging view
-- ============================================

CREATE OR REPLACE VIEW slow_search_queries AS
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%search_users%'
  AND mean_exec_time > 500 -- Queries slower than 500ms
ORDER BY mean_exec_time DESC;

-- ============================================
-- NOTE: VACUUM ANALYZE scheduling removed
-- ============================================
-- The cron.schedule() call has been removed because:
-- 1. It requires the pg_cron extension to be enabled
-- 2. It needs special permissions
-- 3. Supabase may already have automated VACUUM scheduling
-- 
-- If you want to schedule VACUUM ANALYZE, contact Supabase support
-- or run it manually when needed:
-- VACUUM ANALYZE users, friendships, contact_hashes, deals, favorite_deals;
