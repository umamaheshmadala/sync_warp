-- ============================================================
-- STORY 9.1.5: User Blocking System
-- ============================================================
-- Creates a hard privacy barrier where blocked users become
-- completely invisible to the blocker. Blocking atomically
-- removes friendship, follows, and prevents all interactions.
-- ============================================================

-- ============================================================
-- STEP 1: Create blocked_users table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT blocked_users_different_users CHECK (blocker_id != blocked_id),
  CONSTRAINT blocked_users_unique_pair UNIQUE (blocker_id, blocked_id)
);

COMMENT ON TABLE public.blocked_users IS 'Stores user blocking relationships with atomic cleanup of friendships and follows';
COMMENT ON COLUMN public.blocked_users.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN public.blocked_users.blocked_id IS 'User who was blocked';
COMMENT ON COLUMN public.blocked_users.reason IS 'Optional reason for blocking (private to blocker)';

-- ============================================================
-- STEP 2: Create indexes for fast lookup
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker 
  ON public.blocked_users(blocker_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked 
  ON public.blocked_users(blocked_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_created 
  ON public.blocked_users(created_at DESC);

COMMENT ON INDEX idx_blocked_users_blocker IS 'Fast lookup of who a user has blocked';
COMMENT ON INDEX idx_blocked_users_blocked IS 'Fast lookup of who blocked a user';
COMMENT ON INDEX idx_blocked_users_created IS 'Time-based queries for block history';

-- ============================================================
-- STEP 3: Enable RLS and create policies
-- ============================================================

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own block list
DROP POLICY IF EXISTS "blocked_users_select_own" ON public.blocked_users;
CREATE POLICY "blocked_users_select_own"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

COMMENT ON POLICY "blocked_users_select_own" ON public.blocked_users IS 
  'Users can only see their own block list';

-- Policy: Users can block other users
DROP POLICY IF EXISTS "blocked_users_insert_own" ON public.blocked_users;
CREATE POLICY "blocked_users_insert_own"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

COMMENT ON POLICY "blocked_users_insert_own" ON public.blocked_users IS 
  'Users can only create blocks where they are the blocker';

-- Policy: Users can unblock users they blocked
DROP POLICY IF EXISTS "blocked_users_delete_own" ON public.blocked_users;
CREATE POLICY "blocked_users_delete_own"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

COMMENT ON POLICY "blocked_users_delete_own" ON public.blocked_users IS 
  'Users can only unblock users they previously blocked';

-- ============================================================
-- STEP 4: Enable realtime for blocked_users
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;

-- ============================================================
-- STEP 5: Create block_user() function (atomic operation)
-- ============================================================

CREATE OR REPLACE FUNCTION public.block_user(
  p_blocked_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_blocker_id UUID := auth.uid();
  v_friendships_removed INT := 0;
  v_follows_removed INT := 0;
  v_requests_cancelled INT := 0;
  v_already_blocked BOOLEAN := FALSE;
BEGIN
  -- Validate authentication
  IF v_blocker_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate not blocking self
  IF v_blocker_id = p_blocked_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_blocked_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if already blocked (idempotent operation)
  v_already_blocked := EXISTS (
    SELECT 1 FROM public.blocked_users 
    WHERE blocker_id = v_blocker_id 
      AND blocked_id = p_blocked_user_id
  );
  
  -- ATOMIC OPERATION 1: Unfriend both directions (soft delete)
  UPDATE public.friendships 
  SET status = 'unfriended', 
      unfriended_at = NOW()
  WHERE ((user_id = v_blocker_id AND friend_id = p_blocked_user_id)
      OR (user_id = p_blocked_user_id AND friend_id = v_blocker_id))
     AND status = 'active';
  
  GET DIAGNOSTICS v_friendships_removed = ROW_COUNT;
  
  -- ATOMIC OPERATION 2: Remove follows both directions (hard delete)
  DELETE FROM public.following 
  WHERE (follower_id = v_blocker_id AND following_id = p_blocked_user_id)
     OR (follower_id = p_blocked_user_id AND following_id = v_blocker_id);
  
  GET DIAGNOSTICS v_follows_removed = ROW_COUNT;
  
  -- ATOMIC OPERATION 3: Cancel any pending friend requests (both directions)
  UPDATE public.friend_requests 
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE ((sender_id = v_blocker_id AND receiver_id = p_blocked_user_id)
      OR (sender_id = p_blocked_user_id AND receiver_id = v_blocker_id))
     AND status = 'pending';
  
  GET DIAGNOSTICS v_requests_cancelled = ROW_COUNT;
  
  -- ATOMIC OPERATION 4: Create block entry (idempotent)
  IF NOT v_already_blocked THEN
    INSERT INTO public.blocked_users (blocker_id, blocked_id, reason)
    VALUES (v_blocker_id, p_blocked_user_id, p_reason);
  END IF;
  
  -- Return summary of actions taken
  RETURN jsonb_build_object(
    'success', TRUE,
    'already_blocked', v_already_blocked,
    'friendships_removed', v_friendships_removed,
    'follows_removed', v_follows_removed,
    'requests_cancelled', v_requests_cancelled,
    'blocked_at', NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to block user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.block_user IS 
  'Atomically blocks a user: unfriends, unfollows both directions, cancels pending requests, and creates block entry';

-- ============================================================
-- STEP 6: Create unblock_user() function
-- ============================================================

CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_blocker_id UUID := auth.uid();
  v_was_blocked BOOLEAN;
BEGIN
  -- Validate authentication
  IF v_blocker_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate not unblocking self
  IF v_blocker_id = p_blocked_user_id THEN
    RAISE EXCEPTION 'Invalid operation: cannot unblock yourself';
  END IF;
  
  -- Delete block entry
  DELETE FROM public.blocked_users
  WHERE blocker_id = v_blocker_id
    AND blocked_id = p_blocked_user_id;
  
  GET DIAGNOSTICS v_was_blocked = FOUND;
  
  IF NOT v_was_blocked THEN
    RAISE EXCEPTION 'User was not blocked';
  END IF;
  
  -- Return success (does NOT restore friendship or follows)
  RETURN jsonb_build_object(
    'success', TRUE,
    'unblocked_at', NOW(),
    'note', 'Visibility restored, but friendship and follows are NOT automatically restored'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to unblock user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.unblock_user IS 
  'Unblocks a user (restores visibility but NOT friendship or follows)';

-- ============================================================
-- STEP 7: Create helper function - is_user_blocked()
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_user_blocked(
  p_user_id UUID,
  p_blocker_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = p_blocker_id
      AND blocked_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_user_blocked IS 
  'Checks if a user has blocked another user';

-- ============================================================
-- STEP 8: Create helper function - is_blocked_by()
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_blocked_by(
  p_user_id UUID,
  p_current_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = p_user_id
      AND blocked_id = p_current_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_blocked_by IS 
  'Checks if current user is blocked by another user';

-- ============================================================
-- STEP 9: Update profiles RLS policy - Blocked users invisible
-- ============================================================

-- Drop existing profile visibility policy
DROP POLICY IF EXISTS "profiles_visible_to_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "blocked_users_invisible" ON public.profiles;

-- Create comprehensive visibility policy that handles blocking
CREATE POLICY "profiles_visible_with_block_check"
  ON public.profiles FOR SELECT
  USING (
    -- Always see your own profile
    id = auth.uid()
    OR
    -- See other profiles only if no blocking exists
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE 
        -- You blocked them
        (blocker_id = auth.uid() AND blocked_id = id)
        OR
        -- They blocked you
        (blocker_id = id AND blocked_id = auth.uid())
    )
  );

COMMENT ON POLICY "profiles_visible_with_block_check" ON public.profiles IS 
  'Users can see profiles except when blocking exists (either direction)';

-- ============================================================
-- STEP 10: Update friendships RLS to prevent blocked interactions
-- ============================================================

-- Drop and recreate friendships SELECT policy with block check
DROP POLICY IF EXISTS "friendships_select_own" ON public.friendships;

CREATE POLICY "friendships_select_with_block_check"
  ON public.friendships FOR SELECT
  USING (
    (user_id = auth.uid() OR friend_id = auth.uid())
    AND
    -- Cannot see friendships with blocked users
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id IN (user_id, friend_id))
         OR (blocker_id IN (user_id, friend_id) AND blocked_id = auth.uid())
    )
  );

COMMENT ON POLICY "friendships_select_with_block_check" ON public.friendships IS 
  'Users can see their friendships except with blocked users';

-- ============================================================
-- STEP 11: Update friend_requests RLS to prevent blocked interactions
-- ============================================================

-- Prevent sending friend requests to blocked users
DROP POLICY IF EXISTS "friend_requests_insert_check" ON public.friend_requests;

CREATE POLICY "friend_requests_insert_with_block_check"
  ON public.friend_requests FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND
    -- Cannot send requests to users you blocked or who blocked you
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = sender_id AND blocked_id = receiver_id)
         OR (blocker_id = receiver_id AND blocked_id = sender_id)
    )
  );

COMMENT ON POLICY "friend_requests_insert_with_block_check" ON public.friend_requests IS 
  'Prevent friend requests between blocked users';

-- Update SELECT policy for friend requests
DROP POLICY IF EXISTS "friend_requests_select_own" ON public.friend_requests;

CREATE POLICY "friend_requests_select_with_block_check"
  ON public.friend_requests FOR SELECT
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND
    -- Cannot see requests with blocked users
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id IN (sender_id, receiver_id))
         OR (blocker_id IN (sender_id, receiver_id) AND blocked_id = auth.uid())
    )
  );

COMMENT ON POLICY "friend_requests_select_with_block_check" ON public.friend_requests IS 
  'Users can see their requests except with blocked users';

-- ============================================================
-- STEP 12: Update following RLS to prevent blocked interactions
-- ============================================================

-- Prevent following blocked users
DROP POLICY IF EXISTS "following_insert_own" ON public.following;

CREATE POLICY "following_insert_with_block_check"
  ON public.following FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id
    AND
    -- Cannot follow users you blocked or who blocked you
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = follower_id AND blocked_id = following_id)
         OR (blocker_id = following_id AND blocked_id = follower_id)
    )
  );

COMMENT ON POLICY "following_insert_with_block_check" ON public.following IS 
  'Prevent following between blocked users';

-- Update SELECT policy for following
DROP POLICY IF EXISTS "following_select_all" ON public.following;

CREATE POLICY "following_select_with_block_check"
  ON public.following FOR SELECT
  USING (
    -- Can see follows except those involving blocked users
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id IN (follower_id, following_id))
         OR (blocker_id IN (follower_id, following_id) AND blocked_id = auth.uid())
    )
  );

COMMENT ON POLICY "following_select_with_block_check" ON public.following IS 
  'Users cannot see follows involving blocked users';

-- ============================================================
-- STEP 13: Validation queries
-- ============================================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blocked_users') THEN
    RAISE EXCEPTION 'blocked_users table was not created';
  END IF;
  
  RAISE NOTICE 'Blocking system migration completed successfully';
END $$;

-- Count existing records (should be 0 on fresh install)
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.blocked_users;
  RAISE NOTICE 'Current blocked_users count: %', v_count;
END $$;
