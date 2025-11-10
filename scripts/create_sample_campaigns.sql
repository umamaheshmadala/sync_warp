-- ==========================================
-- CREATE SAMPLE CAMPAIGNS & TEST SYSTEM
-- Execute in Supabase SQL Editor
-- ==========================================
--
-- IMPORTANT: Understanding "Drivers" in SynC
-- ==========================================
-- "Drivers" are NOT taxi/rideshare drivers!
-- 
-- In SynC, "Drivers" are:
-- → Top 10% most active users per city
-- → Power users who "drive" word-of-mouth marketing
-- → Measured by:
--   • Coupon collecting & sharing activity
--   • Business check-ins
--   • Writing reviews  
--   • Social interactions (friend connections, shares)
--
-- They're called "Drivers" because they DRIVE engagement,
-- DRIVE footfall to businesses, and DRIVE the viral loop
-- through word-of-mouth advocacy.
--
-- Activity scoring is configurable via admin panel.
-- ==========================================

-- Step 1: Create Campaign 1 - Welcome New Users
INSERT INTO campaigns (
  id, business_id, name, description, campaign_type,
  targeting_rules, target_drivers_only, total_budget_cents,
  start_date, end_date, status, impressions, clicks, conversions,
  created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM businesses LIMIT 1),
  'Welcome New Users',
  'Onboarding campaign for new user engagement with exclusive offers',
  'engagement',
  '{"cities": ["Mumbai", "Delhi", "Bangalore"], "min_profile_completion": 50, "user_types": ["customer"]}'::jsonb,
  false,
  5000000,  -- $50,000
  NOW(),
  NOW() + interval '30 days',
  'active',
  0,
  0,
  0,
  NOW(),
  NOW()
);

-- Step 2: Create Campaign 2 - Power User Rewards
INSERT INTO campaigns (
  id, business_id, name, description, campaign_type,
  targeting_rules, target_drivers_only, total_budget_cents,
  start_date, end_date, status, impressions, clicks, conversions,
  created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM businesses LIMIT 1),
  'Power User Rewards',
  'Reward top 10% most active users (Drivers) who drive word-of-mouth growth through coupon sharing, reviews, and check-ins',
  'reward',
  '{"cities": ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai"], "min_activity_score": 3000, "drivers_only": true}'::jsonb,
  true,
  10000000,  -- ₹100,000
  NOW(),
  NOW() + interval '90 days',
  'active',
  0,
  0,
  0,
  NOW(),
  NOW()
);

-- Step 3: Verify campaigns created
SELECT 
  id, 
  name, 
  campaign_type, 
  status, 
  target_drivers_only,
  total_budget_cents/100 as budget_dollars,
  start_date::date as start_date,
  end_date::date as end_date,
  targeting_rules
FROM campaigns
ORDER BY created_at DESC;

-- ==========================================
-- TEST DRIVER ALGORITHM & RANKINGS
-- ==========================================

-- Step 4: Check driver score distribution
SELECT 
  CASE 
    WHEN total_activity_score < 2000 THEN '0-2000 (Bronze)'
    WHEN total_activity_score < 5000 THEN '2000-5000 (Silver)'
    WHEN total_activity_score < 8000 THEN '5000-8000 (Gold)'
    ELSE '8000+ (Platinum)'
  END as score_tier,
  COUNT(*) as driver_count,
  AVG(total_activity_score)::int as avg_score,
  MIN(total_activity_score)::int as min_score,
  MAX(total_activity_score)::int as max_score
FROM driver_profiles
GROUP BY score_tier
ORDER BY MIN(total_activity_score);

-- Step 5: Check top drivers by city
SELECT 
  c.name as city,
  p.full_name,
  p.email,
  dp.total_activity_score::int as score,
  dp.city_rank,
  dp.percentile::numeric(5,2) as percentile,
  dp.total_coupons_shared,
  dp.total_reviews
FROM driver_profiles dp
JOIN profiles p ON dp.user_id = p.id
LEFT JOIN cities c ON dp.city_id = c.id
ORDER BY dp.total_activity_score DESC
LIMIT 10;

-- Step 6: Check driver activity breakdown
SELECT 
  AVG(coupons_collected_score)::int as avg_coupons_collected,
  AVG(coupons_shared_score)::int as avg_coupons_shared,
  AVG(coupons_redeemed_score)::int as avg_redeemed,
  AVG(checkins_score)::int as avg_checkins,
  AVG(reviews_score)::int as avg_reviews,
  AVG(social_interactions_score)::int as avg_social
FROM driver_profiles;

-- ==========================================
-- TEST CAMPAIGN TARGETING
-- ==========================================

-- Step 7: Find eligible Power Users (Drivers) for Rewards Campaign
-- Drivers = Top 10% most active users who drive word-of-mouth through:
-- - Coupon collecting & sharing
-- - Business check-ins
-- - Writing reviews
-- - Social interactions
WITH target_cities AS (
  SELECT unnest(ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai']) as city_name
)
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.city,
  dp.total_activity_score::int as activity_score,
  dp.percentile::numeric(5,2) as percentile_in_city,
  dp.total_coupons_collected,
  dp.total_coupons_shared,
  dp.total_checkins,
  dp.total_reviews,
  'Eligible for Power User Rewards' as campaign_status,
  CASE 
    WHEN dp.percentile >= 90 THEN 'Top 10% (Driver)'
    WHEN dp.percentile >= 75 THEN 'Top 25%'
    ELSE 'Regular User'
  END as user_tier
FROM profiles p
JOIN driver_profiles dp ON p.id = dp.user_id
WHERE 
  p.is_driver = true  -- Top 10% activity-based power users
  AND dp.total_activity_score >= 3000
  AND p.city IN (SELECT city_name FROM target_cities)
ORDER BY dp.total_activity_score DESC;

-- Step 8: Find eligible customers for Welcome Campaign
-- (Customers in target cities with profile completion >= 50%)
WITH target_cities AS (
  SELECT unnest(ARRAY['Mumbai', 'Delhi', 'Bangalore']) as city_name
)
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.city,
  p.profile_completion,
  p.interests,
  'Eligible for Welcome Campaign' as campaign_status
FROM profiles p
WHERE 
  p.role = 'customer'
  AND p.is_driver = false
  AND p.profile_completion >= 50
  AND p.city IN (SELECT city_name FROM target_cities)
ORDER BY p.profile_completion DESC
LIMIT 20;

-- ==========================================
-- CAMPAIGN SYSTEM INTEGRATION CHECK
-- ==========================================

-- Step 9: Check campaign analytics setup
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'campaign_analytics'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 10: Check campaign targets setup
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'campaign_targets'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 11: Summary statistics
SELECT 
  'Campaigns' as metric, COUNT(*)::text as value FROM campaigns
UNION ALL
SELECT 'Power Users (Top 10% Active)', COUNT(*)::text 
  FROM driver_profiles WHERE is_driver = true
UNION ALL
SELECT 'High-Activity Users (3000+ score)', COUNT(*)::text 
  FROM driver_profiles WHERE total_activity_score >= 3000
UNION ALL
SELECT 'Eligible for Welcome Campaign', COUNT(*)::text 
  FROM profiles WHERE role = 'customer' AND profile_completion >= 50
UNION ALL
SELECT 'Business Customer Profiles', COUNT(*)::text FROM business_customer_profiles;

-- Final Success Message
SELECT 
  '✅ CAMPAIGN SYSTEM READY!' as status,
  (SELECT COUNT(*) FROM campaigns) as total_campaigns,
  (SELECT COUNT(*) FROM driver_profiles WHERE total_activity_score >= 3000) as high_activity_power_users,
  (SELECT COUNT(*) FROM driver_profiles WHERE is_driver = true) as total_drivers_top_10_percent,
  (SELECT COUNT(*) FROM profiles WHERE profile_completion >= 50) as eligible_customers;
