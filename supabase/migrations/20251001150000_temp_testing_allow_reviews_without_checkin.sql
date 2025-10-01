-- =====================================================
-- TEMPORARY TESTING MIGRATION
-- =====================================================
-- Purpose: Allow review submission without check-ins for desktop testing
-- WARNING: This should be REVERTED before production deployment!
-- =====================================================

-- 1. Drop the check-in requirement constraint
ALTER TABLE business_reviews 
  DROP CONSTRAINT IF EXISTS require_checkin;

-- 2. Create a temporary testing policy that allows reviews without check-ins
DROP POLICY IF EXISTS "Users can create reviews with check-in" ON business_reviews;

CREATE POLICY "Users can create reviews with check-in (TESTING MODE)"
  ON business_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Original check-in verification (production mode)
      EXISTS (
        SELECT 1 FROM business_checkins
        WHERE id = checkin_id
        AND user_id = auth.uid()
        AND business_id = business_reviews.business_id
      )
      -- OR allow without check-in (testing mode)
      OR checkin_id IS NULL
    )
  );

-- =====================================================
-- NOTES FOR REVERTING THIS MIGRATION:
-- =====================================================
-- To revert before production:
-- 1. Re-add the constraint:
--    ALTER TABLE business_reviews 
--      ADD CONSTRAINT require_checkin CHECK (checkin_id IS NOT NULL);
-- 2. Replace the policy with the original version
-- =====================================================
