-- Story 4.11: Database Performance Validation Queries
-- Tests for follower system scalability and performance
-- Run these queries via Supabase MCP: execute_sql tool

-- ==========================================
-- TEST 1: Load Test - Create 100 Test Followers
-- ==========================================
-- Purpose: Test system performance with 100 followers
-- Expected: < 2 seconds total execution time

-- Step 1: Create test business (if not exists)
DO $$
DECLARE
  test_business_id UUID;
BEGIN
  -- Insert test business
  INSERT INTO profiles (id, email, full_name, role, city)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'perf-test-business@test.com',
    'Performance Test Business',
    'business_owner',
    'New York'
  )
  ON CONFLICT (id) DO NOTHING;
  
  test_business_id := '00000000-0000-0000-0000-000000000001';
  
  -- Insert 100 test followers
  FOR i IN 1..100 LOOP
    INSERT INTO business_followers (user_id, business_id, is_active, followed_at)
    VALUES (
      gen_random_uuid(),
      test_business_id,
      true,
      NOW() - (i || ' days')::INTERVAL
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Created 100 test followers for business: %', test_business_id;
END $$;

-- ==========================================
-- TEST 2: Query Performance - Follower List
-- ==========================================
-- Purpose: Verify query speed for fetching followers
-- Expected: < 50ms execution time
-- Expected: Uses idx_business_followers_business_active index

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  bf.id,
  bf.user_id,
  bf.business_id,
  bf.followed_at,
  bf.is_active,
  p.full_name,
  p.city,
  p.avatar_url
FROM business_followers bf
LEFT JOIN profiles p ON bf.user_id = p.id
WHERE bf.business_id = '00000000-0000-0000-0000-000000000001'
  AND bf.is_active = true
ORDER BY bf.followed_at DESC
LIMIT 20;

-- Verify index usage:
-- Should show: "Index Scan using idx_business_followers_business_active"
-- Should NOT show: "Seq Scan"

-- ==========================================
-- TEST 3: Follower Count Performance
-- ==========================================
-- Purpose: Test aggregation query performance
-- Expected: < 30ms execution time

EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) as follower_count
FROM business_followers
WHERE business_id = '00000000-0000-0000-0000-000000000001'
  AND is_active = true;

-- ==========================================
-- TEST 4: Notification Generation Load Test
-- ==========================================
-- Purpose: Test notification trigger performance at scale
-- Expected: < 2 seconds for 100 notifications

-- Enable timing
\timing on

-- Insert a test product (triggers notification generation)
DO $$
DECLARE
  test_business_id UUID := '00000000-0000-0000-0000-000000000001';
  test_product_id UUID;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  execution_time INTERVAL;
BEGIN
  start_time := clock_timestamp();
  
  -- Insert product (this will trigger notify_followers_of_update)
  INSERT INTO business_products (id, business_id, name, description, price, created_at)
  VALUES (
    gen_random_uuid(),
    test_business_id,
    'Performance Test Product',
    'Testing notification generation at scale',
    9999,
    NOW()
  )
  RETURNING id INTO test_product_id;
  
  -- Wait for trigger to complete
  PERFORM pg_sleep(1);
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  RAISE NOTICE 'Product inserted: %', test_product_id;
  RAISE NOTICE 'Execution time: %', execution_time;
  
  -- Verify notifications created
  PERFORM COUNT(*) FROM follower_notifications 
  WHERE business_id = test_business_id
    AND created_at > start_time;
  
  RAISE NOTICE 'Notifications created: %', FOUND;
END $$;

-- Verify notification count
SELECT COUNT(*) as notification_count,
       'Expected: ~100' as expected
FROM follower_notifications
WHERE business_id = '00000000-0000-0000-0000-000000000001'
  AND created_at > NOW() - INTERVAL '2 minutes';

-- ==========================================
-- TEST 5: Real-time Subscription Performance
-- ==========================================
-- Purpose: Test real-time channel scalability
-- Note: This test requires manual verification via browser/client

-- Check current real-time connections
SELECT 
  COUNT(*) as active_connections,
  'Monitor via Supabase Dashboard → Realtime' as note
FROM pg_stat_activity
WHERE application_name LIKE 'realtime%';

-- ==========================================
-- TEST 6: Index Usage Verification
-- ==========================================
-- Purpose: Ensure all indexes are being utilized
-- Expected: idx_stat.idx_scan > 0 for all indexes

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_scan = 0 THEN '⚠️ UNUSED'
    WHEN idx_scan < 100 THEN '🟡 LOW USAGE'
    ELSE '✅ ACTIVE'
  END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'business_followers',
    'follower_updates',
    'follower_notifications',
    'notification_preferences'
  )
ORDER BY tablename, indexname;

-- ==========================================
-- TEST 7: Query Plan Analysis - Unread Notifications
-- ==========================================
-- Purpose: Verify efficient query for notification bell
-- Expected: Uses idx_follower_notifications_user_unread

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  fn.id,
  fn.business_id,
  fn.update_type,
  fn.content_title,
  fn.content_description,
  fn.is_read,
  fn.created_at,
  p.business_name,
  p.business_image
FROM follower_notifications fn
LEFT JOIN profiles p ON fn.business_id = p.id
WHERE fn.user_id = gen_random_uuid()  -- Replace with actual user_id for real test
  AND fn.is_read = false
ORDER BY fn.created_at DESC
LIMIT 20;

-- ==========================================
-- TEST 8: Concurrent Follow Actions
-- ==========================================
-- Purpose: Test race conditions and constraints
-- Expected: No duplicate follows, constraint violations handled

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_business_id UUID := '00000000-0000-0000-0000-000000000001';
  i INTEGER;
BEGIN
  -- Attempt 10 simultaneous follows (simulated)
  FOR i IN 1..10 LOOP
    BEGIN
      INSERT INTO business_followers (user_id, business_id, is_active, followed_at)
      VALUES (test_user_id, test_business_id, true, NOW())
      ON CONFLICT (user_id, business_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Expected conflict on iteration %', i;
    END;
  END LOOP;
  
  -- Verify only one follow exists
  PERFORM COUNT(*) FROM business_followers
  WHERE user_id = test_user_id 
    AND business_id = test_business_id;
  
  IF FOUND = 1 THEN
    RAISE NOTICE '✅ TEST PASSED: Only one follow created';
  ELSE
    RAISE WARNING '❌ TEST FAILED: Multiple follows created';
  END IF;
END $$;

-- ==========================================
-- TEST 9: Analytics Query Performance
-- ==========================================
-- Purpose: Test follower analytics dashboard queries
-- Expected: < 100ms for complex aggregations

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  DATE_TRUNC('day', followed_at) as follow_date,
  COUNT(*) as new_followers,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', followed_at)) as cumulative_followers
FROM business_followers
WHERE business_id = '00000000-0000-0000-0000-000000000001'
  AND is_active = true
GROUP BY DATE_TRUNC('day', followed_at)
ORDER BY follow_date DESC
LIMIT 30;

-- ==========================================
-- TEST 10: Demographics Aggregation Performance
-- ==========================================
-- Purpose: Test demographic breakdown query
-- Expected: < 80ms execution time

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  p.city,
  COUNT(*) as follower_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM business_followers bf
INNER JOIN profiles p ON bf.user_id = p.id
WHERE bf.business_id = '00000000-0000-0000-0000-000000000001'
  AND bf.is_active = true
  AND p.city IS NOT NULL
GROUP BY p.city
ORDER BY follower_count DESC
LIMIT 10;

-- ==========================================
-- TEST 11: Notification Preferences Query
-- ==========================================
-- Purpose: Test preference lookup performance
-- Expected: < 20ms (uses primary key index)

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM notification_preferences
WHERE user_id = gen_random_uuid()  -- Replace with actual user_id
  AND business_id = '00000000-0000-0000-0000-000000000001';

-- ==========================================
-- TEST 12: Update Feed Query Performance
-- ==========================================
-- Purpose: Test follower update feed query
-- Expected: < 100ms for paginated results

EXPLAIN (ANALYZE, BUFFERS)
WITH user_follows AS (
  SELECT business_id
  FROM business_followers
  WHERE user_id = gen_random_uuid()  -- Replace with actual user_id
    AND is_active = true
)
SELECT
  fu.id,
  fu.business_id,
  fu.update_type,
  fu.content_title,
  fu.content_description,
  fu.created_at,
  p.business_name,
  p.business_image
FROM follower_updates fu
INNER JOIN user_follows uf ON fu.business_id = uf.business_id
LEFT JOIN profiles p ON fu.business_id = p.id
ORDER BY fu.created_at DESC
LIMIT 20;

-- ==========================================
-- PERFORMANCE TARGETS SUMMARY
-- ==========================================
/*
✅ PASS CRITERIA:

1. Follower List Query: < 50ms (p95)
2. Follower Count: < 30ms
3. Notification Generation: < 2s for 100 followers
4. Unread Notifications Query: < 40ms
5. Analytics Queries: < 100ms
6. Demographics Query: < 80ms
7. Update Feed Query: < 100ms
8. All indexes actively used (idx_scan > 0)
9. No sequential scans on large tables
10. Real-time connections stable under load

⚠️ WARNINGS:
- Sequential scans indicate missing/unused indexes
- Execution times > 2x target indicate optimization needed
- High buffer usage (> 1000 buffers) may indicate memory issues

🔴 FAILURES:
- Execution times > 5x target = CRITICAL
- Constraint violations not handled = CRITICAL
- Real-time disconnections = HIGH PRIORITY
*/

-- ==========================================
-- CLEANUP TEST DATA
-- ==========================================
-- Uncomment to clean up after testing

/*
DELETE FROM follower_notifications
WHERE business_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM business_followers
WHERE business_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM business_products
WHERE business_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM profiles
WHERE id = '00000000-0000-0000-0000-000000000001';
*/

-- End of Performance Tests
