
-- DATABASE VERIFICATION QUERIES
-- Run these after each test scenario

-- 1. Check all friend requests
SELECT 'FRIEND REQUESTS:' as check_type;
SELECT 
    fr.status,
    requester.full_name as from_user,
    receiver.full_name as to_user,
    fr.created_at
FROM friend_requests fr
JOIN profiles requester ON fr.requester_id = requester.id
JOIN profiles receiver ON fr.receiver_id = receiver.id
ORDER BY fr.created_at DESC;

-- 2. Check all friendships  
SELECT 'FRIENDSHIPS:' as check_type;
SELECT 
    u1.full_name as user1,
    u2.full_name as user2,
    f.created_at
FROM friendships f
JOIN profiles u1 ON f.user1_id = u1.id
JOIN profiles u2 ON f.user2_id = u2.id
ORDER BY f.created_at DESC;

-- 3. Check activity log
SELECT 'ACTIVITIES:' as check_type;
SELECT 
    p.full_name as user_name,
    fa.type,
    fa.message,
    fa.created_at
FROM friend_activities fa
JOIN profiles p ON fa.user_id = p.id
ORDER BY fa.created_at DESC
LIMIT 10;

-- 4. Summary counts
SELECT 'SUMMARY:' as check_type;
SELECT 
    (SELECT COUNT(*) FROM friend_requests WHERE status = 'pending') as pending_requests,
    (SELECT COUNT(*) FROM friend_requests WHERE status = 'accepted') as accepted_requests,
    (SELECT COUNT(*) FROM friendships) as total_friendships,
    (SELECT COUNT(*) FROM friend_activities) as total_activities;
