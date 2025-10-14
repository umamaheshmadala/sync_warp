-- =============================================================================
-- COMPLETE User Profiles Seed Data - Addresses All Targeting Filter Issues
-- =============================================================================
-- This migration creates realistic user data for multiple cities with proper
-- behavior tracking, demographics, and interest categories
-- =============================================================================

-- Clear existing data
TRUNCATE TABLE user_profiles CASCADE;

-- Define city centers for major Indian cities
DO $$
DECLARE
  cities JSONB := '[
    {"name": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946, "postal_prefix": "560"},
    {"name": "Vijayawada", "state": "Andhra Pradesh", "lat": 16.5062, "lng": 80.6480, "postal_prefix": "520"},
    {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lng": 78.4867, "postal_prefix": "500"},
    {"name": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707, "postal_prefix": "600"},
    {"name": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777, "postal_prefix": "400"}
  ]'::jsonb;
  city JSONB;
  users_per_city INTEGER := 2000; -- 10,000 total users across 5 cities
BEGIN
  -- Loop through each city
  FOR city IN SELECT * FROM jsonb_array_elements(cities)
  LOOP
    -- Generate users for this city
    INSERT INTO user_profiles (
      id,
      date_of_birth,        -- NEW: For accurate age calculation
      age,                  -- Calculated from DOB
      age_range,            -- Derived from age
      gender,
      income_range,
      latitude,
      longitude,
      city,
      state,
      postal_code,
      interests,            -- FIXED: Proper interest categories
      purchase_history,
      total_purchases,
      total_spent_cents,
      is_driver,
      driver_rating,
      total_trips,
      
      -- NEW: Behavior tracking columns
      last_active_at,       -- For identifying active users
      signup_date,          -- For new vs existing customers
      last_purchase_at,     -- For customer segmentation
      checkin_count,        -- For checked-in users
      favorite_businesses,  -- For power users
      
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid() as id,
      
      -- Date of Birth (ages 18-70)
      (current_date - interval '1 year' * (18 + floor(random() * 52)::int))::date as date_of_birth,
      
      -- Age (calculated from DOB)
      18 + floor(random() * 52)::int as age,
      
      -- Age Range (derived from age)
      CASE 
        WHEN (18 + floor(random() * 52)::int) BETWEEN 18 AND 24 THEN '18-24'
        WHEN (18 + floor(random() * 52)::int) BETWEEN 25 AND 34 THEN '25-34'
        WHEN (18 + floor(random() * 52)::int) BETWEEN 35 AND 44 THEN '35-44'
        WHEN (18 + floor(random() * 52)::int) BETWEEN 45 AND 54 THEN '45-54'
        WHEN (18 + floor(random() * 52)::int) BETWEEN 55 AND 64 THEN '55-64'
        ELSE '65+'
      END as age_range,
      
      -- Gender (60% male, 35% female, 5% other)
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
      
      -- Location within 20km radius of city center
      (city->>'lat')::decimal + (random() - 0.5) * 0.36 as latitude,
      (city->>'lng')::decimal + (random() - 0.5) * 0.36 as longitude,
      city->>'name' as city,
      city->>'state' as state,
      (city->>'postal_prefix') || lpad(floor(random() * 100)::text, 3, '0') as postal_code,
      
      -- Interests (realistic categories that businesses can target)
      (
        SELECT array_agg(interest)
        FROM (
          SELECT unnest(ARRAY[
            'food', 'shopping', 'entertainment', 'health', 
            'travel', 'education', 'services', 'sports',
            'technology', 'fashion', 'home', 'automotive'
          ]) as interest
          ORDER BY random()
          LIMIT 2 + floor(random() * 3)::int
        ) AS selected_interests
      ) as interests,
      
      -- Purchase history (empty JSONB array)
      '[]'::jsonb as purchase_history,
      
      -- Purchase metrics
      floor(random() * 51)::int as total_purchases,
      floor(random() * 10000000)::int as total_spent_cents,
      
      -- Driver status (20% are drivers)
      (random() < 0.2) as is_driver,
      CASE WHEN random() < 0.2 THEN 4.0 + random()::numeric(3,2) ELSE NULL END as driver_rating,
      CASE WHEN random() < 0.2 THEN floor(random() * 500)::int ELSE 0 END as total_trips,
      
      -- BEHAVIOR TRACKING (NEW)
      
      -- Last active (distribute across last 90 days, some never active)
      CASE 
        WHEN random() < 0.8 THEN now() - (random() * interval '90 days')
        ELSE NULL  -- 20% inactive users
      END as last_active_at,
      
      -- Signup date (distribute across last 2 years)
      now() - (random() * interval '730 days') as signup_date,
      
      -- Last purchase (60% have purchased, 40% never purchased)
      CASE 
        WHEN random() < 0.6 THEN now() - (random() * interval '180 days')
        ELSE NULL
      END as last_purchase_at,
      
      -- Check-in count (30% have checked in)
      CASE 
        WHEN random() < 0.3 THEN floor(random() * 20)::int
        ELSE 0
      END as checkin_count,
      
      -- Favorite businesses (power users have 3-10, others 0-2)
      CASE 
        WHEN random() < 0.1 THEN  -- 10% power users
          ARRAY(
            SELECT gen_random_uuid()
            FROM generate_series(1, 3 + floor(random() * 8)::int)
          )
        WHEN random() < 0.4 THEN  -- 30% regular users
          ARRAY(
            SELECT gen_random_uuid()
            FROM generate_series(1, 1 + floor(random() * 2)::int)
          )
        ELSE  -- 60% casual users
          ARRAY[]::uuid[]
      END as favorite_businesses,
      
      now() as created_at,
      now() as updated_at
      
    FROM generate_series(1, users_per_city) AS idx;
    
    RAISE NOTICE 'Generated % users for %', users_per_city, city->>'name';
  END LOOP;
END $$;

-- Create helper function to calculate customer segment
CREATE OR REPLACE FUNCTION get_customer_segment(
  p_signup_date TIMESTAMP,
  p_last_purchase_at TIMESTAMP,
  p_total_purchases INTEGER,
  p_checkin_count INTEGER,
  p_favorite_businesses UUID[]
)
RETURNS TEXT AS $$
BEGIN
  -- Power Users: Top 10% (3+ favorite businesses OR 20+ purchases)
  IF array_length(p_favorite_businesses, 1) >= 3 OR p_total_purchases >= 20 THEN
    RETURN 'power_users';
  END IF;
  
  -- New Customers: Signed up within last 30 days, no purchases
  IF p_signup_date >= now() - interval '30 days' AND p_last_purchase_at IS NULL THEN
    RETURN 'new_customers';
  END IF;
  
  -- Existing Customers: Have made at least one purchase
  IF p_last_purchase_at IS NOT NULL THEN
    RETURN 'existing_customers';
  END IF;
  
  -- Checked-In Users: Have checked in at least once
  IF p_checkin_count > 0 THEN
    RETURN 'checked_in';
  END IF;
  
  -- Default: Regular user
  RETURN 'regular';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verify the data distribution
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '              SEED DATA VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Total users
  SELECT COUNT(*) INTO rec FROM user_profiles;
  RAISE NOTICE 'Total users: %', rec;
  
  RAISE NOTICE '';
  RAISE NOTICE 'CITY DISTRIBUTION:';
  FOR rec IN (
    SELECT city, state, COUNT(*) as count
    FROM user_profiles
    GROUP BY city, state
    ORDER BY count DESC
  ) LOOP
    RAISE NOTICE '  %: % users', rpad(rec.city || ', ' || rec.state, 35), rec.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'AGE DISTRIBUTION:';
  FOR rec IN (
    SELECT age_range, COUNT(*) as count
    FROM user_profiles
    GROUP BY age_range
    ORDER BY age_range
  ) LOOP
    RAISE NOTICE '  %: % users', rpad(rec.age_range, 10), rec.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'GENDER DISTRIBUTION:';
  FOR rec IN (
    SELECT gender, COUNT(*) as count
    FROM user_profiles
    GROUP BY gender
    ORDER BY count DESC
  ) LOOP
    RAISE NOTICE '  %: % users', rpad(rec.gender, 10), rec.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'BEHAVIOR SEGMENTS:';
  SELECT COUNT(*) FILTER (WHERE last_purchase_at IS NULL) INTO rec FROM user_profiles;
  RAISE NOTICE '  New Customers (no purchases): % users', rec;
  
  SELECT COUNT(*) FILTER (WHERE last_purchase_at IS NOT NULL) INTO rec FROM user_profiles;
  RAISE NOTICE '  Existing Customers: % users', rec;
  
  SELECT COUNT(*) FILTER (WHERE array_length(favorite_businesses, 1) >= 3 OR total_purchases >= 20) INTO rec FROM user_profiles;
  RAISE NOTICE '  Power Users: % users', rec;
  
  SELECT COUNT(*) FILTER (WHERE checkin_count > 0) INTO rec FROM user_profiles;
  RAISE NOTICE '  Checked-In Users: % users', rec;
  
  RAISE NOTICE '';
  RAISE NOTICE 'INTERESTS:';
  FOR rec IN (
    SELECT interest, COUNT(*) as count
    FROM user_profiles, unnest(interests) as interest
    GROUP BY interest
    ORDER BY count DESC
    LIMIT 5
  ) LOOP
    RAISE NOTICE '  %: % users', rpad(rec.interest, 15), rec.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'DRIVERS:';
  SELECT COUNT(*) FILTER (WHERE is_driver = TRUE) INTO rec FROM user_profiles;
  RAISE NOTICE '  Total drivers: % users', rec;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles(city);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age_range ON user_profiles(age_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON user_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_user_profiles_income_range ON user_profiles(income_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_driver ON user_profiles(is_driver);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles USING GIST(ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON user_profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_purchase ON user_profiles(last_purchase_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_checkin_count ON user_profiles(checkin_count);
CREATE INDEX IF NOT EXISTS idx_user_profiles_signup_date ON user_profiles(signup_date);

COMMENT ON TABLE user_profiles IS 'User profiles with multi-city support and comprehensive behavior tracking for targeting';
COMMENT ON COLUMN user_profiles.date_of_birth IS 'User date of birth for accurate age calculation and birthday campaigns';
COMMENT ON COLUMN user_profiles.last_active_at IS 'Last activity timestamp for engagement tracking';
COMMENT ON COLUMN user_profiles.signup_date IS 'User signup date for new vs existing customer segmentation';
COMMENT ON COLUMN user_profiles.last_purchase_at IS 'Last purchase timestamp for customer behavior analysis';
COMMENT ON COLUMN user_profiles.checkin_count IS 'Number of check-ins for location-based engagement';
COMMENT ON COLUMN user_profiles.favorite_businesses IS 'Array of favorited business IDs for power user identification';
