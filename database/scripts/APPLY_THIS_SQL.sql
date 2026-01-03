-- =====================================================
-- COUPON STATISTICS VERIFICATION & FIX FUNCTIONS
-- Copy and paste this entire file into Supabase SQL Editor
-- =====================================================

-- 1. Drop existing function if it exists (to recreate with correct types)
DROP FUNCTION IF EXISTS recalculate_coupon_stats();

-- 2. Create function to check for discrepancies
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

-- 3. Create function to fix all statistics
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

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION recalculate_coupon_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_coupon_stats() TO anon;
GRANT EXECUTE ON FUNCTION fix_coupon_stats() TO authenticated;

-- 5. Add helpful comments
COMMENT ON FUNCTION recalculate_coupon_stats() IS 
  'Calculates actual usage and collection counts and compares with stored values. Use this to identify discrepancies.';

COMMENT ON FUNCTION fix_coupon_stats() IS 
  'Fixes all coupon statistics by recalculating from actual redemptions and collections. Returns a JSON summary of changes.';

-- 6. Test: Show any discrepancies (optional - comment out if not needed)
-- SELECT * FROM recalculate_coupon_stats();

-- 7. Fix any discrepancies found (optional - uncomment to auto-fix)
-- SELECT fix_coupon_stats();

-- =====================================================
-- DONE! The functions are now created.
-- You can now use the "Verify Stats" button in the UI.
-- =====================================================
