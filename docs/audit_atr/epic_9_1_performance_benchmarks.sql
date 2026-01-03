-- Epic 9.1 Performance Benchmarks
-- Run these queries in Supabase Studio SQL Editor
-- Replace 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' with your actual user ID

-- ============================================================================
-- BENCHMARK 1: Friend List Query (Target: < 30ms)
-- ============================================================================

EXPLAIN ANALYZE
SELECT 
  f.id,
  p.id as friend_id,
  p.full_name,
  p.avatar_url,
  p.is_online,
  p.last_active
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
  AND f.status = 'active'
ORDER BY f.created_at DESC;

-- Expected: Execution time < 30ms
-- Check for: Index Scan (not Seq Scan)

-- ============================================================================
-- BENCHMARK 2: Friend Search Query (Target: < 100ms)
-- ============================================================================

EXPLAIN ANALYZE
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.is_online
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
  AND f.status = 'active'
  AND (
    p.full_name ILIKE '%test%'
  );

-- Expected: Execution time < 100ms
-- Check for: Index usage on friendships

-- ============================================================================
-- BENCHMARK 3: Blocking Check (Target: < 10ms)
-- ============================================================================

EXPLAIN ANALYZE
SELECT EXISTS (
  SELECT 1 FROM blocked_users
  WHERE (
    (blocker_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' AND blocked_id = 'other-user-id')
    OR
    (blocker_id = 'other-user-id' AND blocked_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2')
  )
) as is_blocked;

-- Expected: Execution time < 10ms
-- Check for: Index-only scan

-- ============================================================================
-- BENCHMARK 4: Mutual Friends Query (Target: < 50ms)
-- ============================================================================

EXPLAIN ANALYZE
SELECT * FROM get_mutual_friends(
  'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2',
  'other-user-id'
);

-- Expected: Execution time < 50ms

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Monitor presence heartbeat
SELECT 
  id,
  full_name,
  email,
  is_online,
  last_active,
  NOW() - last_active as seconds_since_update,
  privacy_settings->>'online_status_visibility' as visibility
FROM profiles
WHERE email = 'testuser1@gmail.com';

-- Check recent notifications
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  p.full_name as sender_name,
  NOW() - n.created_at as age
FROM notifications n
LEFT JOIN profiles p ON p.id = n.sender_id
WHERE n.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
ORDER BY n.created_at DESC
LIMIT 10;

-- Check friendships (bidirectional)
SELECT 
  f.id,
  f.user_id,
  f.friend_id,
  f.status,
  f.created_at,
  p.full_name as friend_name,
  p.is_online
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
  AND f.status = 'active'
ORDER BY f.created_at DESC;

-- Check blocked users
SELECT 
  bu.id,
  bu.blocker_id,
  bu.blocked_id,
  bu.reason,
  bu.created_at,
  p.full_name as blocked_user
FROM blocked_users bu
JOIN profiles p ON p.id = bu.blocked_id
WHERE bu.blocker_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2';

-- ============================================================================
-- INDEX VERIFICATION
-- ============================================================================

-- Check if all required indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('friendships', 'friend_requests', 'blocked_users', 'profiles', 'notifications')
ORDER BY tablename, indexname;

-- ============================================================================
-- RESULTS TEMPLATE
-- ============================================================================

/*
BENCHMARK RESULTS:

1. Friend List Query:
   - Execution Time: _____ ms
   - Status: [ ] PASS (< 30ms) [ ] FAIL
   - Notes: _______________

2. Friend Search Query:
   - Execution Time: _____ ms
   - Status: [ ] PASS (< 100ms) [ ] FAIL
   - Notes: _______________

3. Blocking Check:
   - Execution Time: _____ ms
   - Status: [ ] PASS (< 10ms) [ ] FAIL
   - Notes: _______________

4. Mutual Friends Query:
   - Execution Time: _____ ms
   - Status: [ ] PASS (< 50ms) [ ] FAIL
   - Notes: _______________

OVERALL: [ ] ALL PASS [ ] SOME FAIL
*/
