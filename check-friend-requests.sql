-- Check Friend Requests Status
-- Run this in Supabase SQL Editor to verify friend requests were created

-- 1. Check all friend requests in the system
SELECT 'All Friend Requests:' as info;
SELECT 
    fr.id,
    fr.status,
    fr.created_at,
    requester.email as requester_email,
    requester.full_name as requester_name,
    receiver.email as receiver_email, 
    receiver.full_name as receiver_name
FROM friend_requests fr
JOIN profiles requester ON fr.requester_id = requester.id
JOIN profiles receiver ON fr.receiver_id = receiver.id
ORDER BY fr.created_at DESC;

-- 2. Check pending requests specifically
SELECT 'Pending Friend Requests:' as info;
SELECT 
    fr.id,
    fr.created_at,
    requester.full_name as from_user,
    receiver.full_name as to_user
FROM friend_requests fr
JOIN profiles requester ON fr.requester_id = requester.id
JOIN profiles receiver ON fr.receiver_id = receiver.id
WHERE fr.status = 'pending'
ORDER BY fr.created_at DESC;

-- 3. Check requests for testuser2@gmail.com specifically
SELECT 'Requests for testuser2@gmail.com:' as info;
SELECT 
    fr.id,
    fr.status,
    fr.created_at,
    requester.full_name as from_user
FROM friend_requests fr
JOIN profiles requester ON fr.requester_id = requester.id
JOIN profiles receiver ON fr.receiver_id = receiver.id
WHERE receiver.email = 'testuser2@gmail.com'
ORDER BY fr.created_at DESC;

-- 4. Check existing friendships
SELECT 'Existing Friendships:' as info;
SELECT 
    f.id,
    f.created_at,
    u1.full_name as user1,
    u2.full_name as user2
FROM friendships f
JOIN profiles u1 ON f.user1_id = u1.id
JOIN profiles u2 ON f.user2_id = u2.id
ORDER BY f.created_at DESC;

SELECT '🔍 Friend request diagnostic complete!' as final_status;