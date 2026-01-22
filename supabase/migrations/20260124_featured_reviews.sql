-- ============================================
-- MIGRATION: Featured/Pinned Reviews
-- Story: 11.3.6
-- ============================================

-- Add featured columns to business_reviews
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS featured_by UUID REFERENCES auth.users(id);

-- Create index for faster lookup of featured reviews
CREATE INDEX IF NOT EXISTS idx_featured_reviews 
ON business_reviews(business_id, is_featured) 
WHERE is_featured = TRUE;

-- Function to enforce max 3 featured reviews per business
CREATE OR REPLACE FUNCTION check_featured_limit()
RETURNS TRIGGER AS $$
DECLARE
  featured_count INTEGER;
BEGIN
  -- Only check if we are setting is_featured to TRUE
  IF NEW.is_featured = TRUE AND (OLD.is_featured IS NULL OR OLD.is_featured = FALSE) THEN
    SELECT COUNT(*) INTO featured_count
    FROM business_reviews 
    WHERE business_id = NEW.business_id 
      AND is_featured = TRUE 
      AND id != NEW.id -- Exclude self if updating
      AND deleted_at IS NULL;
      
    IF featured_count >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 featured reviews allowed per business.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce the limit
DROP TRIGGER IF EXISTS enforce_featured_limit ON business_reviews;
CREATE TRIGGER enforce_featured_limit
BEFORE UPDATE ON business_reviews
FOR EACH ROW
WHEN (NEW.is_featured = TRUE)
EXECUTE FUNCTION check_featured_limit();
