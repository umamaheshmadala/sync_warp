-- Add Test Coupon to Test User 2's Wallet for Sharing Test
-- Run this in Supabase SQL Editor

-- Step 1: Get Test User 2's ID
-- Replace with your actual Test User 2 email
DO $$
DECLARE
  v_user_id uuid;
  v_business_id uuid;
  v_coupon_id uuid;
  v_business_owner_id uuid;
BEGIN
  -- Get Test User 2's ID (update email if different)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email LIKE '%test%2%' OR email LIKE '%user2%'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Test User 2 not found. Please update the email filter.';
  END IF;
  
  RAISE NOTICE 'Found Test User 2: %', v_user_id;
  
  -- Get or create a test business
  SELECT id INTO v_business_id
  FROM businesses
  LIMIT 1;
  
  IF v_business_id IS NULL THEN
    -- Create a test business
    INSERT INTO businesses (name, description, category, status)
    VALUES (
      'Test Pizza Palace',
      'Delicious pizzas for testing',
      'food',
      'active'
    )
    RETURNING id INTO v_business_id;
    
    RAISE NOTICE 'Created test business: %', v_business_id;
  ELSE
    RAISE NOTICE 'Using existing business: %', v_business_id;
  END IF;
  
  -- Get the business owner ID (for created_by field)
  SELECT user_id INTO v_business_owner_id
  FROM businesses
  WHERE id = v_business_id;
  
  -- Create a test coupon if it doesn't exist
  SELECT id INTO v_coupon_id
  FROM business_coupons
  WHERE business_id = v_business_id
    AND title = 'Test: 50% OFF Pizza - SHAREABLE'
  LIMIT 1;
  
  IF v_coupon_id IS NULL THEN
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
      created_by
    )
    VALUES (
      v_business_id,
      'Test: 50% OFF Pizza - SHAREABLE',
      'Get 50% off on any large pizza. Perfect for sharing with friends!',
      'percentage',
      'percentage',
      50,
      'PIZZA' || FLOOR(RANDOM() * 10000)::TEXT,
      'Valid on large pizzas only. Not combinable with other offers.',
      NOW(),
      NOW() + INTERVAL '30 days',
      'active',
      true,
      'all_users',
      v_business_owner_id
    )
    RETURNING id INTO v_coupon_id;
    
    RAISE NOTICE 'Created test coupon: %', v_coupon_id;
  ELSE
    RAISE NOTICE 'Using existing test coupon: %', v_coupon_id;
  END IF;
  
  -- Add coupon to Test User 2's wallet (if not already there)
  IF NOT EXISTS (
    SELECT 1 FROM user_coupon_collections
    WHERE user_id = v_user_id AND coupon_id = v_coupon_id
  ) THEN
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
    
    RAISE NOTICE '✅ Added shareable coupon to Test User 2 wallet!';
  ELSE
    RAISE NOTICE 'ℹ️ Coupon already in Test User 2 wallet';
  END IF;
  
  -- Show summary
  RAISE NOTICE '';
  RAISE NOTICE '=== SUMMARY ===';
  RAISE NOTICE 'Test User 2 ID: %', v_user_id;
  RAISE NOTICE 'Business ID: %', v_business_id;
  RAISE NOTICE 'Coupon ID: %', v_coupon_id;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Test User 2 now has a shareable coupon in their wallet!';
  RAISE NOTICE '👉 Refresh the wallet page to see it';
  
END $$;

-- Verify the coupon was added
SELECT 
  u.email as user_email,
  bc.title as coupon_title,
  ucc.acquisition_method,
  ucc.is_shareable,
  ucc.has_been_shared,
  ucc.status,
  ucc.collected_at
FROM user_coupon_collections ucc
JOIN auth.users u ON u.id = ucc.user_id
JOIN business_coupons bc ON bc.id = ucc.coupon_id
WHERE u.email LIKE '%test%2%' OR u.email LIKE '%user2%'
ORDER BY ucc.collected_at DESC
LIMIT 5;
