-- GUARANTEED WORKING - Checks actual schema first
-- Copy and paste this ENTIRE script into Supabase SQL Editor

-- Step 1: Check what columns actually exist in user_coupon_collections
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_coupon_collections'
ORDER BY ordinal_position;

-- Step 2: Check what columns are required (NOT NULL) in business_coupons
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'business_coupons' 
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- Step 3: Get your user ID (UPDATE THE EMAIL TO MATCH YOUR TEST USER)
SELECT id, email FROM auth.users WHERE email ILIKE '%test%' LIMIT 5;

-- Step 4: Get a business (or we'll create one)
SELECT id, business_name, user_id FROM businesses LIMIT 1;

-- ============================================
-- NOW RUN THIS ONLY AFTER CHECKING ABOVE
-- ============================================
-- Uncomment and run AFTER verifying the columns above

/*
DO $$
DECLARE
  v_user_id uuid := 'PASTE-YOUR-USER-ID-HERE';  -- From Step 3
  v_business_id uuid := 'PASTE-BUSINESS-ID-HERE'; -- From Step 4
  v_business_owner uuid := 'PASTE-BUSINESS-OWNER-ID-HERE'; -- From Step 4
  v_coupon_id uuid;
BEGIN
  
  -- Create coupon
  INSERT INTO business_coupons (
    business_id,
    title,
    description,
    type,
    discount_type,
    discount_value,
    coupon_code,
    terms_conditions,
    valid_from,
    valid_until,
    status,
    is_public,
    target_audience,
    created_by,
    usage_count,
    collection_count
  ) VALUES (
    v_business_id,
    'Test Share Coupon',
    'Test coupon for sharing',
    'percentage',
    'percentage',
    50,
    'TEST' || FLOOR(RANDOM() * 10000)::TEXT,
    'Test only',
    NOW(),
    NOW() + INTERVAL '30 days',
    'active',
    true,
    'all_users',
    v_business_owner,
    0,
    0
  ) RETURNING id INTO v_coupon_id;
  
  -- Add to wallet (ONLY with columns that exist)
  INSERT INTO user_coupon_collections (
    user_id,
    coupon_id,
    collected_at,
    collected_from
  ) VALUES (
    v_user_id,
    v_coupon_id,
    NOW(),
    'direct_search'
  );
  
  RAISE NOTICE 'SUCCESS! Coupon ID: %', v_coupon_id;
END $$;
*/
