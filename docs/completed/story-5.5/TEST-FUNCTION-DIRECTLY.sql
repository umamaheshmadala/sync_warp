-- =====================================================
-- Test log_coupon_share Function Directly
-- =====================================================

-- Step 1: Get test data
SELECT 
  'User 1 (Sender)' as role,
  id as user_id,
  email
FROM auth.users 
ORDER BY created_at 
LIMIT 1;

SELECT 
  'User 2 (Receiver)' as role,
  id as user_id,
  email
FROM auth.users 
ORDER BY created_at 
LIMIT 1 OFFSET 1;

SELECT 
  'Shareable Collection' as type,
  ucc.id as collection_id,
  ucc.coupon_id,
  bc.title,
  ucc.has_been_shared
FROM user_coupon_collections ucc
JOIN business_coupons bc ON bc.id = ucc.coupon_id
WHERE ucc.is_shareable = TRUE
  AND ucc.has_been_shared = FALSE
  AND ucc.status = 'active'
LIMIT 1;

-- Step 2: Test the function with real data
-- Copy the IDs from above and paste them below, then uncomment and run:

/*
SELECT log_coupon_share(
  'PASTE-SENDER-USER-ID-HERE',      -- User 1 ID from above
  'PASTE-RECEIVER-USER-ID-HERE',    -- User 2 ID from above
  'PASTE-COUPON-ID-HERE',           -- Coupon ID from collection above
  'PASTE-COLLECTION-ID-HERE',       -- Collection ID from above
  false                              -- is_driver
);
*/

-- Step 3: Verify it worked
/*
SELECT 
  'Sender Collection' as check_name,
  status,
  has_been_shared,
  shared_to_user_id
FROM user_coupon_collections
WHERE id = 'PASTE-COLLECTION-ID-HERE';

SELECT 
  'Receiver Collection' as check_name,
  id,
  acquisition_method,
  original_owner_id,
  status
FROM user_coupon_collections
WHERE user_id = 'PASTE-RECEIVER-USER-ID-HERE'
  AND coupon_id = 'PASTE-COUPON-ID-HERE'
ORDER BY collected_at DESC
LIMIT 1;
*/

-- =====================================================
-- AUTOMATED VERSION (Run entire block at once)
-- =====================================================

DO $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
  v_collection_id UUID;
  v_coupon_id UUID;
  v_result JSON;
BEGIN
  -- Get sender (first user with shareable coupons)
  SELECT ucc.user_id, ucc.id, ucc.coupon_id
  INTO v_sender_id, v_collection_id, v_coupon_id
  FROM user_coupon_collections ucc
  WHERE ucc.is_shareable = TRUE
    AND ucc.has_been_shared = FALSE
    AND ucc.status = 'active'
  LIMIT 1;
  
  -- Get receiver (different user)
  SELECT id INTO v_receiver_id
  FROM auth.users
  WHERE id != v_sender_id
  LIMIT 1;
  
  -- Check if we have all required data
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'No shareable coupons found';
  END IF;
  
  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'No receiver user found';
  END IF;
  
  RAISE NOTICE 'Sender: %', v_sender_id;
  RAISE NOTICE 'Receiver: %', v_receiver_id;
  RAISE NOTICE 'Coupon: %', v_coupon_id;
  RAISE NOTICE 'Collection: %', v_collection_id;
  
  -- Test the function
  SELECT log_coupon_share(
    v_sender_id,
    v_receiver_id,
    v_coupon_id,
    v_collection_id,
    false
  ) INTO v_result;
  
  RAISE NOTICE 'Result: %', v_result;
  RAISE NOTICE '✅ Share completed successfully!';
  
  -- Show results
  RAISE NOTICE 'Sender collection status:';
  PERFORM * FROM user_coupon_collections WHERE id = v_collection_id;
  
  RAISE NOTICE 'Receiver got coupon:';
  PERFORM * FROM user_coupon_collections 
  WHERE user_id = v_receiver_id 
    AND coupon_id = v_coupon_id
  ORDER BY collected_at DESC
  LIMIT 1;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RAISE;
END $$;
