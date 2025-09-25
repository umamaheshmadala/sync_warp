-- Check Row Level Security policies that might be affecting search

-- 1. Check if RLS is enabled on business_coupons
SELECT 
  'RLS STATUS:' as info,
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE tablename = 'business_coupons';

-- 2. Check existing policies on business_coupons table
SELECT 
  'COUPON POLICIES:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'business_coupons';

-- 3. Check existing policies on businesses table
SELECT 
  'BUSINESS POLICIES:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'businesses';

-- 4. Test what the current user can see from business_coupons
SELECT 
  'CURRENT USER CAN SEE:' as info,
  COUNT(*) as total_coupons
FROM business_coupons 
WHERE status = 'active' AND is_public = true;

-- 5. Test specific search that should work for all users
SELECT 
  'PUBLIC COUPON SEARCH:' as info,
  bc.title,
  b.business_name,
  bc.is_public,
  bc.status,
  b.status as business_status
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.title ILIKE '%coupon%'
  AND bc.status = 'active'
  AND bc.is_public = true
  AND b.status = 'active';

-- 6. Check what auth.uid() returns (current user)
SELECT 
  'CURRENT USER:' as info,
  auth.uid() as current_user_id;