-- =====================================================
-- Script 4: Populate Customer Profiles
-- =====================================================
-- Purpose: Create customer profiles for the remaining users (non-drivers)
-- Run this script last, after all previous population scripts
-- =====================================================

-- Temporarily disable RLS for bulk insert
ALTER TABLE customer_profiles DISABLE ROW LEVEL SECURITY;

-- Insert customer profiles for all profiles that are not drivers
-- This gives us a complete set of user types for testing
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
  -- Total trips: 5-100 range for customers
  (5 + random() * 95)::int,
  -- Completed trips (92-99% of total)
  GREATEST(1, ((5 + random() * 95) * (0.92 + random() * 0.07))::int),
  -- Cancelled trips (1-5% of total)
  GREATEST(0, ((5 + random() * 95) * (0.01 + random() * 0.04))::int),
  -- Average rating given: 3.5-5.0
  (3.5 + random() * 1.5)::numeric(3,2),
  -- Total ratings given: matches completed trips (most customers rate)
  GREATEST(1, ((5 + random() * 95) * (0.92 + random() * 0.07) * (0.80 + random() * 0.20))::int),
  -- Payment methods with realistic distribution
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
  -- Preferred vehicle type
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
  -- Frequent routes: random areas
  CASE (random() * 4)::int
    WHEN 0 THEN ARRAY['Home to Work', 'Work to Home']
    WHEN 1 THEN ARRAY['Home to Airport', 'Airport to Home']
    WHEN 2 THEN ARRAY['Home to Shopping', 'Home to Restaurant']
    ELSE ARRAY['Office to Meeting', 'Home to Entertainment']
  END,
  -- Average trip distance: 4-30 km
  (4 + random() * 26)::numeric(8,2),
  -- Average trip cost: $8-$45
  (8 + random() * 37)::numeric(8,2),
  -- Peak hour usage: 10-50% of trips
  (random() < 0.5),
  -- Weekend usage: 20-40% are weekend users
  (random() < 0.4),
  -- Loyalty tier distribution
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
  -- Last trip: within past 30 days
  NOW() - (random() * interval '30 days'),
  NOW() - (random() * interval '180 days'),
  NOW() - (random() * interval '7 days')
FROM profiles p
LEFT JOIN driver_profiles dp ON dp.profile_id = p.id
WHERE dp.profile_id IS NULL
ON CONFLICT (profile_id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Verify the insertion
SELECT 
  COUNT(*) as total_customers,
  ROUND(AVG(total_trips)::numeric, 2) as avg_total_trips,
  ROUND(AVG(avg_rating_given)::numeric, 2) as avg_rating_given,
  ROUND(AVG(avg_trip_cost)::numeric, 2) as avg_trip_cost,
  COUNT(*) FILTER (WHERE loyalty_tier = 'platinum') as platinum_customers,
  COUNT(*) FILTER (WHERE loyalty_tier = 'gold') as gold_customers,
  COUNT(*) FILTER (WHERE loyalty_tier = 'silver') as silver_customers,
  COUNT(*) FILTER (WHERE loyalty_tier = 'bronze') as bronze_customers
FROM customer_profiles;

-- Show distribution of customers by loyalty tier
SELECT 
  loyalty_tier,
  COUNT(*) as customer_count,
  ROUND(AVG(total_trips)::numeric, 2) as avg_trips,
  ROUND(AVG(avg_trip_cost)::numeric, 2) as avg_cost
FROM customer_profiles
GROUP BY loyalty_tier
ORDER BY 
  CASE loyalty_tier
    WHEN 'platinum' THEN 1
    WHEN 'gold' THEN 2
    WHEN 'silver' THEN 3
    ELSE 4
  END;

-- Show sample of created customer profiles
SELECT 
  cp.profile_id,
  p.full_name,
  p.email,
  cp.total_trips,
  cp.loyalty_tier,
  cp.preferred_payment_method,
  cp.avg_trip_cost,
  cp.last_trip_at
FROM customer_profiles cp
JOIN profiles p ON p.id = cp.profile_id
ORDER BY cp.total_trips DESC
LIMIT 10;

COMMENT ON TABLE customer_profiles IS 'Customer profiles table - populated with test customers (non-drivers)';
