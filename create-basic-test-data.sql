-- create-basic-test-data.sql
-- Basic test data for Story 4.4 search functionality testing
-- Run this in your Supabase SQL editor

-- Insert test businesses if they don't exist
INSERT INTO businesses (id, business_name, business_type, description, address, city, country, status, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Pizza Palace', 'restaurant', 'Best pizza in town with amazing deals', '123 Pizza Street', 'New York', 'USA', 'active', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Coffee Corner', 'cafe', 'Premium coffee and pastries', '456 Coffee Ave', 'Seattle', 'USA', 'active', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Burger Hub', 'restaurant', 'Gourmet burgers and fast service', '789 Burger Blvd', 'Chicago', 'USA', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test coupons
INSERT INTO business_coupons (
  id, business_id, title, description, type, discount_value, 
  min_purchase_amount, status, valid_from, valid_until, is_public, 
  target_audience, created_at, updated_at
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
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'Free Dessert with Meal',
    'Complimentary dessert with any pizza order over $30',
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
  )
ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
SELECT 'Businesses inserted:' as info, COUNT(*) as count FROM businesses WHERE business_name IN ('Pizza Palace', 'Coffee Corner', 'Burger Hub');
SELECT 'Coupons inserted:' as info, COUNT(*) as count FROM business_coupons WHERE title LIKE '%Pizza%' OR title LIKE '%Coffee%' OR title LIKE '%Burger%';

-- Show the test data for verification
SELECT 
  bc.title,
  bc.description,
  bc.type,
  bc.discount_value,
  b.business_name,
  bc.status,
  bc.valid_until
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd')
ORDER BY bc.title;