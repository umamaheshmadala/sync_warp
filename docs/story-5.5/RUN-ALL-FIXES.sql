-- =====================================================
-- RUN ALL FIXES - Single Copy/Paste
-- =====================================================
-- Copy this ENTIRE file and run it once in Supabase SQL Editor

-- Fix 1: Add missing updated_at column
ALTER TABLE user_coupon_collections
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fix 2: Add auto-update trigger
CREATE OR REPLACE FUNCTION update_user_coupon_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_coupon_collections_updated_at ON user_coupon_collections;

CREATE TRIGGER set_user_coupon_collections_updated_at
  BEFORE UPDATE ON user_coupon_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_user_coupon_collections_updated_at();

-- Fix 3: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Fix 4: Verify everything
SELECT 'Step 1: Check updated_at column' as step;
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_coupon_collections'
  AND column_name = 'updated_at';

SELECT 'Step 2: Check trigger' as step;
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_coupon_collections'
  AND trigger_name = 'set_user_coupon_collections_updated_at';

SELECT 'Step 3: Check function signature' as step;
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.ordinal_position
FROM information_schema.routines r
JOIN information_schema.parameters p 
  ON p.specific_name = r.specific_name
WHERE r.routine_name = 'log_coupon_share'
  AND r.routine_schema = 'public'
ORDER BY p.ordinal_position;

-- Fix 5: Test the sharing function
SELECT 'Step 4: Testing log_coupon_share function...' as step;

DO $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
  v_collection_id UUID;
  v_coupon_id UUID;
  v_result JSON;
BEGIN
  -- Get sender (first user with shareable coupons)
  SELECT ucc.user_id, ucc.id, ucc.coupon_id
  INTO v_sender_id, v_collection_id, v_coupon_id
  FROM user_coupon_collections ucc
  WHERE ucc.is_shareable = TRUE
    AND ucc.has_been_shared = FALSE
    AND ucc.status = 'active'
  LIMIT 1;
  
  -- Get receiver (different user)
  SELECT id INTO v_receiver_id
  FROM auth.users
  WHERE id != v_sender_id
  LIMIT 1;
  
  -- Check if we have all required data
  IF v_sender_id IS NULL THEN
    RAISE NOTICE '⚠️ No shareable coupons found. Add coupons first using ADD-COUPON-SIMPLE.sql';
    RETURN;
  END IF;
  
  IF v_receiver_id IS NULL THEN
    RAISE NOTICE '⚠️ Need at least 2 users. Create another user first.';
    RETURN;
  END IF;
  
  RAISE NOTICE '📤 Sender: %', v_sender_id;
  RAISE NOTICE '📥 Receiver: %', v_receiver_id;
  RAISE NOTICE '🎫 Coupon: %', v_coupon_id;
  RAISE NOTICE '📦 Collection: %', v_collection_id;
  RAISE NOTICE '---';
  RAISE NOTICE 'Testing share...';
  
  -- Test the function
  SELECT log_coupon_share(
    v_sender_id,
    v_receiver_id,
    v_coupon_id,
    v_collection_id,
    false
  ) INTO v_result;
  
  RAISE NOTICE '✅ Share completed successfully!';
  RAISE NOTICE 'Result: %', v_result;
  RAISE NOTICE '---';
  RAISE NOTICE '📊 Check sender wallet: status should be "used"';
  RAISE NOTICE '📊 Check receiver wallet: should have new coupon with acquisition_method = "shared_received"';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RAISE NOTICE 'Check the error above and fix before trying test page';
END $$;

-- Final message
SELECT '✅ ALL FIXES APPLIED! Wait 30 seconds, then try the test page again.' as final_status;
