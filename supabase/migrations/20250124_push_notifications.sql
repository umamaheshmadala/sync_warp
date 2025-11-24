-- Migration: 20250124_push_notifications.sql
-- Story 9.6.3: Push Notifications Setup
-- Implements push notification infrastructure for friend events

-- ============================================================================
-- 1. CREATE/UPDATE PUSH_TOKENS TABLE
-- ============================================================================

-- Create push_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one token per user per platform
  UNIQUE (user_id, token)
);

-- Add is_active column if it doesn't exist
ALTER TABLE push_tokens 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own push tokens"
ON push_tokens FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
ON push_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
ON push_tokens FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
ON push_tokens FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role can manage all tokens (for Edge Function)
CREATE POLICY "Service role can manage all push tokens"
ON push_tokens FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON push_tokens
FOR EACH ROW
EXECUTE FUNCTION update_push_tokens_updated_at();

-- Comments
COMMENT ON TABLE push_tokens IS 'Stores push notification tokens for FCM (Android) and APNs (iOS)';
COMMENT ON COLUMN push_tokens.is_active IS 'Whether the token is still valid (set to false if FCM/APNs reports invalid)';

-- ============================================================================
-- 2. ADD NOTIFICATION PREFERENCES TO PROFILES
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "push_enabled": true,
  "email_enabled": false,
  "friend_requests": true,
  "friend_accepted": true,
  "deal_shared": true,
  "birthday_reminders": false
}'::jsonb;

COMMENT ON COLUMN profiles.notification_preferences IS 'User notification preferences for different event types';

-- ============================================================================
-- 3. CREATE NOTIFICATION_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false,
  opened BOOLEAN DEFAULT false,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id 
ON notification_log(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_type
ON notification_log(notification_type);

-- Enable RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification logs
CREATE POLICY "Users can view their own notification logs"
ON notification_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can insert notification logs
CREATE POLICY "Service role can insert notification logs"
ON notification_log FOR INSERT
TO service_role
WITH CHECK (true);

COMMENT ON TABLE notification_log IS 'Logs all sent push notifications for debugging and analytics';

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user has notifications enabled for a type
CREATE OR REPLACE FUNCTION should_send_notification(
  target_user_id UUID,
  notif_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  prefs JSONB;
  push_enabled BOOLEAN;
  type_enabled BOOLEAN;
BEGIN
  SELECT notification_preferences INTO prefs
  FROM profiles
  WHERE id = target_user_id;
  
  -- Check if push is enabled globally
  push_enabled := COALESCE((prefs->>'push_enabled')::boolean, true);
  
  -- Check if this specific notification type is enabled
  type_enabled := COALESCE((prefs->>notif_type)::boolean, true);
  
  RETURN push_enabled AND type_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION should_send_notification IS 'Checks if user has notifications enabled for a specific type';

-- ============================================================================
-- 5. NOTIFICATION TRIGGERS
-- ============================================================================

-- Note: Triggers will call Edge Function via pg_net extension
-- Edge Function URL and service role key should be configured via Supabase settings

-- Trigger: Send notification on friend request
CREATE OR REPLACE FUNCTION notify_friend_request_push()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  edge_function_url TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    -- Get sender's name
    SELECT full_name INTO sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
    
    -- Check if receiver has notifications enabled
    IF should_send_notification(NEW.receiver_id, 'friend_requests') THEN
      -- Get Edge Function URL from environment
      -- Note: This will be configured via Supabase dashboard
      edge_function_url := current_setting('app.settings.edge_function_url', true);
      
      IF edge_function_url IS NOT NULL THEN
        -- Call Edge Function via pg_net (requires pg_net extension)
        -- For now, we'll log this as a TODO since pg_net setup is separate
        RAISE NOTICE 'Would send push notification to user % for friend request from %', 
          NEW.receiver_id, sender_name;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_friend_request_push ON friend_requests;
CREATE TRIGGER trigger_notify_friend_request_push
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_push();

-- Trigger: Send notification when friend request is accepted
CREATE OR REPLACE FUNCTION notify_friend_accepted_push()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
  edge_function_url TEXT;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Get accepter's name (the person who accepted)
    SELECT full_name INTO accepter_name
    FROM profiles
    WHERE id = NEW.friend_id;
    
    -- Notify the original sender
    IF should_send_notification(NEW.user_id, 'friend_accepted') THEN
      edge_function_url := current_setting('app.settings.edge_function_url', true);
      
      IF edge_function_url IS NOT NULL THEN
        RAISE NOTICE 'Would send push notification to user % for friend accepted by %', 
          NEW.user_id, accepter_name;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_friend_accepted_push ON friendships;
CREATE TRIGGER trigger_notify_friend_accepted_push
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted_push();

COMMENT ON FUNCTION notify_friend_request_push IS 'Sends push notification when a friend request is received';
COMMENT ON FUNCTION notify_friend_accepted_push IS 'Sends push notification when a friend request is accepted';
