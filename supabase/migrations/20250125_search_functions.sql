-- Migration: Search Functions
-- Story 9.2.1: Global Friend Search with Fuzzy Matching
-- Created: 2025-01-25

-- Function: search_users
-- Searches users with fuzzy matching and intelligent ranking
CREATE OR REPLACE FUNCTION search_users(
  search_query text,
  current_user_id uuid,
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  location text,
  mutual_friends_count bigint,
  distance_km numeric,
  relevance_score numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_lat numeric;
  current_user_lng numeric;
BEGIN
  -- Get current user's location coordinates
  SELECT latitude, longitude 
  INTO current_user_lat, current_user_lng
  FROM profiles 
  WHERE id = current_user_id;

  -- Get mutual friends count using CTE
  WITH mutual_friends AS (
    SELECT 
      f2.friend_id as potential_friend_id,
      COUNT(*) as mutual_count
    FROM friendships f1
    JOIN friendships f2 ON f1.friend_id = f2.user_id
    WHERE f1.user_id = current_user_id
      AND f1.status = 'active'
      AND f2.status = 'active'
      AND f2.friend_id != current_user_id
    GROUP BY f2.friend_id
  ),
  -- Get blocked users (bidirectional)
  blocked_users AS (
    SELECT blocker_id as user_id FROM blocks WHERE blocked_id = current_user_id
    UNION
    SELECT blocked_id as user_id FROM blocks WHERE blocker_id = current_user_id
  ),
  -- Search candidates with fuzzy matching
  search_candidates AS (
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.location,
      COALESCE(mf.mutual_count, 0) as mutual_count,
      -- Calculate distance if both users have coordinates
      CASE 
        WHEN current_user_lat IS NOT NULL AND current_user_lng IS NOT NULL 
             AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        THEN (
          6371 * acos(
            cos(radians(current_user_lat)) * 
            cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(current_user_lng)) + 
            sin(radians(current_user_lat)) * 
            sin(radians(p.latitude))
          )
        )
        ELSE NULL
      END as distance,
      -- Combine full-text and fuzzy matching scores
      (
        ts_rank(p.search_vector, plainto_tsquery('english', search_query)) * 10 +
        similarity(p.full_name, search_query) * 5 +
        similarity(p.username, search_query) * 3
      ) as text_similarity
    FROM profiles p
    LEFT JOIN mutual_friends mf ON p.id = mf.potential_friend_id
    WHERE 
      p.id != current_user_id
      AND p.is_searchable = true
      AND p.id NOT IN (SELECT user_id FROM blocked_users)
      -- Fuzzy text matching conditions
      AND (
        p.search_vector @@ plainto_tsquery('english', search_query)
        OR similarity(p.full_name, search_query) > 0.1
        OR similarity(p.username, search_query) > 0.1
        OR p.full_name ILIKE '%' || search_query || '%'
        OR p.username ILIKE '%' || search_query || '%'
      )
  )
  SELECT 
    sc.id as user_id,
    sc.full_name,
    sc.username,
    sc.avatar_url,
    sc.location,
    sc.mutual_count as mutual_friends_count,
    sc.distance as distance_km,
    -- Weighted relevance score
    (
      (sc.mutual_count * 0.4) +
      (CASE WHEN sc.distance IS NOT NULL THEN (1000 / GREATEST(sc.distance, 1)) * 0.3 ELSE 0 END) +
      (sc.text_similarity * 0.3)
    ) as relevance_score
  FROM search_candidates sc
  ORDER BY relevance_score DESC, sc.mutual_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Function: save_search_query
-- Saves search query to history (keeps last 10)
CREATE OR REPLACE FUNCTION save_search_query(
  p_user_id uuid,
  p_query text
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new search query
  INSERT INTO search_history (user_id, query, searched_at)
  VALUES (p_user_id, p_query, now());

  -- Keep only last 10 searches
  DELETE FROM search_history
  WHERE id IN (
    SELECT id FROM search_history
    WHERE user_id = p_user_id
    ORDER BY searched_at DESC
    OFFSET 10
  );
END;
$$;

-- Function: get_search_history
-- Retrieves user's recent search history
CREATE OR REPLACE FUNCTION get_search_history(
  p_user_id uuid
)
RETURNS TABLE (
  query text,
  searched_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT sh.query, sh.searched_at
  FROM search_history sh
  WHERE sh.user_id = p_user_id
  ORDER BY sh.searched_at DESC
  LIMIT 10;
END;
$$;
