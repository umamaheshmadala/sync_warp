-- =============================================================================
-- Add Behavior Tracking Columns to user_profiles
-- =============================================================================
-- This migration adds columns needed for customer segmentation and targeting

-- Add date_of_birth column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_profiles' AND column_name='date_of_birth') THEN
    ALTER TABLE user_profiles ADD COLUMN date_of_birth DATE;
    COMMENT ON COLUMN user_profiles.date_of_birth IS 'User date of birth for accurate age calculation and birthday campaigns';
  END IF;
END $$;

-- Add last_active_at column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_profiles' AND column_name='last_active_at') THEN
    ALTER TABLE user_profiles ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN user_profiles.last_active_at IS 'Last activity timestamp for engagement tracking';
  END IF;
END $$;

-- Add signup_date column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_profiles' AND column_name='signup_date') THEN
    ALTER TABLE user_profiles ADD COLUMN signup_date TIMESTAMP WITH TIME ZONE DEFAULT now();
    COMMENT ON COLUMN user_profiles.signup_date IS 'User signup date for new vs existing customer segmentation';
  END IF;
END $$;

-- Add last_purchase_at column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_profiles' AND column_name='last_purchase_at') THEN
    ALTER TABLE user_profiles ADD COLUMN last_purchase_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN user_profiles.last_purchase_at IS 'Last purchase timestamp for customer behavior analysis';
  END IF;
END $$;

-- Add checkin_count column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_profiles' AND column_name='checkin_count') THEN
    ALTER TABLE user_profiles ADD COLUMN checkin_count INTEGER DEFAULT 0;
    COMMENT ON COLUMN user_profiles.checkin_count IS 'Number of check-ins for location-based engagement';
  END IF;
END $$;

-- Add favorite_businesses column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_profiles' AND column_name='favorite_businesses') THEN
    ALTER TABLE user_profiles ADD COLUMN favorite_businesses UUID[] DEFAULT ARRAY[]::UUID[];
    COMMENT ON COLUMN user_profiles.favorite_businesses IS 'Array of favorited business IDs for power user identification';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_signup ON user_profiles(signup_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_purchase ON user_profiles(last_purchase_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_checkin ON user_profiles(checkin_count);
CREATE INDEX IF NOT EXISTS idx_user_profiles_dob ON user_profiles(date_of_birth);

RAISE NOTICE 'Behavior tracking columns added successfully!';
