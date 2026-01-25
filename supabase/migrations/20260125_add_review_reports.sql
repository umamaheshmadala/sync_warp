-- ============================================
-- MIGRATION: Review Report System
-- Story: 11.4.2
-- ============================================

-- Step 1: Create review_reports table
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abusive', 'fake', 'offensive', 'irrelevant')),
  details TEXT CHECK (char_length(details) <= 200),
  is_business_owner BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One report per user per review
  UNIQUE(review_id, reporter_id)
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_review_reports_review 
ON review_reports(review_id);

CREATE INDEX IF NOT EXISTS idx_review_reports_pending 
ON review_reports(status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_review_reports_reporter 
ON review_reports(reporter_id);

-- Step 3: Create view for report counts
CREATE OR REPLACE VIEW review_report_counts AS
SELECT 
  review_id,
  COUNT(*) as report_count,
  COUNT(*) FILTER (WHERE is_business_owner) as owner_report_count,
  array_agg(DISTINCT reason) as reasons,
  MIN(created_at) as first_reported_at
FROM review_reports
WHERE status = 'pending'
GROUP BY review_id;

-- Step 4: RLS policies
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON review_reports;
CREATE POLICY "Users can view own reports" ON review_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Users can create reports (not on own reviews)
-- Note: Logic to prevent reporting own review is also enforced in API/Service layer but good to have here
DROP POLICY IF EXISTS "Users can create reports" ON review_reports;
CREATE POLICY "Users can create reports" ON review_reports
  FOR INSERT WITH CHECK (
    reporter_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM business_reviews 
      WHERE id = review_id AND user_id = auth.uid()
    )
  );

-- Admins can view all reports
DROP POLICY IF EXISTS "Admins can view all reports" ON review_reports;
CREATE POLICY "Admins can view all reports" ON review_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update reports
DROP POLICY IF EXISTS "Admins can update reports" ON review_reports;
CREATE POLICY "Admins can update reports" ON review_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
