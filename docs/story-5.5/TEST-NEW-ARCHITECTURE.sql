-- =====================================================
-- Test New Sharing Architecture
-- =====================================================

-- Step 1: Create a test coupon collection for User 1
-- (Replace with actual user_id and coupon_id)
DO $$
DECLARE
  v_user1_id UUID;
  v_user2_id UUID;
  v_coupon_id UUID;
  v_collection_id UUID;
BEGIN
  -- Get two users
  SELECT id INTO v_user1_id FROM auth.users LIMIT 1 OFFSET 0;
  SELECT id INTO v_user2_id FROM auth.users LIMIT 1 OFFSET 1;
  
  -- Get a coupon
  SELECT id INTO v_coupon_id FROM business_coupons WHERE status = 'active' LIMIT 1;
  
  RAISE NOTICE 'User 1: %', v_user1_id;
  RAISE NOTICE 'User 2: %', v_user2_id;
  RAISE NOTICE 'Coupon: %', v_coupon_id;
  
  -- Create collection for User 1 (simulate collecting coupon)
  INSERT INTO user_coupon_collections (
    user_id,
    coupon_id,
    acquisition_method,
    is_shareable,
    has_been_shared,
    collected_at,
    expires_at,
    status
  ) VALUES (
    v_user1_id,
    v_coupon_id,
    'collected',
    TRUE,
    FALSE,
    NOW(),
    NOW() + INTERVAL '30 days',
    'active'
  )
  RETURNING id INTO v_collection_id;
  
  RAISE NOTICE 'Collection created: %', v_collection_id;
  RAISE NOTICE '---';
  RAISE NOTICE 'Now run the queries below with these IDs:';
  RAISE NOTICE 'User 1: %', v_user1_id;
  RAISE NOTICE 'User 2: %', v_user2_id;
  RAISE NOTICE 'Coupon: %', v_coupon_id;
  RAISE NOTICE 'Collection: %', v_collection_id;
END $$;

-- =====================================================
-- After running above, use the IDs in queries below
-- =====================================================

-- Test 1: Get shareable coupons for User 1
-- SELECT * FROM get_shareable_coupons('USER1-UUID-HERE');

-- Test 2: Share coupon from User 1 to User 2
-- SELECT * FROM log_coupon_share(
--   'USER1-UUID-HERE',
--   'USER2-UUID-HERE', 
--   'COUPON-UUID-HERE',
--   'COLLECTION-UUID-HERE',
--   false
-- );

-- Test 3: Check User 1's collection (should be marked as shared)
-- SELECT 
--   id,
--   status,
--   has_been_shared,
--   shared_to_user_id,
--   shared_at
-- FROM user_coupon_collections 
-- WHERE id = 'COLLECTION-UUID-HERE';

-- Test 4: Check User 2's collection (should have new entry)
-- SELECT 
--   id,
--   user_id,
--   coupon_id,
--   acquisition_method,
--   original_owner_id,
--   status
-- FROM user_coupon_collections 
-- WHERE user_id = 'USER2-UUID-HERE'
--   AND coupon_id = 'COUPON-UUID-HERE';

-- Test 5: Check lifecycle events
-- SELECT 
--   event_type,
--   user_id,
--   related_user_id,
--   event_timestamp
-- FROM coupon_lifecycle_events
-- WHERE coupon_id = 'COUPON-UUID-HERE'
-- ORDER BY event_timestamp DESC;

-- Test 6: Try to share same collection again (should fail)
-- SELECT * FROM log_coupon_share(
--   'USER1-UUID-HERE',
--   'USER3-UUID-HERE',  -- Different user
--   'COUPON-UUID-HERE',
--   'COLLECTION-UUID-HERE',  -- Same collection
--   false
-- );
-- Expected: ERROR - Invalid collection: already shared
