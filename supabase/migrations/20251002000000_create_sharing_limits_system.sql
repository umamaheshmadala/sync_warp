-- =====================================================
-- Story 5.5: Enhanced Sharing Limits System
-- Migration: Create sharing limits and logging tables
-- Date: October 2, 2025
-- Alignment: Enhanced Project Brief v2 - Section 6.3
-- =====================================================

-- =====================================================
-- 1. SHARING LIMITS CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sharing_limits_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  limit_type VARCHAR(50) NOT NULL UNIQUE,
  limit_value INTEGER NOT NULL CHECK (limit_value >= 0),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_limit_type UNIQUE(limit_type)
);

COMMENT ON TABLE sharing_limits_config IS 'Configuration for daily coupon sharing limits';
COMMENT ON COLUMN sharing_limits_config.limit_type IS 'Type of limit: per_friend_daily, total_daily, driver_per_friend_daily, driver_total_daily';
COMMENT ON COLUMN sharing_limits_config.limit_value IS 'The numerical limit value';

-- Insert default sharing limits
INSERT INTO sharing_limits_config (limit_type, limit_value, description, is_active) VALUES
  ('per_friend_daily', 3, 'Maximum coupons that can be shared to a single friend per day (regular users)', TRUE),
  ('total_daily', 20, 'Maximum total coupons that can be shared by a user per day (regular users)', TRUE),
  ('driver_per_friend_daily', 5, 'Maximum coupons that can be shared to a single friend per day (Drivers)', TRUE),
  ('driver_total_daily', 30, 'Maximum total coupons that can be shared by a user per day (Drivers)', TRUE)
ON CONFLICT (limit_type) DO NOTHING;

-- =====================================================
-- 2. COUPON SHARING LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS coupon_sharing_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sharing_day DATE DEFAULT CURRENT_DATE,
  is_driver BOOLEAN DEFAULT FALSE, -- Track if sender was a Driver at time of sharing
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE coupon_sharing_log IS 'Logs all coupon sharing activities for limit enforcement and analytics';
COMMENT ON COLUMN coupon_sharing_log.sender_id IS 'User who shared the coupon';
COMMENT ON COLUMN coupon_sharing_log.recipient_id IS 'User who received the coupon';
COMMENT ON COLUMN coupon_sharing_log.sharing_day IS 'Date of sharing for daily limit queries (indexed)';
COMMENT ON COLUMN coupon_sharing_log.is_driver IS 'Whether sender was a Driver at time of sharing';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sharing_log_sender_day 
  ON coupon_sharing_log(sender_id, sharing_day);

CREATE INDEX IF NOT EXISTS idx_sharing_log_sender_recipient_day 
  ON coupon_sharing_log(sender_id, recipient_id, sharing_day);

CREATE INDEX IF NOT EXISTS idx_sharing_log_shared_at 
  ON coupon_sharing_log(shared_at DESC);

CREATE INDEX IF NOT EXISTS idx_sharing_log_recipient 
  ON coupon_sharing_log(recipient_id, sharing_day);

-- =====================================================
-- 3. DATABASE FUNCTIONS
-- =====================================================

-- -------------------------------------------------------
-- Function: Get sharing limits based on user type
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sharing_limits(
  p_user_id UUID,
  p_is_driver BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_per_friend_limit INTEGER;
  v_total_daily_limit INTEGER;
  v_limit_type_prefix VARCHAR(20);
BEGIN
  -- Determine limit type based on Driver status
  IF p_is_driver THEN
    v_limit_type_prefix := 'driver_';
  ELSE
    v_limit_type_prefix := '';
  END IF;
  
  -- Get per-friend daily limit
  SELECT limit_value INTO v_per_friend_limit
  FROM sharing_limits_config
  WHERE limit_type = v_limit_type_prefix || 'per_friend_daily'
    AND is_active = TRUE;
  
  -- Get total daily limit
  SELECT limit_value INTO v_total_daily_limit
  FROM sharing_limits_config
  WHERE limit_type = v_limit_type_prefix || 'total_daily'
    AND is_active = TRUE;
  
  -- Return limits as JSON
  RETURN json_build_object(
    'per_friend_daily', COALESCE(v_per_friend_limit, 3),
    'total_daily', COALESCE(v_total_daily_limit, 20),
    'is_driver', p_is_driver
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sharing_limits IS 'Returns appropriate sharing limits based on user type (regular or Driver)';

-- -------------------------------------------------------
-- Function: Check if user can share to a friend
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION can_share_to_friend(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_is_driver BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_shares_to_friend_today INTEGER;
  v_total_shares_today INTEGER;
  v_per_friend_limit INTEGER;
  v_total_daily_limit INTEGER;
  v_limits JSON;
  v_can_share BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Get appropriate limits
  v_limits := get_sharing_limits(p_sender_id, p_is_driver);
  v_per_friend_limit := (v_limits->>'per_friend_daily')::INTEGER;
  v_total_daily_limit := (v_limits->>'total_daily')::INTEGER;
  
  -- Count shares to this specific friend today
  SELECT COUNT(*) INTO v_shares_to_friend_today
  FROM coupon_sharing_log
  WHERE sender_id = p_sender_id
    AND recipient_id = p_recipient_id
    AND sharing_day = CURRENT_DATE;
  
  -- Count total shares by sender today
  SELECT COUNT(*) INTO v_total_shares_today
  FROM coupon_sharing_log
  WHERE sender_id = p_sender_id
    AND sharing_day = CURRENT_DATE;
  
  -- Check if user can share
  IF v_shares_to_friend_today >= v_per_friend_limit THEN
    v_can_share := FALSE;
    v_reason := format('Daily limit of %s coupons to this friend reached', v_per_friend_limit);
  ELSIF v_total_shares_today >= v_total_daily_limit THEN
    v_can_share := FALSE;
    v_reason := format('Daily limit of %s total coupons reached', v_total_daily_limit);
  ELSE
    v_can_share := TRUE;
    v_reason := 'Can share';
  END IF;
  
  -- Return result
  RETURN json_build_object(
    'can_share', v_can_share,
    'reason', v_reason,
    'shares_to_friend_today', v_shares_to_friend_today,
    'per_friend_limit', v_per_friend_limit,
    'total_shares_today', v_total_shares_today,
    'total_daily_limit', v_total_daily_limit,
    'remaining_to_friend', GREATEST(0, v_per_friend_limit - v_shares_to_friend_today),
    'remaining_total', GREATEST(0, v_total_daily_limit - v_total_shares_today)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_share_to_friend IS 'Checks if a user can share a coupon to a specific friend based on daily limits';

-- -------------------------------------------------------
-- Function: Get sharing statistics for today
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sharing_stats_today(
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_total_shared_today INTEGER;
  v_friends_shared_with JSON;
  v_is_driver BOOLEAN;
  v_limits JSON;
BEGIN
  -- TODO: Determine if user is a Driver (implement Driver detection logic)
  v_is_driver := FALSE;
  
  -- Get appropriate limits
  v_limits := get_sharing_limits(p_user_id, v_is_driver);
  
  -- Count total shares today
  SELECT COUNT(*) INTO v_total_shared_today
  FROM coupon_sharing_log
  WHERE sender_id = p_user_id
    AND sharing_day = CURRENT_DATE;
  
  -- Get shares per friend today
  SELECT json_agg(
    json_build_object(
      'recipient_id', recipient_id,
      'count', share_count
    )
  ) INTO v_friends_shared_with
  FROM (
    SELECT 
      recipient_id,
      COUNT(*) as share_count
    FROM coupon_sharing_log
    WHERE sender_id = p_user_id
      AND sharing_day = CURRENT_DATE
    GROUP BY recipient_id
  ) sub;
  
  -- Return statistics
  RETURN json_build_object(
    'total_shared_today', v_total_shared_today,
    'total_daily_limit', (v_limits->>'total_daily')::INTEGER,
    'remaining_today', GREATEST(0, (v_limits->>'total_daily')::INTEGER - v_total_shared_today),
    'per_friend_limit', (v_limits->>'per_friend_daily')::INTEGER,
    'friends_shared_with', COALESCE(v_friends_shared_with, '[]'::JSON),
    'is_driver', v_is_driver
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sharing_stats_today IS 'Returns sharing statistics for a user for the current day';

-- -------------------------------------------------------
-- Function: Log coupon share
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION log_coupon_share(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_coupon_id UUID,
  p_is_driver BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insert sharing log entry
  INSERT INTO coupon_sharing_log (
    sender_id,
    recipient_id,
    coupon_id,
    is_driver,
    shared_at,
    sharing_day
  ) VALUES (
    p_sender_id,
    p_recipient_id,
    p_coupon_id,
    p_is_driver,
    NOW(),
    CURRENT_DATE
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_coupon_share IS 'Logs a coupon sharing activity';

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE sharing_limits_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_sharing_log ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- RLS Policies for sharing_limits_config
-- -------------------------------------------------------

-- Anyone can read sharing limits (needed for validation)
CREATE POLICY "Sharing limits are publicly readable"
  ON sharing_limits_config FOR SELECT
  USING (true);

-- Only admins can modify sharing limits (TODO: implement admin role check)
CREATE POLICY "Only admins can modify sharing limits"
  ON sharing_limits_config FOR ALL
  USING (false); -- Temporarily disabled, enable with admin role check

-- -------------------------------------------------------
-- RLS Policies for coupon_sharing_log
-- -------------------------------------------------------

-- Users can read their own sharing logs (as sender or recipient)
CREATE POLICY "Users can read their own sharing logs"
  ON coupon_sharing_log FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
  );

-- Users can insert sharing logs as sender
CREATE POLICY "Users can log shares as sender"
  ON coupon_sharing_log FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- No updates or deletes on sharing log (immutable audit trail)
CREATE POLICY "Sharing logs are immutable"
  ON coupon_sharing_log FOR UPDATE
  USING (false);

CREATE POLICY "Sharing logs cannot be deleted"
  ON coupon_sharing_log FOR DELETE
  USING (false);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger to automatically set updated_at on sharing_limits_config
CREATE OR REPLACE FUNCTION update_sharing_limits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sharing_limits_updated_at
  BEFORE UPDATE ON sharing_limits_config
  FOR EACH ROW
  EXECUTE FUNCTION update_sharing_limits_timestamp();

-- =====================================================
-- 6. HELPER VIEW (Optional - for analytics)
-- =====================================================

CREATE OR REPLACE VIEW sharing_analytics AS
SELECT 
  sender_id,
  sharing_day,
  COUNT(*) as total_shares,
  COUNT(DISTINCT recipient_id) as unique_recipients,
  BOOL_OR(is_driver) as was_driver
FROM coupon_sharing_log
GROUP BY sender_id, sharing_day;

COMMENT ON VIEW sharing_analytics IS 'Daily sharing analytics per user';

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Verify tables created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM sharing_limits_config) >= 4, 
    'sharing_limits_config table should have at least 4 default rows';
  
  RAISE NOTICE 'Story 5.5: Enhanced Sharing Limits migration completed successfully';
END $$;

-- Display current configuration
SELECT 
  limit_type,
  limit_value,
  description,
  is_active
FROM sharing_limits_config
ORDER BY 
  CASE 
    WHEN limit_type LIKE 'driver%' THEN 2
    ELSE 1
  END,
  limit_type;
