-- =============================================================================
-- FIXED Seed User Profiles with Proper Age Ranges and Locations
-- This replaces the previous seed data with correctly distributed data
-- =============================================================================

-- First, delete existing data
TRUNCATE TABLE user_profiles CASCADE;

-- Generate 10,000 users with properly distributed attributes
INSERT INTO user_profiles (
  user_id,
  age_range,
  gender,
  income_range,
  interests,
  latitude,
  longitude,
  is_driver,
  total_purchases,
  last_purchase_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as user_id,
  -- Properly distribute age ranges
  CASE 
    WHEN idx % 6 = 0 THEN '18-24'
    WHEN idx % 6 = 1 THEN '25-34'
    WHEN idx % 6 = 2 THEN '35-44'
    WHEN idx % 6 = 3 THEN '45-54'
    WHEN idx % 6 = 4 THEN '55-64'
    ELSE '65+'
  END as age_range,
  -- Gender distribution (60% male, 35% female, 5% other)
  CASE 
    WHEN random() < 0.6 THEN 'male'
    WHEN random() < 0.95 THEN 'female'
    ELSE 'other'
  END as gender,
  -- Income distribution
  CASE 
    WHEN random() < 0.15 THEN 'below_3lpa'
    WHEN random() < 0.50 THEN '3-5lpa'
    WHEN random() < 0.85 THEN '5-10lpa'
    WHEN random() < 0.98 THEN '10-20lpa'
    ELSE 'above_20lpa'
  END as income_range,
  -- Random interests (2-4 interests per user)
  ARRAY(
    SELECT interest FROM (
      VALUES ('food'), ('shopping'), ('entertainment'), ('health'), 
             ('travel'), ('education'), ('services'), ('sports')
    ) AS interests(interest)
    ORDER BY random()
    LIMIT 2 + floor(random() * 3)::int
  ) as interests,
  -- Generate coordinates within ~20km radius of center (16.5062, 80.6480)
  -- Using approximation: 1 degree ≈ 111km at equator
  -- So ~20km ≈ 0.18 degrees
  16.5062 + (random() - 0.5) * 0.36 as latitude,   -- ±20km north/south
  80.6480 + (random() - 0.5) * 0.36 as longitude,  -- ±20km east/west
  -- 20% are drivers (2000 out of 10000)
  (random() < 0.2) as is_driver,
  -- Random purchase history (0-50 purchases)
  floor(random() * 51)::int as total_purchases,
  -- Last purchase in the last 90 days for active users
  CASE 
    WHEN random() < 0.7 THEN now() - (random() * interval '90 days')
    ELSE NULL
  END as last_purchase_at,
  now() as created_at,
  now() as updated_at
FROM generate_series(1, 10000) AS idx;

-- Verify the distribution
DO $$
DECLARE
  v_total INTEGER;
  v_with_location INTEGER;
  v_drivers INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM user_profiles;
  SELECT COUNT(*) INTO v_with_location FROM user_profiles WHERE latitude IS NOT NULL;
  SELECT COUNT(*) INTO v_drivers FROM user_profiles WHERE is_driver = TRUE;
  
  RAISE NOTICE 'Seed data verification:';
  RAISE NOTICE '  Total users: %', v_total;
  RAISE NOTICE '  Users with location: %', v_with_location;
  RAISE NOTICE '  Drivers: %', v_drivers;
  RAISE NOTICE '';
  RAISE NOTICE 'Age distribution:';
  FOR rec IN (SELECT age_range, COUNT(*) as cnt FROM user_profiles GROUP BY age_range ORDER BY age_range) LOOP
    RAISE NOTICE '  %: %', rec.age_range, rec.cnt;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE 'Gender distribution:';
  FOR rec IN (SELECT gender, COUNT(*) as cnt FROM user_profiles GROUP BY gender ORDER BY gender) LOOP
    RAISE NOTICE '  %: %', rec.gender, rec.cnt;
  END LOOP;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_age_range ON user_profiles(age_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON user_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_user_profiles_income_range ON user_profiles(income_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_driver ON user_profiles(is_driver);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles USING GIST(ll_to_earth(latitude, longitude));

COMMENT ON TABLE user_profiles IS 'User profile data with proper age range and location distribution for targeting';
