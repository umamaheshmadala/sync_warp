-- check-coupons-schema.sql
-- Query to check the business_coupons table schema and identify required fields

-- Check table structure and constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'business_coupons' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check specific NOT NULL constraints
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'business_coupons' 
  AND table_schema = 'public'
  AND is_nullable = 'NO'
ORDER BY column_name;

-- Show a sample record if any exist (to see expected structure)
SELECT * FROM business_coupons LIMIT 1;