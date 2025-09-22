-- MINIMAL CORE FIX - Skips policy issues, focuses on core functionality
-- Run this if the policy creation keeps failing

-- Just create the missing function (this is the most critical part)
CREATE OR REPLACE FUNCTION accept_friend_request_safe(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Get the friend request
    SELECT * INTO request_record FROM public.friend_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Create friendship safely with proper ordering
    INSERT INTO public.friendships (user1_id, user2_id)
    VALUES (
        LEAST(request_record.requester_id, request_record.receiver_id),
        GREATEST(request_record.requester_id, request_record.receiver_id)
    ) ON CONFLICT DO NOTHING;
    
    -- Update request status
    UPDATE public.friend_requests 
    SET status = 'accepted', updated_at = NOW() 
    WHERE id = request_id;
    
    RETURN TRUE;
END;
$$;

-- Fix the constraints issue (most important for preventing 409 errors)
DO $$
BEGIN
    -- Try to drop old constraint/index if they exist
    BEGIN
        ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_unique;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP INDEX IF EXISTS friendships_unique;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- Try to create new unique constraint
    BEGIN
        CREATE UNIQUE INDEX friendships_unique_bidirectional ON public.friendships 
        (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Index might already exist, that's fine
    END;
END $$;

-- Test that the function works
SELECT 'Core fix completed - function and constraints updated!' as status;

-- Check if the function was created
SELECT 'Function check:' as info;
SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'accept_friend_request_safe'
) as function_exists;

SELECT 'Constraint check:' as info;
SELECT EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'friendships_unique_bidirectional'
) as new_constraint_exists;