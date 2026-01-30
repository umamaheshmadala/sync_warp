-- =====================================================
-- Script 2: Populate 20 Driver Profiles
-- =====================================================
-- Purpose: Create driver profiles with varied characteristics for targeting
-- Run this script after populating base profiles (01_populate_profiles.sql)
-- =====================================================

-- Temporarily disable RLS for bulk insert
ALTER TABLE driver_profiles DISABLE ROW LEVEL SECURITY;

-- First, get 20 random profile IDs to use as driver profiles
WITH random_profiles AS (
  SELECT id
  FROM profiles
  ORDER BY random()
  LIMIT 20
)
-- Insert 20 driver profiles with diverse characteristics
INSERT INTO driver_profiles (
  profile_id,
  driver_score,
  total_trips,
  completed_trips,
  cancelled_trips,
  acceptance_rate,
  cancellation_rate,
  avg_rating,
  total_ratings,
  online_hours,
  active_days,
  preferred_areas,
  avg_trip_distance,
  avg_trip_duration,
  peak_hour_trips,
  weekend_trips,
  verified,
  vehicle_type,
  last_active_at,
  created_at,
  updated_at
)
SELECT
  rp.id,
  -- Driver score: 60-98 range for realistic distribution
  60 + (random() * 38)::numeric(5,2),
  -- Total trips: 50-500 range
  (50 + random() * 450)::int,
  -- Completed trips (90-98% of total)
  GREATEST(1, ((50 + random() * 450) * (0.90 + random() * 0.08))::int),
  -- Cancelled trips (1-5% of total)
  GREATEST(0, ((50 + random() * 450) * (0.01 + random() * 0.04))::int),
  -- Acceptance rate: 75-98%
  (75 + random() * 23)::numeric(5,2),
  -- Cancellation rate: 1-8%
  (1 + random() * 7)::numeric(5,2),
  -- Average rating: 3.8-5.0
  (3.8 + random() * 1.2)::numeric(3,2),
  -- Total ratings: 10-200
  (10 + random() * 190)::int,
  -- Online hours: 20-200 hours
  (20 + random() * 180)::numeric(8,2),
  -- Active days: 5-90 days
  (5 + random() * 85)::int,
  -- Preferred areas: random mix of cities
  CASE (random() * 3)::int
    WHEN 0 THEN ARRAY['Downtown', 'Midtown']
    WHEN 1 THEN ARRAY['Airport', 'Business District']
    WHEN 2 THEN ARRAY['University Area', 'Shopping District']
    ELSE ARRAY['Residential Areas', 'Entertainment District']
  END,
  -- Average trip distance: 3-25 km
  (3 + random() * 22)::numeric(8,2),
  -- Average trip duration: 10-45 minutes
  (10 + random() * 35)::numeric(8,2),
  -- Peak hour trips: 10-60% of completed trips
  GREATEST(1, ((50 + random() * 450) * (0.90 + random() * 0.08) * (0.10 + random() * 0.50))::int),
  -- Weekend trips: 15-40% of completed trips
  GREATEST(1, ((50 + random() * 450) * (0.90 + random() * 0.08) * (0.15 + random() * 0.25))::int),
  -- Verified: 80% are verified
  random() < 0.8,
  -- Vehicle types with realistic distribution
  CASE (random() * 10)::int
    WHEN 0 THEN 'sedan'
    WHEN 1 THEN 'sedan'
    WHEN 2 THEN 'sedan'
    WHEN 3 THEN 'sedan'
    WHEN 4 THEN 'sedan'
    WHEN 5 THEN 'suv'
    WHEN 6 THEN 'suv'
    WHEN 7 THEN 'luxury'
    WHEN 8 THEN 'van'
    ELSE 'economy'
  END,
  -- Last active: within the past 7 days
  NOW() - (random() * interval '7 days'),
  NOW() - (random() * interval '90 days'),
  NOW() - (random() * interval '7 days')
FROM random_profiles rp
ON CONFLICT (profile_id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Verify the insertion
SELECT 
  COUNT(*) as total_drivers,
  ROUND(AVG(driver_score)::numeric, 2) as avg_driver_score,
  ROUND(AVG(acceptance_rate)::numeric, 2) as avg_acceptance_rate,
  ROUND(AVG(avg_rating)::numeric, 2) as avg_rating,
  COUNT(*) FILTER (WHERE verified = true) as verified_drivers
FROM driver_profiles;

-- Show sample of created driver profiles
SELECT 
  dp.profile_id,
  p.full_name,
  p.email,
  dp.driver_score,
  dp.total_trips,
  dp.acceptance_rate,
  dp.avg_rating,
  dp.vehicle_type,
  dp.verified
FROM driver_profiles dp
JOIN profiles p ON p.id = dp.profile_id
ORDER BY dp.driver_score DESC
LIMIT 10;

COMMENT ON TABLE driver_profiles IS 'Driver profiles table - populated with 20 test drivers';
