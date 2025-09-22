-- Diagnostic SQL to check your current database schema
-- Run this first to see what already exists

-- Check what tables exist
SELECT 'Existing tables:' as info;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'friendships', 'friend_requests', 'friend_activities')
ORDER BY table_name;

-- Check profiles table structure
SELECT 'Profiles table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check friendships table structure (if it exists)
SELECT 'Friendships table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'friendships'
ORDER BY ordinal_position;

-- Check friend_requests table structure (if it exists)
SELECT 'Friend_requests table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'friend_requests'
ORDER BY ordinal_position;

-- Check friend_activities table structure (if it exists)
SELECT 'Friend_activities table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'friend_activities'
ORDER BY ordinal_position;

-- Check your test users
SELECT 'Test users in auth.users:' as info;
SELECT id, email, created_at
FROM auth.users 
WHERE email LIKE '%testuser%@gmail.com'
ORDER BY email;

-- Check existing profiles for test users
SELECT 'Test user profiles:' as info;
SELECT * FROM public.profiles 
WHERE email LIKE '%testuser%@gmail.com'
ORDER BY email;