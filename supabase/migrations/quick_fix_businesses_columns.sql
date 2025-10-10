-- Quick Fix: Add missing columns to businesses table
-- Run this in Supabase SQL Editor to fix the onboarding page error

-- Add new columns for enhanced business profiling
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS employees_count INTEGER,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMPTZ DEFAULT now();

-- Add constraints for new columns
ALTER TABLE businesses
ADD CONSTRAINT IF NOT EXISTS chk_employees_count CHECK (employees_count IS NULL OR employees_count > 0);

ALTER TABLE businesses
ADD CONSTRAINT IF NOT EXISTS chk_years_in_business CHECK (years_in_business IS NULL OR years_in_business >= 0);

ALTER TABLE businesses
ADD CONSTRAINT IF NOT EXISTS chk_profile_completion CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100);

-- Add index for profile completion queries
CREATE INDEX IF NOT EXISTS idx_businesses_profile_completion 
ON businesses(profile_completion_percentage) 
WHERE profile_completion_percentage < 100;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'businesses'
  AND column_name IN (
    'employees_count',
    'years_in_business',
    'profile_completion_percentage',
    'onboarding_completed_at',
    'last_profile_update'
  );
