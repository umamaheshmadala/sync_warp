-- Verify the complete friend request flow
-- Run this after accepting/rejecting requests

-- 1. Show all friend requests with user names
SELECT 'Current Friend Requests:' as info;
SELECT 
    fr.id,
    fr.status,
    fr.created_at,
    requester.full_name as from_user,
    receiver.full_name as to_user
FROM friend_requests fr
JOIN profiles requester ON fr.requester_id = requester.id
JOIN profiles receiver ON fr.receiver_id = receiver.id
ORDER BY fr.created_at DESC;

-- 2. Show all friendships
SELECT 'Current Friendships:' as info;
SELECT 
    f.id,
    f.created_at,
    u1.full_name as user1_name,
    u2.full_name as user2_name
FROM friendships f
JOIN profiles u1 ON f.user1_id = u1.id
JOIN profiles u2 ON f.user2_id = u2.id
ORDER BY f.created_at DESC;

-- 3. Count statistics
SELECT 'Statistics:' as info;
SELECT 
    (SELECT COUNT(*) FROM friend_requests WHERE status = 'pending') as pending_requests,
    (SELECT COUNT(*) FROM friend_requests WHERE status = 'accepted') as accepted_requests,
    (SELECT COUNT(*) FROM friend_requests WHERE status = 'rejected') as rejected_requests,
    (SELECT COUNT(*) FROM friendships) as total_friendships;

SELECT '📊 Friend flow verification complete!' as final_status;