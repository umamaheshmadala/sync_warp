-- test-search-behavior.sql
-- Test what the search should return vs what it actually returns

-- Current timestamp for comparison
SELECT 'Current timestamp:' as info, NOW() as current_time;

-- Test 1: All public active coupons (what empty search should return)
SELECT 
  'BROWSE MODE - All public active coupons:' as test,
  COUNT(*) as total_count
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.status = 'active' 
  AND bc.is_public = true
  AND b.status = 'active'
  AND bc.valid_until > NOW();

-- Test 2: List all public active coupons with details
SELECT 
  'BROWSE MODE - Details:' as test,
  bc.title,
  b.business_name,
  bc.valid_until,
  CASE WHEN bc.valid_until > NOW() THEN 'VALID' ELSE 'EXPIRED' END as validity_status
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.status = 'active' 
  AND bc.is_public = true
  AND b.status = 'active'
ORDER BY bc.valid_until ASC;

-- Test 3: Search for "pizza" (what pizza search should return)  
SELECT 
  'SEARCH MODE - Pizza results:' as test,
  COUNT(*) as total_count
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.status = 'active' 
  AND bc.is_public = true
  AND b.status = 'active'
  AND bc.valid_until > NOW()
  AND (bc.title ILIKE '%pizza%' 
       OR bc.description ILIKE '%pizza%' 
       OR bc.type ILIKE '%pizza%');

-- Test 4: List pizza search results with details
SELECT 
  'SEARCH MODE - Pizza details:' as test,
  bc.title,
  b.business_name,
  bc.description,
  bc.valid_until
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.status = 'active' 
  AND bc.is_public = true
  AND b.status = 'active'
  AND bc.valid_until > NOW()
  AND (bc.title ILIKE '%pizza%' 
       OR bc.description ILIKE '%pizza%' 
       OR bc.type ILIKE '%pizza%');

-- Test 5: Check for expiring coupons (edge cases)
SELECT 
  'EXPIRATION CHECK:' as test,
  bc.title,
  b.business_name,
  bc.valid_until,
  EXTRACT(EPOCH FROM (bc.valid_until - NOW()))/86400 as days_until_expiry
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE bc.status = 'active' 
  AND bc.is_public = true
  AND b.status = 'active'
ORDER BY bc.valid_until ASC;

-- Test 6: Check if any coupons are being filtered out by RLS policies
SELECT 
  'RLS POLICY CHECK:' as test,
  COUNT(*) as total_in_table,
  COUNT(CASE WHEN bc.status = 'active' THEN 1 END) as active_status,
  COUNT(CASE WHEN bc.is_public = true THEN 1 END) as public_coupons,
  COUNT(CASE WHEN bc.valid_until > NOW() THEN 1 END) as valid_coupons
FROM business_coupons bc
JOIN businesses b ON bc.business_id = b.id
WHERE b.status = 'active';

-- Test 7: Check what simple search service query would return
-- This simulates the exact query that simpleSearchService.search() would run
SELECT 'SIMPLE SEARCH SIMULATION:' as test;

-- Browse mode (empty query)
SELECT 
  'Empty query (browse):' as test,
  bc.id,
  bc.title,
  bc.business_id,
  bc.valid_until
FROM business_coupons bc
WHERE bc.status = 'active'
  AND bc.is_public = true
  AND bc.valid_until > NOW()
LIMIT 10;

-- Search mode (pizza query)
SELECT 
  'Pizza query:' as test,
  bc.id,
  bc.title,
  bc.business_id,
  bc.valid_until
FROM business_coupons bc
WHERE bc.status = 'active'
  AND bc.is_public = true
  AND bc.valid_until > NOW()
  AND (bc.title ILIKE '%pizza%' 
       OR bc.description ILIKE '%pizza%' 
       OR bc.type ILIKE '%pizza%')
LIMIT 10;