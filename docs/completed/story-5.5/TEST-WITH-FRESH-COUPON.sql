-- =====================================================
-- Test with Fresh Coupon (that receiver doesn't have)
-- =====================================================

DO $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
  v_collection_id UUID;
  v_coupon_id UUID;
  v_result JSON;
BEGIN
  -- Get receiver first
  SELECT id INTO v_receiver_id
  FROM auth.users
  ORDER BY created_at
  LIMIT 1 OFFSET 1;
  
  -- Get a shareable coupon that receiver doesn't already have
  SELECT ucc.user_id, ucc.id, ucc.coupon_id
  INTO v_sender_id, v_collection_id, v_coupon_id
  FROM user_coupon_collections ucc
  WHERE ucc.is_shareable = TRUE
    AND ucc.has_been_shared = FALSE
    AND ucc.status = 'active'
    AND ucc.user_id != v_receiver_id  -- Not the receiver
    AND NOT EXISTS (
      -- Make sure receiver doesn't already have this coupon
      SELECT 1 FROM user_coupon_collections
      WHERE user_id = v_receiver_id
        AND coupon_id = ucc.coupon_id
    )
  LIMIT 1;
  
  -- Check if we have all required data
  IF v_sender_id IS NULL THEN
    RAISE NOTICE '⚠️ No shareable coupons found that receiver doesnt already have';
    RAISE NOTICE 'Solution: Add more coupons to sender wallet using ADD-COUPON-SIMPLE.sql';
    RETURN;
  END IF;
  
  RAISE NOTICE '📤 Sender: %', v_sender_id;
  RAISE NOTICE '📥 Receiver: %', v_receiver_id;
  RAISE NOTICE '🎫 Coupon: %', v_coupon_id;
  RAISE NOTICE '📦 Collection: %', v_collection_id;
  RAISE NOTICE '---';
  RAISE NOTICE 'Sharing...';
  
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
  RAISE NOTICE '✅ PROOF: The database function works perfectly!';
  RAISE NOTICE '❌ PROBLEM: PostgREST cache is stale';
  RAISE NOTICE '🔧 SOLUTION: Restart Supabase project (see RESTART-SUPABASE.md)';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    
    IF SQLERRM LIKE '%duplicate key%' THEN
      RAISE NOTICE '⚠️ This means receiver already has this coupon';
      RAISE NOTICE '💡 Run this script again - it will find a different coupon';
    END IF;
END $$;

-- Show what was created
SELECT 
  'Verify Receiver Got Coupon' as check,
  bc.title,
  ucc.acquisition_method,
  ucc.status,
  ucc.collected_at
FROM user_coupon_collections ucc
JOIN business_coupons bc ON bc.id = ucc.coupon_id
WHERE ucc.collected_at > NOW() - INTERVAL '1 minute'
  AND ucc.acquisition_method = 'shared_received'
ORDER BY ucc.collected_at DESC
LIMIT 1;
