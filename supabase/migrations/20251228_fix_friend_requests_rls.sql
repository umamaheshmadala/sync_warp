-- Migration: Fix friend_requests RLS policies
-- Date: 2025-12-28
-- Purpose: Restore friend_requests policies to allow normal operations.
--          Blocking should NOT affect friend requests - only messaging.

-- ============================================================
-- Fix friend_requests INSERT policy
-- ============================================================

-- Drop the block-aware policy
DROP POLICY IF EXISTS "friend_requests_insert_with_block_check" ON public.friend_requests;
DROP POLICY IF EXISTS "friend_requests_insert_check" ON public.friend_requests;

-- Create simple policy - user can send friend requests
CREATE POLICY "friend_requests_insert_own"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

COMMENT ON POLICY "friend_requests_insert_own" ON public.friend_requests IS 
  'Users can send friend requests as the sender';

-- ============================================================
-- Fix friend_requests SELECT policy
-- ============================================================

-- Drop the block-aware policy
DROP POLICY IF EXISTS "friend_requests_select_with_block_check" ON public.friend_requests;
DROP POLICY IF EXISTS "friend_requests_select_own" ON public.friend_requests;

-- Create simple policy - user can see their own requests (sent or received)
CREATE POLICY "friend_requests_select_own"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

COMMENT ON POLICY "friend_requests_select_own" ON public.friend_requests IS 
  'Users can see friend requests they sent or received';

-- ============================================================
-- Log completion
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'friend_requests RLS policies fixed - blocking no longer affects friend requests';
END $$;
