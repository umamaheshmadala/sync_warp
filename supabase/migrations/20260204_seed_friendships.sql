
-- Seed friendships for testing social proof
-- Assuming Test User 1 (d7c2f5c4-0f19-4b4f-a641-3f77c34937b2) is the viewer
-- And we want them to be friends with User 2 and User 3

DO $$
DECLARE
    u1 UUID := 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'; -- Test User 1
    u2 UUID := 'eed7a6f3-f531-4621-a118-756cd5d694c4'; -- Test User 2
    u3 UUID := '6fb5eaeb-89ef-4eb0-b156-5b0d012ea4f3'; -- Test User 3
BEGIN
    -- U1 <-> U2
    INSERT INTO friendships (user_id, friend_id, status) VALUES (u1, u2, 'active') ON CONFLICT DO NOTHING;
    INSERT INTO friendships (user_id, friend_id, status) VALUES (u2, u1, 'active') ON CONFLICT DO NOTHING;

    -- U1 <-> U3
    INSERT INTO friendships (user_id, friend_id, status) VALUES (u1, u3, 'active') ON CONFLICT DO NOTHING;
    INSERT INTO friendships (user_id, friend_id, status) VALUES (u3, u1, 'active') ON CONFLICT DO NOTHING;
END $$;
