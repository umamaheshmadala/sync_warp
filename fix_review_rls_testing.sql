-- =====================================================
-- FIX REVIEW RLS FOR TESTING
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Drop the check-in requirement constraint
ALTER TABLE business_reviews 
  DROP CONSTRAINT IF EXISTS require_checkin;

-- 2. Replace the INSERT policy to allow reviews without check-ins (for testing)
DROP POLICY IF EXISTS "Users can create reviews with check-in" ON business_reviews;
DROP POLICY IF EXISTS "Users can create reviews with check-in (TESTING MODE)" ON business_reviews;

CREATE POLICY "Users can create reviews with check-in (TESTING MODE)"
  ON business_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Original check-in verification (production mode)
      (
        checkin_id IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM business_checkins
          WHERE id = checkin_id
          AND user_id = auth.uid()
          AND business_id = business_reviews.business_id
        )
      )
      -- OR allow without check-in (testing mode)
      OR checkin_id IS NULL
    )
  );

-- Show success message
SELECT 'RLS policy updated successfully! Reviews can now be submitted without check-ins for testing.' as message;
