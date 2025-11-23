-- Check contact hashes and sync status
SELECT 
    p.full_name, 
    p.email, 
    p.phone,
    COUNT(ch.phone_hash) as hash_count,
    MAX(ch.updated_at) as last_sync
FROM profiles p 
LEFT JOIN contact_hashes ch ON ch.user_id = p.id 
WHERE p.full_name LIKE '%Test%' OR p.email LIKE '%test%'
GROUP BY p.id, p.full_name, p.email, p.phone;

-- Check if friendships already exist (which would prevent matching)
SELECT 
    p1.full_name as user1,
    p2.full_name as user2,
    f.status
FROM friendships f
JOIN profiles p1 ON f.user_id = p1.id
JOIN profiles p2 ON f.friend_id = p2.id
WHERE p1.full_name LIKE '%Test%' OR p2.full_name LIKE '%Test%';
