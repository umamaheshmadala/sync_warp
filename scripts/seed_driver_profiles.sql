-- Seed Driver Profiles (20-30 drivers)
-- Links to existing profiles where is_driver = true

-- First, get available cities for mapping
WITH available_cities AS (
  SELECT id, name FROM cities LIMIT 20
),
driver_users AS (
  SELECT id, city FROM profiles WHERE is_driver = true LIMIT 30
)
INSERT INTO driver_profiles (
  id,
  user_id,
  city_id,
  total_activity_score,
  coupons_collected_score,
  coupons_shared_score,
  coupons_redeemed_score,
  checkins_score,
  reviews_score,
  social_interactions_score,
  city_rank,
  percentile,
  is_driver,
  total_coupons_collected,
  total_coupons_shared,
  total_coupons_redeemed,
  total_checkins,
  total_reviews,
  score_30d,
  score_90d,
  first_activity_at,
  last_activity_at,
  last_calculated_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() AS id,
  du.id AS user_id,
  (SELECT id FROM available_cities ORDER BY random() LIMIT 1) AS city_id,
  floor(random() * 10000 + 1000)::numeric AS total_activity_score,
  floor(random() * 2000 + 100)::numeric AS coupons_collected_score,
  floor(random() * 3000 + 200)::numeric AS coupons_shared_score,
  floor(random() * 1500 + 150)::numeric AS coupons_redeemed_score,
  floor(random() * 1000 + 100)::numeric AS checkins_score,
  floor(random() * 1200 + 80)::numeric AS reviews_score,
  floor(random() * 800 + 50)::numeric AS social_interactions_score,
  floor(random() * 1000 + 1)::int AS city_rank,
  round((random() * 100)::numeric, 2) AS percentile,
  true AS is_driver,
  floor(random() * 500 + 50)::int AS total_coupons_collected,
  floor(random() * 800 + 100)::int AS total_coupons_shared,
  floor(random() * 300 + 20)::int AS total_coupons_redeemed,
  floor(random() * 200 + 10)::int AS total_checkins,
  floor(random() * 150 + 5)::int AS total_reviews,
  floor(random() * 3000 + 500)::numeric AS score_30d,
  floor(random() * 8000 + 1000)::numeric AS score_90d,
  NOW() - (random() * interval '365 days') AS first_activity_at,
  NOW() - (random() * interval '7 days') AS last_activity_at,
  NOW() AS last_calculated_at,
  NOW() - (random() * interval '180 days') AS created_at,
  NOW() AS updated_at
FROM driver_users du
ON CONFLICT (user_id) DO NOTHING;

-- Verify insert
SELECT 
  COUNT(*) as total_drivers,
  AVG(total_activity_score)::int as avg_activity_score,
  MAX(total_activity_score)::int as max_score,
  MIN(total_activity_score)::int as min_score,
  COUNT(CASE WHEN is_driver THEN 1 END) as active_drivers
FROM driver_profiles;
