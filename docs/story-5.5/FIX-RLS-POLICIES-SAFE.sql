-- Fix RLS Policies for user_coupon_collections table
-- This version is safe to run in SQL Editor (no auth.uid() test)

-- Step 1: Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Users can manage own collections" ON user_coupon_collections;
DROP POLICY IF EXISTS "Users can view their own coupon collections" ON user_coupon_collections;
DROP POLICY IF EXISTS "Users can view active or shared coupons" ON user_coupon_collections;
DROP POLICY IF EXISTS "Users can insert their own coupon collections" ON user_coupon_collections;
DROP POLICY IF EXISTS "Users can update their own coupon collections" ON user_coupon_collections;
DROP POLICY IF EXISTS "Users can delete their own coupon collections" ON user_coupon_collections;
DROP POLICY IF EXISTS "Business owners can view collections" ON user_coupon_collections;

-- Step 2: Ensure RLS is enabled
ALTER TABLE user_coupon_collections ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SELECT policy (includes shared coupons)
CREATE POLICY "Users can view active or shared coupons"
ON user_coupon_collections FOR SELECT
USING (
  user_id = auth.uid() OR 
  (shared_to_user_id = auth.uid() AND status = 'active')
);

-- Step 4: Create INSERT policy
-- IMPORTANT: This allows users to insert records where user_id = auth.uid()
CREATE POLICY "Users can insert their own coupon collections"
ON user_coupon_collections FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Step 5: Create UPDATE policy
CREATE POLICY "Users can update their own coupon collections"
ON user_coupon_collections FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 6: Create DELETE policy
CREATE POLICY "Users can delete their own coupon collections"
ON user_coupon_collections FOR DELETE
USING (user_id = auth.uid());

-- Step 7: Create policy for business owners to view collections
CREATE POLICY "Business owners can view collections"
ON user_coupon_collections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_coupons bc
    JOIN businesses b ON b.id = bc.business_id
    WHERE bc.id = user_coupon_collections.coupon_id 
    AND b.user_id = auth.uid()
  )
);

-- Step 8: Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command_type
FROM pg_policies
WHERE tablename = 'user_coupon_collections'
ORDER BY cmd, policyname;

-- Expected output:
-- You should see 5 policies:
-- 1. Business owners can view collections (SELECT)
-- 2. Users can view active or shared coupons (SELECT)
-- 3. Users can insert their own coupon collections (INSERT)
-- 4. Users can update their own coupon collections (UPDATE)
-- 5. Users can delete their own coupon collections (DELETE)

-- SUCCESS MESSAGE
SELECT 
  '✅ RLS policies have been reset and recreated successfully!' as status,
  '✅ You can now collect coupons from your application.' as message,
  '⚠️ Note: You must be logged in to the APPLICATION (not SQL Editor) to test.' as note;
