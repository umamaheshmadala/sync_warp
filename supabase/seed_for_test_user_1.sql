-- Seed favorites for Test User 1's friends
-- Test User 1 ID: d7c2f5c4-0f19-4b4f-a641-3f77c34937b2

-- First, find Test User 1's friends
SELECT 
    p.id as friend_id,
    p.email,
    p.full_name
FROM friendships f
INNER JOIN profiles p ON (p.id = f.friend_id OR p.id = f.user_id)
WHERE (f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' OR f.friend_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2')
  AND p.id != 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
  AND f.status = 'active'
ORDER BY p.created_at
LIMIT 10;

-- After you get the friend IDs, replace them below and run this:

DO $$
DECLARE
    test_business_id uuid := 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
    offer1_id uuid;
    offer2_id uuid;
    offer3_id uuid;
    offer4_id uuid;
    
    -- REPLACE THESE WITH TEST USER 1'S FRIEND IDs
    friend1_id uuid := 'REPLACE_WITH_FRIEND_1_ID';
    friend2_id uuid := 'REPLACE_WITH_FRIEND_2_ID';
    friend3_id uuid := 'REPLACE_WITH_FRIEND_3_ID';
BEGIN
    -- Get the 4 test offers
    SELECT id INTO offer1_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 1%' LIMIT 1;
    SELECT id INTO offer2_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 2%' LIMIT 1;
    SELECT id INTO offer3_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 3%' LIMIT 1;
    SELECT id INTO offer4_id FROM offers WHERE business_id = test_business_id AND title LIKE '%Test offer 4%' LIMIT 1;

    -- Friend 1 likes offers 1 and 2
    IF friend1_id IS NOT NULL THEN
        INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend1_id, 'offer', offer1_id) ON CONFLICT DO NOTHING;
        INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend1_id, 'offer', offer2_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Friend 2 likes offers 2 and 3
    IF friend2_id IS NOT NULL THEN
        INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend2_id, 'offer', offer2_id) ON CONFLICT DO NOTHING;
        INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend2_id, 'offer', offer3_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Friend 3 likes offers 1, 3, and 4
    IF friend3_id IS NOT NULL THEN
        INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend3_id, 'offer', offer1_id) ON CONFLICT DO NOTHING;
        INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend3_id, 'offer', offer3_id) ON CONFLICT DO NOTHING;
        INSERT INTO favorites (user_id, entity_type, entity_id) VALUES (friend3_id, 'offer', offer4_id) ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE '✅ Seeded favorites for Test User 1''s friends';
END $$;
