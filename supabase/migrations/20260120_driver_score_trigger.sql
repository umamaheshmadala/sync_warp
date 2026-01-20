
-- Function to update driver score when reviews change
CREATE OR REPLACE FUNCTION update_reviews_driver_score()
RETURNS TRIGGER AS $$
DECLARE
  reviews_weight FLOAT;
  reviews_count INTEGER;
  target_user_id UUID;
  user_city_text TEXT;
  user_city_id UUID;
BEGIN
  -- Determine user_id
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- Get weight from config
  reviews_weight := 2.0; 
  
  -- Count user's active reviews
  SELECT COUNT(*) INTO reviews_count
  FROM business_reviews
  WHERE user_id = target_user_id
    AND deleted_at IS NULL;
    
  -- Get user's city from profiles
  SELECT city INTO user_city_text FROM profiles WHERE id = target_user_id;
  
  -- Resolve city_id (Simple matching: assumes profile city starts with city name)
  -- If profile city is "Vijayawada, Andhra Pradesh", we match "Vijayawada"
  SELECT id INTO user_city_id 
  FROM cities 
  WHERE user_city_text ILIKE name || '%' 
  LIMIT 1;
  
  -- Fallback if city not found (optional: use a default or do nothing)
  -- For now, if no city found, we cannot create a driver profile strictly.
  -- But to avoid crashing, we might return or pick a default.
  IF user_city_id IS NULL THEN
      -- Try to find ANY active city to attach to, or just exit.
      -- Exiting logs a warning.
      RAISE WARNING 'User % has no valid city for driver profile', target_user_id;
      RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Upsert driver profile with new score
  INSERT INTO driver_profiles (
      user_id, 
      city_id,
      reviews_score, 
      total_reviews,
      total_activity_score, -- Initialize to avoid null issues on fresh insert
      last_calculated_at
  )
  VALUES (
    target_user_id,
    user_city_id,
    reviews_count * reviews_weight,
    reviews_count,
    reviews_count * reviews_weight, -- Initial total is just reviews if new
    NOW()
  )
  ON CONFLICT (user_id, city_id) 
  DO UPDATE SET 
    reviews_score = EXCLUDED.reviews_score,
    total_reviews = EXCLUDED.total_reviews,
    -- Re-sum total score
    total_activity_score = 
        COALESCE(driver_profiles.coupons_collected_score, 0) + 
        COALESCE(driver_profiles.coupons_shared_score, 0) + 
        COALESCE(driver_profiles.coupons_redeemed_score, 0) + 
        COALESCE(driver_profiles.checkins_score, 0) + 
        EXCLUDED.reviews_score + 
        COALESCE(driver_profiles.social_interactions_score, 0),
    last_calculated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on business_reviews
DROP TRIGGER IF EXISTS trigger_update_reviews_driver_score ON business_reviews;
CREATE TRIGGER trigger_update_reviews_driver_score
AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON business_reviews
FOR EACH ROW
EXECUTE FUNCTION update_reviews_driver_score();

-- Function for Admin to manually recalculate score
CREATE OR REPLACE FUNCTION recalculate_driver_score(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    curr_reviews_count INTEGER;
    curr_reviews_score FLOAT;
    user_city_text TEXT;
    user_city_id UUID;
BEGIN
    -- 1. Calculate Reviews
    SELECT COUNT(*) INTO curr_reviews_count
    FROM business_reviews
    WHERE user_id = target_user_id AND deleted_at IS NULL;

    curr_reviews_score := curr_reviews_count * 2.0;
    
    -- 2. Local City Lookup
    SELECT city INTO user_city_text FROM profiles WHERE id = target_user_id;
    
    SELECT id INTO user_city_id 
    FROM cities 
    WHERE user_city_text ILIKE name || '%' 
    LIMIT 1;
    
    IF user_city_id IS NULL THEN
        RAISE NOTICE 'No city found for user %', target_user_id;
        RETURN;
    END IF;

    -- 3. Update Profile (Upsert)
    INSERT INTO driver_profiles (
        user_id, 
        city_id,
        reviews_score, 
        total_reviews, 
        total_activity_score,
        last_calculated_at
    )
    VALUES (
        target_user_id,
        user_city_id,
        curr_reviews_score,
        curr_reviews_count,
        curr_reviews_score,
        NOW()
    )
    ON CONFLICT (user_id, city_id)
    DO UPDATE SET
        reviews_score = EXCLUDED.reviews_score,
        total_reviews = EXCLUDED.total_reviews,
        total_activity_score = 
            COALESCE(driver_profiles.coupons_collected_score, 0) + 
            COALESCE(driver_profiles.coupons_shared_score, 0) + 
            COALESCE(driver_profiles.coupons_redeemed_score, 0) + 
            COALESCE(driver_profiles.checkins_score, 0) + 
            EXCLUDED.reviews_score + 
            COALESCE(driver_profiles.social_interactions_score, 0),
        last_calculated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
