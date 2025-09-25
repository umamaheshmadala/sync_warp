-- minimal-test-data.sql
-- Minimal test data focusing on essential fields only
-- Run this in Supabase SQL editor

-- Insert test businesses with minimal required fields
INSERT INTO businesses (
  id, 
  business_name, 
  business_type, 
  description, 
  address, 
  city, 
  country, 
  status,
  created_at, 
  updated_at
)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111', 
    'Pizza Palace', 
    'restaurant', 
    'Best pizza in town with amazing deals', 
    '123 Pizza Street', 
    'New York', 
    'USA', 
    'active',
    NOW(), 
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222', 
    'Coffee Corner', 
    'cafe', 
    'Premium coffee and pastries', 
    '456 Coffee Ave', 
    'Seattle', 
    'USA', 
    'active',
    NOW(), 
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333', 
    'Burger Hub', 
    'restaurant', 
    'Gourmet burgers and fast service', 
    '789 Burger Blvd', 
    'Chicago', 
    'USA', 
    'active',
    NOW(), 
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Insert test coupons (assuming this table structure is correct)
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
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '25% Off Pizza Orders',
    'Get 25% discount on all pizza orders over $20',
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
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    '$5 Off Coffee',
    'Save $5 on any coffee order over $15',
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
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Buy 2 Get 1 Free Burgers',
    'Amazing BOGO deal on all burger varieties',
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
  )
ON CONFLICT (id) DO NOTHING;

-- Verify data insertion
SELECT 'Test businesses created:' as result, COUNT(*) as count 
FROM businesses 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333'
);

SELECT 'Test coupons created:' as result, COUNT(*) as count 
FROM business_coupons 
WHERE business_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333'
);

-- Show created data
SELECT 
  b.business_name,
  b.city,
  b.business_type,
  bc.title as coupon_title,
  bc.type as coupon_type,
  bc.discount_value
FROM businesses b
LEFT JOIN business_coupons bc ON b.id = bc.business_id
WHERE b.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333'
)
ORDER BY b.business_name, bc.title;