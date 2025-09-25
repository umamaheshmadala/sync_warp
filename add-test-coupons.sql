-- add-test-coupons.sql
-- Add test coupons to the existing "Test Business 01"
-- This uses the existing business so we don't need to worry about user_id constraints

-- Using the existing business ID from your database
-- Test Business 01: d55594ab-f6a9-4511-a6fa-e7078cd8c9cf

-- Insert test coupons for search testing
INSERT INTO business_coupons (
  id, 
  business_id, 
  title, 
  description, 
  type, 
  discount_value, 
  min_purchase_amount, 
  status, 
  valid_from, 
  valid_until, 
  is_public, 
  target_audience, 
  created_at, 
  updated_at
)
VALUES 
  -- Pizza coupon for Test Business 01
  (
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    '25% Off Pizza Orders',
    'Get 25% discount on all pizza orders over $20 at Test Business 01',
    'percentage',
    25,
    20,
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    true,
    'all_users',
    NOW(),
    NOW()
  ),
  -- Coffee coupon for Test Business 01
  (
    'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    '$5 Off Coffee & Beverages',
    'Save $5 on any coffee or beverage order over $15 at Test Business 01',
    'fixed_amount',
    5,
    15,
    'active',
    NOW(),
    NOW() + INTERVAL '20 days',
    true,
    'all_users',
    NOW(),
    NOW()
  ),
  -- Food combo deal for Test Business 01
  (
    'cccccccc-3333-3333-3333-cccccccccccc',
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    'Buy 2 Get 1 Free Food Items',
    'Amazing BOGO deal on all food items at Test Business 01',
    'buy_x_get_y',
    100,
    25,
    'active',
    NOW(),
    NOW() + INTERVAL '15 days',
    true,
    'all_users',
    NOW(),
    NOW()
  ),
  -- Free dessert for Test Business 01
  (
    'dddddddd-4444-4444-4444-dddddddddddd',
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    'Free Dessert with Meal',
    'Complimentary dessert with any meal over $30 at Test Business 01',
    'free_item',
    0,
    30,
    'active',
    NOW(),
    NOW() + INTERVAL '25 days',
    true,
    'returning_users',
    NOW(),
    NOW()
  ),
  -- Burger special for Test Business 01
  (
    'eeeeeeee-5555-5555-5555-eeeeeeeeeeee',
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    'Burger Special - 30% Off',
    'Get 30% off on all burger varieties at Test Business 01',
    'percentage',
    30,
    15,
    'active',
    NOW(),
    NOW() + INTERVAL '10 days',
    true,
    'all_users',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Verify the coupons were inserted
SELECT 'Test coupons created:' as result, COUNT(*) as count 
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
  AND title LIKE '%Pizza%' OR title LIKE '%Coffee%' OR title LIKE '%Burger%';

-- Show created test coupons with business info
SELECT 
  b.business_name,
  b.city,
  b.business_type,
  bc.title as coupon_title,
  bc.description,
  bc.type as coupon_type,
  bc.discount_value,
  bc.status,
  bc.is_public,
  bc.valid_until
FROM businesses b
INNER JOIN business_coupons bc ON b.id = bc.business_id
WHERE b.id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
  AND bc.id IN (
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    'cccccccc-3333-3333-3333-cccccccccccc',
    'dddddddd-4444-4444-4444-dddddddddddd',
    'eeeeeeee-5555-5555-5555-eeeeeeeeeeee'
  )
ORDER BY bc.title;

-- Show all coupons for Test Business 01 (to see both old and new)
SELECT 
  title,
  type,
  discount_value,
  status,
  is_public,
  created_at
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
ORDER BY created_at DESC;