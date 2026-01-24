-- ============================================
-- MIGRATION: Admin Review Moderation Update Policy
-- Story: 11.4.1 - Fix for admin approval not persisting
-- ============================================
-- Problem: Admins could not update review moderation_status because
-- the UPDATE policy only allowed users to update their own reviews.

-- Drop existing admin update policy if it exists (safe cleanup)
DROP POLICY IF EXISTS "Admins can update reviews for moderation" ON business_reviews;

-- Create policy allowing admins to update any review for moderation purposes
CREATE POLICY "Admins can update reviews for moderation" ON business_reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Admins can update reviews for moderation" ON business_reviews IS 
  'Allows admin users to update any review for moderation purposes (approve/reject)';
