-- Diagnostic SQL to debug friend search issues
-- Run this in your Supabase SQL Editor to test the search functionality

-- 1. Check the profiles table structure
SELECT 'Profiles table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check all users in profiles table
SELECT 'All users in profiles:' as info;
SELECT id, email, full_name, city, is_online, last_active
FROM public.profiles
ORDER BY created_at DESC;

-- 3. Check test users specifically
SELECT 'Test users (gmail.com):' as info;
SELECT id, email, full_name, city, is_online, last_active
FROM public.profiles
WHERE email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com');

-- 4. Test the search query that friendService.searchUsers() is trying to execute
-- This simulates searching for "Test User 2" by a user with id 'test-current-user-id'
SELECT 'Search test for "Test User 2":' as info;
SELECT id, email, full_name, city, is_online, last_active
FROM public.profiles
WHERE id != (SELECT id FROM public.profiles WHERE email = 'testuser1@gmail.com' LIMIT 1)
  AND (full_name ILIKE '%Test User 2%' OR email ILIKE '%Test User 2%')
LIMIT 10;

-- 5. Test search for "testuser2@gmail.com"
SELECT 'Search test for "testuser2@gmail.com":' as info;
SELECT id, email, full_name, city, is_online, last_active
FROM public.profiles
WHERE id != (SELECT id FROM public.profiles WHERE email = 'testuser1@gmail.com' LIMIT 1)
  AND (full_name ILIKE '%testuser2@gmail.com%' OR email ILIKE '%testuser2@gmail.com%')
LIMIT 10;

-- 6. Test simple search without exclusion
SELECT 'Simple search for "Test User":' as info;
SELECT id, email, full_name, city, is_online, last_active
FROM public.profiles
WHERE full_name ILIKE '%Test User%'
LIMIT 10;

-- 7. Check auth.users table for comparison
SELECT 'Users in auth.users:' as info;
SELECT id, email, created_at
FROM auth.users
WHERE email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
ORDER BY email;

-- 8. Check if user_id column exists (this might be the issue)
SELECT 'Check if user_id column exists:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
) as user_id_column_exists;

SELECT '🔍 Debug analysis complete!' as final_status;