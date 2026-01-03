-- ============================================================
-- STORY 9.1.7: Database Functions for Friend Operations
-- ============================================================
-- Reusable, performant functions for common friend operations
-- All functions target < 50ms execution time
-- ============================================================

-- ============================================================
-- FUNCTION 1: unfriend()
-- Unfriend a user and auto-unfollow both directions
-- ============================================================

CREATE OR REPLACE FUNCTION public.unfriend(p_friend_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_rows_updated INT := 0;
  v_follows_removed INT := 0;
BEGIN
  -- Validate authentication
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate not unfriending self
  IF v_current_user_id = p_friend_user_id THEN
    RAISE EXCEPTION 'Cannot unfriend yourself';
  END IF;
  
  -- Check if friendship exists
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE ((user_id = v_current_user_id AND friend_id = p_friend_user_id)
        OR (user_id = p_friend_user_id AND friend_id = v_current_user_id))
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Friendship does not exist or is not active';
  END IF;
  
  -- Soft delete friendship (both directions using bidirectional pattern)
  UPDATE public.friendships 
  SET status = 'unfriended', 
      unfriended_at = NOW()
  WHERE ((user_id = v_current_user_id AND friend_id = p_friend_user_id)
      OR (user_id = p_friend_user_id AND friend_id = v_current_user_id))
     AND status = 'active';
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  -- Auto-unfollow both directions (hard delete)
  DELETE FROM public.following 
  WHERE (follower_id = v_current_user_id AND following_id = p_friend_user_id)
     OR (follower_id = p_friend_user_id AND following_id = v_current_user_id);
  
  GET DIAGNOSTICS v_follows_removed = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'unfriended_count', v_rows_updated,
    'follows_removed', v_follows_removed,
    'unfriended_at', NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to unfriend user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.unfriend IS 
  'Unfriends a user and automatically unfollows both directions';

-- ============================================================
-- FUNCTION 2: get_mutual_friends()
-- Returns shared friends between current user and target user
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_mutual_friends(p_target_user_id UUID)
RETURNS TABLE(
  friend_id UUID, 
  username TEXT, 
  full_name TEXT, 
  avatar_url TEXT,
  is_online BOOLEAN,
  friend_count INTEGER
) AS $$
  SELECT 
    p.id AS friend_id, 
    p.username, 
    p.full_name, 
    p.avatar_url,
    p.is_online,
    p.friend_count
  FROM public.friendships f1
  INNER JOIN public.friendships f2 
    ON f1.friend_id = f2.friend_id
  INNER JOIN public.profiles p 
    ON p.id = f1.friend_id
  WHERE f1.user_id = auth.uid() 
    AND f2.user_id = p_target_user_id
    AND f1.status = 'active' 
    AND f2.status = 'active'
    -- Exclude blocked users (bidirectional check)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    )
  ORDER BY p.full_name NULLS LAST, p.username;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_mutual_friends IS 
  'Returns friends shared between current user and target user';

-- Create composite index for mutual friends optimization
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend_active 
  ON public.friendships(user_id, friend_id, status) 
  WHERE status = 'active';

-- ============================================================
-- FUNCTION 3: search_friends()
-- Full-text search across friends by username and full_name
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_friends(p_query TEXT)
RETURNS TABLE(
  friend_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_online BOOLEAN,
  friend_count INTEGER,
  rank REAL
) AS $$
  SELECT 
    p.id AS friend_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_online,
    p.friend_count,
    ts_rank(
      to_tsvector('english', COALESCE(p.full_name, '') || ' ' || COALESCE(p.username, '')),
      plainto_tsquery('english', p_query)
    ) AS rank
  FROM public.friendships f
  INNER JOIN public.profiles p ON p.id = f.friend_id
  WHERE f.user_id = auth.uid()
    AND f.status = 'active'
    AND (
      p.full_name ILIKE '%' || p_query || '%'
      OR p.username ILIKE '%' || p_query || '%'
    )
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    )
  ORDER BY rank DESC, p.full_name NULLS LAST, p.username
  LIMIT 50;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.search_friends IS 
  'Full-text search across friends list by name or username';

-- Create GIN index for full-text search optimization
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext_search 
  ON public.profiles USING GIN (
    to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(username, ''))
  );

-- ============================================================
-- FUNCTION 4: get_online_friends_count()
-- Returns count of currently online friends
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_online_friends_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.friendships f
  INNER JOIN public.profiles p ON p.id = f.friend_id
  WHERE f.user_id = auth.uid()
    AND f.status = 'active'
    AND p.is_online = TRUE
    -- Respect privacy settings
    AND (p.privacy_settings->>'show_online_status')::boolean = TRUE
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_online_friends_count IS 
  'Returns count of currently online friends (respects privacy settings)';

-- ============================================================
-- FUNCTION 5: get_friend_recommendations()
-- Returns "People You May Know" based on mutual friends
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_friend_recommendations(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  mutual_friends_count INTEGER,
  is_online BOOLEAN,
  friend_count INTEGER
) AS $$
  SELECT 
    p.id AS user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    COUNT(DISTINCT f2.friend_id)::INTEGER AS mutual_friends_count,
    p.is_online,
    p.friend_count
  FROM public.profiles p
  INNER JOIN public.friendships f2 ON f2.user_id = p.id AND f2.status = 'active'
  WHERE 
    -- Exclude yourself
    p.id != auth.uid()
    -- Exclude existing friends
    AND p.id NOT IN (
      SELECT friend_id FROM public.friendships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    -- Exclude users with pending friend requests (both directions)
    AND p.id NOT IN (
      SELECT sender_id FROM public.friend_requests 
      WHERE receiver_id = auth.uid() AND status = 'pending'
    )
    AND p.id NOT IN (
      SELECT receiver_id FROM public.friend_requests 
      WHERE sender_id = auth.uid() AND status = 'pending'
    )
    -- Must have at least one mutual friend
    AND f2.friend_id IN (
      SELECT friend_id FROM public.friendships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    -- Exclude blocked users (bidirectional)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    )
    -- Respect privacy: only recommend users who allow friend requests
    AND (p.privacy_settings->>'allow_friend_requests')::boolean = TRUE
  GROUP BY p.id, p.username, p.full_name, p.avatar_url, p.is_online, p.friend_count
  HAVING COUNT(DISTINCT f2.friend_id) > 0
  ORDER BY mutual_friends_count DESC, p.friend_count DESC, p.full_name NULLS LAST
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_friend_recommendations IS 
  'Returns friend recommendations based on mutual friends (respects privacy settings)';

-- ============================================================
-- FUNCTION 6: get_friends_with_stats()
-- Returns friends list with additional stats (enhanced version)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_friends_with_stats()
RETURNS TABLE(
  friend_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_online BOOLEAN,
  last_active TIMESTAMPTZ,
  friend_count INTEGER,
  follower_count INTEGER,
  mutual_friends_count BIGINT,
  friendship_created_at TIMESTAMPTZ
) AS $$
  SELECT 
    p.id AS friend_id,
    p.username,
    p.full_name,
    p.avatar_url,
    CASE 
      WHEN (p.privacy_settings->>'show_online_status')::boolean = TRUE THEN p.is_online
      ELSE FALSE
    END AS is_online,
    p.last_active,
    p.friend_count,
    p.follower_count,
    (
      -- Count mutual friends
      SELECT COUNT(DISTINCT f2.friend_id)
      FROM public.friendships f2
      WHERE f2.user_id = p.id 
        AND f2.status = 'active'
        AND f2.friend_id IN (
          SELECT friend_id FROM public.friendships 
          WHERE user_id = auth.uid() AND status = 'active'
        )
    ) AS mutual_friends_count,
    f.created_at AS friendship_created_at
  FROM public.friendships f
  INNER JOIN public.profiles p ON p.id = f.friend_id
  WHERE f.user_id = auth.uid()
    AND f.status = 'active'
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    )
  ORDER BY p.is_online DESC, p.last_active DESC NULLS LAST;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_friends_with_stats IS 
  'Returns friends list with stats including mutual friends count';

-- ============================================================
-- STEP 7: Validation and Performance Tests
-- ============================================================

DO $$
BEGIN
  -- Verify all functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'unfriend' 
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'unfriend function was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_mutual_friends'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'get_mutual_friends function was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'search_friends'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'search_friends function was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_online_friends_count'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'get_online_friends_count function was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_friend_recommendations'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'get_friend_recommendations function was not created';
  END IF;
  
  RAISE NOTICE 'All friend operation functions created successfully!';
  RAISE NOTICE 'Functions: unfriend, get_mutual_friends, search_friends, get_online_friends_count, get_friend_recommendations, get_friends_with_stats';
END $$;
