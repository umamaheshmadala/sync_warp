-- ============================================
-- Story 11.3.9: User Review Insights
-- Creates review_views table and updates user_review_activity view
-- ============================================

-- 1. Create review_views table for tracking review views
-- Use view_date column for deduplication instead of expression in index
CREATE TABLE IF NOT EXISTS review_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_date DATE NOT NULL DEFAULT CURRENT_DATE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_view_per_day UNIQUE (review_id, viewer_id, view_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_views_review ON review_views(review_id);
CREATE INDEX IF NOT EXISTS idx_review_views_viewer ON review_views(viewer_id);

-- RLS: Enable row level security
ALTER TABLE review_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own views
CREATE POLICY "Users can log views"
ON review_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- Policy: Reviewers can see view counts on their reviews, users see their own view history
CREATE POLICY "Users can see relevant view data"
ON review_views FOR SELECT
USING (
  viewer_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM business_reviews br 
    WHERE br.id = review_id AND br.user_id = auth.uid()
  )
);

-- Grant access to authenticated users
GRANT SELECT, INSERT ON review_views TO authenticated;

-- ============================================
-- 2. Update user_review_activity view with new metrics
-- ============================================

CREATE OR REPLACE VIEW user_review_activity AS
SELECT 
  br.user_id,
  COUNT(*)::integer AS total_reviews,
  COUNT(*) FILTER (WHERE br.recommendation = true)::integer AS positive_reviews,
  COUNT(*) FILTER (WHERE br.recommendation = false)::integer AS negative_reviews,
  COUNT(*) FILTER (WHERE br.review_text IS NOT NULL AND br.review_text != '')::integer AS reviews_with_text,
  COUNT(*) FILTER (WHERE array_length(br.photo_urls, 1) > 0)::integer AS reviews_with_photos,
  MAX(br.created_at) AS last_review_date,
  -- New fields for Story 11.3.9
  COALESCE(SUM(rhv.vote_count), 0)::integer AS total_helpful_votes,
  COUNT(*) FILTER (WHERE brr.id IS NOT NULL)::integer AS responses_received,
  COALESCE(SUM(rv.view_count), 0)::integer AS total_views
FROM business_reviews br
LEFT JOIN (
  SELECT review_id, COUNT(*) AS vote_count 
  FROM review_helpful_votes 
  GROUP BY review_id
) rhv ON rhv.review_id = br.id
LEFT JOIN business_review_responses brr ON brr.review_id = br.id
LEFT JOIN (
  SELECT review_id, COUNT(DISTINCT viewer_id) AS view_count
  FROM review_views
  GROUP BY review_id
) rv ON rv.review_id = br.id
WHERE br.deleted_at IS NULL
GROUP BY br.user_id;

-- Grant access
GRANT SELECT ON user_review_activity TO authenticated;
