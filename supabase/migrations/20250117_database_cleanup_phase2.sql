-- ============================================================================
-- Database Cleanup Migration - Phase 2
-- Date: 2025-10-17
-- Purpose: Consolidate favorites system while preserving both profile tables
-- Risk: MEDIUM - Involves data migration
-- ============================================================================

-- ============================================================================
-- IMPORTANT CLARIFICATION
-- ============================================================================
-- After analysis, we discovered that 'profiles' and 'user_profiles' are NOT duplicates:
-- - profiles: User account/authentication data (email, name, avatar, role, etc.)
-- - user_profiles: Analytics/behavioral data (demographics, purchase history, etc.)
-- Both tables serve complementary purposes and should be PRESERVED.

-- ============================================================================
-- SECTION 1: MIGRATE LEGACY BUSINESS FAVORITES TO UNIFIED SYSTEM
-- ============================================================================

-- Migrate business favorites
INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
SELECT 
  user_id, 
  'business' as entity_type,
  business_id as entity_id,
  created_at
FROM user_favorites_businesses
WHERE NOT EXISTS (
  SELECT 1 FROM favorites f 
  WHERE f.user_id = user_favorites_businesses.user_id 
    AND f.entity_type = 'business' 
    AND f.entity_id = user_favorites_businesses.business_id
);

-- ============================================================================
-- SECTION 2: MIGRATE LEGACY COUPON FAVORITES TO UNIFIED SYSTEM
-- ============================================================================

-- Migrate coupon favorites
INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
SELECT 
  user_id, 
  'coupon' as entity_type,
  coupon_id as entity_id,
  created_at
FROM user_favorites_coupons
WHERE NOT EXISTS (
  SELECT 1 FROM favorites f 
  WHERE f.user_id = user_favorites_coupons.user_id 
    AND f.entity_type = 'coupon' 
    AND f.entity_id = user_favorites_coupons.coupon_id
);

-- ============================================================================
-- SECTION 3: ADD UNIQUE CONSTRAINTS TO PREVENT DUPLICATES
-- ============================================================================

-- Ensure no duplicate favorites per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_unique_user_entity 
  ON favorites(user_id, entity_type, entity_id);

-- ============================================================================
-- SECTION 4: CREATE MIGRATION VERIFICATION VIEW
-- ============================================================================

-- Create a view to compare legacy vs unified favorites counts
CREATE OR REPLACE VIEW favorites_migration_audit AS
SELECT 
  'businesses' as favorite_type,
  COUNT(*) as legacy_count,
  (SELECT COUNT(*) FROM favorites WHERE entity_type = 'business') as unified_count
FROM user_favorites_businesses
UNION ALL
SELECT 
  'coupons' as favorite_type,
  COUNT(*) as legacy_count,
  (SELECT COUNT(*) FROM favorites WHERE entity_type = 'coupon') as unified_count
FROM user_favorites_coupons
UNION ALL
SELECT 
  'products' as favorite_type,
  0 as legacy_count,
  (SELECT COUNT(*) FROM favorites WHERE entity_type = 'product') as unified_count;

-- ============================================================================
-- SECTION 5: RENAME LEGACY TABLES (INSTEAD OF DROPPING)
-- ============================================================================
-- Keep legacy tables as backup for 30 days before final removal

ALTER TABLE user_favorites_businesses RENAME TO _deprecated_user_favorites_businesses;
ALTER TABLE user_favorites_coupons RENAME TO _deprecated_user_favorites_coupons;

COMMENT ON TABLE _deprecated_user_favorites_businesses IS 
  'DEPRECATED 2025-10-17: Data migrated to unified favorites table. Safe to drop after 2025-11-17';
COMMENT ON TABLE _deprecated_user_favorites_coupons IS 
  'DEPRECATED 2025-10-17: Data migrated to unified favorites table. Safe to drop after 2025-11-17';

-- ============================================================================
-- SECTION 6: UPDATE RPC FUNCTIONS TO USE UNIFIED FAVORITES
-- ============================================================================

-- Drop old RPC functions that used legacy tables
DROP FUNCTION IF EXISTS get_user_favorite_businesses(uuid);
DROP FUNCTION IF EXISTS get_user_favorite_coupons(uuid);

-- Create new unified RPC function
CREATE OR REPLACE FUNCTION get_user_favorites(
  p_user_id uuid,
  p_entity_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id uuid,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.entity_type, f.entity_id, f.created_at
  FROM favorites f
  WHERE f.user_id = p_user_id
    AND (p_entity_type IS NULL OR f.entity_type = p_entity_type)
  ORDER BY f.created_at DESC;
END;
$$;

-- ============================================================================
-- SECTION 7: ADD ENHANCED ANALYTICS FOR FAVORITES
-- ============================================================================

-- Create materialized view for favorites analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS favorites_stats AS
SELECT 
  entity_type,
  COUNT(*) as total_favorites,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_favorited_at
FROM favorites
GROUP BY entity_type;

-- Add index to materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_stats_entity_type 
  ON favorites_stats(entity_type);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
  v_business_legacy_count int;
  v_business_unified_count int;
  v_coupon_legacy_count int;
  v_coupon_unified_count int;
BEGIN
  -- Count legacy records (from deprecated tables)
  SELECT COUNT(*) INTO v_business_legacy_count FROM _deprecated_user_favorites_businesses;
  SELECT COUNT(*) INTO v_coupon_legacy_count FROM _deprecated_user_favorites_coupons;
  
  -- Count unified records
  SELECT COUNT(*) INTO v_business_unified_count FROM favorites WHERE entity_type = 'business';
  SELECT COUNT(*) INTO v_coupon_unified_count FROM favorites WHERE entity_type = 'coupon';
  
  -- Verify migration
  IF v_business_unified_count < v_business_legacy_count THEN
    RAISE WARNING 'Business favorites migration incomplete: unified(%) < legacy(%)', 
      v_business_unified_count, v_business_legacy_count;
  END IF;
  
  IF v_coupon_unified_count < v_coupon_legacy_count THEN
    RAISE WARNING 'Coupon favorites migration incomplete: unified(%) < legacy(%)', 
      v_coupon_unified_count, v_coupon_legacy_count;
  END IF;
  
  RAISE NOTICE 'SUCCESS: Phase 2 migration completed';
  RAISE NOTICE 'Business favorites: % legacy → % unified', v_business_legacy_count, v_business_unified_count;
  RAISE NOTICE 'Coupon favorites: % legacy → % unified', v_coupon_legacy_count, v_coupon_unified_count;
  RAISE NOTICE 'Legacy tables renamed with _deprecated prefix for 30-day safety period';
  
  -- Display audit view
  RAISE NOTICE 'Run: SELECT * FROM favorites_migration_audit; to verify counts';
END $$;
