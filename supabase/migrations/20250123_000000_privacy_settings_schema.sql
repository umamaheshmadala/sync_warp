-- Migration: 20251123_privacy_settings_schema.sql

-- Add privacy settings column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "friend_requests": "everyone",
  "profile_visibility": "public",
  "search_visibility": true,
  "online_status_visibility": "friends",
  "who_can_follow": "everyone",
  "last_updated": null
}'::jsonb;

-- Create validation function
CREATE OR REPLACE FUNCTION validate_privacy_settings(settings JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Check all required fields exist
    settings ? 'friend_requests' AND
    settings ? 'profile_visibility' AND
    settings ? 'search_visibility' AND
    settings ? 'online_status_visibility' AND
    settings ? 'who_can_follow' AND
    
    -- Validate friend_requests values
    settings->>'friend_requests' IN ('everyone', 'friends_of_friends', 'no_one') AND
    
    -- Validate profile_visibility values
    settings->>'profile_visibility' IN ('public', 'friends', 'friends_of_friends') AND
    
    -- Validate search_visibility is boolean
    jsonb_typeof(settings->'search_visibility') = 'boolean' AND
    
    -- Validate online_status_visibility values
    settings->>'online_status_visibility' IN ('everyone', 'friends', 'no_one') AND
    
    -- Validate who_can_follow values
    settings->>'who_can_follow' IN ('everyone', 'friends', 'no_one')
  );
END;
$$ LANGUAGE plpgsql;

-- Add check constraint
ALTER TABLE profiles
ADD CONSTRAINT valid_privacy_settings 
CHECK (validate_privacy_settings(privacy_settings));

-- Create index for faster privacy queries
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_settings 
ON profiles USING GIN (privacy_settings);

-- RPC function to update privacy settings
CREATE OR REPLACE FUNCTION update_privacy_settings(
  setting_key TEXT,
  setting_value TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_settings JSONB;
BEGIN
  -- Get current settings
  SELECT privacy_settings INTO current_settings 
  FROM profiles WHERE id = auth.uid();
  
  -- Update the specific setting
  current_settings = jsonb_set(
    current_settings, 
    ARRAY[setting_key], 
    to_jsonb(setting_value)
  );
  
  -- Update last_updated timestamp
  current_settings = jsonb_set(
    current_settings,
    '{last_updated}',
    to_jsonb(NOW())
  );
  
  -- Save to database
  UPDATE profiles 
  SET privacy_settings = current_settings 
  WHERE id = auth.uid();
  
  RETURN current_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_privacy_settings(TEXT, TEXT) TO authenticated;

-- Create audit log table for privacy changes
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create index on audit log
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_user_id 
ON privacy_audit_log(user_id, changed_at DESC);

-- RLS for audit log
ALTER TABLE privacy_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own privacy audit log"
ON privacy_audit_log FOR SELECT
USING (auth.uid() = user_id);

-- Trigger to log privacy changes
CREATE OR REPLACE FUNCTION log_privacy_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if privacy_settings actually changed
  IF OLD.privacy_settings IS DISTINCT FROM NEW.privacy_settings THEN
    INSERT INTO privacy_audit_log (user_id, setting_key, old_value, new_value)
    VALUES (
      NEW.id,
      'privacy_settings',
      OLD.privacy_settings::TEXT,
      NEW.privacy_settings::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER privacy_settings_audit
AFTER UPDATE OF privacy_settings ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_privacy_change();

-- Backfill existing users with default privacy settings
UPDATE profiles
SET privacy_settings = '{
  "friend_requests": "everyone",
  "profile_visibility": "public",
  "search_visibility": true,
  "online_status_visibility": "friends",
  "who_can_follow": "everyone",
  "last_updated": null
}'::jsonb
WHERE privacy_settings IS NULL;
