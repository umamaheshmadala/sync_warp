-- Check all search data in database

-- 1. Check all businesses
SELECT 
  'BUSINESSES:' as type,
  id,
  business_name,
  business_type,
  city,
  status,
  created_at
FROM businesses 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check all coupons 
SELECT 
  'COUPONS:' as type,
  bc.id,
  bc.title,
  bc.business_id,
  b.business_name,
  bc.status,
  bc.is_public,
  bc.created_at
FROM business_coupons bc
LEFT JOIN businesses b ON bc.business_id = b.id
ORDER BY bc.created_at DESC
LIMIT 10;

-- 3. Check specifically Test Business 01 coupons
SELECT 
  'TEST BUSINESS 01 COUPONS:' as type,
  title,
  status,
  is_public,
  discount_value,
  created_at
FROM business_coupons 
WHERE business_id = 'd55594ab-f6a9-4511-a6fa-e7078cd8c9cf'
ORDER BY created_at DESC;

-- 4. Search test - simulate what the app would search for
SELECT 
  'SEARCH TEST - coffee:' as type,
  title,
  business_id,
  status,
  is_public
FROM business_coupons
WHERE (title ILIKE '%coffee%' OR description ILIKE '%coffee%')
  AND status = 'active'
  AND is_public = true;

-- 5. Search test - simulate business search
SELECT 
  'SEARCH TEST - test:' as type,
  business_name,
  business_type,
  status
FROM businesses
WHERE (business_name ILIKE '%test%' OR description ILIKE '%test%')
  AND status = 'active';