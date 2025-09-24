-- Test queries to debug the products issue
-- Run these in Supabase SQL Editor to check RLS policies

-- 1. Check if RLS is enabled on business_products table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'business_products';

-- 2. Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'business_products';

-- 3. Test direct query (should work as superuser)
SELECT id, name, is_featured, is_available, business_id, created_at
FROM business_products
WHERE business_id = 'ac269130-cfb0-4c36-b5ad-34931cd19b50'
ORDER BY created_at DESC;

-- 4. Check business ownership for the user
SELECT b.id, b.business_name, b.user_id, u.email
FROM businesses b
LEFT JOIN auth.users u ON b.user_id = u.id
WHERE b.id = 'ac269130-cfb0-4c36-b5ad-34931cd19b50';

-- 5. Temporarily disable RLS for testing (run if needed)
-- ALTER TABLE business_products DISABLE ROW LEVEL SECURITY;

-- 6. Re-enable RLS after testing (run after testing)
-- ALTER TABLE business_products ENABLE ROW LEVEL SECURITY;