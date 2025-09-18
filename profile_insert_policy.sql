-- Add missing RLS policy to allow users to create their own profile
-- This should be run in your Supabase SQL editor

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);