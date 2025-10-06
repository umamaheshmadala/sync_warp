-- Phase 3: Profile Enhancements Migration
-- This migration ensures the profiles table supports all Phase 3 features
-- Run this using Supabase MCP: apply_migration

-- 1. Ensure interests column exists as text array
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'interests'
    ) THEN
        ALTER TABLE profiles ADD COLUMN interests text[] DEFAULT '{}';
    END IF;
END $$;

-- 2. Ensure social_links is JSONB and supports github
-- Note: social_links should already exist as JSONB, but we'll ensure it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'social_links'
    ) THEN
        ALTER TABLE profiles ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Ensure avatar_url column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN avatar_url text;
    END IF;
END $$;

-- 4. Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Set up storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 7. Add helpful comment
COMMENT ON COLUMN profiles.interests IS 'Array of user interests for personalization (Phase 3)';
COMMENT ON COLUMN profiles.social_links IS 'JSONB object containing social media links including github (Phase 3)';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture in Supabase Storage (Phase 3)';
