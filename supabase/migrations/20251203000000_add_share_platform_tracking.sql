-- Migration: Add share platform and messaging tracking to shares table
-- Story: 8.3.4 - Coupon/Deal Sharing Integration
-- Created: 2025-12-03

-- ============================================================================
-- ADD PLATFORM TRACKING COLUMNS
-- ============================================================================
-- Track which platform the share originated from (web, ios, android)

ALTER TABLE shares 
ADD COLUMN IF NOT EXISTS share_platform TEXT 
CHECK (share_platform IN ('web', 'ios', 'android')) 
DEFAULT 'web';

COMMENT ON COLUMN shares.share_platform IS 'Platform where share originated: web, ios, or android';

-- ============================================================================
-- ADD SHARE METHOD COLUMN
-- ============================================================================
-- Track how the share was performed (message, share_sheet, link)

ALTER TABLE shares
ADD COLUMN IF NOT EXISTS share_method TEXT
CHECK (share_method IN ('message', 'share_sheet', 'link', 'web_share', 'copy', 'whatsapp', 'facebook', 'twitter', 'email'))
DEFAULT 'message';

COMMENT ON COLUMN shares.share_method IS 'Method used to share: message (in-app), share_sheet (native), link (copied), or social platform';

-- ============================================================================
-- ADD MESSAGING INTEGRATION COLUMNS
-- ============================================================================
-- Track shares that happen through the messaging system

ALTER TABLE shares
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

ALTER TABLE shares
ADD COLUMN IF NOT EXISTS shared_with_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN shares.conversation_id IS 'Conversation where the share occurred (if shared via messaging)';
COMMENT ON COLUMN shares.shared_with_user_id IS 'User who received the share (if shared directly)';

-- ============================================================================
-- CREATE ANALYTICS INDEXES
-- ============================================================================
-- Performance indexes for analytics queries

CREATE INDEX IF NOT EXISTS idx_shares_platform 
  ON shares(share_platform);

CREATE INDEX IF NOT EXISTS idx_shares_method 
  ON shares(share_method);

CREATE INDEX IF NOT EXISTS idx_shares_analytics 
  ON shares(type, entity_id, share_platform);

CREATE INDEX IF NOT EXISTS idx_shares_conversation 
  ON shares(conversation_id) 
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shares_recipient 
  ON shares(shared_with_user_id) 
  WHERE shared_with_user_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================
-- Uncomment to test after migration

-- Check updated schema
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'shares'
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'shares'
-- ORDER BY indexname;
