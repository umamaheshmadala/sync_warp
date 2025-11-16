-- ============================================
-- SEARCH PERFORMANCE OPTIMIZATION
-- Story 9.2.5: Search Performance Optimization
-- VERSION: Using correct table name 'profiles' instead of 'users'
-- ============================================

-- Composite index for name search (GIN for full-text)
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext_name 
ON public.profiles USING GIN (to_tsvector('english', full_name));

-- Composite index for location + timestamp
CREATE INDEX IF NOT EXISTS idx_profiles_location_created 
ON public.profiles (location, created_at DESC);

-- Partial index for active profiles only (reduces index size)
CREATE INDEX IF NOT EXISTS idx_profiles_active 
ON public.profiles (id, full_name, email) 
WHERE updated_at IS NOT NULL;

-- Note: Your database does not have 'friendships' table yet, so skipping those indexes

-- ============================================
-- QUERY OPTIMIZATION: search_users function
-- NOTE: This will fail if search_users doesn't exist yet
-- ============================================

-- Check if the function exists first - you may need to create it manually
-- For now, let's just create the indexes which will help any search queries

SELECT 'Indexes created successfully for profiles table' AS status;
