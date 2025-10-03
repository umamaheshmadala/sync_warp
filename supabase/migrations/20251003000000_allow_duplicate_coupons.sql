-- Migration: Allow duplicate coupons per user
-- Date: 2025-10-03
-- Purpose: Remove unique constraint on (user_id, coupon_id) to allow users to have multiple copies of the same coupon

-- =====================================================
-- 1. DROP THE UNIQUE CONSTRAINT
-- =====================================================

-- Drop the unique constraint that prevents duplicate coupons
ALTER TABLE user_coupon_collections 
DROP CONSTRAINT IF EXISTS user_coupon_collections_user_id_coupon_id_key;

-- Add a comment explaining the design decision
COMMENT ON TABLE user_coupon_collections IS 'User coupon collections - users can have multiple copies of the same coupon through sharing';

-- =====================================================
-- 2. ADD INDEX FOR PERFORMANCE
-- =====================================================

-- Add a non-unique index for efficient querying
-- This helps with performance when checking how many copies a user has
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_user_coupon 
ON user_coupon_collections(user_id, coupon_id, status);

COMMENT ON INDEX idx_user_coupon_collections_user_coupon IS 'Index for efficiently counting user coupon copies and checking status';

-- =====================================================
-- 3. ADD HELPER FUNCTION TO COUNT COUPON COPIES
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_coupon_count(
  p_user_id UUID,
  p_coupon_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM user_coupon_collections
    WHERE user_id = p_user_id
      AND coupon_id = p_coupon_id
      AND status IN ('active', 'used')
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_coupon_count IS 'Get the count of how many copies of a coupon a user has (active or used)';
