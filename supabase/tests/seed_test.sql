
-- Test Data Seed
-- Users handled by Supabase Auth usually, but for local/test DB we enable them in public.users/profiles if triggers exist.
-- Assuming internal knowledge of schema from viewing migrations earlier.

INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'test_user_a@example.com'),
('00000000-0000-0000-0000-000000000002', 'test_user_b@example.com'),
('00000000-0000-0000-0000-000000000003', 'blocked_user@example.com');

-- Profiles
INSERT INTO public.profiles (id, username, full_name, avatar_url) VALUES 
('00000000-0000-0000-0000-000000000001', 'user_a', 'Test User A', 'https://example.com/avatar1.png'),
('00000000-0000-0000-0000-000000000002', 'user_b', 'Test User B', 'https://example.com/avatar2.png'),
('00000000-0000-0000-0000-000000000003', 'blocked_user', 'Blocked User', 'https://example.com/avatar3.png');

-- Basic Conversation
INSERT INTO public.conversations (id, created_at) VALUES 
('11111111-1111-1111-1111-111111111111', NOW());

INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002');
