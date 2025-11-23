-- Check phone hashes in database
SELECT 
    full_name, 
    phone, 
    phone_hash 
FROM profiles 
WHERE phone IS NOT NULL 
LIMIT 10;

-- Check if there are any matches manually
-- Replace 'YOUR_HASH_FROM_LOGS' with a hash from the logs if you have one
-- SELECT * FROM profiles WHERE phone_hash = 'YOUR_HASH_FROM_LOGS';
