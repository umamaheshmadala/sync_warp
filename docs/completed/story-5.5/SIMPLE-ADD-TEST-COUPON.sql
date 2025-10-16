-- SIMPLE: Add Test Coupon to Your Wallet
-- This script adds a test shareable coupon to the current logged-in user's wallet
-- Run this in Supabase SQL Editor

-- Step 1: Get your user ID (replace 'your-email@example.com' with your actual email)
-- Or use: SELECT auth.uid(); if you're the current logged-in user

DO $$
DECLARE
  v_user_id uuid;
  v_business_id uuid;
  v_coupon_id uuid;
  v_business_owner_id uuid;
BEGIN
  -- Get current user (Test User 2)
  -- Update the email pattern to match your test user's email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email ILIKE '%test%2%' OR email ILIKE '%user2%'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Update the email filter in the script.';
  END IF;
  
  RAISE NOTICE 'Found user: %', v_user_id;
  
  -- Get or create a test business
  SELECT id, user_id INTO v_business_id, v_business_owner_id
  FROM businesses
  LIMIT 1;
  
  IF v_business_id IS NULL THEN
    -- Create a minimal test business
    INSERT INTO businesses (
      business_name,
      description,
      category,
      status,
      user_id
    )
    VALUES (
      'Test Pizza Palace',
      'Delicious pizzas',
      'food',
      'active',
      v_user_id  -- Use test user as business owner
    )
    RETURNING id, user_id INTO v_business_id, v_business_owner_id;
    
    RAISE NOTICE 'Created test business: %', v_business_id;
  ELSE
    RAISE NOTICE 'Using existing business: % (owner: %)', v_business_id, v_business_owner_id;
  END IF;
  
  -- Delete existing test coupon if it exists (to allow re-running this script)
  DELETE FROM business_coupons
  WHERE business_id = v_business_id
    AND title = 'Test: 50% OFF Pizza - SHAREABLE';
  
  -- Create test coupon with ALL required fields
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
  )
  VALUES (
    v_business_id,
    'Test: 50% OFF Pizza - SHAREABLE',
    'Get 50% off on any large pizza. Perfect for sharing with friends!',
    'percentage',
    'percentage',
    50,
    'PIZZA' || FLOOR(RANDOM() * 10000)::TEXT,  -- Random code like PIZZA1234
    'Valid on large pizzas only. Not combinable with other offers.',
    NOW(),
    NOW() + INTERVAL '30 days',
    'active',
    true,
    'all_users',
    v_business_owner_id,
    0,
    0
  )
  RETURNING id INTO v_coupon_id;
  
  RAISE NOTICE 'Created test coupon: %', v_coupon_id;
  
  -- Add coupon to Test User's wallet (if not already there)
  -- First, delete if exists (to allow re-running)
  DELETE FROM user_coupon_collections
  WHERE user_id = v_user_id 
    AND coupon_id = v_coupon_id;
  
  -- Now insert fresh
  INSERT INTO user_coupon_collections (
    user_id,
    coupon_id,
    collected_at,
    collected_from,
    status,
    acquisition_method,
    is_shareable,
    has_been_shared
  )
  VALUES (
    v_user_id,
    v_coupon_id,
    NOW(),
    'direct_search',
    'active',
    'collected',
    true,
    false
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '=================================';
  RAISE NOTICE '✅ SUCCESS!';
  RAISE NOTICE '=================================';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Business ID: %', v_business_id;
  RAISE NOTICE 'Coupon ID: %', v_coupon_id;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Test coupon added to your wallet!';
  RAISE NOTICE '👉 Refresh localhost:5173/wallet to see it';
  RAISE NOTICE '';
  
END $$;

-- Verify the coupon was added
SELECT 
  u.email as user_email,
  bc.title as coupon_title,
  bc.coupon_code,
  bc.discount_value || '% OFF' as discount,
  ucc.acquisition_method,
  ucc.is_shareable,
  ucc.has_been_shared,
  ucc.status,
  ucc.collected_at,
  bc.valid_until as expires_at
FROM user_coupon_collections ucc
JOIN auth.users u ON u.id = ucc.user_id
JOIN business_coupons bc ON bc.id = ucc.coupon_id
WHERE u.email ILIKE '%test%2%' OR u.email ILIKE '%user2%'
ORDER BY ucc.collected_at DESC
LIMIT 3;
