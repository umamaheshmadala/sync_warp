-- =====================================================
-- Support for GPS Testing Mode
-- =====================================================
-- This migration relaxes the database constraint on checkin_id
-- to allow "Testing Mode" submissions where checkin_id is null.
--
-- The application layer (reviewService.ts) matches the strictness
-- based on the Admin GPS Toggle setting.
-- =====================================================

-- 1. DROP the explicit constraint if it exists (from previous migrations)
ALTER TABLE business_reviews DROP CONSTRAINT IF EXISTS require_checkin;

-- 2. Make the column nullable
ALTER TABLE business_reviews ALTER COLUMN checkin_id DROP NOT NULL;

-- 3. Add a comment explaining why
COMMENT ON COLUMN business_reviews.checkin_id IS 'Check-in ID. Nullable to support Admin Testing Mode. App layer enforces requirement by default.';

-- =====================================================
-- Migration Complete! ✅
-- Reviews can now be created without a check-in ID (if app allows it)
-- =====================================================
