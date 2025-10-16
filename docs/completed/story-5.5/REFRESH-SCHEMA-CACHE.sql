-- =====================================================
-- Refresh Supabase Schema Cache
-- =====================================================

-- Option 1: Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Option 2: Verify the function exists and get its signature
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'log_coupon_share'
  AND routine_schema = 'public';

-- Option 3: Check function parameters
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode,
  p.ordinal_position
FROM information_schema.routines r
JOIN information_schema.parameters p 
  ON p.specific_name = r.specific_name
WHERE r.routine_name = 'log_coupon_share'
  AND r.routine_schema = 'public'
ORDER BY p.ordinal_position;

-- Option 4: Test the function directly in SQL
-- Replace UUIDs with real values from your database
/*
SELECT log_coupon_share(
  'SENDER-USER-ID',
  'RECIPIENT-USER-ID',
  'COUPON-ID',
  'COLLECTION-ID',
  false
);
*/

-- Option 5: If function doesn't exist, recreate it
-- (Copy from migration file: supabase/migrations/20251002000002_fix_coupon_sharing_architecture.sql)
