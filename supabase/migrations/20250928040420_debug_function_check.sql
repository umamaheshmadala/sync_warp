-- Debug script to check and fix the get_coupon_drafts function issue

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

-- Check if the function exists and its signature
DO $$
DECLARE
    func_count INTEGER;
    rec RECORD;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'get_coupon_drafts';
    
    RAISE NOTICE 'Found % get_coupon_drafts functions', func_count;
    
    -- List all coupon-related functions
    FOR rec IN 
        SELECT routine_name, routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%coupon%'
    LOOP
        RAISE NOTICE 'Found function: % (type: %)', rec.routine_name, rec.routine_type;
    END LOOP;
END $$;