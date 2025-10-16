-- =====================================================
-- Add Coupon to Your Wallet for Testing
-- =====================================================
-- Run this to add a coupon to your wallet so you can test sharing

-- Option 1: Add specific coupon by ID
INSERT INTO user_coupon_collections (
  user_id,
  coupon_id,
  acquisition_method,
  is_shareable,
  has_been_shared,
  collected_at,
  expires_at,
  status,
  collected_from
) VALUES (
  (SELECT auth.uid()),  -- Your user ID
  'PASTE-COUPON-ID-HERE',  -- Replace with a coupon ID from business_coupons
  'collected',
  TRUE,
  FALSE,
  NOW(),
  NOW() + INTERVAL '30 days',
  'active',
  'direct_search'
);

-- Option 2: Add first available coupon automatically
/*
INSERT INTO user_coupon_collections (
  user_id,
  coupon_id,
  acquisition_method,
  is_shareable,
  has_been_shared,
  collected_at,
  expires_at,
  status,
  collected_from
)
SELECT 
  (SELECT auth.uid()),
  id,
  'collected',
  TRUE,
  FALSE,
  NOW(),
  valid_until,
  'active',
  'direct_search'
FROM business_coupons
WHERE status = 'active' 
  AND valid_until > NOW()
LIMIT 1;
*/

-- Verify it was added
SELECT 
  ucc.id as collection_id,
  bc.title,
  bc.coupon_code,
  ucc.acquisition_method,
  ucc.is_shareable,
  ucc.has_been_shared,
  ucc.collected_at,
  ucc.expires_at
FROM user_coupon_collections ucc
JOIN business_coupons bc ON bc.id = ucc.coupon_id
WHERE ucc.user_id = (SELECT auth.uid())
ORDER BY ucc.collected_at DESC
LIMIT 5;
