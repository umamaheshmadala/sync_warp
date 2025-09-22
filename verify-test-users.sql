-- Simple verification of test users
-- Run this to confirm your test users exist

-- Check if test users exist in auth.users
SELECT 'Test users in auth.users:' as check_type, email, id, created_at
FROM auth.users 
WHERE email IN ('testuser1@gmail.com', 'testuser2@gmail.com', 'testuser3@gmail.com')
ORDER BY email;

-- If no results above, check all users to see what exists
SELECT 'All users in auth.users:' as check_type, email, created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;