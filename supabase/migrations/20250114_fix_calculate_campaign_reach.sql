-- =============================================================================
-- Fix calculate_campaign_reach Function
-- =============================================================================
-- This migration rebuilds the function to properly support:
-- 1. Min/Max age filtering using exact 'age' column
-- 2. Gender 'all' handling (no filter when 'all' selected)
-- 3. Customer segments (new_customers, existing_customers, power_users, etc.)
-- 4. Interest array overlap queries
-- 5. Proper behavior tracking column queries

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_campaign_reach(jsonb, boolean);

-- Create improved function
CREATE OR REPLACE FUNCTION calculate_campaign_reach(
  p_targeting_rules JSONB,
  p_debug BOOLEAN DEFAULT false
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
  v_query TEXT;
  v_where_clauses TEXT[] := ARRAY[]::TEXT[];
  v_params JSONB := '{}'::jsonb;
  
  -- Demographics
  v_min_age INTEGER;
  v_max_age INTEGER;
  v_genders TEXT[];
  v_income_ranges TEXT[];
  
  -- Location
  v_latitude DECIMAL;
  v_longitude DECIMAL;
  v_radius_km DECIMAL;
  
  -- Behavior
  v_interests TEXT[];
  v_customer_segments TEXT[];
  v_min_purchases INTEGER;
  v_is_driver BOOLEAN;
  
  -- Counts
  v_demographics_count BIGINT := 0;
  v_location_count BIGINT := 0;
  v_behavior_count BIGINT := 0;
  v_total_count BIGINT := 0;
  v_breakdown JSONB := '{}'::jsonb;
  v_debug_info JSONB := '{}'::jsonb;
BEGIN
  -- ============================================================================
  -- EXTRACT PARAMETERS FROM p_targeting_rules
  -- ============================================================================
  
  -- Demographics: Age (min/max instead of ranges)
  IF p_targeting_rules ? 'demographics' THEN
    -- Extract age_ranges and parse them
    IF p_targeting_rules->'demographics' ? 'ageRanges' AND 
       jsonb_array_length(p_targeting_rules->'demographics'->'ageRanges') > 0 THEN
      -- Get the first age range and parse it (e.g., "25-45")
      DECLARE
        v_age_range TEXT;
        v_age_parts TEXT[];
      BEGIN
        v_age_range := p_targeting_rules->'demographics'->'ageRanges'->>0;
        v_age_parts := string_to_array(v_age_range, '-');
        v_min_age := v_age_parts[1]::INTEGER;
        v_max_age := CASE 
          WHEN array_length(v_age_parts, 1) > 1 THEN v_age_parts[2]::INTEGER
          ELSE 100  -- If no max (e.g., "55+"), use 100
        END;
      END;
    END IF;
    
    -- Gender
    IF p_targeting_rules->'demographics' ? 'gender' AND 
       jsonb_array_length(p_targeting_rules->'demographics'->'gender') > 0 THEN
      v_genders := ARRAY(SELECT jsonb_array_elements_text(
        p_targeting_rules->'demographics'->'gender'
      ));
      -- Remove 'all' from genders array if present
      v_genders := array_remove(v_genders, 'all');
    END IF;
    
    -- Income ranges
    IF p_targeting_rules->'demographics' ? 'incomeRanges' AND 
       jsonb_array_length(p_targeting_rules->'demographics'->'incomeRanges') > 0 THEN
      v_income_ranges := ARRAY(SELECT jsonb_array_elements_text(
        p_targeting_rules->'demographics'->'incomeRanges'
      ));
    END IF;
  END IF;
  
  -- Location
  IF p_targeting_rules ? 'location' THEN
    v_latitude := (p_targeting_rules->'location'->>'lat')::DECIMAL;
    v_longitude := (p_targeting_rules->'location'->>'lng')::DECIMAL;
    v_radius_km := COALESCE((p_targeting_rules->'location'->>'radiusKm')::DECIMAL, 3);
  END IF;
  
  -- Behavior
  IF p_targeting_rules ? 'behavior' THEN
    -- Interests
    IF p_targeting_rules->'behavior' ? 'interests' AND 
       jsonb_array_length(p_targeting_rules->'behavior'->'interests') > 0 THEN
      v_interests := ARRAY(SELECT jsonb_array_elements_text(
        p_targeting_rules->'behavior'->'interests'
      ));
    END IF;
    
    -- Customer segments
    IF p_targeting_rules->'behavior' ? 'customerSegments' AND 
       jsonb_array_length(p_targeting_rules->'behavior'->'customerSegments') > 0 THEN
      v_customer_segments := ARRAY(SELECT jsonb_array_elements_text(
        p_targeting_rules->'behavior'->'customerSegments'
      ));
    END IF;
    
    v_min_purchases := (p_targeting_rules->'behavior'->>'minPurchases')::INTEGER;
    v_is_driver := (p_targeting_rules->'behavior'->>'isDriver')::BOOLEAN;
  END IF;
  
  -- ============================================================================
  -- BUILD WHERE CLAUSES FOR TOTAL REACH QUERY
  -- ============================================================================
  
  -- Age filter (using exact age column)
  IF v_min_age IS NOT NULL AND v_max_age IS NOT NULL THEN
    v_where_clauses := array_append(v_where_clauses, 
      format('age BETWEEN %s AND %s', v_min_age, v_max_age)
    );
  END IF;
  
  -- Gender filter (only if not 'all')
  IF array_length(v_genders, 1) > 0 THEN
    v_where_clauses := array_append(v_where_clauses, 
      format('gender = ANY(ARRAY[%s]::text[])', 
        array_to_string(array_agg(quote_literal(g)), ',')
      ) FROM unnest(v_genders) AS g
    );
  END IF;
  
  -- Income filter
  IF array_length(v_income_ranges, 1) > 0 THEN
    v_where_clauses := array_append(v_where_clauses, 
      format('income_range = ANY(ARRAY[%s]::text[])', 
        array_to_string(array_agg(quote_literal(i)), ',')
      ) FROM unnest(v_income_ranges) AS i
    );
  END IF;
  
  -- Location filter (using earth_distance)
  IF v_latitude IS NOT NULL AND v_longitude IS NOT NULL THEN
    v_where_clauses := array_append(v_where_clauses, 
      format(
        'earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%s, %s)) <= %s',
        v_latitude, v_longitude, v_radius_km * 1000
      )
    );
  END IF;
  
  -- Interest filter (array overlap)
  IF array_length(v_interests, 1) > 0 THEN
    v_where_clauses := array_append(v_where_clauses, 
      format('interests && ARRAY[%s]::text[]', 
        array_to_string(array_agg(quote_literal(int)), ',')
      ) FROM unnest(v_interests) AS int
    );
  END IF;
  
  -- Customer segment filters
  IF array_length(v_customer_segments, 1) > 0 THEN
    DECLARE
      v_segment_conditions TEXT[] := ARRAY[]::TEXT[];
      v_segment TEXT;
    BEGIN
      FOREACH v_segment IN ARRAY v_customer_segments LOOP
        CASE v_segment
          -- New customers: signed up < 30 days ago, no purchases
          WHEN 'new_customers' THEN
            v_segment_conditions := array_append(v_segment_conditions,
              '(signup_date >= NOW() - INTERVAL ''30 days'' AND last_purchase_at IS NULL)'
            );
          
          -- Existing customers: have made at least one purchase
          WHEN 'existing_customers' THEN
            v_segment_conditions := array_append(v_segment_conditions,
              '(last_purchase_at IS NOT NULL)'
            );
          
          -- Power users: 10+ check-ins OR 3+ favorite businesses
          WHEN 'power_users' THEN
            v_segment_conditions := array_append(v_segment_conditions,
              '(checkin_count >= 10 OR array_length(favorite_businesses, 1) >= 3)'
            );
          
          -- Checked-in users: at least 1 check-in
          WHEN 'checked_in' THEN
            v_segment_conditions := array_append(v_segment_conditions,
              '(checkin_count > 0)'
            );
          
          -- Nearby users: currently active (last 7 days)
          WHEN 'nearby' THEN
            v_segment_conditions := array_append(v_segment_conditions,
              '(last_active_at >= NOW() - INTERVAL ''7 days'')'
            );
          
          ELSE
            -- Unknown segment, skip
            NULL;
        END CASE;
      END LOOP;
      
      -- Add segment conditions with OR logic
      IF array_length(v_segment_conditions, 1) > 0 THEN
        v_where_clauses := array_append(v_where_clauses, 
          '(' || array_to_string(v_segment_conditions, ' OR ') || ')'
        );
      END IF;
    END;
  END IF;
  
  -- Min purchases filter
  IF v_min_purchases IS NOT NULL THEN
    v_where_clauses := array_append(v_where_clauses, 
      format('total_purchases >= %s', v_min_purchases)
    );
  END IF;
  
  -- Driver-only filter
  IF v_is_driver = TRUE THEN
    v_where_clauses := array_append(v_where_clauses, 'is_driver = TRUE');
  END IF;
  
  -- ============================================================================
  -- EXECUTE QUERIES
  -- ============================================================================
  
  -- Build final query
  v_query := 'SELECT COUNT(*) FROM user_profiles';
  IF array_length(v_where_clauses, 1) > 0 THEN
    v_query := v_query || ' WHERE ' || array_to_string(v_where_clauses, ' AND ');
  END IF;
  
  -- Execute total count
  EXECUTE v_query INTO v_total_count;
  
  -- Count demographics-only matches (age + gender + income)
  DECLARE
    v_demo_clauses TEXT[] := ARRAY[]::TEXT[];
  BEGIN
    IF v_min_age IS NOT NULL AND v_max_age IS NOT NULL THEN
      v_demo_clauses := array_append(v_demo_clauses, 
        format('age BETWEEN %s AND %s', v_min_age, v_max_age)
      );
    END IF;
    IF array_length(v_genders, 1) > 0 THEN
      v_demo_clauses := array_append(v_demo_clauses, 
        format('gender = ANY(ARRAY[%s]::text[])', 
          array_to_string(array_agg(quote_literal(g)), ',')
        ) FROM unnest(v_genders) AS g
      );
    END IF;
    IF array_length(v_income_ranges, 1) > 0 THEN
      v_demo_clauses := array_append(v_demo_clauses, 
        format('income_range = ANY(ARRAY[%s]::text[])', 
          array_to_string(array_agg(quote_literal(i)), ',')
        ) FROM unnest(v_income_ranges) AS i
      );
    END IF;
    
    IF array_length(v_demo_clauses, 1) > 0 THEN
      v_query := 'SELECT COUNT(*) FROM user_profiles WHERE ' || 
                 array_to_string(v_demo_clauses, ' AND ');
      EXECUTE v_query INTO v_demographics_count;
    ELSE
      SELECT COUNT(*) INTO v_demographics_count FROM user_profiles;
    END IF;
  END;
  
  -- Count location-only matches
  IF v_latitude IS NOT NULL AND v_longitude IS NOT NULL THEN
    v_query := format(
      'SELECT COUNT(*) FROM user_profiles WHERE earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%s, %s)) <= %s',
      v_latitude, v_longitude, v_radius_km * 1000
    );
    EXECUTE v_query INTO v_location_count;
  ELSE
    SELECT COUNT(*) INTO v_location_count FROM user_profiles;
  END IF;
  
  -- Count behavior-only matches
  v_behavior_count := v_total_count;  -- Simplified for now
  
  -- Get demographic breakdown
  SELECT jsonb_build_object(
    'by_age', (
      SELECT jsonb_object_agg(age_range, count)
      FROM (
        SELECT age_range, COUNT(*) as count
        FROM user_profiles
        GROUP BY age_range
        ORDER BY age_range
      ) sub
    ),
    'by_gender', (
      SELECT jsonb_object_agg(gender, count)
      FROM (
        SELECT gender, COUNT(*) as count
        FROM user_profiles
        GROUP BY gender
        ORDER BY gender
      ) sub
    )
  ) INTO v_breakdown;
  
  -- Build debug info
  IF p_debug THEN
    v_debug_info := jsonb_build_object(
      'final_query', v_query,
      'where_clauses', v_where_clauses,
      'parameters', jsonb_build_object(
        'min_age', v_min_age,
        'max_age', v_max_age,
        'genders', v_genders,
        'income_ranges', v_income_ranges,
        'interests', v_interests,
        'customer_segments', v_customer_segments,
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_campaign_reach IS 'Calculate campaign reach based on targeting rules. Supports demographics (min/max age, gender, income), location (radius), and behavior (interests, customer segments, purchases, driver status)';
