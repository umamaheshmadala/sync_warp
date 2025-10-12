-- =====================================================
-- Script 3: Update Businesses with City Data
-- =====================================================
-- Purpose: Add city information to existing business records for location-based targeting
-- Run this script after populating profiles and driver profiles
-- =====================================================

-- Temporarily disable RLS for bulk update
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;

-- Update existing businesses with random city assignments
-- This ensures businesses have proper location data for targeting campaigns
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

-- Verify the update
SELECT 
  COUNT(*) as total_businesses,
  COUNT(DISTINCT city) as unique_cities,
  city,
  COUNT(*) as businesses_per_city
FROM businesses
WHERE city IS NOT NULL
GROUP BY city
ORDER BY businesses_per_city DESC;

-- Show sample of updated businesses
SELECT 
  id,
  name,
  city,
  updated_at
FROM businesses
WHERE city IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

COMMENT ON COLUMN businesses.city IS 'City where business operates - populated for targeting campaigns';
