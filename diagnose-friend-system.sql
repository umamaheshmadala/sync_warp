-- DIAGNOSTIC SCRIPT for Friend System Issues
-- Run this to identify the exact problems

-- 1. Check if tables exist and their structure
SELECT 'TABLES CHECK:' as info;

SELECT 'friend_requests table:' as table_name, count(*) as row_count FROM public.friend_requests;
SELECT 'friendships table:' as table_name, count(*) as row_count FROM public.friendships;
SELECT 'friend_activities table:' as table_name, count(*) as row_count FROM public.friend_activities;
SELECT 'profiles table:' as table_name, count(*) as row_count FROM public.profiles;

-- 2. Check if the accept_friend_request_safe function exists
SELECT 'FUNCTIONS CHECK:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%accept_friend%';

-- 3. Check current RLS policies
SELECT 'RLS POLICIES CHECK:' as info;
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('friend_requests', 'friendships', 'friend_activities');

-- 4. Check for any active constraints that might cause issues
SELECT 'CONSTRAINTS CHECK:' as info;
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('friend_requests', 'friendships', 'friend_activities')
ORDER BY tc.table_name, tc.constraint_name;

-- 5. Check if RLS is enabled on tables
SELECT 'RLS STATUS:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrlspolicy
FROM pg_tables 
WHERE tablename IN ('friend_requests', 'friendships', 'friend_activities', 'profiles');

-- 6. Try a simple INSERT test to see what specific error occurs
-- (This will likely fail but show us the exact error)
SELECT 'INSERT TEST (will probably fail):' as info;

-- Insert a dummy friend request to test permissions
-- Replace these UUIDs with actual user IDs from your profiles table
-- This is just to see what error we get
DO $$
DECLARE
    test_user1 uuid;
    test_user2 uuid;
BEGIN
    -- Get two actual user IDs
    SELECT id INTO test_user1 FROM public.profiles LIMIT 1;
    SELECT id INTO test_user2 FROM public.profiles WHERE id != test_user1 LIMIT 1;
    
    IF test_user1 IS NOT NULL AND test_user2 IS NOT NULL THEN
        BEGIN
            INSERT INTO public.friend_requests (requester_id, receiver_id, status)
            VALUES (test_user1, test_user2, 'pending');
            
            RAISE NOTICE 'SUCCESS: Test friend request created';
            
            -- Clean up the test
            DELETE FROM public.friend_requests 
            WHERE requester_id = test_user1 AND receiver_id = test_user2;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'ERROR: Not enough users in profiles table to test';
    END IF;
END $$;