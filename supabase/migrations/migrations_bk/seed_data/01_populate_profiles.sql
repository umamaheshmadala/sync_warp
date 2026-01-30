-- =====================================================
-- Script 1: Populate 100 Test User Profiles
-- =====================================================
-- Purpose: Create diverse user profiles for testing the targeting system
-- Run this script first to establish the user base
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
  -- Assign cities randomly for location-based targeting
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

-- Verify the insertion
SELECT 
  COUNT(*) as total_profiles,
  MIN(created_at) as oldest_profile,
  MAX(created_at) as newest_profile
FROM profiles;

-- Show sample of created profiles
SELECT 
  id,
  email,
  full_name,
  phone,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

COMMENT ON TABLE profiles IS 'User profiles table - populated with 100 test users';
