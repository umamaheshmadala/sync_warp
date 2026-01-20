-- =====================================================
-- Story 11.1.3: Remove 24-Hour Edit Window
-- =====================================================
-- This migration updates the RLS policy to allow users to edit
-- their reviews at any time (removes the 24-hour restriction)
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can update own reviews within 24h" ON business_reviews;

-- Create new policy allowing edits at any time
CREATE POLICY "Users can update own reviews"
  ON business_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON POLICY "Users can update own reviews" ON business_reviews IS 
  'Story 11.1.3: Users can edit their own reviews at any time (24-hour restriction removed)';

-- =====================================================
-- Migration Complete! ✅
-- Story 11.1.3: 24-hour edit restriction removed
-- =====================================================
