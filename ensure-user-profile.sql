-- ensure-user-profile.sql
-- Create user profile if it doesn't exist (for favorites functionality)
-- Replace YOUR_USER_ID with the actual user ID from auth

-- This should be run for each user to ensure they have a profile record
-- You can get the user ID from the browser dev tools auth state

-- Example usage:
-- INSERT INTO profiles (id, email, username, created_at, updated_at)
-- VALUES ('YOUR_USER_ID_HERE', 'user@example.com', 'username', NOW(), NOW())
-- ON CONFLICT (id) DO NOTHING;

-- Check current user (run this in Supabase SQL editor while logged in)
SELECT auth.uid() as current_user_id;

-- Check if current user has profile
SELECT * FROM profiles WHERE id = auth.uid();

-- Create profile for current user if it doesn't exist (run while logged in)
INSERT INTO profiles (id, created_at, updated_at)
SELECT auth.uid(), NOW(), NOW()
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());

-- Verify profile was created
SELECT 'Profile exists' as status, * FROM profiles WHERE id = auth.uid();