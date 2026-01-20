-- ============================================
-- MIGRATION: Implement Soft Delete for Reviews
-- Story: 11.1.4
-- ============================================

-- Ensure deleted_at column exists
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Ensure deleted_by column exists (for admin deletions)
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;

-- Ensure deletion_reason exists (for admin/moderation deletions)
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;

-- Drop the old UNIQUE constraint if it exists
ALTER TABLE business_reviews 
DROP CONSTRAINT IF EXISTS business_reviews_user_business_unique;

-- Create new UNIQUE constraint that only applies to non-deleted reviews
-- This allows users to have one active review per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_active_per_user_business
ON business_reviews (user_id, business_id)
WHERE deleted_at IS NULL;

-- Create index for efficient filtering of active reviews
CREATE INDEX IF NOT EXISTS idx_reviews_active
ON business_reviews (business_id)
WHERE deleted_at IS NULL;

-- Create index for admin queries on deleted reviews
CREATE INDEX IF NOT EXISTS idx_reviews_deleted
ON business_reviews (deleted_at)
WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude deleted reviews for regular users
DROP POLICY IF EXISTS "Users can view active reviews" ON business_reviews;
CREATE POLICY "Users can view active reviews" ON business_reviews
  FOR SELECT
  USING (deleted_at IS NULL OR auth.uid() = user_id);

-- Policy for admins to see all reviews including deleted
DROP POLICY IF EXISTS "Admins can view all reviews" ON business_reviews;
CREATE POLICY "Admins can view all reviews" ON business_reviews
  FOR SELECT
  USING (
    deleted_at IS NULL 
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can update (edit or soft delete) their own reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON business_reviews;
CREATE POLICY "Users can update own reviews" ON business_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
