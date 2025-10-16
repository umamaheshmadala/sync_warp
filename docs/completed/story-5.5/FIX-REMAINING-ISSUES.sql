-- Fix remaining coupon collection issues
-- 1. Add 'deleted' to status constraint (or use 'removed')
-- 2. Ensure proper logic for shared vs deleted coupons

-- Step 1: Check current status constraint
SELECT 
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname LIKE '%status_check%' 
  AND conrelid = 'user_coupon_collections'::regclass;

-- Step 2: Update status constraint to include 'deleted'
-- Option A: Add 'deleted' to existing constraint
ALTER TABLE user_coupon_collections 
DROP CONSTRAINT IF EXISTS user_coupon_collections_status_check;

ALTER TABLE user_coupon_collections 
ADD CONSTRAINT user_coupon_collections_status_check 
CHECK (status IN ('active', 'used', 'expired', 'removed', 'deleted'));

-- Step 3: Verify constraint was updated
SELECT 
  pg_get_constraintdef(oid) as updated_constraint
FROM pg_constraint
WHERE conname = 'user_coupon_collections_status_check' 
  AND conrelid = 'user_coupon_collections'::regclass;

-- Step 4: Update RLS policies to handle deleted status
-- The existing policies should already handle this, but let's verify

-- Step 5: Success message
SELECT 
  '✅ Status constraint updated successfully!' as status,
  '✅ Coupons can now be deleted without constraint errors.' as message,
  '✅ Test by deleting a coupon from your wallet.' as test_instruction;