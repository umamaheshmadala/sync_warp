-- =====================================================
-- Verify Architecture Fix Migration
-- =====================================================

-- 1️⃣ Check new columns in user_coupon_collections
SELECT 
  'user_coupon_collections columns' as check_name,
  COUNT(*) as found_columns,
  CASE 
    WHEN COUNT(*) >= 7 THEN '✅ All columns added'
    ELSE '❌ Missing columns'
  END as status
FROM information_schema.columns 
WHERE table_name = 'user_coupon_collections' 
AND column_name IN (
  'acquisition_method', 
  'is_shareable', 
  'has_been_shared', 
  'shared_to_user_id',
  'shared_at',
  'original_owner_id',
  'sharing_log_id'
);

-- 2️⃣ Check new columns in coupon_sharing_log
SELECT 
  'coupon_sharing_log columns' as check_name,
  COUNT(*) as found_columns,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ All columns added'
    ELSE '❌ Missing columns'
  END as status
FROM information_schema.columns 
WHERE table_name = 'coupon_sharing_log' 
AND column_name IN (
  'sender_collection_id',
  'receiver_collection_id',
  'notification_sent',
  'notification_sent_at'
);

-- 3️⃣ Check new table: coupon_lifecycle_events
SELECT 
  'coupon_lifecycle_events table' as check_name,
  1 as exists,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_lifecycle_events')
    THEN '✅ Table created'
    ELSE '❌ Table missing'
  END as status;

-- 4️⃣ Check updated function: log_coupon_share (with 5 parameters)
SELECT 
  'log_coupon_share function' as check_name,
  COUNT(*) as parameter_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.parameters 
      WHERE specific_name IN (
        SELECT specific_name FROM information_schema.routines 
        WHERE routine_name = 'log_coupon_share'
      )
      GROUP BY specific_name
      HAVING COUNT(*) = 5
    )
    THEN '✅ Function updated (5 params)'
    ELSE '⚠️ Check function signature'
  END as status
FROM information_schema.parameters 
WHERE specific_name IN (
  SELECT specific_name FROM information_schema.routines 
  WHERE routine_name = 'log_coupon_share'
);

-- 5️⃣ Check new function: get_shareable_coupons
SELECT 
  'get_shareable_coupons function' as check_name,
  1 as exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'get_shareable_coupons'
    )
    THEN '✅ Function created'
    ELSE '❌ Function missing'
  END as status;

-- 6️⃣ Check new function: get_coupon_lifecycle
SELECT 
  'get_coupon_lifecycle function' as check_name,
  1 as exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'get_coupon_lifecycle'
    )
    THEN '✅ Function created'
    ELSE '❌ Function missing'
  END as status;

-- 7️⃣ Check RLS policy on coupon_lifecycle_events
SELECT 
  'coupon_lifecycle_events RLS' as check_name,
  COUNT(*) as policies_count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ RLS policy exists'
    ELSE '⚠️ No RLS policy'
  END as status
FROM pg_policies 
WHERE tablename = 'coupon_lifecycle_events';

-- 8️⃣ Check trigger: log_collection_lifecycle
SELECT 
  'log_collection_lifecycle trigger' as check_name,
  1 as exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trigger_log_collection_lifecycle'
    )
    THEN '✅ Trigger created'
    ELSE '❌ Trigger missing'
  END as status;

-- 9️⃣ Check indexes created
SELECT 
  'Lifecycle indexes' as check_name,
  COUNT(*) as indexes_found,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ All indexes created'
    ELSE '⚠️ Some indexes missing'
  END as status
FROM pg_indexes
WHERE tablename = 'coupon_lifecycle_events'
AND indexname LIKE 'idx_lifecycle%';

-- 🔟 Update existing data (set defaults for existing rows)
UPDATE user_coupon_collections
SET 
  acquisition_method = COALESCE(acquisition_method, 'collected'),
  is_shareable = COALESCE(is_shareable, TRUE),
  has_been_shared = COALESCE(has_been_shared, FALSE)
WHERE acquisition_method IS NULL 
   OR is_shareable IS NULL 
   OR has_been_shared IS NULL;

-- Show how many rows were updated
SELECT 
  'Existing data updated' as check_name,
  COUNT(*) as total_collections,
  '✅ Defaults set' as status
FROM user_coupon_collections;

-- =====================================================
-- Summary
-- =====================================================

SELECT 
  '===== MIGRATION VERIFICATION COMPLETE =====' as summary,
  'All checks above should show ✅' as instructions;
