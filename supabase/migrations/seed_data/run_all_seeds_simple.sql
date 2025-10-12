-- =====================================================
-- Master Seed Script - Run All Data Population Scripts
-- =====================================================
-- Purpose: Execute all seed data scripts in the correct order
-- This is a simplified version for Supabase SQL Editor
-- =====================================================
-- WARNING: This will temporarily disable RLS on multiple tables
-- Only run this in development/test environments
-- =====================================================

-- Note: Copy and paste each individual script into the SQL Editor
-- in the order listed below, or use this combined script

-- =====================================================
-- Script 1: Populate User Profiles (100 profiles)
-- =====================================================

-- Temporarily disable RLS for bulk insert
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Insert 100 diverse test profiles with realistic data
INSERT INTO profiles (
  id,
  email,
  full_name,
  avatar_url,
  phone,
  city,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'user' || gs || '@synctest.com',
  CASE (random() * 100)::int % 10
    WHEN 0 THEN 'John Smith'
    WHEN 1 THEN 'Sarah Johnson'
    WHEN 2 THEN 'Michael Brown'
    WHEN 3 THEN 'Emily Davis'
    WHEN 4 THEN 'David Wilson'
    WHEN 5 THEN 'Jessica Martinez'
    WHEN 6 THEN 'James Anderson'
    WHEN 7 THEN 'Ashley Taylor'
    WHEN 8 THEN 'Christopher Thomas'
    ELSE 'Jennifer Garcia'
  END || ' ' || gs,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=' || gs,
  '+1-555-' || lpad((1000 + gs)::text, 4, '0') || '-' || lpad((random() * 9999)::int::text, 4, '0'),
  CASE (random() * 9)::int
    WHEN 0 THEN 'New York'
    WHEN 1 THEN 'Los Angeles'
    WHEN 2 THEN 'Chicago'
    WHEN 3 THEN 'Houston'
    WHEN 4 THEN 'Phoenix'
    WHEN 5 THEN 'Philadelphia'
    WHEN 6 THEN 'San Antonio'
    WHEN 7 THEN 'San Diego'
    WHEN 8 THEN 'Dallas'
    ELSE 'Austin'
  END,
  NOW() - (random() * interval '365 days'),
  NOW() - (random() * interval '30 days')
FROM generate_series(1, 100) gs
ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verify profiles
SELECT COUNT(*) as profiles_created FROM profiles WHERE email LIKE '%@synctest.com';

-- =====================================================
-- Script 2: Populate Driver Profiles (20 drivers)
-- =====================================================

-- Temporarily disable RLS for bulk insert
ALTER TABLE driver_profiles DISABLE ROW LEVEL SECURITY;

-- First, get 20 random profile IDs to use as driver profiles
WITH random_profiles AS (
  SELECT id
  FROM profiles
  WHERE email LIKE '%@synctest.com'
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
  60 + (random() * 38)::numeric(5,2),
  (50 + random() * 450)::int,
  GREATEST(1, ((50 + random() * 450) * (0.90 + random() * 0.08))::int),
  GREATEST(0, ((50 + random() * 450) * (0.01 + random() * 0.04))::int),
  (75 + random() * 23)::numeric(5,2),
  (1 + random() * 7)::numeric(5,2),
  (3.8 + random() * 1.2)::numeric(3,2),
  (10 + random() * 190)::int,
  (20 + random() * 180)::numeric(8,2),
  (5 + random() * 85)::int,
  CASE (random() * 3)::int
    WHEN 0 THEN ARRAY['Downtown', 'Midtown']
    WHEN 1 THEN ARRAY['Airport', 'Business District']
    WHEN 2 THEN ARRAY['University Area', 'Shopping District']
    ELSE ARRAY['Residential Areas', 'Entertainment District']
  END,
  (3 + random() * 22)::numeric(8,2),
  (10 + random() * 35)::numeric(8,2),
  GREATEST(1, ((50 + random() * 450) * (0.90 + random() * 0.08) * (0.10 + random() * 0.50))::int),
  GREATEST(1, ((50 + random() * 450) * (0.90 + random() * 0.08) * (0.15 + random() * 0.25))::int),
  random() < 0.8,
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
  NOW() - (random() * interval '7 days'),
  NOW() - (random() * interval '90 days'),
  NOW() - (random() * interval '7 days')
FROM random_profiles rp
ON CONFLICT (profile_id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Verify drivers
SELECT COUNT(*) as drivers_created FROM driver_profiles;

-- =====================================================
-- Script 3: Update Businesses with Cities
-- =====================================================

-- Temporarily disable RLS for bulk update
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;

-- Update existing businesses with random city assignments
UPDATE businesses
SET 
  city = CASE (random() * 9)::int
    WHEN 0 THEN 'New York'
    WHEN 1 THEN 'Los Angeles'
    WHEN 2 THEN 'Chicago'
    WHEN 3 THEN 'Houston'
    WHEN 4 THEN 'Phoenix'
    WHEN 5 THEN 'Philadelphia'
    WHEN 6 THEN 'San Antonio'
    WHEN 7 THEN 'San Diego'
    WHEN 8 THEN 'Dallas'
    ELSE 'Austin'
  END,
  updated_at = NOW()
WHERE city IS NULL OR city = '';

-- Re-enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Verify businesses
SELECT COUNT(*) as businesses_with_city FROM businesses WHERE city IS NOT NULL;

-- =====================================================
-- Script 4: Populate Customer Profiles (80 customers)
-- =====================================================

-- Temporarily disable RLS for bulk insert
ALTER TABLE customer_profiles DISABLE ROW LEVEL SECURITY;

-- Insert customer profiles for all profiles that are not drivers
INSERT INTO customer_profiles (
  profile_id,
  total_trips,
  completed_trips,
  cancelled_trips,
  avg_rating_given,
  total_ratings_given,
  preferred_payment_method,
  preferred_vehicle_type,
  frequent_routes,
  avg_trip_distance,
  avg_trip_cost,
  peak_hour_usage,
  weekend_usage,
  loyalty_tier,
  last_trip_at,
  created_at,
  updated_at
)
SELECT
  p.id,
  (5 + random() * 95)::int,
  GREATEST(1, ((5 + random() * 95) * (0.92 + random() * 0.07))::int),
  GREATEST(0, ((5 + random() * 95) * (0.01 + random() * 0.04))::int),
  (3.5 + random() * 1.5)::numeric(3,2),
  GREATEST(1, ((5 + random() * 95) * (0.92 + random() * 0.07) * (0.80 + random() * 0.20))::int),
  CASE (random() * 10)::int
    WHEN 0 THEN 'credit_card'
    WHEN 1 THEN 'credit_card'
    WHEN 2 THEN 'credit_card'
    WHEN 3 THEN 'credit_card'
    WHEN 4 THEN 'credit_card'
    WHEN 5 THEN 'credit_card'
    WHEN 6 THEN 'debit_card'
    WHEN 7 THEN 'debit_card'
    WHEN 8 THEN 'digital_wallet'
    ELSE 'cash'
  END,
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
  CASE (random() * 4)::int
    WHEN 0 THEN ARRAY['Home to Work', 'Work to Home']
    WHEN 1 THEN ARRAY['Home to Airport', 'Airport to Home']
    WHEN 2 THEN ARRAY['Home to Shopping', 'Home to Restaurant']
    ELSE ARRAY['Office to Meeting', 'Home to Entertainment']
  END,
  (4 + random() * 26)::numeric(8,2),
  (8 + random() * 37)::numeric(8,2),
  (random() < 0.5),
  (random() < 0.4),
  CASE (random() * 10)::int
    WHEN 0 THEN 'bronze'
    WHEN 1 THEN 'bronze'
    WHEN 2 THEN 'bronze'
    WHEN 3 THEN 'bronze'
    WHEN 4 THEN 'bronze'
    WHEN 5 THEN 'silver'
    WHEN 6 THEN 'silver'
    WHEN 7 THEN 'silver'
    WHEN 8 THEN 'gold'
    WHEN 9 THEN 'gold'
    ELSE 'platinum'
  END,
  NOW() - (random() * interval '30 days'),
  NOW() - (random() * interval '180 days'),
  NOW() - (random() * interval '7 days')
FROM profiles p
LEFT JOIN driver_profiles dp ON dp.profile_id = p.id
WHERE dp.profile_id IS NULL AND p.email LIKE '%@synctest.com'
ON CONFLICT (profile_id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Verify customers
SELECT COUNT(*) as customers_created FROM customer_profiles;

-- =====================================================
-- Final Verification Summary
-- =====================================================
SELECT 
  '🎉 Database Population Complete!' as status,
  (SELECT COUNT(*) FROM profiles WHERE email LIKE '%@synctest.com') as test_profiles,
  (SELECT COUNT(*) FROM driver_profiles) as total_drivers,
  (SELECT COUNT(*) FROM customer_profiles) as total_customers,
  (SELECT COUNT(*) FROM businesses WHERE city IS NOT NULL) as businesses_with_city,
  (SELECT ROUND(AVG(driver_score)::numeric, 2) FROM driver_profiles) as avg_driver_score,
  (SELECT COUNT(DISTINCT city) FROM businesses WHERE city IS NOT NULL) as unique_cities;

-- Show sample data
SELECT 
  'Sample Driver Profiles' as section,
  p.full_name,
  p.city,
  dp.driver_score,
  dp.total_trips,
  dp.vehicle_type
FROM driver_profiles dp
JOIN profiles p ON p.id = dp.profile_id
ORDER BY dp.driver_score DESC
LIMIT 5;
