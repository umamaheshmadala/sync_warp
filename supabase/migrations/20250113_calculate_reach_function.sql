-- =============================================================================
-- Calculate Campaign Reach Function
-- Accurately calculates estimated reach based on all targeting filters
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_campaign_reach(
  p_targeting_rules JSONB DEFAULT '{}'::jsonb,
  p_debug BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  total_reach BIGINT,
  demographics_count BIGINT,
  location_count BIGINT,
  behavior_count BIGINT,
  breakdown JSONB,
  debug_info JSONB
) AS $$
DECLARE
  v_demographics_filter TEXT := '';
  v_location_filter TEXT := '';
  v_behavior_filter TEXT := '';
  v_query TEXT;
  v_age_ranges TEXT[];
  v_genders TEXT[];
  v_income_ranges TEXT[];
  v_interests TEXT[];
  v_latitude DECIMAL;
  v_longitude DECIMAL;
  v_radius_km DECIMAL;
  v_min_purchases INTEGER;
  v_is_driver BOOLEAN;
  v_demographics_count BIGINT := 0;
  v_location_count BIGINT := 0;
  v_behavior_count BIGINT := 0;
  v_total_count BIGINT := 0;
  v_breakdown JSONB := '{}'::jsonb;
  v_debug_info JSONB := '{}'::jsonb;
BEGIN
  -- Extract demographics filters
  IF p_targeting_rules ? 'demographics' THEN
    v_age_ranges := ARRAY(SELECT jsonb_array_elements_text(
      p_targeting_rules->'demographics'->'ageRanges'
    ));
    v_genders := ARRAY(SELECT jsonb_array_elements_text(
      p_targeting_rules->'demographics'->'gender'
    ));
    v_income_ranges := ARRAY(SELECT jsonb_array_elements_text(
      p_targeting_rules->'demographics'->'incomeRanges'
    ));
  END IF;

  -- Extract location filters
  IF p_targeting_rules ? 'location' THEN
    v_latitude := (p_targeting_rules->'location'->>'lat')::DECIMAL;
    v_longitude := (p_targeting_rules->'location'->>'lng')::DECIMAL;
    v_radius_km := COALESCE((p_targeting_rules->'location'->>'radiusKm')::DECIMAL, 3);
  END IF;

  -- Extract behavior filters
  IF p_targeting_rules ? 'behavior' THEN
    v_interests := ARRAY(SELECT jsonb_array_elements_text(
      p_targeting_rules->'behavior'->'interests'
    ));
    v_min_purchases := (p_targeting_rules->'behavior'->>'minPurchases')::INTEGER;
    v_is_driver := (p_targeting_rules->'behavior'->>'isDriver')::BOOLEAN;
  END IF;

  -- Build WHERE clause parts
  -- Demographics filter
  IF array_length(v_age_ranges, 1) > 0 OR array_length(v_genders, 1) > 0 OR array_length(v_income_ranges, 1) > 0 THEN
    v_demographics_filter := 'WHERE 1=1';
    
    IF array_length(v_age_ranges, 1) > 0 THEN
      v_demographics_filter := v_demographics_filter || ' AND age_range = ANY($1)';
    END IF;
    
    IF array_length(v_genders, 1) > 0 THEN
      v_demographics_filter := v_demographics_filter || ' AND gender = ANY($2)';
    END IF;
    
    IF array_length(v_income_ranges, 1) > 0 THEN
      v_demographics_filter := v_demographics_filter || ' AND income_range = ANY($3)';
    END IF;
  END IF;

  -- Location filter (using PostGIS earth_distance)
  IF v_latitude IS NOT NULL AND v_longitude IS NOT NULL THEN
    v_location_filter := format(
      ' AND earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%s, %s)) <= %s',
      v_latitude, v_longitude, v_radius_km * 1000
    );
  END IF;

  -- Behavior filter
  IF array_length(v_interests, 1) > 0 OR v_min_purchases IS NOT NULL OR v_is_driver IS NOT NULL THEN
    v_behavior_filter := '';
    
    IF array_length(v_interests, 1) > 0 THEN
      v_behavior_filter := v_behavior_filter || ' AND interests && $4';
    END IF;
    
    IF v_min_purchases IS NOT NULL THEN
      v_behavior_filter := v_behavior_filter || format(' AND total_purchases >= %s', v_min_purchases);
    END IF;
    
    IF v_is_driver = TRUE THEN
      v_behavior_filter := v_behavior_filter || ' AND is_driver = TRUE';
    END IF;
  END IF;

  -- Count users matching demographics only
  IF v_demographics_filter != '' THEN
    v_query := 'SELECT COUNT(*) FROM user_profiles ' || v_demographics_filter;
    EXECUTE v_query USING v_age_ranges, v_genders, v_income_ranges INTO v_demographics_count;
  ELSE
    SELECT COUNT(*) INTO v_demographics_count FROM user_profiles;
  END IF;

  -- Count users matching location only
  IF v_location_filter != '' THEN
    v_query := 'SELECT COUNT(*) FROM user_profiles WHERE 1=1' || v_location_filter;
    EXECUTE v_query INTO v_location_count;
  ELSE
    SELECT COUNT(*) INTO v_location_count FROM user_profiles;
  END IF;

  -- Count users matching behavior only
  IF v_behavior_filter != '' THEN
    v_query := 'SELECT COUNT(*) FROM user_profiles WHERE 1=1' || v_behavior_filter;
    EXECUTE v_query USING v_interests INTO v_behavior_count;
  ELSE
    SELECT COUNT(*) INTO v_behavior_count FROM user_profiles;
  END IF;

  -- Count total users matching ALL filters
  v_query := 'SELECT COUNT(*) FROM user_profiles';
  IF v_demographics_filter != '' THEN
    v_query := v_query || ' ' || v_demographics_filter;
  ELSE
    v_query := v_query || ' WHERE 1=1';
  END IF;
  v_query := v_query || v_location_filter || v_behavior_filter;
  
  EXECUTE v_query USING v_age_ranges, v_genders, v_income_ranges, v_interests INTO v_total_count;

  -- Get demographic breakdown
  SELECT jsonb_build_object(
    'by_age', (
      SELECT jsonb_object_agg(age_range, count)
      FROM (
        SELECT age_range, COUNT(*) as count
        FROM user_profiles
        WHERE 
          (array_length(v_age_ranges, 1) IS NULL OR age_range = ANY(v_age_ranges))
          AND (v_location_filter = '' OR true)
          AND (v_behavior_filter = '' OR true)
        GROUP BY age_range
      ) sub
    ),
    'by_gender', (
      SELECT jsonb_object_agg(gender, count)
      FROM (
        SELECT gender, COUNT(*) as count
        FROM user_profiles
        WHERE 
          (array_length(v_genders, 1) IS NULL OR gender = ANY(v_genders))
          AND (v_location_filter = '' OR true)
          AND (v_behavior_filter = '' OR true)
        GROUP BY gender
      ) sub
    ),
    'by_income', (
      SELECT jsonb_object_agg(income_range, count)
      FROM (
        SELECT income_range, COUNT(*) as count
        FROM user_profiles
        WHERE 
          (array_length(v_income_ranges, 1) IS NULL OR income_range = ANY(v_income_ranges))
          AND (v_location_filter = '' OR true)
          AND (v_behavior_filter = '' OR true)
        GROUP BY income_range
      ) sub
    )
  ) INTO v_breakdown;

  -- Build debug info
  IF p_debug THEN
    v_debug_info := jsonb_build_object(
      'sql_query', v_query,
      'demographics_filter', v_demographics_filter,
      'location_filter', v_location_filter,
      'behavior_filter', v_behavior_filter,
      'parameters', jsonb_build_object(
        'age_ranges', v_age_ranges,
        'genders', v_genders,
        'income_ranges', v_income_ranges,
        'interests', v_interests,
        'latitude', v_latitude,
        'longitude', v_longitude,
        'radius_km', v_radius_km,
        'min_purchases', v_min_purchases,
        'is_driver', v_is_driver
      )
    );
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    v_total_count,
    v_demographics_count,
    v_location_count,
    v_behavior_count,
    v_breakdown,
    v_debug_info;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_campaign_reach IS 'Calculates accurate campaign reach with demographics, location, and behavior filters';
