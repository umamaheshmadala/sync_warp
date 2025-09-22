-- FRESH FRIEND SYSTEM - Clean Start
-- This replaces the existing friend system completely

-- 1. Drop all existing friend-related tables and functions
DROP TABLE IF EXISTS public.friend_activities CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP FUNCTION IF EXISTS public.accept_friend_request_safe CASCADE;
DROP FUNCTION IF EXISTS public.create_friendship CASCADE;

-- 2. Create simple, clean friend_connections table (single table approach)
CREATE TABLE public.friend_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure users can't friend themselves
    CONSTRAINT no_self_friendship CHECK (user_a_id != user_b_id),
    
    -- Ensure unique friendship (bidirectional)
    CONSTRAINT unique_friendship UNIQUE (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
);

-- 3. Add indexes for performance
CREATE INDEX idx_friend_connections_user_a ON public.friend_connections(user_a_id);
CREATE INDEX idx_friend_connections_user_b ON public.friend_connections(user_b_id);
CREATE INDEX idx_friend_connections_status ON public.friend_connections(status);
CREATE INDEX idx_friend_connections_requester ON public.friend_connections(requester_id);

-- 4. Enable RLS with simple, permissive policies
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

-- Allow users to see connections they're involved in
CREATE POLICY "Users can view their connections" ON public.friend_connections
    FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Allow users to create friend requests
CREATE POLICY "Users can create friend requests" ON public.friend_connections
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Allow users to update connections they're involved in
CREATE POLICY "Users can update their connections" ON public.friend_connections
    FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- 5. Create helper functions
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    connection_id UUID;
    ordered_user_a UUID;
    ordered_user_b UUID;
BEGIN
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Can't friend yourself
    IF current_user_id = target_user_id THEN
        RAISE EXCEPTION 'Cannot send friend request to yourself';
    END IF;
    
    -- Order users for consistent storage
    IF current_user_id < target_user_id THEN
        ordered_user_a := current_user_id;
        ordered_user_b := target_user_id;
    ELSE
        ordered_user_a := target_user_id;
        ordered_user_b := current_user_id;
    END IF;
    
    -- Insert the friend request
    INSERT INTO public.friend_connections (user_a_id, user_b_id, requester_id, status)
    VALUES (ordered_user_a, ordered_user_b, current_user_id, 'pending')
    RETURNING id INTO connection_id;
    
    RETURN connection_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(connection_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    connection_record RECORD;
BEGIN
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get the connection
    SELECT * INTO connection_record
    FROM public.friend_connections
    WHERE id = connection_id 
    AND status = 'pending'
    AND (user_a_id = current_user_id OR user_b_id = current_user_id)
    AND requester_id != current_user_id; -- Can't accept your own request
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update to accepted
    UPDATE public.friend_connections
    SET status = 'accepted', updated_at = NOW()
    WHERE id = connection_id;
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_friend_request(connection_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Update to rejected
    UPDATE public.friend_connections
    SET status = 'rejected', updated_at = NOW()
    WHERE id = connection_id 
    AND status = 'pending'
    AND (user_a_id = current_user_id OR user_b_id = current_user_id)
    AND requester_id != current_user_id; -- Can't reject your own request
    
    RETURN FOUND;
END;
$$;

-- 6. Create views for easier querying
CREATE OR REPLACE VIEW public.user_friends AS
SELECT 
    fc.id,
    CASE 
        WHEN fc.user_a_id = auth.uid() THEN fc.user_b_id
        ELSE fc.user_a_id
    END as friend_id,
    fc.created_at
FROM public.friend_connections fc
WHERE fc.status = 'accepted'
AND (fc.user_a_id = auth.uid() OR fc.user_b_id = auth.uid());

CREATE OR REPLACE VIEW public.pending_friend_requests AS
SELECT 
    fc.id,
    fc.requester_id,
    fc.created_at,
    p.full_name as requester_name,
    p.avatar_url as requester_avatar
FROM public.friend_connections fc
JOIN public.profiles p ON p.id = fc.requester_id
WHERE fc.status = 'pending'
AND (fc.user_a_id = auth.uid() OR fc.user_b_id = auth.uid())
AND fc.requester_id != auth.uid();

-- 7. Test the schema
SELECT 'Fresh friend system schema created successfully!' as status;

-- Show the new structure
SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%friend%';

SELECT 'Functions created:' as info;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%friend%';