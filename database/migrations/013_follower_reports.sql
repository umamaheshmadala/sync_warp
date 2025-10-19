-- Migration 013: Follower Reports System
-- Creates table for tracking suspicious follower activity reports
-- Part of Story 4.11 - Phase 5

-- Create follower_reports table
CREATE TABLE IF NOT EXISTS follower_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
    'fake_reviews',
    'spam_bot',
    'harassment',
    'competitor_sabotage',
    'other'
  )),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_follower_reports_business ON follower_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_follower_reports_reporter ON follower_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_follower_reports_reported_user ON follower_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_follower_reports_status ON follower_reports(status);
CREATE INDEX IF NOT EXISTS idx_follower_reports_created_at ON follower_reports(created_at DESC);

-- RLS Policies
ALTER TABLE follower_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can view reports they submitted
CREATE POLICY "Business owners can view their own reports"
  ON follower_reports
  FOR SELECT
  USING (
    reporter_id = auth.uid()
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Business owners can insert reports for their businesses
CREATE POLICY "Business owners can create reports"
  ON follower_reports
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON follower_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Admins can update reports (review, add notes, change status)
CREATE POLICY "Admins can update reports"
  ON follower_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_follower_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_follower_reports_timestamp
  BEFORE UPDATE ON follower_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_reports_updated_at();

-- Function to get report statistics for a business
CREATE OR REPLACE FUNCTION get_business_report_stats(p_business_id UUID)
RETURNS TABLE (
  total_reports BIGINT,
  pending_reports BIGINT,
  resolved_reports BIGINT,
  dismissed_reports BIGINT,
  unique_reported_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_reports,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_reports,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT AS resolved_reports,
    COUNT(*) FILTER (WHERE status = 'dismissed')::BIGINT AS dismissed_reports,
    COUNT(DISTINCT reported_user_id)::BIGINT AS unique_reported_users
  FROM follower_reports
  WHERE business_id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_business_report_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE follower_reports IS 'Tracks suspicious activity reports for followers';
COMMENT ON COLUMN follower_reports.report_type IS 'Type of suspicious activity: fake_reviews, spam_bot, harassment, competitor_sabotage, other';
COMMENT ON COLUMN follower_reports.status IS 'Report status: pending, reviewing, resolved, dismissed';
COMMENT ON COLUMN follower_reports.admin_notes IS 'Internal notes added by admin during review';
