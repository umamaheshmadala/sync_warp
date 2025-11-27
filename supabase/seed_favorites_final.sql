-- ============================================
-- Story 9.7.3: Seed Test Data - READY TO RUN
-- ============================================
-- This script is ready to run in Supabase SQL Editor

DO $$
DECLARE
    test_business_id uuid := 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
    offer1_id uuid;
    offer2_id uuid;
    offer3_id uuid;
    offer4_id uuid;
    
    -- Friend IDs from your database
    friend1_id uuid := 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2';  -- Test User 1
    friend2_id uuid := '6fb5eaeb-89ef-4eb0-b156-5b0d012ea4f3';  -- Test User 3
    friend3_id uuid := '331346a4-51f6-4907-b1a4-67447a6eaab6';  -- Test User 4
BEGIN
    -- Get the 4 test offers
    SELECT id INTO offer1_id FROM offers 
    WHERE business_id = test_business_id AND title LIKE '%Test offer 1%' 
    LIMIT 1;
    
    SELECT id INTO offer2_id FROM offers 
    WHERE business_id = test_business_id AND title LIKE '%Test offer 2%' 
    LIMIT 1;
    
    SELECT id INTO offer3_id FROM offers 
    WHERE business_id = test_business_id AND title LIKE '%Test offer 3%' 
    LIMIT 1;
    
    SELECT id INTO offer4_id FROM offers 
    WHERE business_id = test_business_id AND title LIKE '%Test offer 4%' 
    LIMIT 1;

    -- Log what we found
    RAISE NOTICE 'Offer 1: %', offer1_id;
    RAISE NOTICE 'Offer 2: %', offer2_id;
    RAISE NOTICE 'Offer 3: %', offer3_id;
    RAISE NOTICE 'Offer 4: %', offer4_id;
    RAISE NOTICE 'Friend 1 (Test User 1): %', friend1_id;
    RAISE NOTICE 'Friend 2 (Test User 3): %', friend2_id;
    RAISE NOTICE 'Friend 3 (Test User 4): %', friend3_id;

    -- Create favorites for friends
    -- Test User 1 likes offers 1 and 2
    IF friend1_id IS NOT NULL AND offer1_id IS NOT NULL THEN
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend1_id, 'offer', offer1_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend1_id, 'offer', offer2_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        RAISE NOTICE '✅ Test User 1 favorited offers 1 and 2';
    END IF;

    -- Test User 3 likes offers 2 and 3
    IF friend2_id IS NOT NULL AND offer2_id IS NOT NULL THEN
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend2_id, 'offer', offer2_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend2_id, 'offer', offer3_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        RAISE NOTICE '✅ Test User 3 favorited offers 2 and 3';
    END IF;

    -- Test User 4 likes offers 1, 3, and 4
    IF friend3_id IS NOT NULL AND offer1_id IS NOT NULL THEN
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend3_id, 'offer', offer1_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend3_id, 'offer', offer3_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend3_id, 'offer', offer4_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        RAISE NOTICE '✅ Test User 4 favorited offers 1, 3, and 4';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 Test data seeded successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected results:';
    RAISE NOTICE '  - Offer 1: liked by 2 friends (Test User 1, Test User 4)';
    RAISE NOTICE '  - Offer 2: liked by 2 friends (Test User 1, Test User 3)';
    RAISE NOTICE '  - Offer 3: liked by 2 friends (Test User 3, Test User 4)';
    RAISE NOTICE '  - Offer 4: liked by 1 friend (Test User 4)';
END $$;

-- Verify the data was created
SELECT 
    o.title,
    COUNT(f.id) as favorite_count,
    ARRAY_AGG(p.full_name) as favorited_by
FROM offers o
LEFT JOIN favorites f ON f.entity_id = o.id AND f.entity_type = 'offer'
LEFT JOIN profiles p ON p.id = f.user_id
WHERE o.business_id = 'ac269130-cfb0-4c36-b5ad-34931cd19b50'
GROUP BY o.id, o.title
ORDER BY o.title;
