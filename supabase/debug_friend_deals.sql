-- Check friendship status for Test User 1
SELECT
    f.id,
    f.status,
    f.user_id,
    f.friend_id,
    p1.full_name as user_name,
    p2.full_name as friend_name
FROM friendships f
LEFT JOIN profiles p1 ON p1.id = f.user_id
LEFT JOIN profiles p2 ON p2.id = f.friend_id
WHERE (f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' OR f.friend_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2');

-- Check status of the 4 test offers
SELECT
    id,
    title,
    is_active,
    status,
    valid_until,
    (valid_until IS NULL OR valid_until > NOW()) as is_valid
FROM offers
WHERE business_id = 'ac269130-cfb0-4c36-b5ad-34931cd19b50';

-- Test the RPC function directly for Test User 1
-- This simulates what the frontend is calling
SELECT * FROM get_deals_liked_by_friends();
