-- ============================================
-- Story 9.7.3: Friend-Based Deal Recommendations
-- Complete Setup Script
-- ============================================
-- Run this entire script in Supabase SQL Editor while logged in as your test user

-- PART 1: Apply Migration - Add 'offer' to favorites table
-- ============================================

-- Drop the existing check constraint
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_entity_type_check;

-- Add new check constraint that includes 'offer'
ALTER TABLE favorites ADD CONSTRAINT favorites_entity_type_check 
  CHECK (entity_type IN ('product', 'coupon', 'event', 'offer'));

-- Add comment explaining the entity types
COMMENT ON COLUMN favorites.entity_type IS 'Type of entity being favorited: product, coupon, event, or offer';

-- Verify the constraint was added
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'favorites_entity_type_check';

-- PART 2: Seed Test Data
-- ============================================
-- This creates test favorites for the 4 test offers from Test Business 1

DO $$
DECLARE
    test_business_id uuid := 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
    offer1_id uuid;
    offer2_id uuid;
    offer3_id uuid;
    offer4_id uuid;
    current_user_id uuid;
    friend1_id uuid;
    friend2_id uuid;
    friend3_id uuid;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in to run this script';
    END IF;

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

    -- Get 3 friends of the current user
    SELECT friend_id INTO friend1_id FROM friendships 
    WHERE user_id = current_user_id AND status = 'active' 
    LIMIT 1 OFFSET 0;
    
    SELECT friend_id INTO friend2_id FROM friendships 
    WHERE user_id = current_user_id AND status = 'active' 
    LIMIT 1 OFFSET 1;
    
    SELECT friend_id INTO friend3_id FROM friendships 
    WHERE user_id = current_user_id AND status = 'active' 
    LIMIT 1 OFFSET 2;

    -- Log what we found
    RAISE NOTICE 'Current user: %', current_user_id;
    RAISE NOTICE 'Offer 1: %', offer1_id;
    RAISE NOTICE 'Offer 2: %', offer2_id;
    RAISE NOTICE 'Offer 3: %', offer3_id;
    RAISE NOTICE 'Offer 4: %', offer4_id;
    RAISE NOTICE 'Friend 1: %', friend1_id;
    RAISE NOTICE 'Friend 2: %', friend2_id;
    RAISE NOTICE 'Friend 3: %', friend3_id;

    -- Create favorites for friends
    -- Friend 1 likes offers 1 and 2
    IF friend1_id IS NOT NULL AND offer1_id IS NOT NULL THEN
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend1_id, 'offer', offer1_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend1_id, 'offer', offer2_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        RAISE NOTICE 'Friend 1 favorited offers 1 and 2';
    END IF;

    -- Friend 2 likes offers 2 and 3
    IF friend2_id IS NOT NULL AND offer2_id IS NOT NULL THEN
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend2_id, 'offer', offer2_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        INSERT INTO favorites (user_id, entity_type, entity_id)
        VALUES (friend2_id, 'offer', offer3_id)
        ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
        
        RAISE NOTICE 'Friend 2 favorited offers 2 and 3';
    END IF;

    -- Friend 3 likes offers 1, 3, and 4
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
        
        RAISE NOTICE 'Friend 3 favorited offers 1, 3, and 4';
    END IF;

    RAISE NOTICE '✅ Test data seeded successfully!';
    RAISE NOTICE 'Expected results:';
    RAISE NOTICE '  - Offer 1: liked by 2 friends';
    RAISE NOTICE '  - Offer 2: liked by 2 friends';
    RAISE NOTICE '  - Offer 3: liked by 2 friends';
    RAISE NOTICE '  - Offer 4: liked by 1 friend';
END $$;

-- PART 3: Verify the data
-- ============================================

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

-- PART 4: Test the RPC function
-- ============================================

SELECT * FROM get_deals_liked_by_friends();
