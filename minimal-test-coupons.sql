-- minimal-test-coupons.sql
-- Minimal test coupons focusing on just the essential required fields

-- First, let's see what's already in the table to understand the structure
SELECT 
  column_name, 
  is_nullable, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'business_coupons' 
  AND table_schema = 'public' 
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- Simple insert with just basic required fields
INSERT INTO business_coupons (
  business_id, 
  title, 
  description, 
  type,
  discount_type,
  discount_value,
  status,
  is_public,
  created_at,
  updated_at
)
VALUES 
  (
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    '25% Off Pizza Orders',
    'Get 25% discount on all pizza orders over $20 at Test Business 01',
    'percentage',
    'percentage', 
    25,
    'active',
    true,
    NOW(),
    NOW()
  ),
  (
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    '$5 Off Coffee & Beverages',
    'Save $5 on coffee and beverages at Test Business 01',
    'fixed_amount',
    'fixed_amount',
    5,
    'active',
    true,
    NOW(),
    NOW()
  ),
  (
    'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf',
    'Burger Special - 30% Off',
    'Get 30% off on burgers at Test Business 01',
    'percentage',
    'percentage',
    30,
    'active',
    true,
    NOW(),
    NOW()
  );

-- Verify insertion
SELECT 
  'New test coupons:' as info,
  COUNT(*) as count
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
  AND created_at > NOW() - INTERVAL '1 minute';

-- Show the created coupons
SELECT 
  title,
  type,
  discount_type,
  discount_value,
  status,
  is_public,
  created_at
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
ORDER BY created_at DESC
LIMIT 10;