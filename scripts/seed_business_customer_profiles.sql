-- Seed Business Customer Profiles
-- Creates customer profiles for existing businesses

WITH existing_businesses AS (
  SELECT id, name, city FROM businesses LIMIT 10
),
age_range_options AS (
  SELECT unnest(ARRAY['18-24', '25-34', '35-44', '45-54', '55+']) AS age_range
),
income_levels AS (
  SELECT unnest(ARRAY['low', 'medium', 'high', 'premium']) AS income
),
interest_categories AS (
  SELECT unnest(ARRAY[
    'dining', 'shopping', 'entertainment', 'wellness', 
    'travel', 'technology', 'fashion', 'sports', 'education'
  ]) AS category
)
INSERT INTO business_customer_profiles (
  id,
  business_id,
  primary_age_ranges,
  gender_distribution,
  income_levels,
  interest_categories,
  customer_behavior_notes,
  typical_visit_duration,
  repeat_customer_rate,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() AS id,
  eb.id AS business_id,
  ARRAY(
    SELECT age_range FROM age_range_options 
    ORDER BY random() 
    LIMIT floor(random() * 3 + 1)::int
  ) AS primary_age_ranges,
  jsonb_build_object(
    'male', floor(random() * 60 + 20)::int,
    'female', floor(random() * 60 + 20)::int,
    'other', floor(random() * 10)::int
  ) AS gender_distribution,
  ARRAY(
    SELECT income FROM income_levels 
    ORDER BY random() 
    LIMIT floor(random() * 2 + 1)::int
  ) AS income_levels,
  ARRAY(
    SELECT category FROM interest_categories 
    ORDER BY random() 
    LIMIT floor(random() * 4 + 2)::int
  ) AS interest_categories,
  CASE floor(random() * 5)::int
    WHEN 0 THEN 'High foot traffic during lunch hours. Price-sensitive customers.'
    WHEN 1 THEN 'Weekend shoppers, family-oriented. Values quality over price.'
    WHEN 2 THEN 'Young professionals, tech-savvy. Prefers digital payments.'
    WHEN 3 THEN 'Regular customers, brand loyal. Responds well to loyalty programs.'
    ELSE 'Mixed demographic. Peak hours evening 6-9 PM.'
  END AS customer_behavior_notes,
  floor(random() * 120 + 30)::int AS typical_visit_duration, -- 30-150 minutes
  floor(random() * 50 + 30)::int AS repeat_customer_rate, -- 30-80%
  NOW() - (random() * interval '180 days') AS created_at,
  NOW() - (random() * interval '30 days') AS updated_at
FROM existing_businesses eb
ON CONFLICT (business_id) DO UPDATE SET
  primary_age_ranges = EXCLUDED.primary_age_ranges,
  gender_distribution = EXCLUDED.gender_distribution,
  updated_at = NOW();

-- Verify insert
SELECT 
  COUNT(*) as total_customer_profiles,
  COUNT(DISTINCT business_id) as businesses_with_profiles,
  AVG(typical_visit_duration)::int as avg_visit_duration,
  AVG(repeat_customer_rate)::int as avg_repeat_rate
FROM business_customer_profiles;
