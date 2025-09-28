-- Check if get_coupon_drafts function exists and its signature
SELECT 
    schemaname,
    functionname,
    definition
FROM pg_functions 
WHERE functionname = 'get_coupon_drafts';

-- Alternative check using pg_proc
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_coupon_drafts'
AND n.nspname = 'public';

-- Check coupon_drafts table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'coupon_drafts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test the function call
SELECT get_coupon_drafts();