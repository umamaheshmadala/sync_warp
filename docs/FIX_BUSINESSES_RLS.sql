-- Fix RLS policies for businesses table to allow reading business data
-- Run this in Supabase SQL Editor

-- 1. Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'businesses';

-- 2. Drop any overly restrictive policies (if needed)
-- Uncomment if you need to remove problematic policies:
-- DROP POLICY IF EXISTS "Businesses are viewable by owner only" ON businesses;

-- 3. Create a policy to allow all authenticated users to READ businesses
-- This is needed for following page, search, etc.
CREATE POLICY IF NOT EXISTS "Businesses are viewable by everyone"
ON businesses
FOR SELECT
TO authenticated
USING (true);

-- 4. Ensure RLS is enabled
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- 5. Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'businesses'
AND policyname = 'Businesses are viewable by everyone';

-- Note: If you want to restrict viewing to only:
-- - Business owners
-- - Users who follow the business
-- Then use this more complex policy instead:

/*
CREATE POLICY IF NOT EXISTS "Businesses viewable by owner and followers"
ON businesses
FOR SELECT
TO authenticated
USING (
  -- Owner can see their own business
  owner_id = auth.uid()
  OR
  -- Anyone can see the business (for public discovery)
  true
  -- If you want to restrict to only followers, use:
  -- EXISTS (
  --   SELECT 1 FROM business_followers
  --   WHERE business_followers.business_id = businesses.id
  --   AND business_followers.user_id = auth.uid()
  --   AND business_followers.is_active = true
  -- )
);
*/
