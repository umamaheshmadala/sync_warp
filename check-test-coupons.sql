-- check-test-coupons.sql
-- Quick check to see if our test coupons were created

-- Check if test coupons exist
SELECT 
  'Test coupons check:' as info,
  COUNT(*) as total_count
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf';

-- Show any coupons that exist for Test Business 01
SELECT 
  title,
  type,
  discount_value,
  status,
  is_public,
  created_at
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
ORDER BY created_at DESC
LIMIT 10;