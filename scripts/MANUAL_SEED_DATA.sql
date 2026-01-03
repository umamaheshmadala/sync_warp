-- ==========================================
-- MANUAL SEEDING SCRIPT FOR SUPABASE SQL EDITOR
-- Copy and paste this entire script into Supabase SQL Editor
-- Project: sync_warp (ysxmgbblljoyebvugrfo)
-- ==========================================

-- Step 1: Temporarily disable RLS (already done)
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Insert 100 test profiles
INSERT INTO profiles (
  id, email, full_name, phone, role, city, interests, is_driver, 
  driver_score, bio, location, date_of_birth, profile_completion, 
  is_online, created_at, updated_at, last_active
)
SELECT 
  gen_random_uuid(),
  'syncuser' || n || '@sync.app',
  'SynC User ' || n,
  '+917' || lpad(n::text, 9, '0'),
  CASE 
    WHEN n <= 70 THEN 'customer'::user_role
    WHEN n <= 85 THEN 'customer'::user_role  -- Drivers are customers with is_driver=true
    ELSE 'business_owner'::user_role
  END,
  (ARRAY[
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
    'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane'
  ])[1 + floor(random() * 15)::int],
  ARRAY[
    (ARRAY['food', 'shopping', 'entertainment', 'travel', 'sports', 
           'music', 'movies', 'technology', 'fashion', 'fitness'])[1 + floor(random() * 10)::int],
    (ARRAY['food', 'shopping', 'entertainment', 'travel', 'sports', 
           'music', 'movies', 'technology', 'fashion', 'fitness'])[1 + floor(random() * 10)::int]
  ],
  (n BETWEEN 71 AND 85),
  CASE WHEN n BETWEEN 71 AND 85 THEN floor(random() * 100)::int ELSE 0 END,
  'SynC test user profile for development and testing.',
  (ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'])[1 + floor(random() * 5)::int],
  CURRENT_DATE - (6570 + floor(random() * 12000))::int,
  60 + floor(random() * 40)::int,
  random() > 0.6,
  NOW() - (random() * interval '400 days'),
  NOW() - (random() * interval '40 days'),
  NOW() - (random() * interval '10 days')
FROM generate_series(1, 100) AS n;

-- Step 3: Verify profiles inserted
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN is_driver THEN 1 END) as drivers,
  COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
  COUNT(CASE WHEN role = 'business_owner' THEN 1 END) as business_owners
FROM profiles;

-- Step 4: Insert driver profiles for all drivers
INSERT INTO driver_profiles (
  id, user_id, city_id, total_activity_score,
  coupons_collected_score, coupons_shared_score, coupons_redeemed_score,
  checkins_score, reviews_score, social_interactions_score,
  city_rank, percentile, is_driver,
  total_coupons_collected, total_coupons_shared, total_coupons_redeemed,
  total_checkins, total_reviews,
  score_30d, score_90d,
  first_activity_at, last_activity_at, last_calculated_at,
  created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  p.id,
  (SELECT id FROM cities ORDER BY random() LIMIT 1),
  1000 + floor(random() * 10000)::numeric,
  100 + floor(random() * 2000)::numeric,
  200 + floor(random() * 3000)::numeric,
  150 + floor(random() * 1500)::numeric,
  100 + floor(random() * 1000)::numeric,
  80 + floor(random() * 1200)::numeric,
  50 + floor(random() * 800)::numeric,
  1 + floor(random() * 1000)::int,
  round((random() * 100)::numeric, 2),
  true,
  50 + floor(random() * 500)::int,
  100 + floor(random() * 800)::int,
  20 + floor(random() * 300)::int,
  10 + floor(random() * 200)::int,
  5 + floor(random() * 150)::int,
  500 + floor(random() * 3000)::numeric,
  1000 + floor(random() * 8000)::numeric,
  NOW() - (random() * interval '365 days'),
  NOW() - (random() * interval '7 days'),
  NOW(),
  NOW() - (random() * interval '180 days'),
  NOW()
FROM profiles p
WHERE p.is_driver = true;

-- Step 5: Verify driver profiles
SELECT 
  COUNT(*) as total_driver_profiles,
  AVG(total_activity_score)::int as avg_score,
  MAX(total_activity_score)::int as max_score,
  MIN(total_activity_score)::int as min_score
FROM driver_profiles;

-- Step 6: Insert business customer profiles
INSERT INTO business_customer_profiles (
  id, business_id, primary_age_ranges, gender_distribution,
  income_levels, interest_categories, customer_behavior_notes,
  typical_visit_duration, repeat_customer_rate, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  b.id,
  ARRAY[
    (ARRAY['18-24', '25-34', '35-44', '45-54', '55+'])[1 + floor(random() * 5)::int],
    (ARRAY['18-24', '25-34', '35-44', '45-54', '55+'])[1 + floor(random() * 5)::int]
  ],
  jsonb_build_object(
    'male', 20 + floor(random() * 60)::int,
    'female', 20 + floor(random() * 60)::int,
    'other', floor(random() * 10)::int
  ),
  ARRAY[
    (ARRAY['low', 'medium', 'high', 'premium'])[1 + floor(random() * 4)::int]
  ],
  ARRAY[
    (ARRAY['dining', 'shopping', 'entertainment', 'wellness', 
           'travel', 'technology', 'fashion', 'sports'])[1 + floor(random() * 8)::int],
    (ARRAY['dining', 'shopping', 'entertainment', 'wellness', 
           'travel', 'technology', 'fashion', 'sports'])[1 + floor(random() * 8)::int]
  ],
  (ARRAY[
    'High foot traffic during lunch hours. Price-sensitive customers.',
    'Weekend shoppers, family-oriented. Values quality over price.',
    'Young professionals, tech-savvy. Prefers digital payments.',
    'Regular customers, brand loyal. Responds well to loyalty programs.',
    'Mixed demographic. Peak hours evening 6-9 PM.'
  ])[1 + floor(random() * 5)::int],
  30 + floor(random() * 120)::int,
  30 + floor(random() * 50)::int,
  NOW() - (random() * interval '180 days'),
  NOW() - (random() * interval '30 days')
FROM businesses b
LIMIT 10
ON CONFLICT (business_id) DO UPDATE SET
  updated_at = NOW();

-- Step 7: Verify business customer profiles
SELECT 
  COUNT(*) as total_customer_profiles,
  COUNT(DISTINCT business_id) as businesses_with_profiles,
  AVG(typical_visit_duration)::int as avg_visit_mins,
  AVG(repeat_customer_rate)::int as avg_repeat_rate_pct
FROM business_customer_profiles;

-- Step 8: Re-enable RLS (if it was disabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Final Summary
SELECT 'SEEDING COMPLETE!' as status,
       (SELECT COUNT(*) FROM profiles) as profiles,
       (SELECT COUNT(*) FROM driver_profiles) as driver_profiles,
       (SELECT COUNT(*) FROM business_customer_profiles) as business_customer_profiles;
