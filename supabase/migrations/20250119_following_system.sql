-- ============================================
-- MIGRATION: Follow System (Instagram-style)
-- Date: 2025-01-19
-- Story: 9.1.4
-- ============================================

-- ============================================
-- STEP 1: Add follower/following counts to profiles
-- ============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN profiles.follower_count IS 'Number of users following this user';
COMMENT ON COLUMN profiles.following_count IS 'Number of users this user is following';

-- Create indexes for counts (useful for leaderboards/sorting)
CREATE INDEX IF NOT EXISTS idx_profiles_follower_count ON profiles(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_following_count ON profiles(following_count DESC);

-- ============================================
-- STEP 2: Create following table
-- ============================================

CREATE TABLE IF NOT EXISTS public.following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT following_different_users 
    CHECK (follower_id != following_id),
  CONSTRAINT following_unique_pair 
    UNIQUE (follower_id, following_id)
);

COMMENT ON TABLE following IS 'One-way follow relationships (Instagram-style)';

-- Enable RLS
ALTER TABLE following ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_following_follower_id ON following(follower_id);
CREATE INDEX idx_following_following_id ON following(following_id);
CREATE INDEX idx_following_created_at ON following(created_at DESC);

-- Composite index for checking if A follows B
CREATE INDEX idx_following_pair ON following(follower_id, following_id);

-- ============================================
-- RLS POLICIES (Public visibility)
-- ============================================

-- Anyone can view follows (public information)
CREATE POLICY "Anyone can view follows"
  ON following FOR SELECT
  USING (true);

-- Users can follow anyone
CREATE POLICY "Users can follow others"
  ON following FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id
    AND follower_id != following_id
  );

-- Users can unfollow anyone they follow
CREATE POLICY "Users can unfollow"
  ON following FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- TRIGGER: Auto-Unfollow on Unfriend
-- ============================================

CREATE OR REPLACE FUNCTION auto_unfollow_on_unfriend()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'unfriended' AND OLD.status != 'unfriended' THEN
    -- Remove both directions of follow
    DELETE FROM following 
    WHERE (follower_id = NEW.user_id AND following_id = NEW.friend_id)
       OR (follower_id = NEW.friend_id AND following_id = NEW.user_id);
       
    RAISE NOTICE 'Auto-unfollowed users % and %', NEW.user_id, NEW.friend_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_unfollow
  AFTER UPDATE ON friendships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION auto_unfollow_on_unfriend();

-- ============================================
-- TRIGGER: Update Follower/Following Counts
-- ============================================

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    UPDATE profiles 
    SET follower_count = follower_count + 1 
    WHERE id = NEW.following_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counts (GREATEST ensures never goes below 0)
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    
    UPDATE profiles 
    SET follower_count = GREATEST(follower_count - 1, 0)
    WHERE id = OLD.following_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON following
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM following
    WHERE follower_id = p_follower_id
      AND following_id = p_following_id
  );
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION is_following IS 'Check if follower_id follows following_id';

-- Get follower count for user
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM following
  WHERE following_id = p_user_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_follower_count IS 'Get count of users following this user';

-- Get following count for user
CREATE OR REPLACE FUNCTION get_following_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM following
  WHERE follower_id = p_user_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_following_count IS 'Get count of users this user is following';

-- Get mutual followers (users who both follow each other)
CREATE OR REPLACE FUNCTION get_mutual_followers(p_user_id UUID)
RETURNS TABLE(user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT) AS $$
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM following f1
    WHERE f1.follower_id = p_user_id AND f1.following_id = p.id
  )
  AND EXISTS (
    SELECT 1 FROM following f2
    WHERE f2.follower_id = p.id AND f2.following_id = p_user_id
  );
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_mutual_followers IS 'Get users who both follow and are followed by the specified user';

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE following;

-- ============================================
-- BACKFILL: Initialize counts for existing users
-- ============================================

-- Calculate and update follower counts for all existing users
UPDATE profiles p
SET follower_count = (
  SELECT COUNT(*)::INTEGER
  FROM following f
  WHERE f.following_id = p.id
);

-- Calculate and update following counts for all existing users
UPDATE profiles p
SET following_count = (
  SELECT COUNT(*)::INTEGER
  FROM following f
  WHERE f.follower_id = p.id
);

-- ============================================
-- MIGRATION VALIDATION
-- ============================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'following'
  ) THEN
    RAISE EXCEPTION 'Migration failed: following table not created';
  END IF;
  
  -- Verify columns exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN ('follower_count', 'following_count')
    HAVING COUNT(*) = 2
  ) THEN
    RAISE EXCEPTION 'Migration failed: follower/following count columns not added to profiles';
  END IF;
  
  RAISE NOTICE 'Migration 20250119_following_system completed successfully';
END $$;
