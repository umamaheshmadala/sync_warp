-- Fix Bidirectional Friend Removal
-- This ensures that when user1 unfriends user2, the friendship is removed for both users

-- Create a database function for safe bidirectional friend removal
CREATE OR REPLACE FUNCTION public.remove_friend(friend_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    deleted_count INTEGER := 0;
BEGIN
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Can't unfriend yourself
    IF current_user_id = friend_user_id THEN
        RAISE EXCEPTION 'Cannot unfriend yourself';
    END IF;
    
    -- Delete the friendship connection (works bidirectionally due to the OR condition)
    WITH deleted AS (
        DELETE FROM public.friend_connections
        WHERE status = 'accepted'
        AND (
            (user_a_id = current_user_id AND user_b_id = friend_user_id) OR
            (user_a_id = friend_user_id AND user_b_id = current_user_id)
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log the operation
    RAISE NOTICE 'Friend removal: Current user: %, Friend: %, Deleted: %', 
        current_user_id, friend_user_id, deleted_count;
    
    -- Return true if friendship was found and deleted
    RETURN deleted_count > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID) TO authenticated;

-- Test the function to make sure it works
SELECT 'Bidirectional friend removal function created successfully!' as status;

-- You can test it like this (uncomment to test):
-- SELECT public.remove_friend('some-friend-uuid-here');