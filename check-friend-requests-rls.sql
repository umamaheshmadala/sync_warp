-- Check and fix RLS policies on friend_requests table
-- This might be the root cause of "Failed to send friend request"

-- 1. Check if RLS is enabled on friend_requests
SELECT 'RLS Status Check:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrlspolicy as has_policies
FROM pg_tables 
WHERE tablename = 'friend_requests';

-- 2. Check current policies on friend_requests
SELECT 'Current Policies on friend_requests:' as info;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'friend_requests';

-- 3. Check if there are any blocking policies
-- If friend_requests has RLS enabled but no INSERT policies, that would block requests

-- 4. Fix by adding proper policies for friend_requests
-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can only see their own requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can only create requests to others" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can view friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_requests;

-- Create permissive policies that allow friend request functionality
CREATE POLICY "Anyone can create friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view requests involving them" ON public.friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update requests involving them" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- 5. Also check friendships table policies
SELECT 'Friendships table policies:' as info;
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'friendships';

-- Add missing policies for friendships if needed
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;

CREATE POLICY "Anyone can view friendships" ON public.friendships
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (true);

-- 6. Verify the fix worked
SELECT 'Verification - Updated Policies:' as info;
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('friend_requests', 'friendships')
ORDER BY tablename, policyname;

SELECT '✅ RLS policies updated for friend system!' as status;