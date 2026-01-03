-- Create push_tokens table for storing FCM/APNs device tokens
-- Story 7.4.1: Push Notification Implementation

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one token per user per platform
  UNIQUE (user_id, platform)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Create index on platform for filtering
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);

-- Enable Row Level Security
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
CREATE POLICY "Users can view their own push tokens"
ON push_tokens FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert their own push tokens"
ON push_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update their own push tokens"
ON push_tokens FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete their own push tokens"
ON push_tokens FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON push_tokens
FOR EACH ROW
EXECUTE FUNCTION update_push_tokens_updated_at();

-- Add comment to table
COMMENT ON TABLE push_tokens IS 'Stores push notification tokens for FCM (Android) and APNs (iOS)';
COMMENT ON COLUMN push_tokens.user_id IS 'Reference to the user who owns this token';
COMMENT ON COLUMN push_tokens.token IS 'FCM or APNs device token';
COMMENT ON COLUMN push_tokens.platform IS 'Platform: android, ios, or web';
COMMENT ON COLUMN push_tokens.device_name IS 'Optional device name for identification';
