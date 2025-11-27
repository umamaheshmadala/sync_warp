-- Find Test User 1's friends and seed favorites for them
-- Test User 1 ID: d7c2f5c4-0f19-4b4f-a641-3f77c34937b2

DO $$
DECLARE
    test_business_id uuid := 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
    test_user_1_id uuid := 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2';
    offer1_id uuid;
    offer2_id uuid;
    offer3_id uuid;
    offer4_id uuid;
    friend_record RECORD;
    friend_count int := 0;
BEGIN
    -- Get the 4 test offers
    SELECT id INTO offer1_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 1%' LIMIT 1;
    SELECT id INTO offer2_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 2%' LIMIT 1;
    SELECT id INTO offer3_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 3%' LIMIT 1;
    SELECT id INTO offer4_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 4%' LIMIT 1;

    RAISE NOTICE 'Offers found: %, %, %, %', offer1_id, offer2_id, offer3_id, offer4_id;

    -- Loop through Test User 1's friends and assign favorites
    FOR friend_record IN 
        SELECT DISTINCT
            p.id as friend_id,
            p.full_name
        FROM friendships f
        INNER JOIN profiles p ON (p.id = f.friend_id OR p.id = f.user_id)
        WHERE (f.user_id = test_user_1_id OR f.friend_id = test_user_1_id)
          AND p.id != test_user_1_id
          AND f.status = 'active'
        LIMIT 3
    LOOP
        friend_count := friend_count + 1;
        
        IF friend_count = 1 THEN
            -- Friend 1 likes offers 1 and 2
            INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend_record.friend_id, 'offer', offer1_id) ON CONFLICT DO NOTHING;
            INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend_record.friend_id, 'offer', offer2_id) ON CONFLICT DO NOTHING;
            RAISE NOTICE '✅ % favorited offers 1 and 2', friend_record.full_name;
            
        ELSIF friend_count = 2 THEN
            -- Friend 2 likes offers 2 and 3
            INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend_record.friend_id, 'offer', offer2_id) ON CONFLICT DO NOTHING;
            INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend_record.friend_id, 'offer', offer3_id) ON CONFLICT DO NOTHING;
            RAISE NOTICE '✅ % favorited offers 2 and 3', friend_record.full_name;
            
        ELSIF friend_count = 3 THEN
            -- Friend 3 likes offers 1, 3, and 4
            INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend_record.friend_id, 'offer', offer1_id) ON CONFLICT DO NOTHING;
            INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend_record.friend_id, 'offer', offer3_id) ON CONFLICT DO NOTHING;
            INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend_record.friend_id, 'offer', offer4_id) ON CONFLICT DO NOTHING;
            RAISE NOTICE '✅ % favorited offers 1, 3, and 4', friend_record.full_name;
        END IF;
    END LOOP;

    IF friend_count = 0 THEN
        RAISE NOTICE '⚠️ Test User 1 has no friends! Cannot seed data.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '🎉 Seeded favorites for % friends of Test User 1', friend_count;
    END IF;
END $$;

-- Verify the data
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
