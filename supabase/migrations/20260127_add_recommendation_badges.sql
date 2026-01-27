-- ============================================
-- MIGRATION: Business Recommendation Badges
-- Story: 11.4.5
-- ============================================

-- Step 1: Add badge columns to businesses
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS recommendation_badge TEXT 
  CHECK (recommendation_badge IN ('recommended', 'highly_recommended', 'very_highly_recommended')),
ADD COLUMN IF NOT EXISTS recommendation_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge_updated_at TIMESTAMPTZ;

-- Step 2: Create function to calculate badge
CREATE OR REPLACE FUNCTION calculate_business_badge(p_business_id UUID)
RETURNS TEXT AS $$
DECLARE
  pct DECIMAL(5,2);
  review_count INTEGER;
  badge TEXT;
BEGIN
  -- Count approved reviews and calculate percentage
  SELECT 
    COUNT(*) as total,
    ROUND(100.0 * SUM(CASE WHEN recommendation = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)
  INTO review_count, pct
  FROM business_reviews
  WHERE business_id = p_business_id
    AND moderation_status = 'approved'
    AND deleted_at IS NULL;
  
  -- Determine badge tier
  IF review_count >= 3 THEN
    IF pct >= 95 THEN
      badge := 'very_highly_recommended';
    ELSIF pct >= 90 THEN
      badge := 'highly_recommended';
    ELSIF pct >= 75 THEN
      badge := 'recommended';
    ELSE
      badge := NULL;
    END IF;
  ELSE
    badge := NULL;
  END IF;
  
  -- Update business record
  UPDATE businesses
  SET 
    recommendation_badge = badge,
    recommendation_percentage = COALESCE(pct, 0),
    approved_review_count = review_count,
    badge_updated_at = NOW()
  WHERE id = p_business_id;
  
  RETURN badge;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Trigger on review moderation
CREATE OR REPLACE FUNCTION trigger_recalculate_badge()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_business_badge(COALESCE(NEW.business_id, OLD.business_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_badge_on_review ON business_reviews;
CREATE TRIGGER trigger_badge_on_review
AFTER INSERT OR UPDATE OF moderation_status, recommendation, deleted_at OR DELETE 
ON business_reviews
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_badge();

-- Step 4: Initialize badges for existing businesses
DO $$
DECLARE
  biz RECORD;
BEGIN
  FOR biz IN SELECT id FROM businesses LOOP
    PERFORM calculate_business_badge(biz.id);
  END LOOP;
END $$;
