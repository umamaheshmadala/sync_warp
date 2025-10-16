-- =====================================================
-- Add Coupon to Wallet (Simple Version)
-- =====================================================
-- SQL Editor doesn't have auth context, so we need to specify user ID manually

-- Step 1: Get your user ID
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Step 2: Get available coupons
SELECT id, title, coupon_code, status, valid_until 
FROM business_coupons 
WHERE status = 'active' AND valid_until > NOW()
LIMIT 5;

-- Step 3: Insert coupon to your wallet (replace the UUIDs below)
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
  'YOUR-USER-ID-HERE',  -- Replace with your user ID from Step 1
  'COUPON-ID-HERE',     -- Replace with coupon ID from Step 2
  'collected',
  TRUE,
  FALSE,
  NOW(),
  NOW() + INTERVAL '30 days',
  'active',
  'direct_search'
);

-- Step 4: Verify it was added
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
WHERE ucc.user_id = 'YOUR-USER-ID-HERE'  -- Same user ID as above
ORDER BY ucc.collected_at DESC
LIMIT 5;

-- =====================================================
-- ALTERNATIVE: Add all available coupons at once
-- =====================================================

/*
-- Get user ID first
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Replace with your actual user ID or email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'your.email@example.com';
  
  -- Add 3 coupons
  INSERT INTO user_coupon_collections (
    user_id, coupon_id, acquisition_method, is_shareable, 
    has_been_shared, collected_at, expires_at, status, collected_from
  )
  SELECT 
    v_user_id, id, 'collected', TRUE, FALSE, NOW(),
    valid_until, 'active', 'direct_search'
  FROM business_coupons
  WHERE status = 'active' AND valid_until > NOW()
  LIMIT 3;
  
  RAISE NOTICE 'Added % coupons to user %', 3, v_user_id;
END $$;
*/
