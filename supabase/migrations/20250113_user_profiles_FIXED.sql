-- =============================================================================
-- User Profiles for Targeting (FIXED VERSION)
-- Stores user demographic, location, and behavioral data
-- =============================================================================

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow read access to user_profiles" ON user_profiles;

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Demographics
  age INTEGER CHECK (age >= 13 AND age <= 100),
  age_range TEXT CHECK (age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  income_range TEXT CHECK (income_range IN ('below_3lpa', '3-5lpa', '5-10lpa', '10-20lpa', 'above_20lpa')),
  
  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city TEXT,
  state TEXT,
  postal_code TEXT,
  
  -- Behavior
  interests TEXT[],
  purchase_history JSONB DEFAULT '[]'::jsonb,
  last_active_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_purchases INTEGER DEFAULT 0,
  total_spent_cents BIGINT DEFAULT 0,
  
  -- Driver specific
  is_driver BOOLEAN DEFAULT FALSE,
  driver_rating DECIMAL(3, 2),
  total_trips INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster querying
CREATE INDEX idx_user_profiles_age_range ON user_profiles(age_range);
CREATE INDEX idx_user_profiles_gender ON user_profiles(gender);
CREATE INDEX idx_user_profiles_income_range ON user_profiles(income_range);
CREATE INDEX idx_user_profiles_location ON user_profiles USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX idx_user_profiles_interests ON user_profiles USING GIN (interests);
CREATE INDEX idx_user_profiles_is_driver ON user_profiles(is_driver);
CREATE INDEX idx_user_profiles_city ON user_profiles(city);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy (without IF NOT EXISTS)
CREATE POLICY "Allow read access to user_profiles" 
  ON user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Comment
COMMENT ON TABLE user_profiles IS 'Stores user demographics, location, and behavior for campaign targeting';

-- Verify table was created
SELECT 'Table user_profiles created successfully with ' || COUNT(*) || ' indexes' as status
FROM pg_indexes 
WHERE tablename = 'user_profiles';
