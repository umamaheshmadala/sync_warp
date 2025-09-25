-- Fix search issues

-- 1. Update business status to 'active' so they show up in search
UPDATE businesses 
SET status = 'active' 
WHERE business_name IN ('Test Business 01', 'Test Business 1A');

-- 2. Verify businesses are now active
SELECT 
  'FIXED BUSINESSES:' as info,
  business_name,
  status,
  created_at
FROM businesses 
WHERE business_name IN ('Test Business 01', 'Test Business 1A')
ORDER BY business_name;

-- 3. Test business search now
SELECT 
  'BUSINESS SEARCH TEST:' as info,
  business_name,
  business_type,
  status
FROM businesses
WHERE (business_name ILIKE '%test%' OR description ILIKE '%test%')
  AND status = 'active';

-- 4. Test coupon search 
SELECT 
  'COUPON SEARCH TEST:' as info,
  bc.title,
  b.business_name,
  bc.status,
  bc.is_public
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE (bc.title ILIKE '%coupon%' OR bc.description ILIKE '%coupon%')
  AND bc.status = 'active'
  AND bc.is_public = true
  AND b.status = 'active';

-- 5. Show all active search data now
SELECT 
  'ALL SEARCHABLE DATA:' as info,
  'BUSINESS' as data_type,
  business_name as title,
  business_type as details,
  status
FROM businesses 
WHERE status = 'active'
UNION ALL
SELECT 
  'ALL SEARCHABLE DATA:' as info,
  'COUPON' as data_type,
  bc.title,
  CONCAT(b.business_name, ' - ', bc.type) as details,
  bc.status
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.status = 'active' 
  AND bc.is_public = true
  AND b.status = 'active'
ORDER BY data_type, title;