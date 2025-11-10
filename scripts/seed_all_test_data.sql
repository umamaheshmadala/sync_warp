-- ==========================================
-- COMPREHENSIVE TEST DATA SEEDING SCRIPT
-- For SynC App - Supabase Database
-- ==========================================

-- Step 1: Create a temporary function to bypass RLS
CREATE OR REPLACE FUNCTION seed_test_data()
RETURNS TABLE(
  profiles_inserted int,
  drivers_inserted int,
  customers_inserted int
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_profiles_count int;
  v_drivers_count int;
  v_customers_count int;
BEGIN
  -- Insert 100 test profiles
  WITH city_list AS (
    SELECT unnest(ARRAY[
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
      'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
      'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
      'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara',
      'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad'
    ]) AS city_name
  ),
  inserted_profiles AS (
    INSERT INTO profiles (
      id, email, full_name, phone, role, city, interests,
      is_driver, driver_score, bio, location, date_of_birth,
      profile_completion, is_online, created_at, updated_at, last_active
    )
    SELECT
      gen_random_uuid(),
      'testuser' || n || '@sync.app',
      'Test User ' || n,
      '+91' || (6000000000 + n)::text,
      CASE 
        WHEN n <= 72 THEN 'customer'::user_role
        WHEN n <= 87 THEN 'driver'::user_role
        ELSE 'business_owner'::user_role
      END,
      (SELECT city_name FROM city_list ORDER BY random() LIMIT 1),
      ARRAY(
        SELECT category FROM (
          VALUES ('food'), ('shopping'), ('entertainment'), ('travel'), 
                 ('sports'), ('music'), ('movies'), ('technology')
        ) AS t(category) 
        ORDER BY random() 
        LIMIT floor(random() * 4 + 1)::int
      ),
      (n BETWEEN 73 AND 87),
      CASE WHEN n BETWEEN 73 AND 87 THEN floor(random() * 100)::int ELSE 0 END,
      'Test user profile for SynC app development and testing purposes.',
      (SELECT city_name FROM city_list ORDER BY random() LIMIT 1),
      CURRENT_DATE - (floor(random() * 14600) + 6570)::int,
      floor(random() * 40 + 60)::int,
      random() > 0.7,
      NOW() - (random() * interval '365 days'),
      NOW() - (random() * interval '30 days'),
      NOW() - (random() * interval '7 days')
    FROM generate_series(5, 104) AS n
    ON CONFLICT (email) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_profiles_count FROM inserted_profiles;

  -- Insert driver profiles for users with is_driver = true
  WITH available_cities AS (
    SELECT id FROM cities LIMIT 20
  ),
  driver_users AS (
    SELECT id FROM profiles WHERE is_driver = true
  ),
  inserted_drivers AS (
    INSERT INTO driver_profiles (
      id, user_id, city_id, total_activity_score,
      coupons_collected_score, coupons_shared_score,
      coupons_redeemed_score, checkins_score, reviews_score,
      social_interactions_score, city_rank, percentile, is_driver,
      total_coupons_collected, total_coupons_shared,
      total_coupons_redeemed, total_checkins, total_reviews,
      score_30d, score_90d, first_activity_at, last_activity_at,
      last_calculated_at, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      du.id,
      (SELECT id FROM available_cities ORDER BY random() LIMIT 1),
      floor(random() * 10000 + 1000)::numeric,
      floor(random() * 2000 + 100)::numeric,
      floor(random() * 3000 + 200)::numeric,
      floor(random() * 1500 + 150)::numeric,
      floor(random() * 1000 + 100)::numeric,
      floor(random() * 1200 + 80)::numeric,
      floor(random() * 800 + 50)::numeric,
      floor(random() * 1000 + 1)::int,
      round((random() * 100)::numeric, 2),
      true,
      floor(random() * 500 + 50)::int,
      floor(random() * 800 + 100)::int,
      floor(random() * 300 + 20)::int,
      floor(random() * 200 + 10)::int,
      floor(random() * 150 + 5)::int,
      floor(random() * 3000 + 500)::numeric,
      floor(random() * 8000 + 1000)::numeric,
      NOW() - (random() * interval '365 days'),
      NOW() - (random() * interval '7 days'),
      NOW(),
      NOW() - (random() * interval '180 days'),
      NOW()
    FROM driver_users du
    ON CONFLICT (user_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_drivers_count FROM inserted_drivers;

  -- Insert business customer profiles
  WITH existing_businesses AS (
    SELECT id FROM businesses LIMIT 10
  ),
  inserted_customers AS (
    INSERT INTO business_customer_profiles (
      id, business_id, primary_age_ranges, gender_distribution,
      income_levels, interest_categories, customer_behavior_notes,
      typical_visit_duration, repeat_customer_rate, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      eb.id,
      ARRAY(
        SELECT age FROM (
          VALUES ('18-24'), ('25-34'), ('35-44'), ('45-54'), ('55+')
        ) AS t(age) 
        ORDER BY random() 
        LIMIT floor(random() * 3 + 1)::int
      ),
      jsonb_build_object(
        'male', floor(random() * 60 + 20)::int,
        'female', floor(random() * 60 + 20)::int,
        'other', floor(random() * 10)::int
      ),
      ARRAY(
        SELECT income FROM (
          VALUES ('low'), ('medium'), ('high'), ('premium')
        ) AS t(income) 
        ORDER BY random() 
        LIMIT floor(random() * 2 + 1)::int
      ),
      ARRAY(
        SELECT category FROM (
          VALUES ('dining'), ('shopping'), ('entertainment'), ('wellness'),
                 ('travel'), ('technology'), ('fashion'), ('sports')
        ) AS t(category) 
        ORDER BY random() 
        LIMIT floor(random() * 4 + 2)::int
      ),
      CASE floor(random() * 5)::int
        WHEN 0 THEN 'High foot traffic during lunch hours. Price-sensitive customers.'
        WHEN 1 THEN 'Weekend shoppers, family-oriented. Values quality over price.'
        WHEN 2 THEN 'Young professionals, tech-savvy. Prefers digital payments.'
        WHEN 3 THEN 'Regular customers, brand loyal. Responds well to loyalty programs.'
        ELSE 'Mixed demographic. Peak hours evening 6-9 PM.'
      END,
      floor(random() * 120 + 30)::int,
      floor(random() * 50 + 30)::int,
      NOW() - (random() * interval '180 days'),
      NOW() - (random() * interval '30 days')
    FROM existing_businesses eb
    ON CONFLICT (business_id) DO UPDATE SET
      updated_at = NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_customers_count FROM inserted_customers;

  RETURN QUERY SELECT v_profiles_count, v_drivers_count, v_customers_count;
END;
$$;

-- Execute the seeding function
SELECT * FROM seed_test_data();

-- Drop the temporary function
DROP FUNCTION IF EXISTS seed_test_data();

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verification queries
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN is_driver THEN 1 END) as drivers,
  COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
  COUNT(CASE WHEN role = 'business_owner' THEN 1 END) as business_owners
FROM profiles;

SELECT COUNT(*) as total_driver_profiles FROM driver_profiles;

SELECT COUNT(*) as total_business_customer_profiles FROM business_customer_profiles;
