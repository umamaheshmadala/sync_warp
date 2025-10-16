-- =====================================================
-- Story 5.5: Get Test Data for Sharing Limits Testing
-- =====================================================
-- Run this in Supabase SQL Editor to get valid IDs for testing

-- 1️⃣ Get your current user ID (the one you're logged in as)
SELECT 
  'Current User' as type,
  id as user_id,
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = current_setting('request.jwt.claim.email', true)
LIMIT 1;

-- 2️⃣ Get other users (potential friends to share with)
SELECT 
  'Friend Users' as type,
  id as friend_id,
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email != current_setting('request.jwt.claim.email', true)
ORDER BY created_at DESC
LIMIT 5;

-- 3️⃣ Get valid coupon IDs
SELECT 
  'Valid Coupons' as type,
  id as coupon_id,
  title,
  description,
  status
FROM business_coupons
WHERE status = 'active'
  AND valid_until > NOW()
ORDER BY created_at DESC
LIMIT 5;

-- 4️⃣ Check if you have any existing shares today
SELECT 
  'Today Shares' as type,
  COUNT(*) as total_shares_today,
  COUNT(DISTINCT recipient_id) as unique_friends_shared_with
FROM coupon_sharing_log
WHERE sender_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = current_setting('request.jwt.claim.email', true)
)
AND DATE(shared_at) = CURRENT_DATE;

-- 5️⃣ Check your Driver status
SELECT 
  'Driver Status' as type,
  u.id as user_id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'role' = 'driver', false) as is_driver
FROM auth.users u
WHERE email = current_setting('request.jwt.claim.email', true);

-- 6️⃣ Get sharing stats using the function
SELECT * FROM get_sharing_stats_today(
  (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claim.email', true))
);
