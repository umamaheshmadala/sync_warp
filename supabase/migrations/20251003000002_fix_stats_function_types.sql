-- Migration: Fix Type Mismatch in Stats Functions
-- Created: 2025-10-03
-- Purpose: Fix VARCHAR(100) vs TEXT type mismatch

-- Drop and recreate the function with correct types
DROP FUNCTION IF EXISTS recalculate_coupon_stats();

CREATE OR REPLACE FUNCTION recalculate_coupon_stats()
RETURNS TABLE (
  coupon_id UUID,
  coupon_title VARCHAR(100),
  old_usage_count INTEGER,
  new_usage_count INTEGER,
  old_collection_count INTEGER,
  new_collection_count INTEGER,
  usage_diff INTEGER,
  collection_diff INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH actual_stats AS (
    SELECT 
      bc.id as coupon_id,
      bc.title::VARCHAR(100) as coupon_title,
      bc.usage_count as old_usage_count,
      bc.collection_count as old_collection_count,
      COALESCE(COUNT(DISTINCT cr.id), 0)::INTEGER as calculated_usage_count,
      COALESCE(COUNT(DISTINCT ucc.id), 0)::INTEGER as calculated_collection_count
    FROM business_coupons bc
    LEFT JOIN coupon_redemptions cr 
      ON bc.id = cr.coupon_id 
      AND cr.status = 'completed'
    LEFT JOIN user_coupon_collections ucc 
      ON bc.id = ucc.coupon_id
    GROUP BY bc.id, bc.title, bc.usage_count, bc.collection_count
  )
  SELECT 
    s.coupon_id,
    s.coupon_title,
    s.old_usage_count,
    s.calculated_usage_count as new_usage_count,
    s.old_collection_count,
    s.calculated_collection_count as new_collection_count,
    (s.calculated_usage_count - s.old_usage_count) as usage_diff,
    (s.calculated_collection_count - s.old_collection_count) as collection_diff
  FROM actual_stats s
  WHERE s.old_usage_count != s.calculated_usage_count
     OR s.old_collection_count != s.calculated_collection_count
  ORDER BY ABS((s.calculated_usage_count - s.old_usage_count) + (s.calculated_collection_count - s.old_collection_count)) DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION recalculate_coupon_stats() TO authenticated;

-- Test the function (should return empty if all stats are accurate)
SELECT * FROM recalculate_coupon_stats();
