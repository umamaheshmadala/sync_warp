-- =====================================================
-- QUICK ADD: Copy entire block and run once
-- =====================================================

-- This will add 3 coupons to the FIRST user's wallet
INSERT INTO user_coupon_collections (
  user_id, coupon_id, acquisition_method, is_shareable, 
  has_been_shared, collected_at, expires_at, status, collected_from
)
SELECT 
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),  -- First user
  bc.id,
  'collected',
  TRUE,
  FALSE,
  NOW(),
  bc.valid_until,
  'active',
  'direct_search'
FROM business_coupons bc
WHERE bc.status = 'active' 
  AND bc.valid_until > NOW()
LIMIT 3;

-- Verify what was added
SELECT 
  u.email as user_email,
  bc.title as coupon_title,
  bc.coupon_code,
  ucc.collected_at,
  ucc.expires_at
FROM user_coupon_collections ucc
JOIN auth.users u ON u.id = ucc.user_id
JOIN business_coupons bc ON bc.id = ucc.coupon_id
WHERE ucc.collected_at > NOW() - INTERVAL '5 minutes'
ORDER BY ucc.collected_at DESC;
