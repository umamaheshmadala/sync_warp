-- simple-test-coupons.sql
-- Add test coupons to existing "Test Business 01" using auto-generated UUIDs
-- Run this in your Supabase SQL editor

-- Insert test coupons for search testing
INSERT INTO business_coupons (
  id, 
  business_id, 
  title, 
  description, 
  type, 
  discount_type,
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
  -- Pizza coupon
  (
    gen_random_uuid(),
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    '25% Off Pizza Orders',
    'Get 25% discount on all pizza orders over $20 at Test Business 01',
    'percentage',
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
  -- Coffee coupon
  (
    gen_random_uuid(),
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    '$5 Off Coffee & Beverages',
    'Save $5 on any coffee or beverage order over $15 at Test Business 01',
    'fixed_amount',
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
  -- Food combo deal
  (
    gen_random_uuid(),
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    'Buy 2 Get 1 Free Food Items',
    'Amazing BOGO deal on all food items at Test Business 01',
    'buy_x_get_y',
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
  -- Free dessert
  (
    gen_random_uuid(),
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    'Free Dessert with Meal',
    'Complimentary dessert with any meal over $30 at Test Business 01',
    'free_item',
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
  -- Burger special
  (
    gen_random_uuid(),
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    'Burger Special - 30% Off',
    'Get 30% off on all burger varieties at Test Business 01',
    'percentage',
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
  );

-- Verify the coupons were inserted
SELECT 
  'Test coupons created:' as result, 
  COUNT(*) as count 
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
  AND (title LIKE '%Pizza%' OR title LIKE '%Coffee%' OR title LIKE '%Burger%' OR title LIKE '%Food%' OR title LIKE '%Dessert%');

-- Show all coupons for Test Business 01
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
  bc.valid_until,
  bc.created_at
FROM businesses b
INNER JOIN business_coupons bc ON b.id = bc.business_id
WHERE b.id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
ORDER BY bc.created_at DESC;

-- Show search-relevant data
SELECT 
  'Search terms to test:' as info,
  'pizza, coffee, burger, food, dessert' as test_queries;

SELECT 
  'Business to search for:' as info,
  'Test Business 01' as business_name;