-- ============================================
-- MIGRATION: Review Request Tracking
-- Story: 11.3.2
-- ============================================

-- Step 1: Create review requests table
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES business_checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Request state
  prompt_shown_at TIMESTAMPTZ, -- When modal was displayed
  prompt_response TEXT CHECK (prompt_response IN ('now', 'later', 'never')),
  reminder_sent_at TIMESTAMPTZ, -- When push notification was sent
  reminder_clicked_at TIMESTAMPTZ, -- If user tapped notification
  
  -- Outcome tracking
  review_id UUID REFERENCES business_reviews(id) ON DELETE SET NULL,
  converted BOOLEAN DEFAULT FALSE,
  conversion_source TEXT CHECK (conversion_source IN ('prompt', 'reminder', 'organic')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(checkin_id)
);

-- Step 2: Indexes
CREATE INDEX IF NOT EXISTS idx_review_requests_user ON review_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_pending_reminder ON review_requests(reminder_sent_at)
  WHERE prompt_response = 'later' AND reminder_sent_at IS NULL;

-- Step 3: Enable RLS
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own requests" ON review_requests;
CREATE POLICY "Users can view own requests"
ON review_requests FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert requests" ON review_requests;
CREATE POLICY "System can insert requests"
ON review_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own requests" ON review_requests;
CREATE POLICY "Users can update own requests"
ON review_requests FOR UPDATE
USING (auth.uid() = user_id);

-- Step 4: Function to check for pending reminders
CREATE OR REPLACE FUNCTION get_pending_review_reminders()
RETURNS TABLE (
  request_id UUID,
  user_id UUID,
  business_id UUID,
  business_name TEXT,
  checkin_time TIMESTAMPTZ,
  push_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.id AS request_id,
    rr.user_id,
    rr.business_id,
    b.name AS business_name,
    bc.created_at AS checkin_time,
    pt.token AS push_token
  FROM review_requests rr
  JOIN businesses b ON b.id = rr.business_id
  JOIN business_checkins bc ON bc.id = rr.checkin_id
  JOIN push_tokens pt ON pt.user_id = rr.user_id AND pt.active = true
  WHERE rr.prompt_response = 'later'
    AND rr.reminder_sent_at IS NULL
    AND rr.converted = FALSE
    AND rr.created_at <= NOW() - INTERVAL '4 hours'
    AND NOT EXISTS (
      SELECT 1 FROM business_reviews br 
      WHERE br.user_id = rr.user_id 
        AND br.business_id = rr.business_id
        AND br.created_at > rr.created_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update review_requests when review is submitted
CREATE OR REPLACE FUNCTION link_review_to_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Find pending request and mark as converted
  UPDATE review_requests
  SET 
    review_id = NEW.id,
    converted = TRUE,
    conversion_source = CASE 
      WHEN reminder_sent_at IS NOT NULL THEN 'reminder'
      WHEN prompt_shown_at IS NOT NULL THEN 'prompt'
      ELSE 'organic'
    END,
    updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND business_id = NEW.business_id
    AND converted = FALSE
    AND created_at > NOW() - INTERVAL '24 hours';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_review_created ON business_reviews;
CREATE TRIGGER on_review_created
AFTER INSERT ON business_reviews
FOR EACH ROW EXECUTE FUNCTION link_review_to_request();
