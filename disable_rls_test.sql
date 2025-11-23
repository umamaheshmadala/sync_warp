-- Temporarily disable RLS on contact_hashes to test
-- This will help us determine if RLS is the issue

ALTER TABLE contact_hashes DISABLE ROW LEVEL SECURITY;

-- After testing, you can re-enable it with:
-- ALTER TABLE contact_hashes ENABLE ROW LEVEL SECURITY;
