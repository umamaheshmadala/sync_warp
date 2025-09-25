-- Test the exact query that the search service runs

-- This simulates the enhanced coupon search from simpleSearchService
SELECT 
  'SEARCH SERVICE SIMULATION - coupon:' as info,
  bc.*,
  b.business_name,
  b.business_type,
  b.city,
  b.status as business_status
FROM business_coupons bc
INNER JOIN businesses b ON bc.business_id = b.id
WHERE (bc.title ILIKE '%coupon%' OR bc.description ILIKE '%coupon%' OR bc.terms_conditions ILIKE '%coupon%' OR bc.type ILIKE '%coupon%')
  AND bc.status = 'active'
  AND bc.is_public = true
  AND b.status = 'active'
LIMIT 10;

-- Check if terms_conditions field is causing issues (it might be NULL)
SELECT 
  'TERMS CONDITIONS CHECK:' as info,
  title,
  terms_conditions,
  CASE 
    WHEN terms_conditions IS NULL THEN 'NULL'
    WHEN terms_conditions = '' THEN 'EMPTY'
    ELSE 'HAS_VALUE'
  END as terms_status
FROM business_coupons 
WHERE business_id = (SELECT id FROM businesses WHERE business_name = 'Test Business 1A');

-- Test without terms_conditions to see if that's the issue
SELECT 
  'SEARCH WITHOUT TERMS_CONDITIONS:' as info,
  bc.title,
  b.business_name
FROM business_coupons bc
INNER JOIN businesses b ON bc.business_id = b.id
WHERE (bc.title ILIKE '%coupon%' OR bc.description ILIKE '%coupon%' OR bc.type ILIKE '%coupon%')
  AND bc.status = 'active'
  AND bc.is_public = true
  AND b.status = 'active';