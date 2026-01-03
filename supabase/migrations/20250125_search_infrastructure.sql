-- Migration: Search Infrastructure
-- Story 9.2.1: Global Friend Search with Fuzzy Matching
-- Created: 2025-01-25

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Add search_vector column to profiles for full-text search
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index on search_vector for fast full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector 
ON profiles USING gin(search_vector);

-- Create trigram index on full_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm 
ON profiles USING gin(full_name gin_trgm_ops);

-- Create partial index for searchable users only
CREATE INDEX IF NOT EXISTS idx_profiles_searchable 
ON profiles(id) 
WHERE is_searchable = true;

-- Create function to update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_profiles_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.username, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector
DROP TRIGGER IF EXISTS profiles_search_vector_update ON profiles;
CREATE TRIGGER profiles_search_vector_update
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_search_vector();

-- Backfill search_vector for existing profiles
UPDATE profiles 
SET search_vector = 
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(username, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'C')
WHERE search_vector IS NULL;

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  searched_at timestamptz DEFAULT now(),
  CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on search_history for user queries
CREATE INDEX IF NOT EXISTS idx_search_history_user_date 
ON search_history(user_id, searched_at DESC);

-- Enable RLS on search_history
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own search history
CREATE POLICY "Users can view own search history"
ON search_history FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own search history
CREATE POLICY "Users can insert own search history"
ON search_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own search history
CREATE POLICY "Users can delete own search history"
ON search_history FOR DELETE
USING (auth.uid() = user_id);
