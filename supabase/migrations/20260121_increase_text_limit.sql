-- Story 11.2.1: Increase Review Text Limit
-- Drop the legacy constraint that limits text to 30 words
ALTER TABLE business_reviews DROP CONSTRAINT IF EXISTS review_text_word_limit;

-- Ensure the replacement constraint exists and is correct (150 words)
-- We check if it exists, if so we might want to replace it to be sure, 
-- but identifying it by name 'check_word_count' is sufficient if we trust the previous step.
-- However, for robustness, we can recreate it.

DO $$
BEGIN
    -- Check if check_word_count exists, if NOT we create it. 
    -- If it does exist, we assume it's correct based on previous inspection or we could drop and recreate.
    -- Let's drop and recreate to be 100% sure of the logic.
    ALTER TABLE business_reviews DROP CONSTRAINT IF EXISTS check_word_count;
    
    ALTER TABLE business_reviews ADD CONSTRAINT check_word_count 
    CHECK (
      (review_text IS NULL) OR 
      (review_text = '') OR 
      (
        array_length(regexp_split_to_array(TRIM(BOTH FROM review_text), '\s+'), 1) >= 1 
        AND 
        array_length(regexp_split_to_array(TRIM(BOTH FROM review_text), '\s+'), 1) <= 150
      )
    );
END $$;
