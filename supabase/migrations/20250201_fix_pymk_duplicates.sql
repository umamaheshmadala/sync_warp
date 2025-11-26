-- Fix PYMK duplicates caused by bidirectional friendship rows
-- Story 9.3.5 / Bugfix

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
    -- Get all friends of the current user (DISTINCT to handle bidirectional rows)
    SELECT DISTINCT
      CASE
        WHEN f.user_id = current_user_id THEN f.friend_id
        ELSE f.user_id
      END as friend_id
    FROM friendships f
    WHERE (f.user_id = current_user_id OR f.friend_id = current_user_id)
    AND f.status = 'active'
  ),
  raw_candidates AS (
    -- Get all connections from friends to others
    SELECT
      uf.friend_id as mutual_friend_id,
      CASE
        WHEN f.user_id = uf.friend_id THEN f.friend_id
        ELSE f.user_id
      END as candidate_id
    FROM user_friends uf
    JOIN friendships f ON (f.user_id = uf.friend_id OR f.friend_id = uf.friend_id)
    WHERE f.status = 'active'
    AND (
      (f.user_id = uf.friend_id AND f.friend_id != current_user_id) OR
      (f.friend_id = uf.friend_id AND f.user_id != current_user_id)
    )
  ),
  unique_matches AS (
    -- Ensure each (mutual_friend, candidate) pair is unique
    -- This handles cases where A-B is stored as both (A,B) and (B,A)
    SELECT DISTINCT mutual_friend_id, candidate_id
    FROM raw_candidates
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    COUNT(um.mutual_friend_id) as mutual_friends_count,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'id', sub.id,
            'avatar_url', sub.avatar_url,
            'full_name', sub.full_name
        ))
        FROM (
            SELECT DISTINCT mp.id, mp.avatar_url, mp.full_name
            FROM unique_matches um_sub
            JOIN profiles mp ON mp.id = um_sub.mutual_friend_id
            WHERE um_sub.candidate_id = p.id
            LIMIT 3
        ) sub
    ) as mutual_friends
  FROM unique_matches um
  JOIN profiles p ON p.id = um.candidate_id
  WHERE um.candidate_id != current_user_id
  -- Exclude existing friends
  AND um.candidate_id NOT IN (SELECT friend_id FROM user_friends)
  -- Exclude pending requests
  AND um.candidate_id NOT IN (
    SELECT receiver_id FROM friend_requests WHERE sender_id = current_user_id AND status = 'pending'
    UNION
    SELECT sender_id FROM friend_requests WHERE receiver_id = current_user_id AND status = 'pending'
  )
  -- Exclude dismissed suggestions
  AND um.candidate_id NOT IN (
    SELECT suggested_user_id FROM dismissed_pymk_suggestions WHERE user_id = current_user_id
  )
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY mutual_friends_count DESC
  LIMIT limit_count;
END;
$$;
