-- Fix PYMK: Correct Mutual Friends Count
-- The previous version was inflating counts 4x due to bidirectional join issues

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
    -- Get all friends of the current user (normalized to single column)
    SELECT DISTINCT
      CASE
        WHEN f.user_id = current_user_id THEN f.friend_id
        ELSE f.user_id
      END as friend_id
    FROM friendships f
    WHERE (f.user_id = current_user_id OR f.friend_id = current_user_id)
    AND f.status = 'active'
  ),
  -- For each potential candidate, find their friends
  candidate_friends AS (
    SELECT DISTINCT
      CASE
        WHEN f.user_id IN (SELECT friend_id FROM user_friends) THEN f.friend_id
        ELSE f.user_id  
      END as candidate_id,
      CASE
        WHEN f.user_id IN (SELECT friend_id FROM user_friends) THEN f.user_id
        ELSE f.friend_id
      END as candidate_friend_id
    FROM friendships f
    WHERE f.status = 'active'
    AND (
      f.user_id IN (SELECT friend_id FROM user_friends) OR 
      f.friend_id IN (SELECT friend_id FROM user_friends)
    )
    AND f.user_id != current_user_id
    AND f.friend_id != current_user_id
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    -- Count mutual friends: users who are friends with BOTH current_user AND candidate
    (
      SELECT COUNT(DISTINCT uf.friend_id)
      FROM user_friends uf
      WHERE uf.friend_id IN (
        SELECT DISTINCT
          CASE 
            WHEN cf.user_id = p.id THEN cf.friend_id
            ELSE cf.user_id
          END
        FROM friendships cf
        WHERE (cf.user_id = p.id OR cf.friend_id = p.id)
        AND cf.status = 'active'
      )
    ) as mutual_friends_count,
    -- Get display list of mutual friends (max 5)
    (
      SELECT jsonb_agg(mf_data)
      FROM (
        SELECT DISTINCT
          mp.id,
          mp.avatar_url,
          mp.full_name
        FROM user_friends uf
        JOIN profiles mp ON mp.id = uf.friend_id
        WHERE uf.friend_id IN (
          SELECT DISTINCT
            CASE 
              WHEN cf.user_id = p.id THEN cf.friend_id
              ELSE cf.user_id
            END
          FROM friendships cf
          WHERE (cf.user_id = p.id OR cf.friend_id = p.id)
          AND cf.status = 'active'
        )
        ORDER BY mp.full_name ASC
        LIMIT 5
      ) mf_data
    ) as mutual_friends
  FROM (
    -- Get unique candidates (friends of friends, excluding self and existing friends)
    SELECT DISTINCT cf.candidate_id
    FROM candidate_friends cf
    WHERE cf.candidate_id != current_user_id
    AND cf.candidate_id NOT IN (SELECT friend_id FROM user_friends)
  ) candidates
  JOIN profiles p ON p.id = candidates.candidate_id
  -- Exclude pending requests
  WHERE candidates.candidate_id NOT IN (
    SELECT receiver_id FROM friend_requests WHERE sender_id = current_user_id AND status = 'pending'
    UNION
    SELECT sender_id FROM friend_requests WHERE receiver_id = current_user_id AND status = 'pending'
  )
  -- Exclude dismissed suggestions
  AND candidates.candidate_id NOT IN (
    SELECT suggested_user_id FROM dismissed_pymk_suggestions WHERE user_id = current_user_id
  )
  -- Data Privacy: Exclude private profiles
  AND (p.privacy_settings->>'profile_visibility') IS DISTINCT FROM 'friends'
  
  ORDER BY mutual_friends_count DESC
  LIMIT limit_count;
END;
$$;
