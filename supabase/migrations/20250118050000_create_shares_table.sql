-- Migration: Create shares table for tracking social shares
-- Story: 4.9 - Social Sharing Actions
-- Created: 2025-01-18

-- ============================================================================
-- SHARES TABLE
-- ============================================================================
-- Tracks all social sharing events for storefronts, products, offers, and coupons
-- Includes referral code generation for attribution tracking

CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('storefront', 'product', 'offer', 'coupon')),
  entity_id UUID NOT NULL,
  method VARCHAR(50) NOT NULL CHECK (method IN ('web_share', 'copy', 'whatsapp', 'facebook', 'twitter', 'email')),
  referral_code VARCHAR(20) UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Performance indexes for common query patterns

-- Index for user's share history
CREATE INDEX idx_shares_user 
  ON shares(user_id) 
  WHERE user_id IS NOT NULL;

-- Index for entity-specific share stats
CREATE INDEX idx_shares_entity 
  ON shares(entity_id, type);

-- Index for share type filtering
CREATE INDEX idx_shares_type 
  ON shares(type);

-- Index for share method analytics
CREATE INDEX idx_shares_method 
  ON shares(method);

-- Index for time-based queries (recent shares, trends)
CREATE INDEX idx_shares_created 
  ON shares(created_at DESC);

-- Index for referral code lookups
CREATE INDEX idx_shares_referral 
  ON shares(referral_code) 
  WHERE referral_code IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own shares (and anonymous shares)
CREATE POLICY "Users can view own shares"
  ON shares FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Anyone (including anonymous) can create shares
-- This allows tracking shares from non-logged-in users
CREATE POLICY "Anyone can create shares"
  ON shares FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL OR 
    auth.uid() IS NULL
  );

-- Policy: Users can only update their own shares (for future metadata updates)
CREATE POLICY "Users can update own shares"
  ON shares FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RPC FUNCTION: track_share
-- ============================================================================
-- Function to track share events with automatic referral code generation

CREATE OR REPLACE FUNCTION track_share(
  p_user_id UUID DEFAULT NULL,
  p_type VARCHAR DEFAULT 'product',
  p_entity_id UUID DEFAULT NULL,
  p_method VARCHAR DEFAULT 'web_share'
)
RETURNS UUID AS $$
DECLARE
  v_share_id UUID;
  v_referral_code VARCHAR(20);
BEGIN
  -- Generate unique referral code (20 hex characters)
  v_referral_code := encode(gen_random_bytes(10), 'hex');
  
  -- Insert share record
  INSERT INTO shares (user_id, type, entity_id, method, referral_code)
  VALUES (
    COALESCE(p_user_id, auth.uid()),
    p_type,
    p_entity_id,
    p_method,
    v_referral_code
  )
  RETURNING id INTO v_share_id;
  
  RETURN v_share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
-- Documentation for future reference

COMMENT ON TABLE shares IS 'Tracks social sharing events for storefronts, products, offers, and coupons';
COMMENT ON COLUMN shares.id IS 'Unique identifier for the share event';
COMMENT ON COLUMN shares.user_id IS 'User who shared (NULL for anonymous shares)';
COMMENT ON COLUMN shares.type IS 'Type of entity being shared: storefront, product, offer, coupon';
COMMENT ON COLUMN shares.entity_id IS 'ID of the entity being shared';
COMMENT ON COLUMN shares.method IS 'Method used to share: web_share (native), copy, whatsapp, facebook, twitter, email';
COMMENT ON COLUMN shares.referral_code IS 'Unique code for tracking share attribution and conversions';
COMMENT ON COLUMN shares.metadata IS 'Additional data about the share (optional)';
COMMENT ON COLUMN shares.created_at IS 'Timestamp when the share occurred';
COMMENT ON FUNCTION track_share IS 'RPC function to log share events with automatic referral code generation. Returns share ID.';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================
-- Uncomment to test after migration

-- Test share creation
-- SELECT track_share(
--   p_type := 'product',
--   p_entity_id := gen_random_uuid(),
--   p_method := 'web_share'
-- );

-- Verify table structure
-- SELECT 
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'shares'
-- ORDER BY ordinal_position;

-- Check RLS policies
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual
-- FROM pg_policies
-- WHERE tablename = 'shares';

-- Verify indexes
-- SELECT 
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'shares';
