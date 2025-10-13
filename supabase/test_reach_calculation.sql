-- =============================================================================
-- Comprehensive Test Suite for Reach Calculation
-- Run this in Supabase SQL Editor to diagnose issues
-- =============================================================================

-- Test 1: Verify user_profiles table exists and has data
SELECT 'TEST 1: User Profiles Table' as test_name;
SELECT COUNT(*) as total_users FROM user_profiles;
SELECT 
  COUNT(DISTINCT age_range) as unique_age_ranges,
  COUNT(DISTINCT gender) as unique_genders,
  COUNT(DISTINCT income_range) as unique_income_ranges,
  COUNT(*) FILTER (WHERE is_driver = TRUE) as total_drivers
FROM user_profiles;

-- Test 2: Check age range distribution
SELECT 'TEST 2: Age Range Distribution' as test_name;
SELECT age_range, COUNT(*) as count
FROM user_profiles
GROUP BY age_range
ORDER BY age_range;

-- Test 3: Check gender distribution
SELECT 'TEST 3: Gender Distribution' as test_name;
SELECT gender, COUNT(*) as count
FROM user_profiles
GROUP BY gender;

-- Test 4: Test demographics filter ONLY (age range)
SELECT 'TEST 4: Demographics Filter (Age 25-45)' as test_name;
SELECT calculate_campaign_reach(
  jsonb_build_object(
    'demographics', jsonb_build_object(
      'ageRanges', jsonb_build_array('25-45')
    )
  ),
  TRUE -- debug mode
);

-- Test 5: Test demographics filter (gender)
SELECT 'TEST 5: Demographics Filter (Male)' as test_name;
SELECT calculate_campaign_reach(
  jsonb_build_object(
    'demographics', jsonb_build_object(
      'gender', jsonb_build_array('male')
    )
  ),
  TRUE
);

-- Test 6: Test demographics filter (age + gender)
SELECT 'TEST 6: Demographics Filter (Age 25-45 + Male)' as test_name;
SELECT calculate_campaign_reach(
  jsonb_build_object(
    'demographics', jsonb_build_object(
      'ageRanges', jsonb_build_array('25-45'),
      'gender', jsonb_build_array('male')
    )
  ),
  TRUE
);

-- Test 7: Test location filter ONLY (3km radius)
SELECT 'TEST 7: Location Filter (3km radius)' as test_name;
SELECT calculate_campaign_reach(
  jsonb_build_object(
    'location', jsonb_build_object(
      'lat', 16.5062,
      'lng', 80.6480,
      'radiusKm', 3
    )
  ),
  TRUE
);

-- Test 8: Test location filter (10km radius)
SELECT 'TEST 8: Location Filter (10km radius)' as test_name;
SELECT calculate_campaign_reach(
  jsonb_build_object(
    'location', jsonb_build_object(
      'lat', 16.5062,
      'lng', 80.6480,
      'radiusKm', 10
    )
  ),
  TRUE
);

-- Test 9: Test behavior filter ONLY (drivers)
SELECT 'TEST 9: Behavior Filter (Drivers Only)' as test_name;
SELECT calculate_campaign_reach(
  jsonb_build_object(
    'behavior', jsonb_build_object(
      'isDriver', true
    )
  ),
  TRUE
);

-- Test 10: Test combined filters
SELECT 'TEST 10: Combined Filters (Age + Gender + Location + Drivers)' as test_name;
SELECT calculate_campaign_reach(
  jsonb_build_object(
    'demographics', jsonb_build_object(
      'ageRanges', jsonb_build_array('25-45'),
      'gender', jsonb_build_array('male')
    ),
    'location', jsonb_build_object(
      'lat', 16.5062,
      'lng', 80.6480,
      'radiusKm', 5
    ),
    'behavior', jsonb_build_object(
      'isDriver', true
    )
  ),
  TRUE
);

-- Test 11: Verify PostGIS functions work
SELECT 'TEST 11: PostGIS Functions Test' as test_name;
SELECT 
  ll_to_earth(16.5062, 80.6480) as center_point,
  earth_distance(
    ll_to_earth(16.5062, 80.6480),
    ll_to_earth(16.5000, 80.6500)
  ) as distance_meters;

-- Test 12: Manual query to verify location filtering
SELECT 'TEST 12: Manual Location Query (3km)' as test_name;
SELECT COUNT(*) as users_within_3km
FROM user_profiles
WHERE earth_distance(
  ll_to_earth(latitude, longitude),
  ll_to_earth(16.5062, 80.6480)
) <= 3000;

-- Test 13: Check if latitude/longitude are NULL
SELECT 'TEST 13: NULL Location Check' as test_name;
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE latitude IS NULL) as null_lat,
  COUNT(*) FILTER (WHERE longitude IS NULL) as null_lng,
  COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as valid_locations
FROM user_profiles;

-- Test 14: Sample user locations
SELECT 'TEST 14: Sample User Locations' as test_name;
SELECT 
  user_id,
  age_range,
  gender,
  is_driver,
  latitude,
  longitude,
  earth_distance(
    ll_to_earth(latitude, longitude),
    ll_to_earth(16.5062, 80.6480)
  ) / 1000.0 as distance_km
FROM user_profiles
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
ORDER BY distance_km
LIMIT 10;

-- Test 15: Test empty filters (should return all users)
SELECT 'TEST 15: Empty Filters (All Users)' as test_name;
SELECT calculate_campaign_reach(
  '{}'::jsonb,
  TRUE
);
