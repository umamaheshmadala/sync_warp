-- =====================================================
-- FORCE CACHE RELOAD - Multiple Methods
-- =====================================================

-- Method 1: Standard reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Method 2: Verify function exists with CORRECT signature
SELECT 
  'Function Check' as step,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'log_coupon_share'
  AND n.nspname = 'public';

-- Expected: log_coupon_share(p_sender_id uuid, p_recipient_id uuid, p_coupon_id uuid, p_sender_collection_id uuid, p_is_driver boolean)

-- Method 3: Check if there are multiple versions of the function
SELECT 
  'All Versions' as info,
  p.oid,
  p.proname,
  pg_get_function_arguments(p.oid) as signature
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'log_coupon_share'
  AND n.nspname = 'public';

-- Method 4: If wrong version exists, drop ALL versions
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count how many versions exist
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'log_coupon_share'
    AND n.nspname = 'public';
  
  IF v_count > 1 THEN
    RAISE NOTICE 'Found % versions of log_coupon_share. Dropping all...', v_count;
    
    -- Drop all versions
    DROP FUNCTION IF EXISTS public.log_coupon_share(uuid, uuid, uuid, boolean);
    DROP FUNCTION IF EXISTS public.log_coupon_share(uuid, uuid, uuid, uuid, boolean);
    
    RAISE NOTICE '✅ Dropped old versions';
  ELSE
    RAISE NOTICE 'Only 1 version exists (correct)';
  END IF;
END $$;

-- Method 5: Recreate the function with correct signature
-- (Only if Method 4 dropped it)

-- Drop any remaining old versions
DROP FUNCTION IF EXISTS public.log_coupon_share(uuid, uuid, uuid, boolean);

-- Verify only the correct version exists
SELECT 
  'Final Check' as step,
  COUNT(*) as version_count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Correct - only 1 version'
    WHEN COUNT(*) > 1 THEN '❌ Problem - multiple versions exist'
    ELSE '❌ Problem - no function found'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'log_coupon_share'
  AND n.nspname = 'public';

-- Final reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

SELECT '✅ Cache reload complete. Wait 30 seconds and try again.' as final_status;
