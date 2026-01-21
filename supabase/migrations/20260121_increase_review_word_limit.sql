-- ============================================
-- MIGRATION: Increase Review Word Limit to 150
-- Story: 11.2.1
-- ============================================

-- Step 1: Drop old constraint
ALTER TABLE business_reviews 
DROP CONSTRAINT IF EXISTS check_word_count;

-- Step 2: Add new constraint (150 words max, 1 word min if text exists)
ALTER TABLE business_reviews
ADD CONSTRAINT check_word_count CHECK (
  -- Text is optional (NULL or empty is OK)
  review_text IS NULL 
  OR review_text = '' 
  -- If text exists, check word count range
  OR (
    array_length(regexp_split_to_array(trim(review_text), '\s+'), 1) >= 1
    AND array_length(regexp_split_to_array(trim(review_text), '\s+'), 1) <= 150
  )
);
