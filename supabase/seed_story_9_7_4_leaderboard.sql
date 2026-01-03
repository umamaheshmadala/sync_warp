-- Seed test data for Friend Leaderboard (Story 9.7.4)
-- Creates favorites for test users to populate the leaderboard

-- This script assumes:
-- 1. Test User 1 (d7c2f5c4-0f19-4b4f-a641-3f77c34937b2) is logged in
-- 2. Test offers from Test Business 1 exist
-- 3. Friendships are already established

DO $$
DECLARE
    test_business_id uuid := 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
    offer1_id uuid;
    offer2_id uuid;
    offer3_id uuid;
    offer4_id uuid;
    
    -- Test users (friends of Test User 1)
    user1_id uuid := 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2';  -- Test User 1
    user3_id uuid := '6fb5eaeb-89ef-4eb0-b156-5b0d012ea4f3';  -- Test User 3
    user4_id uuid := '331346a4-51f6-4907-b1a4-67447a6eaab6';  -- Test User 4
    user5_id uuid := 'e3ae5bfa-2fb0-4cd4-b397-dfa47e9d94de';  -- Test User 5
    user8_id uuid := '092963d0-d1f4-444d-9a0e-781b0f6f293c';  -- Test User 8
BEGIN
    -- Get the 4 test offers
    SELECT id INTO offer1_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 1%' LIMIT 1;
    SELECT id INTO offer2_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 2%' LIMIT 1;
    SELECT id INTO offer3_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 3%' LIMIT 1;
    SELECT id INTO offer4_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 4%' LIMIT 1;

    RAISE NOTICE 'Seeding leaderboard test data...';
    RAISE NOTICE 'Offers: %, %, %, %', offer1_id, offer2_id, offer3_id, offer4_id;

    -- Create varied favorite counts to test leaderboard ranking
    -- Goal: Create realistic distribution for badge testing
    
    -- Test User 8: Legend (100+ deals) - Favorited all 4 offers multiple times at different dates
    -- Simulate finding deals over time
    FOR i IN 1..25 LOOP
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user8_id, 'offer', offer1_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user8_id, 'offer', offer2_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user8_id, 'offer', offer3_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user8_id, 'offer', offer4_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
    END LOOP;
    
    -- Test User 3: Expert (50+ deals) - Favorited offers 1, 2, 3
    FOR i IN 1..18 LOOP
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user3_id, 'offer', offer1_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user3_id, 'offer', offer2_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user3_id, 'offer', offer3_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
    END LOOP;
    
    -- Test User 4: Hunter (10+ deals) - Favorited offers 1, 2
    FOR i IN 1..6 LOOP
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user4_id, 'offer', offer1_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user4_id, 'offer', offer2_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
    END LOOP;
    
    -- Test User 5: Beginner (< 10 deals) - Favorited offers 1, 3
    INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
    VALUES (user5_id, 'offer', offer1_id, NOW() - INTERVAL '2 days')
    ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
    
    INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
    VALUES (user5_id, 'offer', offer3_id, NOW() - INTERVAL '5 days')
    ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
    
    -- Test User 1: Moderate (15 deals) - Favorited all offers
    FOR i IN 1..4 LOOP
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user1_id, 'offer', offer1_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user1_id, 'offer', offer2_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user1_id, 'offer', offer3_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user1_id, 'offer', offer4_id, NOW() - (i || ' days')::INTERVAL)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
    END LOOP;

    RAISE NOTICE '✅ Leaderboard test data seeded successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected leaderboard ranking:';
    RAISE NOTICE '  1. Test User 8 - 100+ deals (Legend 🏆)';
    RAISE NOTICE '  2. Test User 3 - 54 deals (Expert 🥇)';
    RAISE NOTICE '  3. Test User 1 - 16 deals (Hunter 🥈)';
    RAISE NOTICE '  4. Test User 4 - 12 deals (Hunter 🥈)';
    RAISE NOTICE '  5. Test User 5 - 2 deals (No badge)';
END $$;

-- Verify the data
SELECT 
    p.full_name,
    COUNT(f.id) as deal_count,
    CASE
        WHEN COUNT(f.id) >= 100 THEN '🏆 Legend'
        WHEN COUNT(f.id) >= 50 THEN '🥇 Expert'
        WHEN COUNT(f.id) >= 10 THEN '🥈 Hunter'
        ELSE 'No badge'
    END as badge
FROM profiles p
LEFT JOIN favorites f ON f.user_id = p.id AND f.entity_type = 'offer'
WHERE p.id IN (
    'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2',
    '6fb5eaeb-89ef-4eb0-b156-5b0d012ea4f3',
    '331346a4-51f6-4907-b1a4-67447a6eaab6',
    'e3ae5bfa-2fb0-4cd4-b397-dfa47e9d94de',
    '092963d0-d1f4-444d-9a0e-781b0f6f293c'
)
GROUP BY p.id, p.full_name
ORDER BY deal_count DESC;
