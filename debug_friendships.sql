-- Diagnostic queries for friendships issue
-- Test User 1 should have 5 friends but only 1 is showing

-- Query 1: Check all friendships for test user 1
-- Replace 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' with the actual user ID if different
SELECT 
    f.id,
    f.user_id,
    f.friend_id,
    f.status,
    f.created_at,
    p.full_name as friend_name,
    p.email as friend_email
FROM friendships f
LEFT JOIN profiles p ON f.friend_id = p.id
WHERE f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
ORDER BY f.created_at DESC;

-- Query 2: Count friendships by status
SELECT 
    status,
    COUNT(*) as count
FROM friendships
WHERE user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
GROUP BY status;

-- Query 3: Check for bidirectional friendships
-- This shows if friendships exist in both directions
SELECT 
    f1.user_id as user1_id,
    f1.friend_id as user2_id,
    f1.status as user1_status,
    f2.status as user2_status,
    p1.full_name as user1_name,
    p2.full_name as user2_name,
    CASE 
        WHEN f2.id IS NULL THEN 'MISSING REVERSE'
        WHEN f1.status != f2.status THEN 'STATUS MISMATCH'
        ELSE 'OK'
    END as bidirectional_check
FROM friendships f1
LEFT JOIN friendships f2 ON f1.user_id = f2.friend_id AND f1.friend_id = f2.user_id
LEFT JOIN profiles p1 ON f1.user_id = p1.id
LEFT JOIN profiles p2 ON f1.friend_id = p2.id
WHERE f1.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
ORDER BY bidirectional_check DESC, f1.created_at DESC;

-- Query 4: Check friend requests for test user 1
SELECT 
    fr.id,
    fr.sender_id,
    fr.receiver_id,
    fr.status,
    fr.created_at,
    sender.full_name as sender_name,
    receiver.full_name as receiver_name,
    CASE 
        WHEN fr.sender_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' THEN 'SENT'
        WHEN fr.receiver_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' THEN 'RECEIVED'
    END as direction
FROM friend_requests fr
LEFT JOIN profiles sender ON fr.sender_id = sender.id
LEFT JOIN profiles receiver ON fr.receiver_id = receiver.id
WHERE fr.sender_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
   OR fr.receiver_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
ORDER BY fr.created_at DESC;

-- Query 5: Get current user info
SELECT id, full_name, email, created_at
FROM profiles
WHERE id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2';
