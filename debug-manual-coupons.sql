-- Debug manual coupons in Test Business 1A

-- 1. Check Test Business 1A details
SELECT 
  'TEST BUSINESS 1A:' as info,
  id,
  business_name,
  status,
  created_at
FROM businesses 
WHERE business_name = 'Test Business 1A';

-- 2. Check all coupons for Test Business 1A
SELECT 
  'TEST BUSINESS 1A COUPONS:' as info,
  id,
  title,
  description,
  status,
  is_public,
  created_at,
  created_by
FROM business_coupons 
WHERE business_id = (SELECT id FROM businesses WHERE business_name = 'Test Business 1A');

-- 3. Test search query for "coupon" (should match your manual coupons)
SELECT 
  'SEARCH TEST - coupon:' as info,
  bc.title,
  bc.description,
  bc.status,
  bc.is_public,
  b.business_name,
  b.status as business_status
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE (bc.title ILIKE '%coupon%' OR bc.description ILIKE '%coupon%')
  AND bc.status = 'active'
  AND bc.is_public = true
  AND b.status = 'active';

-- 4. Test broader search for Test Business 1A coupons (any term)
SELECT 
  'ALL TEST BUSINESS 1A SEARCHABLE COUPONS:' as info,
  bc.title,
  bc.status as coupon_status,
  bc.is_public,
  b.business_name,
  b.status as business_status
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE b.business_name = 'Test Business 1A'
  AND bc.status = 'active'
  AND bc.is_public = true
  AND b.status = 'active';

-- 5. Check what search should find with "test" query
SELECT 
  'SEARCH TEST - test:' as info,
  bc.title,
  b.business_name,
  bc.status as coupon_status,
  bc.is_public,
  b.status as business_status
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE (bc.title ILIKE '%test%' OR bc.description ILIKE '%test%' OR b.business_name ILIKE '%test%')
  AND bc.status = 'active'
  AND bc.is_public = true
  AND b.status = 'active';