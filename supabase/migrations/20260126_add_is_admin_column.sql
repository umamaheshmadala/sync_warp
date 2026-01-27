-- Migration: Add is_admin to profiles
-- Date: 2026-01-26
-- Description: Adds is_admin column to profiles to support notification triggers.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Update testuser1 to be admin (based on previous context)
UPDATE profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'testuser1@gmail.com'
);
