-- Test Script for Coupon Collection and Deletion Flow
-- This script helps verify that the fix is working correctly

-- Step 1: Get your user ID
-- Replace 'your-email@example.com' with your actual email
SELECT id as user_id, email 
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Step 2: Get a test coupon ID
-- This will show you active coupons you can test with
SELECT 
  bc.id as coupon_id,
  bc.title,
  bc.status,
  b.business_name
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.status = 'active'
LIMIT 5;

-- Step 3: Check if you've already collected a coupon
-- Replace 'YOUR_USER_ID' and 'THE_COUPON_ID' with actual values
SELECT 
  id as collection_id,
  status,
  has_been_shared,
  deleted_at,
  collected_at
FROM user_coupon_collections
WHERE user_id = 'YOUR_USER_ID'
AND coupon_id = 'THE_COUPON_ID';

-- Step 4: Manually collect a coupon (if needed for testing)
-- Replace the UUIDs with actual values
INSERT INTO user_coupon_collections (
  user_id,
  coupon_id,
  collected_from,
  status,
  has_been_shared,
  collected_at
) VALUES (
  'YOUR_USER_ID',
  'THE_COUPON_ID',
  'manual_test',
  'active',
  FALSE,
  NOW()
);

-- Step 5: Verify the collection was created
SELECT 
  id,
  status,
  has_been_shared,
  deleted_at,
  collected_at
FROM user_coupon_collections
WHERE user_id = 'YOUR_USER_ID'
AND coupon_id = 'THE_COUPON_ID'
ORDER BY collected_at DESC
LIMIT 1;

-- Step 6: Test soft delete
-- Replace 'THE_COLLECTION_ID' with the actual collection ID from Step 5
UPDATE user_coupon_collections
SET 
  status = 'deleted',
  deleted_at = NOW()
WHERE id = 'THE_COLLECTION_ID';

-- Step 7: Verify the soft delete worked
SELECT 
  id,
  status,
  has_been_shared,
  deleted_at,
  collected_at
FROM user_coupon_collections
WHERE id = 'THE_COLLECTION_ID';

-- Step 8: Check if you can collect again
-- This should return 0 rows if the soft delete worked correctly
SELECT COUNT(*) as active_collections
FROM user_coupon_collections
WHERE user_id = 'YOUR_USER_ID'
AND coupon_id = 'THE_COUPON_ID'
AND status = 'active';

-- Step 9: Test shared coupon scenario
-- First, collect a coupon
INSERT INTO user_coupon_collections (
  user_id,
  coupon_id,
  collected_from,
  status,
  has_been_shared,
  collected_at
) VALUES (
  'YOUR_USER_ID',
  'ANOTHER_COUPON_ID',
  'manual_test',
  'active',
  FALSE,
  NOW()
);

-- Then, simulate sharing it
UPDATE user_coupon_collections
SET 
  shared_to_user_id = 'FRIEND_USER_ID',
  has_been_shared = TRUE
WHERE user_id = 'YOUR_USER_ID'
AND coupon_id = 'ANOTHER_COUPON_ID'
AND status = 'active';

-- Now, delete the shared coupon
UPDATE user_coupon_collections
SET 
  status = 'deleted',
  deleted_at = NOW()
WHERE user_id = 'YOUR_USER_ID'
AND coupon_id = 'ANOTHER_COUPON_ID';

-- Try to collect again (this should be blocked by has_been_shared flag)
-- Run this query to see if there's a shared coupon that should block re-collection
SELECT 
  id,
  status,
  has_been_shared,
  deleted_at
FROM user_coupon_collections
WHERE user_id = 'YOUR_USER_ID'
AND coupon_id = 'ANOTHER_COUPON_ID'
AND has_been_shared = TRUE;

-- Step 10: Clean up test data (optional)
-- Uncomment these lines if you want to remove test data
-- DELETE FROM user_coupon_collections 
-- WHERE user_id = 'YOUR_USER_ID' 
-- AND collected_from = 'manual_test';

-- Step 11: View all your coupons (for debugging)
SELECT 
  ucc.id as collection_id,
  ucc.status,
  ucc.has_been_shared,
  ucc.deleted_at,
  ucc.collected_at,
  bc.title as coupon_title,
  b.business_name
FROM user_coupon_collections ucc
JOIN business_coupons bc ON ucc.coupon_id = bc.id
JOIN businesses b ON bc.business_id = b.id
WHERE ucc.user_id = 'YOUR_USER_ID'
ORDER BY ucc.collected_at DESC;

-- Expected Results:
-- 1. After Step 4: Collection should be created with status='active', has_been_shared=FALSE
-- 2. After Step 6: status should be 'deleted', deleted_at should have a timestamp
-- 3. After Step 8: Should return 0 (no active collections)
-- 4. After Step 9: has_been_shared should be TRUE even after deletion
-- 5. Re-collection should be blocked if has_been_shared is TRUE
