-- Add sample businesses near your location and verify setup
-- Your location: 16.4710657, 80.6146415 (Vijayawada area)

-- First, let's check what we have
SELECT 'Current businesses count: ' || COUNT(*) as status FROM public.businesses;

-- Check if businesses table exists and show structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'businesses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add sample businesses near your location (within 2km)
-- First check if they already exist to avoid duplicates
DO $$
BEGIN
    -- Only insert if businesses don't already exist
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE business_name = 'Cafe Coffee Day - Vijayawada') THEN
        INSERT INTO public.businesses (
            business_name, business_type, address, 
            latitude, longitude, phone, website, status
        ) VALUES 
            -- Very close businesses (within 500m)
            ('Cafe Coffee Day - Vijayawada', 'Restaurant', 'MG Road, Vijayawada', 
             16.4715657, 80.6150415, '+91-8866123456', 'https://www.cafecoffeeday.com', 'active'),
            
            ('McDonald''s Vijayawada', 'Restaurant', 'Besant Road, Vijayawada', 
             16.4705657, 80.6140415, '+91-8866654321', 'https://www.mcdonalds.co.in', 'active'),
            
            -- Nearby businesses (within 1km)
            ('More Supermarket', 'Retail', 'Labbipet, Vijayawada', 
             16.4720657, 80.6156415, '+91-8866789012', 'https://www.more.co.in', 'active'),
            
            ('Apollo Pharmacy', 'Healthcare', 'Governorpet, Vijayawada', 
             16.4700657, 80.6136415, '+91-8866345678', 'https://www.apollopharmacy.in', 'active'),
            
            -- Slightly farther (within 2km)
            ('PVP Square Mall', 'Shopping', 'PVP Square, Vijayawada', 
             16.4730657, 80.6170415, '+91-8866901234', 'https://www.pvpsquare.com', 'active');
        
        RAISE NOTICE '✅ Sample businesses added successfully!';
    ELSE
        RAISE NOTICE '⚠️ Sample businesses already exist, skipping insert.';
    END IF;
END $$;

-- Verify the data was inserted
SELECT 'Sample businesses added: ' || COUNT(*) as status 
FROM public.businesses 
WHERE business_name LIKE '%Vijayawada%' OR business_name LIKE '%Cafe%' OR business_name LIKE '%McDonald%';

-- Test the nearby_businesses function
SELECT 'Testing nearby businesses function...' as status;

-- Test with your exact coordinates
SELECT 
    business_name,
    address,
    latitude,
    longitude,
    ROUND(distance::numeric, 2) as distance_meters,
    business_type
FROM public.nearby_businesses(16.4710657, 80.6146415, 5.0, 10)
ORDER BY distance;

-- Check if the function is working
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function working! Found ' || COUNT(*) || ' businesses nearby'
        ELSE '❌ No businesses found - check coordinates or data'
    END as test_result
FROM public.nearby_businesses(16.4710657, 80.6146415, 10.0, 10);

-- Also check the checkins table structure
SELECT 'Checking business_checkins table...' as status;
SELECT COUNT(*) as current_checkins FROM public.business_checkins;

-- Add a sample user profile if needed for testing
DO $$
BEGIN
    -- Check if we need to add a profile for testing
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'eed7a6f3-f531-4621-a118-756cd5d694c4') THEN
        INSERT INTO public.profiles (id, username, full_name, avatar_url) 
        VALUES ('eed7a6f3-f531-4621-a118-756cd5d694c4', 'testuser', 'Test User', null);
        RAISE NOTICE '✅ Test user profile created';
    ELSE
        RAISE NOTICE '✅ Test user profile already exists';
    END IF;
EXCEPTION 
    WHEN others THEN
        RAISE NOTICE '⚠️ Could not create test profile (table may not exist): %', SQLERRM;
END $$;

-- Show final summary
SELECT '=== SUMMARY ===' as status;
SELECT 'Total businesses: ' || COUNT(*) as businesses_count FROM public.businesses;

-- Try to show profiles count (may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        PERFORM COUNT(*) FROM public.profiles;
        RAISE NOTICE 'Total profiles: %', (SELECT COUNT(*) FROM public.profiles);
    ELSE
        RAISE NOTICE 'Profiles table does not exist';
    END IF;
END $$;

SELECT 'Total checkins: ' || COUNT(*) as checkins_count FROM public.business_checkins;

-- Final test
SELECT '=== FINAL TEST ===' as status;
SELECT 
    business_name,
    ROUND(distance::numeric, 0) || 'm away' as distance,
    business_type
FROM public.nearby_businesses(16.4710657, 80.6146415, 2.0, 5)
ORDER BY distance;