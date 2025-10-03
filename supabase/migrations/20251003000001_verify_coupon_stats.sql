-- Migration: Verify and Fix Coupon Statistics
-- Created: 2025-10-03
-- Purpose: Ensure coupon usage_count and collection_count are accurate

-- Function to recalculate and fix coupon statistics
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

-- Function to fix coupon statistics
CREATE OR REPLACE FUNCTION fix_coupon_stats()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  fixed_count INTEGER := 0;
  coupon_record RECORD;
  result JSONB;
BEGIN
  -- Update all coupon stats based on actual data
  FOR coupon_record IN
    SELECT 
      bc.id,
      bc.title,
      bc.usage_count as old_usage,
      bc.collection_count as old_collection,
      COALESCE(COUNT(DISTINCT cr.id), 0)::INTEGER as actual_usage,
      COALESCE(COUNT(DISTINCT ucc.id), 0)::INTEGER as actual_collection
    FROM business_coupons bc
    LEFT JOIN coupon_redemptions cr 
      ON bc.id = cr.coupon_id 
      AND cr.status = 'completed'
    LEFT JOIN user_coupon_collections ucc 
      ON bc.id = ucc.coupon_id
    GROUP BY bc.id, bc.title, bc.usage_count, bc.collection_count
    HAVING bc.usage_count != COALESCE(COUNT(DISTINCT cr.id), 0)
        OR bc.collection_count != COALESCE(COUNT(DISTINCT ucc.id), 0)
  LOOP
    UPDATE business_coupons
    SET 
      usage_count = coupon_record.actual_usage,
      collection_count = coupon_record.actual_collection,
      updated_at = NOW()
    WHERE id = coupon_record.id;
    
    fixed_count := fixed_count + 1;
    
    RAISE NOTICE 'Fixed stats for coupon: % (usage: % -> %, collection: % -> %)',
      coupon_record.title,
      coupon_record.old_usage,
      coupon_record.actual_usage,
      coupon_record.old_collection,
      coupon_record.actual_collection;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'fixed_count', fixed_count,
    'message', 'Updated ' || fixed_count || ' coupon(s) with incorrect statistics'
  );
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION recalculate_coupon_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_coupon_stats() TO authenticated;

-- Run verification (this will show if there are any discrepancies)
DO $$
DECLARE
  discrepancies RECORD;
  has_issues BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=== Verifying Coupon Statistics ===';
  
  FOR discrepancies IN 
    SELECT * FROM recalculate_coupon_stats()
  LOOP
    has_issues := TRUE;
    RAISE NOTICE 'Coupon: % - Usage: % -> % (diff: %), Collection: % -> % (diff: %)',
      discrepancies.coupon_title,
      discrepancies.old_usage_count,
      discrepancies.new_usage_count,
      discrepancies.usage_diff,
      discrepancies.old_collection_count,
      discrepancies.new_collection_count,
      discrepancies.collection_diff;
  END LOOP;
  
  IF NOT has_issues THEN
    RAISE NOTICE 'All coupon statistics are accurate!';
  ELSE
    RAISE NOTICE 'Found discrepancies. Run SELECT fix_coupon_stats(); to fix them.';
  END IF;
END $$;

-- Comment for documentation
COMMENT ON FUNCTION recalculate_coupon_stats() IS 
  'Calculates actual usage and collection counts and compares with stored values. Use this to identify discrepancies.';

COMMENT ON FUNCTION fix_coupon_stats() IS 
  'Fixes all coupon statistics by recalculating from actual redemptions and collections. Returns a JSON summary of changes.';
