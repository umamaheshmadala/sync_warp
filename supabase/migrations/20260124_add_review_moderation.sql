-- ============================================
-- MIGRATION: Pre-Moderation System
-- Story: 11.4.1
-- ============================================

-- Step 1: Add moderation columns to business_reviews
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' 
  CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 2: Update existing reviews to 'approved' (grandfather clause)
UPDATE business_reviews 
SET moderation_status = 'approved', 
    moderated_at = created_at 
WHERE moderation_status IS NULL OR moderation_status = 'pending';

-- Step 3: Create index for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_pending 
ON business_reviews (created_at) 
WHERE moderation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status 
ON business_reviews (moderation_status);

-- Step 4: Update RLS policies for visibility rules
DROP POLICY IF EXISTS "Users can view approved reviews" ON business_reviews;
CREATE POLICY "Users can view approved reviews" ON business_reviews
  FOR SELECT
  USING (
    -- Approved reviews visible to all
    moderation_status = 'approved' AND deleted_at IS NULL
    -- OR own reviews (any status) visible to author
    OR (auth.uid() = user_id AND deleted_at IS NULL)
    -- OR admin can see all
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 5: Create moderation audit log
CREATE TABLE IF NOT EXISTS review_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES business_reviews(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'pending')),
  performed_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for audit log (admin only)
ALTER TABLE review_moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view moderation log" ON review_moderation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert moderation log" ON review_moderation_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
