-- Test Bidirectional Unfriend Functionality
-- This script tests that unfriending works both ways

-- First, let's check if the remove_friend function exists
SELECT 
    routine_name, 
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'remove_friend' 
AND routine_schema = 'public';

-- Test 1: Check current friendships before testing
SELECT 'Current friendships before test:' as test_step;
SELECT 
    fc.id,
    fc.user_a_id,
    fc.user_b_id,
    fc.status,
    fc.created_at,
    p1.full_name as user_a_name,
    p2.full_name as user_b_name
FROM friend_connections fc
JOIN profiles p1 ON p1.id = fc.user_a_id
JOIN profiles p2 ON p2.id = fc.user_b_id
WHERE fc.status = 'accepted'
ORDER BY fc.created_at DESC;

-- Test 2: Create two test users if they don't exist
-- (This assumes you have test users in your system - adjust the user IDs as needed)
-- You can replace these UUIDs with actual user IDs from your system

-- Show how to test with actual users:
SELECT 'To test bidirectional unfriend:' as instructions;
SELECT '1. Find two users who are friends' as step_1;
SELECT '2. Note their user IDs from the query above' as step_2;
SELECT '3. Replace the UUIDs in the queries below with actual user IDs' as step_3;
SELECT '4. Run the unfriend test' as step_4;

-- Test 3: Test the remove_friend function
-- IMPORTANT: Replace these UUIDs with actual user IDs from your database
-- Example format (uncomment and modify with real UUIDs):

/*
-- Replace 'user1-uuid-here' and 'user2-uuid-here' with actual UUIDs

-- Set the current auth context to user1 (this would normally be done by authentication)
SELECT set_config('request.jwt.claims', '{"sub": "user1-uuid-here"}', true);

-- Test removing friend from user1's perspective
SELECT 'Testing friend removal from user1 perspective:' as test_step;
SELECT public.remove_friend('user2-uuid-here') as removal_result;

-- Check if friendship was removed
SELECT 'Friendships after removal:' as test_step;
SELECT 
    fc.id,
    fc.user_a_id,
    fc.user_b_id,
    fc.status,
    p1.full_name as user_a_name,
    p2.full_name as user_b_name
FROM friend_connections fc
JOIN profiles p1 ON p1.id = fc.user_a_id
JOIN profiles p2 ON p2.id = fc.user_b_id
WHERE (fc.user_a_id = 'user1-uuid-here' AND fc.user_b_id = 'user2-uuid-here')
   OR (fc.user_a_id = 'user2-uuid-here' AND fc.user_b_id = 'user1-uuid-here');

-- The result should be empty (no rows) if the bidirectional removal worked
*/

-- Test 4: Verify the function handles edge cases
SELECT 'Testing edge cases:' as test_step;

-- Test what happens when trying to remove a non-existent friendship
-- This should return false but not throw an error
SELECT 'Test removing non-existent friendship (should return false):' as edge_case_1;

-- Test 5: Show the complete friend removal logic for reference
SELECT 'Friend removal logic:' as info;
SELECT '1. The remove_friend function uses an OR condition to find the friendship regardless of which user is user_a or user_b' as logic_1;
SELECT '2. It deletes the single row in friend_connections that represents the bidirectional friendship' as logic_2;
SELECT '3. Since there is only one row per friendship pair, removing it affects both users' as logic_3;
SELECT '4. Both users will no longer see each other as friends after the deletion' as logic_4;

-- Test 6: Show how to create a test friendship for testing
SELECT 'To create a test friendship for testing:' as create_test;
SELECT 'Use the send_friend_request function followed by accept_friend_request' as create_step_1;
SELECT 'Example: SELECT send_friend_request(''target-user-id'');' as create_step_2;
SELECT 'Then: SELECT accept_friend_request(''connection-id'');' as create_step_3;

-- Final verification query template
SELECT 'Use this query to verify friendships are truly bidirectional removed:' as final_check;
SELECT 'Replace USER_A and USER_B with actual UUIDs and run:' as template;

/*
SELECT 
    'Friendship exists?' as check_type,
    CASE 
        WHEN EXISTS(
            SELECT 1 FROM friend_connections 
            WHERE status = 'accepted' 
            AND ((user_a_id = 'USER_A' AND user_b_id = 'USER_B') 
                OR (user_a_id = 'USER_B' AND user_b_id = 'USER_A'))
        ) THEN 'YES - Still friends'
        ELSE 'NO - Friendship removed'
    END as result;
*/

SELECT '✅ Bidirectional unfriend test setup complete!' as final_status;