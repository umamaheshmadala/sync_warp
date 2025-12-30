-- Drop website and social_links columns from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS social_links;
