-- Check if users are actually marked as online
-- This will show the is_online status for all test users

SELECT 
    full_name,
    email,
    is_online,
    last_active,
    CASE 
        WHEN is_online THEN '✅ ONLINE'
        ELSE '❌ OFFLINE'
    END as status
FROM profiles
WHERE email LIKE '%test%'
ORDER BY full_name;
