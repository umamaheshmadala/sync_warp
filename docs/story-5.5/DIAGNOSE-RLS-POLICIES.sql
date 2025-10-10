-- Diagnostic script to check RLS policies on user_coupon_collections table
-- Run this in Supabase SQL Editor to see what policies are currently active

-- Step 1: Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_coupon_collections';

-- Step 2: List all policies on the table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command_type,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'user_coupon_collections'
ORDER BY policyname;

-- Step 3: Check current user context
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    auth.role() as current_role;

-- Step 4: Test if you can select from the table
-- This should work if SELECT policy is correct
SELECT COUNT(*) as my_collection_count
FROM user_coupon_collections
WHERE user_id = auth.uid();

-- Step 5: Check table structure (verify columns exist)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_coupon_collections'
ORDER BY ordinal_position;

-- Step 6: Test INSERT permission by attempting a dry run
-- This will show if INSERT policy allows the operation
EXPLAIN (COSTS FALSE, VERBOSE TRUE)
INSERT INTO user_coupon_collections (
    user_id,
    coupon_id,
    collected_from,
    status,
    expires_at
) VALUES (
    auth.uid(),
    (SELECT id FROM business_coupons WHERE status = 'active' LIMIT 1),
    'direct_search',
    'active',
    NOW() + INTERVAL '30 days'
);

-- Step 7: Check if auth.uid() is NULL
SELECT 
    CASE 
        WHEN auth.uid() IS NULL THEN 'ERROR: auth.uid() is NULL - user not authenticated!'
        ELSE 'OK: User is authenticated with ID: ' || auth.uid()::text
    END as auth_status;

-- Step 8: Verify auth.users table has your user
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE id = auth.uid();

-- Expected Results:
-- 1. RLS should be enabled (rls_enabled = true)
-- 2. You should see policies for INSERT, SELECT, UPDATE, DELETE
-- 3. auth.uid() should NOT be NULL
-- 4. You should see your user in auth.users
-- 5. If any of these fail, that's where the problem is

-- Common Issues and Solutions:

-- Issue 1: auth.uid() is NULL
-- Solution: User session expired or not properly authenticated
-- Action: Log out completely and log back in

-- Issue 2: No INSERT policy found
-- Solution: Migration not applied
-- Action: Run the migration: 20250203_add_coupon_sharing_tracking.sql

-- Issue 3: INSERT policy exists but WITH CHECK fails
-- Solution: The user_id being inserted doesn't match auth.uid()
-- Action: Verify the code is using auth.uid() correctly

-- Issue 4: Multiple conflicting policies
-- Solution: Old policies not properly dropped
-- Action: Run the fix script below
