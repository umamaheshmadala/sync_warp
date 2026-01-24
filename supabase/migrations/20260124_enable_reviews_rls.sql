-- Enable RLS on business_reviews (critical for moderation policies to work)
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;

-- Verify policy again just in case
DROP POLICY IF EXISTS "Users can view approved reviews" ON business_reviews;
CREATE POLICY "Users can view approved reviews" ON business_reviews
  FOR SELECT
  USING (
    moderation_status = 'approved' AND deleted_at IS NULL
    OR (auth.uid() = user_id AND deleted_at IS NULL)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
