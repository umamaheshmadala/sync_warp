-- DEBUG FRIEND SYSTEM STATE
-- Run this to check what's happening in the database

-- 1. Check friend_connections table
SELECT 'FRIEND CONNECTIONS TABLE:' as info;
SELECT 
    id,
    user_a_id,
    user_b_id, 
    status,
    requester_id,
    created_at
FROM public.friend_connections
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check profiles table for online status
SELECT 'PROFILES TABLE (Online Status):' as info;
SELECT 
    id,
    full_name,
    is_online,
    last_active,
    created_at
FROM public.profiles
ORDER BY last_active DESC
LIMIT 10;

-- 3. Test user_friends view
SELECT 'USER FRIENDS VIEW (for first user):' as info;
SELECT 
    id,
    friend_id,
    created_at
FROM public.user_friends
LIMIT 10;

-- 4. Test pending_friend_requests view
SELECT 'PENDING FRIEND REQUESTS VIEW:' as info;
SELECT 
    id,
    requester_id,
    requester_name,
    requester_avatar,
    created_at
FROM public.pending_friend_requests
LIMIT 10;

-- 5. Check auth.users table
SELECT 'AUTH USERS:' as info;
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY last_sign_in_at DESC
LIMIT 10;

-- 6. Check if there are any accepted friendships
SELECT 'ACCEPTED FRIENDSHIPS COUNT:' as info;
SELECT status, COUNT(*) as count
FROM public.friend_connections
GROUP BY status;

-- 7. Check for any RLS issues by testing direct queries
SELECT 'DIRECT QUERY TEST:' as info;
SELECT COUNT(*) as total_connections FROM public.friend_connections;
SELECT COUNT(*) as total_profiles FROM public.profiles;