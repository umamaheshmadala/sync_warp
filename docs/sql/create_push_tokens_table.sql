-- =====================================================
-- Push Tokens Table for Mobile Push Notifications
-- =====================================================
-- Purpose: Store device push tokens for sending notifications
-- Supports: iOS (APNs), Android (FCM), Web (FCM)
-- Security: Row Level Security (RLS) enabled
-- =====================================================

-- Create the table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Index for querying tokens by user (most common query)
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id 
  ON push_tokens(user_id);

-- Index for looking up specific tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_token 
  ON push_tokens(token);

-- Index for platform-specific queries
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform 
  ON push_tokens(platform);

-- Composite index for user + platform lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_platform 
  ON push_tokens(user_id, platform);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on the table
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own push tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own push tokens
CREATE POLICY "Users can insert own push tokens"
  ON push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own push tokens
CREATE POLICY "Users can update own push tokens"
  ON push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own push tokens
CREATE POLICY "Users can delete own push tokens"
  ON push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Automatic Timestamp Updates
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before updates
CREATE TRIGGER trigger_update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- =====================================================
-- Table and Column Comments (Documentation)
-- =====================================================

COMMENT ON TABLE push_tokens IS 
  'Stores push notification tokens for user devices. Supports multiple devices per user.';

COMMENT ON COLUMN push_tokens.id IS 
  'Unique identifier for the push token record';

COMMENT ON COLUMN push_tokens.user_id IS 
  'Reference to the user who owns this device. Cascades on delete.';

COMMENT ON COLUMN push_tokens.token IS 
  'The actual push notification token from FCM (Android/Web) or APNs (iOS)';

COMMENT ON COLUMN push_tokens.platform IS 
  'Device platform: ios, android, or web';

COMMENT ON COLUMN push_tokens.created_at IS 
  'When the token was first registered';

COMMENT ON COLUMN push_tokens.updated_at IS 
  'Last time the token was updated. Auto-updated by trigger.';

COMMENT ON COLUMN push_tokens.last_used_at IS 
  'Last time this token was used to send a notification. Updated by backend.';
