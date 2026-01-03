-- Fix PYMK Privacy: Exclude private profiles from suggestions
-- Replaces get_pymk_suggestions with version that respects profile_visibility

CREATE OR REPLACE FUNCTION get_pymk_suggestions(
  current_user_id uuid,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  mutual_friends_count bigint,
  mutual_friends jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    -- Get all friends of the current user
    SELECT
      CASE
        WHEN f.user_id = current_user_id THEN f.friend_id
        ELSE f.user_id
      END as friend_id
    FROM friendships f
    WHERE (f.user_id = current_user_id OR f.friend_id = current_user_id)
    AND f.status = 'active'
  ),
  candidates AS (
    -- Find friends of friends
    SELECT
      f.user_id,
      f.friend_id
    FROM friendships f
    JOIN user_friends uf ON (
      (f.user_id = uf.friend_id AND f.friend_id != current_user_id) OR
      (f.friend_id = uf.friend_id AND f.user_id != current_user_id)
    )
    WHERE f.status = 'active'
  ),
  potential_matches AS (
    -- Normalize candidates to just the person who is NOT the mutual friend
    SELECT
      CASE
        WHEN c.user_id IN (SELECT friend_id FROM user_friends) THEN c.friend_id
        ELSE c.user_id
      END as candidate_id
    FROM candidates c
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    COUNT(pm.candidate_id) as mutual_friends_count,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'id', mp.id,
            'avatar_url', mp.avatar_url,
            'full_name', mp.full_name
        ))
        FROM user_friends uf
        JOIN friendships f ON (
            (f.user_id = uf.friend_id AND f.friend_id = p.id) OR
            (f.friend_id = uf.friend_id AND f.user_id = p.id)
        )
        JOIN profiles mp ON mp.id = uf.friend_id
        WHERE f.status = 'active'
        LIMIT 3
    ) as mutual_friends
  FROM potential_matches pm
  JOIN profiles p ON p.id = pm.candidate_id
  WHERE pm.candidate_id != current_user_id
  -- Exclude existing friends
  AND pm.candidate_id NOT IN (SELECT friend_id FROM user_friends)
  -- Exclude pending requests
  AND pm.candidate_id NOT IN (
    SELECT receiver_id FROM friend_requests WHERE sender_id = current_user_id AND status = 'pending'
    UNION
    SELECT sender_id FROM friend_requests WHERE receiver_id = current_user_id AND status = 'pending'
  )
  -- Exclude dismissed suggestions
  AND pm.candidate_id NOT IN (
    SELECT suggested_user_id FROM dismissed_pymk_suggestions WHERE user_id = current_user_id
  )
  -- Data Privacy: Exclude profiles that are set to 'friends' (Private)
  AND (p.privacy_settings->>'profile_visibility') IS DISTINCT FROM 'friends'
  
  GROUP BY p.id, p.full_name, p.avatar_url, p.privacy_settings
  ORDER BY mutual_friends_count DESC
  LIMIT limit_count;
END;
$$;
