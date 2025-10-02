-- =====================================================
-- CHECK DATABASE STATE & CREATE TEST DATA IF NEEDED
-- =====================================================
-- Run this to check your database and create test data if needed

-- 1️⃣ Check if business_coupons table exists
SELECT 
  'business_coupons table' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'business_coupons'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 2️⃣ Count active coupons
SELECT 
  'Active coupons' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ NO COUPONS - Need to create test data'
    ELSE '✅ Has coupons'
  END as status
FROM business_coupons
WHERE status = 'active' AND valid_until > NOW();

-- 3️⃣ Count users (for sharing)
SELECT 
  'Total users' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) < 2 THEN '⚠️ NEED MORE USERS - Need at least 2 users to test sharing'
    ELSE '✅ Has enough users'
  END as status
FROM auth.users;

-- 4️⃣ Check if coupon_sharing_log table exists
SELECT 
  'coupon_sharing_log table' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'coupon_sharing_log'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 5️⃣ Check foreign key constraint
SELECT 
  'Foreign key to business_coupons' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage AS ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_name = 'coupon_sharing_log_coupon_id_fkey'
      AND ccu.table_name = 'business_coupons'
  ) THEN '✅ CORRECT' ELSE '❌ NEEDS FIX' END as status;

-- =====================================================
-- IF YOU NEED TEST DATA, UNCOMMENT AND RUN BELOW:
-- =====================================================

/*
-- Create a test coupon (modify business_id to match your business)
INSERT INTO business_coupons (
  business_id,
  title,
  description,
  type,
  discount_type,
  discount_value,
  terms_conditions,
  valid_from,
  valid_until,
  coupon_code,
  status,
  is_public,
  created_by
) VALUES (
  (SELECT id FROM businesses LIMIT 1), -- Uses first business, change if needed
  'Test Coupon for Sharing',
  'This is a test coupon for testing the sharing limits feature',
  'percentage',
  'percentage',
  20.00,
  'Valid for testing purposes only',
  NOW(),
  NOW() + INTERVAL '30 days',
  'TEST-' || substr(gen_random_uuid()::text, 1, 8),
  'active',
  true,
  auth.uid()
);
*/

-- =====================================================
-- AFTER CHECKS PASS, GET TEST DATA:
-- =====================================================

-- Get user IDs (friends to share with):
SELECT 
  id as friend_id, 
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;

-- Get coupon IDs:
SELECT 
  id as coupon_id, 
  title,
  coupon_code,
  status,
  valid_until
FROM business_coupons 
WHERE status = 'active' 
  AND valid_until > NOW()
ORDER BY created_at DESC
LIMIT 5;
