-- =============================================================================
-- CORRECTED Seed User Profiles - Matches Actual Table Structure
-- =============================================================================

-- Delete existing data
TRUNCATE TABLE user_profiles CASCADE;

-- Generate 10,000 users with proper distribution
INSERT INTO user_profiles (
  id,
  age,
  age_range,
  gender,
  income_range,
  latitude,
  longitude,
  city,
  state,
  postal_code,
  interests,
  purchase_history,
  total_purchases,
  total_spent_cents,
  is_driver,
  driver_rating,
  total_trips,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  -- Age (actual number)
  18 + floor(random() * 60)::int as age,
  -- Age range - PROPERLY DISTRIBUTED
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
  -- Generate coordinates within ~20km radius of Vijayawada center (16.5062, 80.6480)
  -- Using approximation: 1 degree ≈ 111km at equator
  -- So ~20km ≈ 0.18 degrees
  16.5062 + (random() - 0.5) * 0.36 as latitude,   -- ±20km north/south
  80.6480 + (random() - 0.5) * 0.36 as longitude,  -- ±20km east/west
  'Vijayawada' as city,
  'Andhra Pradesh' as state,
  -- Random postal codes in Vijayawada range
  ('52' || lpad(floor(random() * 10)::text, 1, '0') || lpad(floor(random() * 100)::text, 3, '0')) as postal_code,
  -- Random interests (2-4 interests per user)
  ARRAY(
    SELECT interest FROM (
      VALUES ('food'), ('shopping'), ('entertainment'), ('health'), 
             ('travel'), ('education'), ('services'), ('sports')
    ) AS interests(interest)
    ORDER BY random()
    LIMIT 2 + floor(random() * 3)::int
  ) as interests,
  -- Empty purchase history (would be populated by actual transactions)
  '[]'::jsonb as purchase_history,
  -- Random purchase count (0-50 purchases)
  floor(random() * 51)::int as total_purchases,
  -- Random total spent (0-100000 rupees = 0-10000000 cents)
  floor(random() * 10000000)::int as total_spent_cents,
  -- 20% are drivers (2000 out of 10000)
  (random() < 0.2) as is_driver,
  -- Driver rating (4.0-5.0 for drivers, NULL for non-drivers)
  CASE 
    WHEN random() < 0.2 THEN 4.0 + random()::numeric(3,2)
    ELSE NULL
  END as driver_rating,
  -- Total trips (0-500 for drivers, 0 for non-drivers)
  CASE 
    WHEN random() < 0.2 THEN floor(random() * 500)::int
    ELSE 0
  END as total_trips,
  now() as created_at,
  now() as updated_at
FROM generate_series(1, 10000) AS idx;

-- Verify the distribution
DO $$
DECLARE
  v_total INTEGER;
  v_with_location INTEGER;
  v_drivers INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO v_total FROM user_profiles;
  SELECT COUNT(*) INTO v_with_location FROM user_profiles WHERE latitude IS NOT NULL;
  SELECT COUNT(*) INTO v_drivers FROM user_profiles WHERE is_driver = TRUE;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'Seed Data Verification';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Total users: %', v_total;
  RAISE NOTICE 'Users with location: %', v_with_location;
  RAISE NOTICE 'Drivers: %', v_drivers;
  RAISE NOTICE '';
  RAISE NOTICE 'Age Range Distribution:';
  FOR rec IN (
    SELECT age_range, COUNT(*) as cnt 
    FROM user_profiles 
    GROUP BY age_range 
    ORDER BY age_range
  ) LOOP
    RAISE NOTICE '  %: %', rpad(rec.age_range, 10), rec.cnt;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE 'Gender Distribution:';
  FOR rec IN (
    SELECT gender, COUNT(*) as cnt 
    FROM user_profiles 
    GROUP BY gender 
    ORDER BY gender
  ) LOOP
    RAISE NOTICE '  %: %', rpad(rec.gender, 10), rec.cnt;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_age_range ON user_profiles(age_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON user_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_user_profiles_income_range ON user_profiles(income_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_driver ON user_profiles(is_driver);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles USING GIST(ll_to_earth(latitude, longitude));

COMMENT ON TABLE user_profiles IS 'User profile data with proper age range and location distribution for Vijayawada targeting';
