-- Debug script to check and fix the get_coupon_drafts function issue

-- First, check if the function exists
SELECT routine_name, routine_type, specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_coupon_drafts';

-- Check the function parameters
SELECT 
    r.routine_name,
    p.parameter_name,
    p.data_type,
    p.parameter_mode
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public' 
AND r.routine_name = 'get_coupon_drafts'
ORDER BY p.ordinal_position;

-- Try to call the function to see the exact error
DO $$
BEGIN
    BEGIN
        PERFORM get_coupon_drafts();
        RAISE NOTICE 'Function call succeeded';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Function call failed: %', SQLERRM;
    END;
END $$;