-- ============================================
-- FIX: Drop conflicting unique constraint
-- Story: 11.1.4 (Bugfix)
-- ============================================

-- Drop the correct legacy constraint name
ALTER TABLE business_reviews 
DROP CONSTRAINT IF EXISTS unique_user_business_review;

-- Ensure the new partial index exists (just in case)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_active_per_user_business
ON business_reviews (user_id, business_id)
WHERE deleted_at IS NULL;
