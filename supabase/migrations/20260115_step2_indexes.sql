-- ============================================
-- STEP 2: CREATE INDEXES (Run after Step 1)
-- ============================================

-- First, verify tables exist by running this SELECT (should return 3 rows):
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('share_events', 'share_clicks_unified', 'share_conversions');

-- If share_clicks_unified is missing, run Step 1 again or just this:
-- CREATE TABLE IF NOT EXISTS share_clicks_unified (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   share_event_id UUID NOT NULL REFERENCES share_events(id) ON DELETE CASCADE,
--   clicked_at TIMESTAMPTZ DEFAULT NOW(),
--   ip_hash TEXT,
--   user_agent TEXT,
--   referrer TEXT
-- );

-- Indexes for share_events
CREATE INDEX IF NOT EXISTS idx_share_events_entity ON share_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_share_events_user ON share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_created ON share_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_events_method ON share_events(share_method);

-- Comments
COMMENT ON TABLE share_events IS 'Tracks all share events across entity types (storefront, product, offer, profile)';
