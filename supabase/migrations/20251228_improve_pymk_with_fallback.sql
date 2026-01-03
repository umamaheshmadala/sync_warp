-- Improved PYMK function with fallback for random users when no mutual friends exist
-- This ensures the "People You May Know" section always has suggestions

-- Drop existing function first
DROP FUNCTION IF EXISTS get_pymk_suggestions(uuid, int);

-- Create improved function
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
SET search_path = public
AS $$
DECLARE
  result_count int;
BEGIN
  -- First, get users with mutual friends
  RETURN QUERY
  WITH user_friends AS (
    -- Get all friends of the current user
    SELECT DISTINCT
      CASE
        WHEN f.user_id = current_user_id THEN f.friend_id
        ELSE f.user_id
      END as friend_id
    FROM friendships f
    WHERE (f.user_id = current_user_id OR f.friend_id = current_user_id)
    AND f.status = 'active'
  ),
  candidates AS (
    -- Find friends of friends (candidates for suggestions)
    SELECT
      -- matches the friend of the current user (mutual friend)
      uf.friend_id as mutual_friend_id,
      -- matches the accumulated friend (candidate)
      CASE
        WHEN f.user_id = uf.friend_id THEN f.friend_id
        ELSE f.user_id
      END as candidate_id
    FROM friendships f
    JOIN user_friends uf ON (
      (f.user_id = uf.friend_id AND f.friend_id != current_user_id) OR
      (f.friend_id = uf.friend_id AND f.user_id != current_user_id)
    )
    WHERE f.status = 'active'
  ),
  -- Get mutual friends based suggestions
  -- Get mutual friends based suggestions
  mutual_friend_suggestions AS (
    SELECT
      p.id,
      p.full_name,
      p.avatar_url,
      COUNT(DISTINCT pm.mutual_friend_id) as mutual_friends_count,
      (
          SELECT jsonb_agg(jsonb_build_object(
              'id', sub.id,
              'avatar_url', sub.avatar_url,
              'full_name', sub.full_name
          ))
          FROM (
              SELECT DISTINCT ON (mp.id) mp.id, mp.avatar_url, mp.full_name
              FROM candidates sub_pm
              JOIN profiles mp ON mp.id = sub_pm.mutual_friend_id
              WHERE sub_pm.candidate_id = pm.candidate_id
              LIMIT 3
          ) sub
      ) as mutual_friends
    FROM candidates pm
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
    -- Exclude blocked users (both directions)
    AND pm.candidate_id NOT IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = current_user_id
      UNION
      SELECT blocker_id FROM blocked_users WHERE blocked_id = current_user_id
    )
    -- Exclude dismissed suggestions
    AND pm.candidate_id NOT IN (
      SELECT suggested_user_id FROM dismissed_pymk_suggestions WHERE user_id = current_user_id
    )
    GROUP BY p.id, p.full_name, p.avatar_url, pm.candidate_id
    ORDER BY mutual_friends_count DESC
    LIMIT limit_count
  ),
  -- Fallback: Random users when no mutual friends found
  random_suggestions AS (
    SELECT
      p.id,
      p.full_name,
      p.avatar_url,
      0::bigint as mutual_friends_count,
      NULL::jsonb as mutual_friends
    FROM profiles p
    WHERE p.id != current_user_id
    -- Exclude existing friends
    AND p.id NOT IN (
      SELECT CASE WHEN f.user_id = current_user_id THEN f.friend_id ELSE f.user_id END
      FROM friendships f
      WHERE (f.user_id = current_user_id OR f.friend_id = current_user_id)
      AND f.status = 'active'
    )
    -- Exclude pending requests
    AND p.id NOT IN (
      SELECT receiver_id FROM friend_requests WHERE sender_id = current_user_id AND status = 'pending'
      UNION
      SELECT sender_id FROM friend_requests WHERE receiver_id = current_user_id AND status = 'pending'
    )
    -- Exclude blocked users
    AND p.id NOT IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = current_user_id
      UNION
      SELECT blocker_id FROM blocked_users WHERE blocked_id = current_user_id
    )
    -- Exclude dismissed suggestions
    AND p.id NOT IN (
      SELECT suggested_user_id FROM dismissed_pymk_suggestions WHERE user_id = current_user_id
    )
    -- Exclude profiles without full_name (incomplete profiles)
    AND p.full_name IS NOT NULL
    AND p.full_name != ''
    ORDER BY RANDOM()
    LIMIT limit_count
  ),
  -- Combine: mutual friends first, then random to fill up to limit
  combined AS (
    SELECT * FROM mutual_friend_suggestions
    UNION ALL
    SELECT * FROM random_suggestions
    WHERE NOT EXISTS (SELECT 1 FROM mutual_friend_suggestions)
    OR (SELECT COUNT(*) FROM mutual_friend_suggestions) < limit_count
  )
  SELECT * FROM (
    SELECT DISTINCT ON (combined.id)
      combined.id,
      combined.full_name,
      combined.avatar_url,
      combined.mutual_friends_count,
      combined.mutual_friends
    FROM combined
    ORDER BY combined.id, combined.mutual_friends_count DESC
  ) sub
  ORDER BY mutual_friends_count DESC
  LIMIT limit_count;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pymk_suggestions(uuid, int) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION get_pymk_suggestions IS 
'Get People You May Know suggestions. 
Returns users with mutual friends first (sorted by count), 
then falls back to random users if no mutual friends exist.
Excludes: existing friends, pending requests, blocked users, dismissed suggestions.';
