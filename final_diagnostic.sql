-- Final diagnostic: Check the complete data flow
-- 1. Check what phone_hash values exist in profiles
SELECT 
    full_name,
    phone,
    right(regexp_replace(phone, '\D', '', 'g'), 10) as last_10_digits,
    phone_hash,
    length(phone_hash) as hash_length
FROM profiles 
WHERE phone IS NOT NULL 
ORDER BY full_name
LIMIT 10;

-- 2. Check what hashes are in contact_hashes for test users
SELECT 
    p.full_name,
    COUNT(ch.phone_hash) as num_hashes,
    (array_agg(ch.phone_hash ORDER BY ch.phone_hash))[1:3] as sample_hashes
FROM profiles p
LEFT JOIN contact_hashes ch ON ch.user_id = p.id
WHERE p.email LIKE '%test%'
GROUP BY p.full_name, p.id
ORDER BY p.full_name;

-- 3. Manually test if there SHOULD be a match
-- Get a hash from Test User 1's contacts and see if it matches any profile
WITH test_user_hashes AS (
    SELECT ch.phone_hash
    FROM contact_hashes ch
    JOIN profiles p ON p.id = ch.user_id
    WHERE p.email = 'testuser1@gmail.com'
    LIMIT 5
)
SELECT 
    p.full_name,
    p.phone,
    p.phone_hash,
    tuh.phone_hash as test_user_has_this_hash,
    CASE WHEN p.phone_hash = tuh.phone_hash THEN '✅ MATCH' ELSE '❌ NO MATCH' END as match_status
FROM profiles p
CROSS JOIN test_user_hashes tuh
WHERE p.phone_hash IS NOT NULL
ORDER BY match_status DESC, p.full_name
LIMIT 20;

-- 4. Check if match_contacts function exists and its signature
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'match_contacts';
