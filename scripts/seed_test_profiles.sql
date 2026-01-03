-- Seed Test User Profiles (100 users)
-- This script creates test profiles without requiring auth.users entries

-- Indian cities to use for profiles
WITH city_names AS (
  SELECT unnest(ARRAY[
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
    'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
    'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara',
    'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
    'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar', 'Varanasi',
    'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai',
    'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur'
  ]) AS city
),
interest_options AS (
  SELECT unnest(ARRAY[
    'food', 'shopping', 'entertainment', 'travel', 'sports',
    'music', 'movies', 'books', 'technology', 'fashion',
    'fitness', 'gaming', 'photography', 'art', 'cooking'
  ]) AS interest
),
roles AS (
  SELECT unnest(ARRAY['customer', 'driver', 'business_owner']) AS role
)
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  city,
  interests,
  is_driver,
  driver_score,
  bio,
  location,
  date_of_birth,
  profile_completion,
  is_online,
  created_at,
  updated_at,
  last_active
)
SELECT
  gen_random_uuid() AS id,
  'testuser' || n || '@sync.app' AS email,
  'Test User ' || n AS full_name,
  '+91' || (6000000000 + n)::text AS phone,
  CASE 
    WHEN n <= 75 THEN 'customer'
    WHEN n <= 90 THEN 'driver'
    ELSE 'business_owner'
  END AS role,
  (SELECT city FROM city_names ORDER BY random() LIMIT 1) AS city,
  ARRAY(
    SELECT interest FROM interest_options 
    ORDER BY random() 
    LIMIT floor(random() * 5 + 1)::int
  ) AS interests,
  (n BETWEEN 76 AND 90) AS is_driver,
  CASE 
    WHEN n BETWEEN 76 AND 90 THEN floor(random() * 100)::int
    ELSE 0
  END AS driver_score,
  'Test user profile for development and testing purposes.' AS bio,
  (SELECT city FROM city_names ORDER BY random() LIMIT 1) AS location,
  CURRENT_DATE - (floor(random() * 14600) + 6570)::int AS date_of_birth, -- Age 18-58
  floor(random() * 40 + 60)::int AS profile_completion, -- 60-100%
  random() > 0.7 AS is_online,
  NOW() - (random() * interval '365 days') AS created_at,
  NOW() - (random() * interval '30 days') AS updated_at,
  NOW() - (random() * interval '7 days') AS last_active
FROM generate_series(4, 103) AS n
ON CONFLICT (id) DO NOTHING;

-- Verify insert
SELECT COUNT(*) as total_profiles, 
       COUNT(CASE WHEN is_driver THEN 1 END) as drivers,
       COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
       COUNT(CASE WHEN role = 'business_owner' THEN 1 END) as business_owners
FROM profiles;
