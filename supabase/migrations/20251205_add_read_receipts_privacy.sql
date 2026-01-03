-- Migration: Add read_receipts_enabled to privacy settings
-- Story: 8.5.1 - Read Receipts

-- First, drop the existing constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS valid_privacy_settings;

-- Update the validation function to include read_receipts_enabled
CREATE OR REPLACE FUNCTION validate_privacy_settings(settings JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Check required fields exist
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
    settings->>'who_can_follow' IN ('everyone', 'friends', 'no_one') AND
    
    -- Validate read_receipts_enabled if present (optional, defaults to true)
    (NOT (settings ? 'read_receipts_enabled') OR jsonb_typeof(settings->'read_receipts_enabled') = 'boolean')
  );
END;
$$ LANGUAGE plpgsql;

-- Re-add the constraint with the updated validation
ALTER TABLE profiles
ADD CONSTRAINT valid_privacy_settings 
CHECK (validate_privacy_settings(privacy_settings));

-- Update the default privacy settings to include read_receipts_enabled
COMMENT ON COLUMN profiles.privacy_settings IS 'User privacy settings including: friend_requests, profile_visibility, search_visibility, online_status_visibility, who_can_follow, read_receipts_enabled (default: true)';
