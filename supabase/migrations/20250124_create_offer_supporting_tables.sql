-- Migration: Create Supporting Tables for Story 4.12
-- Date: 2025-01-24
-- Description: Create tables for offer drafts, analytics, shares, and lifecycle events

-- ==========================================
-- TABLE 1: Offer Drafts
-- ==========================================
CREATE TABLE IF NOT EXISTS offer_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  draft_name TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  step_completed INTEGER DEFAULT 1 CHECK (step_completed >= 1 AND step_completed <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_drafts_user_business ON offer_drafts(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_offer_drafts_business ON offer_drafts(business_id);

COMMENT ON TABLE offer_drafts IS 'Saved draft offers for businesses to complete later';
COMMENT ON COLUMN offer_drafts.draft_name IS 'User-friendly name for the draft';
COMMENT ON COLUMN offer_drafts.form_data IS 'JSON object containing partial offer data';
COMMENT ON COLUMN offer_drafts.step_completed IS 'Last completed step in creation wizard (1-4)';

-- Enable RLS
ALTER TABLE offer_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own drafts" ON offer_drafts
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- TABLE 2: Offer Analytics
-- ==========================================
CREATE TABLE IF NOT EXISTS offer_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  
  -- View metrics
  total_views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  
  -- Share metrics
  total_shares INTEGER DEFAULT 0,
  unique_sharers INTEGER DEFAULT 0,
  share_channels JSONB DEFAULT '{}', -- {"whatsapp": 50, "in_app": 30, "facebook": 20}
  
  -- Click metrics
  total_clicks INTEGER DEFAULT 0,
  unique_clickers INTEGER DEFAULT 0,
  click_sources JSONB DEFAULT '{}', -- {"direct": 100, "shared_link": 50}
  
  -- Daily stats for charts
  daily_stats JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(offer_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_analytics_business ON offer_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_offer_analytics_offer ON offer_analytics(offer_id);

COMMENT ON TABLE offer_analytics IS 'Analytics and metrics for business offers';
COMMENT ON COLUMN offer_analytics.share_channels IS 'JSON object tracking shares per channel';
COMMENT ON COLUMN offer_analytics.daily_stats IS 'JSON array of daily statistics for trend charts';

-- Enable RLS
ALTER TABLE offer_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Business owners can view own analytics" ON offer_analytics
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- ==========================================
-- TABLE 3: Offer Shares
-- ==========================================
CREATE TABLE IF NOT EXISTS offer_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  sharer_id UUID REFERENCES auth.users(id),
  share_channel VARCHAR(50) NOT NULL CHECK (share_channel IN ('whatsapp', 'facebook', 'twitter', 'in_app', 'other')),
  shared_to_user_id UUID REFERENCES auth.users(id), -- For in-app shares only
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Analytics tracking
  was_clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_offer_shares_offer ON offer_shares(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_shares_sharer ON offer_shares(sharer_id);
CREATE INDEX IF NOT EXISTS idx_offer_shares_business ON offer_shares(business_id);
CREATE INDEX IF NOT EXISTS idx_offer_shares_shared_at ON offer_shares(shared_at);

COMMENT ON TABLE offer_shares IS 'Tracks all offer sharing activities for analytics';
COMMENT ON COLUMN offer_shares.share_channel IS 'Platform where offer was shared (whatsapp, facebook, twitter, in_app, other)';
COMMENT ON COLUMN offer_shares.shared_to_user_id IS 'Target user ID for in-app shares only';

-- Enable RLS
ALTER TABLE offer_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can share offers" ON offer_shares
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view shares they created" ON offer_shares
  FOR SELECT USING (sharer_id = auth.uid() OR shared_to_user_id = auth.uid());

CREATE POLICY "Business owners can view all shares of their offers" ON offer_shares
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- ==========================================
-- TABLE 4: Offer Lifecycle Events
-- ==========================================
CREATE TABLE IF NOT EXISTS offer_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'created', 'activated', 'deactivated', 'expired', 'extended', 
    'duplicated', 'archived', 'deleted'
  )),
  event_metadata JSONB DEFAULT '{}',
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_lifecycle_offer ON offer_lifecycle_events(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_lifecycle_business ON offer_lifecycle_events(business_id);
CREATE INDEX IF NOT EXISTS idx_offer_lifecycle_timestamp ON offer_lifecycle_events(event_timestamp);

COMMENT ON TABLE offer_lifecycle_events IS 'Audit trail of all offer lifecycle events for compliance and analytics';
COMMENT ON COLUMN offer_lifecycle_events.event_type IS 'Type of lifecycle event (created, activated, expired, etc.)';
COMMENT ON COLUMN offer_lifecycle_events.event_metadata IS 'Additional context about the event';

-- Enable RLS
ALTER TABLE offer_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Business owners can view own offer events" ON offer_lifecycle_events
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );
