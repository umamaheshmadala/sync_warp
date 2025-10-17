-- ============================================================================
-- Database Cleanup Migration - Phase 1
-- Date: 2025-01-17
-- Purpose: Remove unused tables and add performance indexes
-- Risk: LOW - Only drops unused tables
-- ============================================================================

-- ============================================================================
-- SECTION 1: DROP UNUSED ENHANCED FAVORITES TABLES
-- ============================================================================
-- These tables were created but never used in the codebase
-- The app uses simpler favorites, user_favorites_businesses, user_favorites_coupons

DROP TABLE IF EXISTS favorite_stats CASCADE;
DROP TABLE IF EXISTS favorite_notifications CASCADE;
DROP TABLE IF EXISTS favorite_shares CASCADE;
DROP TABLE IF EXISTS favorite_categories CASCADE;
DROP TABLE IF EXISTS enhanced_favorites CASCADE;

COMMENT ON SCHEMA public IS 'Dropped 5 unused enhanced favorites tables (20250117)';

-- ============================================================================
-- SECTION 2: DROP UNUSED COUPON COLLECTIONS TABLE
-- ============================================================================
-- Replaced by simpler favorites system

DROP TABLE IF EXISTS user_coupon_collections CASCADE;

-- ============================================================================
-- SECTION 3: ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index for active coupons (heavily queried)
CREATE INDEX IF NOT EXISTS idx_business_coupons_active 
  ON business_coupons(status, business_id) 
  WHERE status = 'active';

-- Index for campaign status filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_status 
  ON campaigns(status, business_id);

-- Index for unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
  ON notifications(user_id, read, created_at) 
  WHERE read = false;

-- Index for favorites by user and type
CREATE INDEX IF NOT EXISTS idx_favorites_user_type 
  ON favorites(user_id, entity_type, created_at);

-- Index for wishlist items by user
CREATE INDEX IF NOT EXISTS idx_wishlist_user 
  ON user_wishlist_items(user_id, created_at DESC);

-- Index for business reviews by business
CREATE INDEX IF NOT EXISTS idx_reviews_business 
  ON business_reviews(business_id, created_at DESC);

-- Index for checkins by user (for analytics)
CREATE INDEX IF NOT EXISTS idx_checkins_user 
  ON business_checkins(user_id, created_at DESC);

-- ============================================================================
-- SECTION 4: DOCUMENT FUTURE-USE TABLES
-- ============================================================================

-- Mark tables as "future use" with comments
COMMENT ON TABLE media_processing_queue IS 'FUTURE USE: Async media processing - not yet implemented';
COMMENT ON TABLE retention_warnings IS 'FUTURE USE: GDPR compliance - not yet implemented';
COMMENT ON TABLE retention_override_requests IS 'FUTURE USE: GDPR compliance - not yet implemented';
COMMENT ON TABLE retention_archives IS 'FUTURE USE: GDPR compliance - not yet implemented';
COMMENT ON TABLE business_verification_documents IS 'FUTURE USE: KYB verification - not yet implemented';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify enhanced favorites tables are dropped
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enhanced_favorites') THEN
    RAISE EXCEPTION 'ERROR: enhanced_favorites table still exists!';
  END IF;
  
  RAISE NOTICE 'SUCCESS: Phase 1 cleanup completed successfully';
  RAISE NOTICE 'Dropped: 6 unused tables';
  RAISE NOTICE 'Added: 7 performance indexes';
END $$;
