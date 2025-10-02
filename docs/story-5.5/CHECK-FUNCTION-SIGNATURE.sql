-- =====================================================
-- Check Function Signature
-- =====================================================

-- Method 1: Check all versions of log_coupon_share
SELECT 
  p.oid,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'log_coupon_share'
  AND n.nspname = 'public';

-- Method 2: Check detailed parameters
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode,
  p.ordinal_position
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
  ON p.specific_name = r.specific_name
WHERE r.routine_name = 'log_coupon_share'
  AND r.routine_schema = 'public'
ORDER BY p.ordinal_position;

-- EXPECTED OUTPUT:
-- 1. p_sender_id (uuid)
-- 2. p_recipient_id (uuid)
-- 3. p_coupon_id (uuid)
-- 4. p_sender_collection_id (uuid)
-- 5. p_is_driver (boolean)
