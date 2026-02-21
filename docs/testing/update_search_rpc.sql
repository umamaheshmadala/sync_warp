-- Update search_users RPC to include city and is_online columns
-- This is required for the Location and Online Status filters to work correctly

-- DROP the existing function first because we are changing the return type
DROP FUNCTION IF EXISTS public.search_users(text, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.search_users(
  search_query text, 
  current_user_id uuid, 
  limit_count integer DEFAULT 20, 
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid, 
  full_name text, 
  username text, 
  avatar_url text, 
  location text, 
  city text,          -- Added city column
  is_online boolean,  -- Added is_online column
  mutual_friends_count bigint, 
  distance_km numeric, 
  relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
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
  search_candidates AS (
    SELECT 
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.location,
      p.city,         -- Added city
      p.is_online,    -- Added is_online
      COALESCE(mf.mutual_count, 0) as mutual_count,
      (
        COALESCE(similarity(p.full_name, search_query), 0) * 5 +
        COALESCE(similarity(p.email, search_query), 0) * 2
      ) as text_similarity
    FROM profiles p
    LEFT JOIN mutual_friends mf ON p.id = mf.potential_friend_id
    WHERE 
      p.id != current_user_id
      AND (
        similarity(p.full_name, search_query) > 0.1
        OR similarity(p.email, search_query) > 0.1
        OR p.full_name ILIKE '%' || search_query || '%'
        OR p.email ILIKE '%' || search_query || '%'
      )
  )
  SELECT 
    sc.id as user_id,
    sc.full_name,
    sc.email as username,
    sc.avatar_url,
    sc.location,
    sc.city,          -- Added city
    sc.is_online,     -- Added is_online
    sc.mutual_count as mutual_friends_count,
    NULL::numeric as distance_km,
    (
      (sc.mutual_count * 0.3) +
      (sc.text_similarity * 0.7)
    )::numeric as relevance_score
  FROM search_candidates sc
  ORDER BY relevance_score DESC, sc.mutual_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$function$;
