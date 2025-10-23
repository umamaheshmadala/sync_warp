-- Migration: Follower Targeting System
-- Description: Creates all tables, indexes, and RLS policies for the follower targeting and analytics system
-- Created: 2025-01-23

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Business Followers Table
CREATE TABLE IF NOT EXISTS business_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- Add comment for documentation
COMMENT ON TABLE business_followers IS 'Tracks follower relationships between users and businesses';
COMMENT ON COLUMN business_followers.is_active IS 'true = currently following, false = unfollowed';

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  targeting_filters JSONB,
  budget DECIMAL(10, 2),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE campaigns IS 'Stores marketing campaigns created by businesses';
COMMENT ON COLUMN campaigns.targeting_filters IS 'JSON object containing demographic and follower targeting filters';
COMMENT ON COLUMN campaigns.status IS 'Campaign lifecycle status: draft, active, paused, completed, archived';

-- Campaign Metrics Table
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),
  clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  shares INTEGER DEFAULT 0 CHECK (shares >= 0),
  conversions INTEGER DEFAULT 0 CHECK (conversions >= 0),
  demographic TEXT,
  is_follower BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE campaign_metrics IS 'Tracks performance metrics for campaigns';
COMMENT ON COLUMN campaign_metrics.demographic IS 'Demographic segment identifier (e.g., age-25-34, gender-male)';
COMMENT ON COLUMN campaign_metrics.is_follower IS 'Whether the user was a follower at the time of interaction';

-- Follower Reports Table (for suspicious activity)
CREATE TABLE IF NOT EXISTS follower_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('spam', 'bot', 'harassment', 'fake_engagement', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'action_taken', 'dismissed')),
  admin_notes TEXT,
  action_taken TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE follower_reports IS 'User-submitted reports of suspicious follower activity';
COMMENT ON COLUMN follower_reports.action_taken IS 'Action taken by admin: warned, suspended, banned, none';

-- =====================================================
-- 2. ADD DEMOGRAPHIC COLUMNS TO USERS TABLE
-- =====================================================

-- Check if columns exist before adding
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='age') THEN
    ALTER TABLE users ADD COLUMN age INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gender') THEN
    ALTER TABLE users ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='city') THEN
    ALTER TABLE users ADD COLUMN city TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='country') THEN
    ALTER TABLE users ADD COLUMN country TEXT;
  END IF;
END $$;

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Business Followers Indexes
CREATE INDEX IF NOT EXISTS idx_business_followers_business_id ON business_followers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_followers_user_id ON business_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_business_followers_is_active ON business_followers(is_active);
CREATE INDEX IF NOT EXISTS idx_business_followers_followed_at ON business_followers(followed_at);
CREATE INDEX IF NOT EXISTS idx_business_followers_active_business ON business_followers(business_id, is_active);

-- Campaigns Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);

-- Campaign Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_user_id ON campaign_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_created_at ON campaign_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_is_follower ON campaign_metrics(is_follower);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_demographic ON campaign_metrics(demographic);

-- Follower Reports Indexes
CREATE INDEX IF NOT EXISTS idx_follower_reports_reporter_id ON follower_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_follower_reports_reported_user_id ON follower_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_follower_reports_business_id ON follower_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_follower_reports_status ON follower_reports(status);
CREATE INDEX IF NOT EXISTS idx_follower_reports_created_at ON follower_reports(created_at);

-- Users Demographic Indexes
CREATE INDEX IF NOT EXISTS idx_users_age ON users(age);
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE business_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Business Followers Policies
CREATE POLICY "Users can view their own follows"
  ON business_followers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow businesses"
  ON business_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow businesses"
  ON business_followers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view their followers"
  ON business_followers FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Campaigns Policies
CREATE POLICY "Business owners can view their campaigns"
  ON campaigns FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their campaigns"
  ON campaigns FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their campaigns"
  ON campaigns FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Campaign Metrics Policies
CREATE POLICY "Business owners can view campaign metrics"
  ON campaign_metrics FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN businesses b ON c.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );

CREATE POLICY "System can insert campaign metrics"
  ON campaign_metrics FOR INSERT
  WITH CHECK (true); -- Metrics are inserted by the system

-- Follower Reports Policies
CREATE POLICY "Users can create reports"
  ON follower_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON follower_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Business owners can view reports about their business"
  ON follower_reports FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Admins can view and manage all reports (requires admin role)
CREATE POLICY "Admins can manage all reports"
  ON follower_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- 6. CREATE TRIGGER FUNCTIONS
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to tables
DROP TRIGGER IF EXISTS update_business_followers_updated_at ON business_followers;
CREATE TRIGGER update_business_followers_updated_at
  BEFORE UPDATE ON business_followers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_follower_reports_updated_at ON follower_reports;
CREATE TRIGGER update_follower_reports_updated_at
  BEFORE UPDATE ON follower_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get follower count for a business
CREATE OR REPLACE FUNCTION get_follower_count(business_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM business_followers
  WHERE business_id = business_uuid AND is_active = true;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_follower_count IS 'Returns the active follower count for a business';

-- Function to check if a user follows a business
CREATE OR REPLACE FUNCTION is_following(user_uuid UUID, business_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM business_followers
    WHERE user_id = user_uuid
    AND business_id = business_uuid
    AND is_active = true
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION is_following IS 'Checks if a user is currently following a business';

-- Function to calculate campaign CTR
CREATE OR REPLACE FUNCTION get_campaign_ctr(campaign_uuid UUID)
RETURNS NUMERIC AS $$
  SELECT 
    CASE 
      WHEN SUM(impressions) > 0 THEN 
        (SUM(clicks)::NUMERIC / SUM(impressions)::NUMERIC) * 100
      ELSE 0
    END
  FROM campaign_metrics
  WHERE campaign_id = campaign_uuid;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_campaign_ctr IS 'Calculates Click-Through Rate for a campaign';

-- =====================================================
-- 8. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active campaigns with metrics
CREATE OR REPLACE VIEW campaign_overview AS
SELECT 
  c.id,
  c.business_id,
  c.title,
  c.status,
  c.start_date,
  c.end_date,
  COALESCE(SUM(cm.impressions), 0) as total_impressions,
  COALESCE(SUM(cm.clicks), 0) as total_clicks,
  COALESCE(SUM(cm.likes), 0) as total_likes,
  COALESCE(SUM(cm.shares), 0) as total_shares,
  CASE 
    WHEN SUM(cm.impressions) > 0 THEN 
      (SUM(cm.clicks)::NUMERIC / SUM(cm.impressions)::NUMERIC) * 100
    ELSE 0
  END as ctr,
  c.created_at,
  c.updated_at
FROM campaigns c
LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
GROUP BY c.id;

COMMENT ON VIEW campaign_overview IS 'Summary view of campaigns with aggregated metrics';

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON business_followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
GRANT SELECT, INSERT ON campaign_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON follower_reports TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_follower_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_following TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_ctr TO authenticated;

-- =====================================================
-- 10. INSERT SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Uncomment below to insert sample data for testing
/*
-- Sample followers (requires existing businesses and users)
INSERT INTO business_followers (business_id, user_id, followed_at, is_active)
SELECT 
  b.id,
  u.id,
  NOW() - (random() * interval '30 days'),
  random() > 0.1 -- 90% active
FROM businesses b
CROSS JOIN LATERAL (
  SELECT id FROM users ORDER BY random() LIMIT 10
) u
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Sample campaigns
INSERT INTO campaigns (business_id, title, description, status, targeting_filters, start_date)
SELECT 
  id,
  'Sample Campaign ' || generate_series,
  'Test campaign description',
  CASE WHEN random() > 0.5 THEN 'active' ELSE 'draft' END,
  '{"targetFollowers": true, "ageRange": {"min": 18, "max": 45}}'::jsonb,
  NOW()
FROM businesses, generate_series(1, 3)
LIMIT 10;
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('business_followers', 'campaigns', 'campaign_metrics', 'follower_reports');
  
  IF table_count = 4 THEN
    RAISE NOTICE 'Migration completed successfully! All 4 tables created.';
  ELSE
    RAISE WARNING 'Migration may be incomplete. Expected 4 tables, found %.', table_count;
  END IF;
END $$;
