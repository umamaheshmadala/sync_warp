-- create-test-data-with-uuids.sql
-- Test data for Story 4.4 search functionality with proper UUIDs
-- Run this in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create temporary variables for consistent UUIDs across the script
DO $$
DECLARE
    pizza_business_id UUID := '11111111-1111-1111-1111-111111111111';
    coffee_business_id UUID := '22222222-2222-2222-2222-222222222222';
    burger_business_id UUID := '33333333-3333-3333-3333-333333333333';
    
    pizza_coupon_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    coffee_coupon_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    burger_coupon_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    dessert_coupon_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
BEGIN
    -- Insert test businesses if they don't exist
    INSERT INTO businesses (id, business_name, business_type, description, address, city, country, status, created_at, updated_at)
    VALUES 
      (pizza_business_id, 'Pizza Palace', 'restaurant', 'Best pizza in town with amazing deals', '123 Pizza Street', 'New York', 'USA', 'active', NOW(), NOW()),
      (coffee_business_id, 'Coffee Corner', 'cafe', 'Premium coffee and pastries', '456 Coffee Ave', 'Seattle', 'USA', 'active', NOW(), NOW()),
      (burger_business_id, 'Burger Hub', 'restaurant', 'Gourmet burgers and fast service', '789 Burger Blvd', 'Chicago', 'USA', 'active', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Insert test coupons
    INSERT INTO business_coupons (
      id, business_id, title, description, type, discount_value, 
      min_purchase_amount, status, valid_from, valid_until, is_public, 
      target_audience, created_at, updated_at
    )
    VALUES 
      (
        pizza_coupon_id,
        pizza_business_id,
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
        coffee_coupon_id,
        coffee_business_id,
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
        burger_coupon_id,
        burger_business_id,
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
        dessert_coupon_id,
        pizza_business_id,
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
END $$;

-- Verify the data was inserted
SELECT 'Businesses inserted:' as info, COUNT(*) as count 
FROM businesses 
WHERE business_name IN ('Pizza Palace', 'Coffee Corner', 'Burger Hub');

SELECT 'Coupons inserted:' as info, COUNT(*) as count 
FROM business_coupons 
WHERE title LIKE '%Pizza%' OR title LIKE '%Coffee%' OR title LIKE '%Burger%';

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
WHERE bc.id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
)
ORDER BY bc.title;