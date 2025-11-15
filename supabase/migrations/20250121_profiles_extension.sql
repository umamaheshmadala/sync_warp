-- ============================================================
-- STORY 9.1.6: Profiles Extension
-- Add friend/follower metrics and online presence tracking
-- ============================================================
-- Note: is_online and last_active columns already exist
-- This migration adds friend_count, follower_count, following_count, privacy_settings
-- and updates existing triggers to maintain these counts
-- ============================================================

-- ============================================================
-- STEP 1: Add new columns to profiles table
-- ============================================================

-- Add friend_count column (tracks active friendships)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0;

-- Add follower_count column (tracks users following this profile)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- Add following_count column (tracks users this profile follows)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Add privacy_settings JSONB column with default preferences
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
    "show_online_status": true,
    "show_friend_list": "friends",
    "allow_friend_requests": true,
    "show_mutual_friends": true,
    "profile_visibility": "public"
  }'::jsonb;

COMMENT ON COLUMN public.profiles.friend_count IS 'Cached count of active friendships (bidirectional)';
COMMENT ON COLUMN public.profiles.follower_count IS 'Cached count of followers (users following this profile)';
COMMENT ON COLUMN public.profiles.following_count IS 'Cached count of users this profile is following';
COMMENT ON COLUMN public.profiles.privacy_settings IS 'User privacy preferences: show_online_status, show_friend_list, allow_friend_requests, show_mutual_friends, profile_visibility';

-- ============================================================
-- STEP 2: Create indexes for performance
-- ============================================================

-- Index for friend_count (for sorting/filtering by popularity)
CREATE INDEX IF NOT EXISTS idx_profiles_friend_count 
  ON public.profiles(friend_count DESC);

-- Index for combined follower/following metrics
CREATE INDEX IF NOT EXISTS idx_profiles_social_counts 
  ON public.profiles(follower_count DESC, following_count DESC);

-- Partial index for online users only (more efficient queries)
CREATE INDEX IF NOT EXISTS idx_profiles_is_online 
  ON public.profiles(is_online) 
  WHERE is_online = true;

-- Index for last_active (to find recently active users)
CREATE INDEX IF NOT EXISTS idx_profiles_last_active 
  ON public.profiles(last_active DESC);

COMMENT ON INDEX idx_profiles_friend_count IS 'Fast lookup and sorting by friend count';
COMMENT ON INDEX idx_profiles_social_counts IS 'Combined index for social metrics queries';
COMMENT ON INDEX idx_profiles_is_online IS 'Partial index for online users only (efficient)';
COMMENT ON INDEX idx_profiles_last_active IS 'Fast lookup for recently active users';

-- ============================================================
-- STEP 3: Create/Update trigger for friend_count
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_friend_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- When a friendship becomes active (new friendship established)
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.profiles 
    SET friend_count = friend_count + 1 
    WHERE id IN (NEW.user_id, NEW.friend_id);
    
  -- When a friendship status changes to active (rare, but handle it)
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
    UPDATE public.profiles 
    SET friend_count = friend_count + 1 
    WHERE id IN (NEW.user_id, NEW.friend_id);
    
  -- When a friendship is deactivated (unfriended or other non-active status)
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    UPDATE public.profiles 
    SET friend_count = GREATEST(friend_count - 1, 0)
    WHERE id IN (NEW.user_id, NEW.friend_id);
    
  -- When a friendship is deleted entirely
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.profiles 
    SET friend_count = GREATEST(friend_count - 1, 0)
    WHERE id IN (OLD.user_id, OLD.friend_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_friend_counts IS 
  'Automatically updates friend_count in profiles table on friendship changes';

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_update_friend_counts ON public.friendships;

CREATE TRIGGER trigger_update_friend_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_friend_counts();

-- ============================================================
-- STEP 4: Update trigger for follower/following counts
-- ============================================================
-- Note: Story 9.1.4 may have created this trigger already
-- We'll drop and recreate to ensure it's correct
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the followed user
    UPDATE public.profiles 
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
    -- Increment following count for the follower
    UPDATE public.profiles 
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the followed user
    UPDATE public.profiles 
    SET follower_count = GREATEST(follower_count - 1, 0)
    WHERE id = OLD.following_id;
    
    -- Decrement following count for the follower
    UPDATE public.profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_follow_counts IS 
  'Automatically updates follower_count and following_count in profiles table';

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON public.following;

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON public.following
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follow_counts();

-- ============================================================
-- STEP 5: Backfill existing data counts
-- ============================================================

-- Update friend_count for all existing users
-- Count active friendships where user is either user_id or friend_id
UPDATE public.profiles p
SET friend_count = (
  SELECT COUNT(*) 
  FROM public.friendships f
  WHERE (f.user_id = p.id OR f.friend_id = p.id)
    AND f.status = 'active'
);

-- Update follower_count for all existing users
UPDATE public.profiles p
SET follower_count = (
  SELECT COUNT(*) 
  FROM public.following f
  WHERE f.following_id = p.id
);

-- Update following_count for all existing users
UPDATE public.profiles p
SET following_count = (
  SELECT COUNT(*) 
  FROM public.following f
  WHERE f.follower_id = p.id
);

-- ============================================================
-- STEP 6: Create helper functions for stats queries
-- ============================================================

-- Function to get user's complete social stats
CREATE OR REPLACE FUNCTION public.get_user_social_stats(p_user_id UUID)
RETURNS TABLE(
  friend_count INTEGER,
  follower_count INTEGER,
  following_count INTEGER,
  mutual_followers_count BIGINT,
  is_online BOOLEAN,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.friend_count,
    p.follower_count,
    p.following_count,
    (
      -- Count mutual followers (users who follow each other)
      SELECT COUNT(*)
      FROM public.following f1
      INNER JOIN public.following f2 
        ON f1.follower_id = f2.following_id 
        AND f1.following_id = f2.follower_id
      WHERE f1.follower_id = p_user_id
    ) as mutual_followers_count,
    p.is_online,
    p.last_active
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_social_stats IS 
  'Returns comprehensive social stats for a user including mutual followers';

-- Function to get users by activity (most popular)
CREATE OR REPLACE FUNCTION public.get_popular_users(
  p_limit INTEGER DEFAULT 10,
  p_min_friends INTEGER DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  friend_count INTEGER,
  follower_count INTEGER,
  is_online BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.friend_count,
    p.follower_count,
    p.is_online
  FROM public.profiles p
  WHERE p.friend_count >= p_min_friends
  ORDER BY p.friend_count DESC, p.follower_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_popular_users IS 
  'Returns most popular users sorted by friend and follower counts';

-- Function to get online friends
CREATE OR REPLACE FUNCTION public.get_online_friends(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  is_online BOOLEAN,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.is_online,
    p.last_active
  FROM public.profiles p
  INNER JOIN public.friendships f 
    ON (f.user_id = p_user_id AND f.friend_id = p.id)
    OR (f.friend_id = p_user_id AND f.user_id = p.id)
  WHERE f.status = 'active'
    AND p.is_online = true
    -- Respect privacy settings
    AND (p.privacy_settings->>'show_online_status')::boolean = true
  ORDER BY p.last_active DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_online_friends IS 
  'Returns list of online friends respecting privacy settings';

-- ============================================================
-- STEP 7: Validation and statistics
-- ============================================================

DO $$
DECLARE
  v_total_profiles INT;
  v_profiles_with_friends INT;
  v_avg_friends NUMERIC;
  v_max_friends INT;
BEGIN
  -- Gather statistics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE friend_count > 0),
    AVG(friend_count),
    MAX(friend_count)
  INTO v_total_profiles, v_profiles_with_friends, v_avg_friends, v_max_friends
  FROM public.profiles;
  
  -- Report statistics
  RAISE NOTICE 'Profiles Extension Migration Statistics:';
  RAISE NOTICE '  Total profiles: %', v_total_profiles;
  RAISE NOTICE '  Profiles with friends: %', v_profiles_with_friends;
  RAISE NOTICE '  Average friends per user: %', ROUND(v_avg_friends, 2);
  RAISE NOTICE '  Maximum friends: %', v_max_friends;
  
  -- Verify columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'friend_count'
  ) THEN
    RAISE EXCEPTION 'friend_count column was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'privacy_settings'
  ) THEN
    RAISE EXCEPTION 'privacy_settings column was not created';
  END IF;
  
  RAISE NOTICE 'Profiles Extension migration completed successfully!';
END $$;
