-- check-businesses-schema.sql
-- Query to check the businesses table schema and identify NOT NULL constraints
-- Run this in Supabase SQL editor to see what fields are required

-- Check table structure and constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check specific NOT NULL constraints
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
  AND is_nullable = 'NO'
ORDER BY column_name;

-- Show a sample record if any exist (to see expected structure)
SELECT * FROM businesses LIMIT 1;