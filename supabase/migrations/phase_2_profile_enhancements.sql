-- Phase 2: Profile Enhancements Migration
-- Add new columns to profiles table for enhanced profile functionality

-- Add new profile fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);

-- Add comment for documentation
COMMENT ON COLUMN profiles.bio IS 'User biography, max 500 characters';
COMMENT ON COLUMN profiles.social_links IS 'JSON object containing social media links (twitter, linkedin, instagram, facebook)';
COMMENT ON COLUMN profiles.website IS 'User personal or business website URL';
COMMENT ON COLUMN profiles.location IS 'User location (city, region, or country)';
COMMENT ON COLUMN profiles.date_of_birth IS 'User date of birth';
COMMENT ON COLUMN profiles.profile_completion IS 'Profile completion percentage (0-100)';
