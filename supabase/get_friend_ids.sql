-- Quick query to get friend IDs for user eed7a6f3-f531-4621-a118-756cd5d694c4
SELECT 
    p.id as friend_id,
    p.email,
    p.full_name,
    f.status
FROM friendships f
INNER JOIN profiles p ON (p.id = f.friend_id OR p.id = f.user_id)
WHERE (f.user_id = 'eed7a6f3-f531-4621-a118-756cd5d694c4' OR f.friend_id = 'eed7a6f3-f531-4621-a118-756cd5d694c4')
  AND p.id != 'eed7a6f3-f531-4621-a118-756cd5d694c4'
  AND f.status = 'active'
ORDER BY p.created_at
LIMIT 10;
