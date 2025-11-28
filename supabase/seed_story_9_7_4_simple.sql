-- Seed test data for Friend Leaderboard (Story 9.7.4) - SIMPLE VERSION
-- Creates dummy offers and favorites to test all badge levels

DO $$
DECLARE
    test_business_id uuid := 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
    
    -- Test users (friends of Test User 1)
    user1_id uuid := 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2';  -- Test User 1
    user3_id uuid := '6fb5eaeb-89ef-4eb0-b156-5b0d012ea4f3';  -- Test User 3
    user4_id uuid := '331346a4-51f6-4907-b1a4-67447a6eaab6';  -- Test User 4
    user5_id uuid := 'e3ae5bfa-2fb0-4cd4-b397-dfa47e9d94de';  -- Test User 5
    user8_id uuid := '092963d0-d1f4-444d-9a0e-781b0f6f293c';  -- Test User 8
    
    offer_id uuid;
    i integer;
BEGIN
    RAISE NOTICE 'Creating dummy offers for leaderboard testing...';
    
    -- Create dummy offers for Test User 8 (Legend - 105 offers)
    FOR i IN 1..105 LOOP
        INSERT INTO offers (
            business_id,
            title,
            description,
            is_active,
            status,
            valid_until,
            created_at
        ) VALUES (
            test_business_id,
            'Leaderboard Test Offer ' || i,
            'Dummy offer for leaderboard testing',
            true,
            'active',
            NOW() + INTERVAL '30 days',
            NOW() - (i % 30 || ' days')::INTERVAL
        )
        RETURNING id INTO offer_id;
        
        -- User 8 favorites all 105
        INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
        VALUES (user8_id, 'offer', offer_id, NOW() - (i % 30 || ' days')::INTERVAL);
        
        -- User 3 favorites first 55
        IF i <= 55 THEN
            INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
            VALUES (user3_id, 'offer', offer_id, NOW() - (i % 30 || ' days')::INTERVAL);
        END IF;
        
        -- User 1 favorites first 16
        IF i <= 16 THEN
            INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
            VALUES (user1_id, 'offer', offer_id, NOW() - (i % 30 || ' days')::INTERVAL);
        END IF;
        
        -- User 4 favorites first 12
        IF i <= 12 THEN
            INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
            VALUES (user4_id, 'offer', offer_id, NOW() - (i % 30 || ' days')::INTERVAL);
        END IF;
        
        -- User 5 favorites first 5
        IF i <= 5 THEN
            INSERT INTO favorites (user_id, entity_type, entity_id, created_at)
            VALUES (user5_id, 'offer', offer_id, NOW() - (i % 7 || ' days')::INTERVAL);
        END IF;
    END LOOP;

    RAISE NOTICE '✅ Created 105 dummy offers';
    RAISE NOTICE '✅ Test User 8: Favorited 105 offers (Legend 🏆)';
    RAISE NOTICE '✅ Test User 3: Favorited 55 offers (Expert 🥇)';
    RAISE NOTICE '✅ Test User 1: Favorited 16 offers (Hunter 🥈)';
    RAISE NOTICE '✅ Test User 4: Favorited 12 offers (Hunter 🥈)';
    RAISE NOTICE '✅ Test User 5: Favorited 5 offers (No badge)';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Leaderboard test data seeded successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected leaderboard ranking:';
    RAISE NOTICE '  1. Test User 8 - 105 deals (Legend 🏆)';
    RAISE NOTICE '  2. Test User 3 - 55 deals (Expert 🥇)';
    RAISE NOTICE '  3. Test User 1 - 16 deals (Hunter 🥈)';
    RAISE NOTICE '  4. Test User 4 - 12 deals (Hunter 🥈)';
    RAISE NOTICE '  5. Test User 5 - 5 deals (No badge)';
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
