-- Quick check to see if any friend requests were created
SELECT 'Friend Requests Count:' as info, COUNT(*) as total_requests FROM friend_requests;

-- Check if any requests exist at all
SELECT * FROM friend_requests ORDER BY created_at DESC LIMIT 5;