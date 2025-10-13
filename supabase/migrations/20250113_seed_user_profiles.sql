-- =============================================================================
-- Seed User Profiles for Targeting
-- Creates 10,000 sample users in Bengaluru with realistic data
-- =============================================================================

-- Clear existing data (optional)
-- TRUNCATE user_profiles;

-- Function to generate random location within Bengaluru radius
CREATE OR REPLACE FUNCTION random_location_bengaluru()
RETURNS TABLE(lat DECIMAL, lng DECIMAL) AS $$
DECLARE
  center_lat DECIMAL := 12.930978;
  center_lng DECIMAL := 77.584126;
  radius_km DECIMAL := 20;
  random_angle DECIMAL := random() * 360;
  random_distance_km DECIMAL := random() * radius_km;
BEGIN
  -- Convert to radians and calculate offset
  lat := center_lat + (random_distance_km / 111.0) * cos(radians(random_angle));
  lng := center_lng + (random_distance_km / (111.0 * cos(radians(center_lat)))) * sin(radians(random_angle));
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Insert 10,000 sample users
INSERT INTO user_profiles (
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
  total_purchases,
  total_spent_cents,
  is_driver,
  driver_rating,
  total_trips
)
SELECT
  -- Age: 18-65
  (18 + floor(random() * 48))::INTEGER as age,
  
  -- Age range based on age
  CASE 
    WHEN (18 + floor(random() * 48)) BETWEEN 18 AND 24 THEN '18-24'
    WHEN (18 + floor(random() * 48)) BETWEEN 25 AND 34 THEN '25-34'
    WHEN (18 + floor(random() * 48)) BETWEEN 35 AND 44 THEN '35-44'
    WHEN (18 + floor(random() * 48)) BETWEEN 45 AND 54 THEN '45-54'
    WHEN (18 + floor(random() * 48)) BETWEEN 55 AND 64 THEN '55-64'
    ELSE '65+'
  END as age_range,
  
  -- Gender distribution: 60% male, 30% female, 10% other
  CASE 
    WHEN random() < 0.6 THEN 'male'
    WHEN random() < 0.9 THEN 'female'
    ELSE 'other'
  END as gender,
  
  -- Income range distribution (Indian middle class heavy)
  CASE 
    WHEN random() < 0.15 THEN 'below_3lpa'
    WHEN random() < 0.40 THEN '3-5lpa'
    WHEN random() < 0.70 THEN '5-10lpa'
    WHEN random() < 0.90 THEN '10-20lpa'
    ELSE 'above_20lpa'
  END as income_range,
  
  -- Location: Random point within Bengaluru
  loc.lat,
  loc.lng,
  'Bengaluru' as city,
  'Karnataka' as state,
  (560000 + floor(random() * 100))::TEXT as postal_code,
  
  -- Interests: 1-5 random interests per user
  ARRAY(
    SELECT interest
    FROM unnest(ARRAY[
      'food', 'shopping', 'entertainment', 'travel', 'fitness',
      'technology', 'fashion', 'health', 'education', 'automotive',
      'home_decor', 'sports', 'music', 'movies', 'books'
    ]) AS interest
    ORDER BY random()
    LIMIT (1 + floor(random() * 5))::INTEGER
  ) as interests,
  
  -- Total purchases: 0-100
  floor(random() * 100)::INTEGER as total_purchases,
  
  -- Total spent: ₹0 - ₹100,000 in cents
  floor(random() * 10000000)::BIGINT as total_spent_cents,
  
  -- Is driver: 20% are drivers
  (random() < 0.2) as is_driver,
  
  -- Driver rating: 3.0 - 5.0
  CASE WHEN random() < 0.2 THEN
    (3.0 + random() * 2.0)::DECIMAL(3,2)
  ELSE NULL END as driver_rating,
  
  -- Total trips for drivers: 0-500
  CASE WHEN random() < 0.2 THEN
    floor(random() * 500)::INTEGER
  ELSE 0 END as total_trips

FROM generate_series(1, 10000) as id
CROSS JOIN LATERAL random_location_bengaluru() as loc;

-- Verify data
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE gender = 'male') as male_count,
  COUNT(*) FILTER (WHERE gender = 'female') as female_count,
  COUNT(*) FILTER (WHERE is_driver = TRUE) as driver_count,
  COUNT(*) FILTER (WHERE age_range = '25-34') as age_25_34_count,
  COUNT(*) FILTER (WHERE income_range = '5-10lpa') as income_5_10lpa_count
FROM user_profiles;

-- Create summary view
CREATE OR REPLACE VIEW user_profiles_summary AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE gender = 'male') as males,
  COUNT(*) FILTER (WHERE gender = 'female') as females,
  COUNT(*) FILTER (WHERE is_driver = TRUE) as drivers,
  jsonb_object_agg(age_range, age_count) as by_age,
  jsonb_object_agg(income_range, income_count) as by_income
FROM user_profiles,
LATERAL (
  SELECT age_range, COUNT(*) as age_count
  FROM user_profiles
  GROUP BY age_range
) age_breakdown,
LATERAL (
  SELECT income_range, COUNT(*) as income_count
  FROM user_profiles
  GROUP BY income_range
) income_breakdown
GROUP BY age_range, income_range;

COMMENT ON VIEW user_profiles_summary IS 'Summary statistics for user profiles targeting data';
