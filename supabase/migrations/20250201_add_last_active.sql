-- Add last_active column to profiles table
-- Story 9.3.7: Online Status & Badges

-- Add last_active timestamp column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active DESC);

-- Create function to update last_active on user activity
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_active on profile updates
DROP TRIGGER IF EXISTS trigger_update_last_active ON profiles;
CREATE TRIGGER trigger_update_last_active
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active();

-- Backfill existing profiles with current timestamp
UPDATE profiles 
SET last_active = NOW()
WHERE last_active IS NULL;

COMMENT ON COLUMN profiles.last_active IS 'Timestamp of last user activity for offline status display';
