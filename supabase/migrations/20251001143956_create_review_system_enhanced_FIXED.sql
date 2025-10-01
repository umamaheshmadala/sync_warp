-- =====================================================
-- Story 5.2: Binary Review System - Enhanced Schema (FIXED)
-- =====================================================
-- Created: 2025-01-30
-- Fixed: Column reference in profiles join (id instead of user_id)
-- =====================================================

-- =====================================================
-- 1. CREATE REVIEW TABLES
-- =====================================================

-- Main business reviews table with enhanced features
CREATE TABLE IF NOT EXISTS business_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core review data
  recommendation BOOLEAN NOT NULL,  -- TRUE = Recommend, FALSE = Don't Recommend
  review_text TEXT,
  
  -- Enhanced features (NEW)
  photo_url TEXT,  -- Optional photo upload
  tags TEXT[] DEFAULT '{}',  -- Categories/tags for the review
  
  -- GPS check-in requirement
  checkin_id UUID REFERENCES business_checkins(id),
  
  -- Timestamps and tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  edit_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT unique_user_business_review UNIQUE(user_id, business_id),
  CONSTRAINT require_checkin CHECK (checkin_id IS NOT NULL),
  CONSTRAINT review_text_word_limit CHECK (
    review_text IS NULL OR 
    array_length(string_to_array(trim(review_text), ' '), 1) <= 30
  )
);

-- Business owner responses to reviews
CREATE TABLE IF NOT EXISTS business_review_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  response_text TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_review_response UNIQUE(review_id),
  CONSTRAINT response_text_word_limit CHECK (
    array_length(string_to_array(trim(response_text), ' '), 1) <= 50
  )
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_business_reviews_business_id 
  ON business_reviews(business_id);

CREATE INDEX IF NOT EXISTS idx_business_reviews_user_id 
  ON business_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_business_reviews_recommendation 
  ON business_reviews(recommendation);

CREATE INDEX IF NOT EXISTS idx_business_reviews_created_at 
  ON business_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_reviews_tags 
  ON business_reviews USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_review_responses_review_id 
  ON business_review_responses(review_id);

CREATE INDEX IF NOT EXISTS idx_review_responses_business_id 
  ON business_review_responses(business_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on review tables
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_review_responses ENABLE ROW LEVEL SECURITY;

-- ============ business_reviews POLICIES ============

-- Everyone can read reviews (public data)
CREATE POLICY "Anyone can view reviews"
  ON business_reviews FOR SELECT
  USING (true);

-- Users can create reviews if they have checked in
CREATE POLICY "Users can create reviews with check-in"
  ON business_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM business_checkins
      WHERE id = checkin_id
      AND user_id = auth.uid()
      AND business_id = business_reviews.business_id
    )
  );

-- Users can update their own reviews within 24 hours
CREATE POLICY "Users can update own reviews within 24h"
  ON business_reviews FOR UPDATE
  USING (
    auth.uid() = user_id
    AND created_at > NOW() - INTERVAL '24 hours'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON business_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ============ business_review_responses POLICIES ============

-- Everyone can read responses (public data)
CREATE POLICY "Anyone can view review responses"
  ON business_review_responses FOR SELECT
  USING (true);

-- Business owners can create responses
CREATE POLICY "Business owners can create responses"
  ON business_review_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
      AND owner_id = auth.uid()
    )
  );

-- Business owners can update their own responses
CREATE POLICY "Business owners can update own responses"
  ON business_review_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
      AND owner_id = auth.uid()
    )
  );

-- Business owners can delete their own responses
CREATE POLICY "Business owners can delete own responses"
  ON business_review_responses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
      AND owner_id = auth.uid()
    )
  );

-- =====================================================
-- 4. DATABASE FUNCTIONS
-- =====================================================

-- Function to get review statistics for a business
CREATE OR REPLACE FUNCTION get_business_review_stats(p_business_id UUID)
RETURNS TABLE (
  total_reviews BIGINT,
  recommend_count BIGINT,
  not_recommend_count BIGINT,
  recommend_percentage NUMERIC,
  reviews_with_text BIGINT,
  reviews_with_photos BIGINT,
  average_tags_per_review NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_reviews,
    COUNT(*) FILTER (WHERE recommendation = TRUE)::BIGINT AS recommend_count,
    COUNT(*) FILTER (WHERE recommendation = FALSE)::BIGINT AS not_recommend_count,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE recommendation = TRUE)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END AS recommend_percentage,
    COUNT(*) FILTER (WHERE review_text IS NOT NULL AND review_text != '')::BIGINT AS reviews_with_text,
    COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '')::BIGINT AS reviews_with_photos,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(AVG(array_length(tags, 1))::NUMERIC, 1)
    END AS average_tags_per_review
  FROM business_reviews
  WHERE business_id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify user has checked in before reviewing
CREATE OR REPLACE FUNCTION verify_checkin_for_review(
  p_user_id UUID,
  p_business_id UUID,
  p_checkin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_checkins
    WHERE id = p_checkin_id
    AND user_id = p_user_id
    AND business_id = p_business_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count words in text
CREATE OR REPLACE FUNCTION count_words(text_input TEXT)
RETURNS INTEGER AS $$
BEGIN
  IF text_input IS NULL OR trim(text_input) = '' THEN
    RETURN 0;
  END IF;
  
  RETURN array_length(string_to_array(trim(text_input), ' '), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to update updated_at and is_edited
CREATE OR REPLACE FUNCTION update_review_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Mark as edited if this is an update (not insert)
  IF TG_OP = 'UPDATE' AND OLD.created_at IS NOT NULL THEN
    NEW.is_edited = TRUE;
    NEW.edit_count = OLD.edit_count + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for review responses
CREATE OR REPLACE FUNCTION update_response_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS set_business_reviews_updated_at ON business_reviews;
CREATE TRIGGER set_business_reviews_updated_at
  BEFORE UPDATE ON business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_review_modified_timestamp();

DROP TRIGGER IF EXISTS set_review_responses_updated_at ON business_review_responses;
CREATE TRIGGER set_review_responses_updated_at
  BEFORE UPDATE ON business_review_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_response_modified_timestamp();

-- =====================================================
-- 6. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Reviews with user profiles and response data
-- FIXED: Changed p.user_id to p.id to match profiles table structure
CREATE OR REPLACE VIEW business_reviews_with_details AS
SELECT
  br.id,
  br.business_id,
  br.user_id,
  br.recommendation,
  br.review_text,
  br.photo_url,
  br.tags,
  br.checkin_id,
  br.created_at,
  br.updated_at,
  br.is_edited,
  br.edit_count,
  -- User profile data
  p.full_name AS user_name,
  p.avatar_url AS user_avatar,
  p.city AS user_city,
  -- Response data (if exists)
  brr.id AS response_id,
  brr.response_text,
  brr.created_at AS response_created_at,
  brr.updated_at AS response_updated_at
FROM business_reviews br
LEFT JOIN profiles p ON br.user_id = p.id
LEFT JOIN business_review_responses brr ON br.id = brr.review_id;

-- View: User's review activity
CREATE OR REPLACE VIEW user_review_activity AS
SELECT
  br.user_id,
  COUNT(*)::INTEGER AS total_reviews,
  COUNT(*) FILTER (WHERE br.recommendation = TRUE)::INTEGER AS positive_reviews,
  COUNT(*) FILTER (WHERE br.recommendation = FALSE)::INTEGER AS negative_reviews,
  COUNT(*) FILTER (WHERE br.review_text IS NOT NULL)::INTEGER AS reviews_with_text,
  COUNT(*) FILTER (WHERE br.photo_url IS NOT NULL)::INTEGER AS reviews_with_photos,
  MAX(br.created_at) AS last_review_date
FROM business_reviews br
GROUP BY br.user_id;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT ON business_reviews TO authenticated;
GRANT INSERT ON business_reviews TO authenticated;
GRANT UPDATE ON business_reviews TO authenticated;
GRANT DELETE ON business_reviews TO authenticated;

GRANT SELECT ON business_review_responses TO authenticated;
GRANT INSERT ON business_review_responses TO authenticated;
GRANT UPDATE ON business_review_responses TO authenticated;
GRANT DELETE ON business_review_responses TO authenticated;

-- Grant access to views
GRANT SELECT ON business_reviews_with_details TO authenticated;
GRANT SELECT ON user_review_activity TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_business_review_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_checkin_for_review(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_words(TEXT) TO authenticated;

-- =====================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE business_reviews IS 'Binary reviews (recommend/not recommend) with GPS check-in gating';
COMMENT ON TABLE business_review_responses IS 'Business owner responses to reviews';

COMMENT ON COLUMN business_reviews.recommendation IS 'TRUE = Recommend, FALSE = Do Not Recommend';
COMMENT ON COLUMN business_reviews.review_text IS 'Optional text review (max 30 words)';
COMMENT ON COLUMN business_reviews.photo_url IS 'Optional photo upload URL';
COMMENT ON COLUMN business_reviews.tags IS 'Categories/tags for the review';
COMMENT ON COLUMN business_reviews.checkin_id IS 'Required check-in ID to verify user visited business';

COMMENT ON COLUMN business_review_responses.response_text IS 'Business owner response (max 50 words)';

-- =====================================================
-- Migration Complete! ✅
-- =====================================================
-- Story 5.2: Binary Review System - Database Ready
-- Fixed: profiles join now uses p.id instead of p.user_id
-- =====================================================
