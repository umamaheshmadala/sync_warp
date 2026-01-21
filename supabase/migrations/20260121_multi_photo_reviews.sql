-- Story 11.2.2: Multi-Photo Support
-- Migration to support up to 5 photos per review

-- Step 1: Add photo_urls array column
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing single photo_url to array
-- Only update rows where photo_url is set and photo_urls is empty
UPDATE business_reviews
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL 
  AND photo_url != ''
  AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL);

-- Step 3: Add constraint for max 5 photos
ALTER TABLE business_reviews
DROP CONSTRAINT IF EXISTS check_photo_count; -- Drop if exists to be safe

ALTER TABLE business_reviews
ADD CONSTRAINT check_photo_count CHECK (
  array_length(photo_urls, 1) IS NULL 
  OR array_length(photo_urls, 1) <= 5
);

-- Step 4: Create helper function to maintain backward compatibility if needed
CREATE OR REPLACE FUNCTION get_primary_photo(urls TEXT[])
RETURNS TEXT AS $$
BEGIN
  IF urls IS NULL OR array_length(urls, 1) < 1 THEN
    RETURN NULL;
  END IF;
  RETURN urls[1];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Add index for reviews with photos (using the new array column)
CREATE INDEX IF NOT EXISTS idx_reviews_with_photos
ON business_reviews (business_id)
WHERE array_length(photo_urls, 1) > 0;
