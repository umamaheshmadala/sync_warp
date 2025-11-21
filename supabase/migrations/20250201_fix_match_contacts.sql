-- Fix match_contacts function to use correct column names
-- The function was referencing p.username which doesn't exist in profiles table

CREATE OR REPLACE FUNCTION match_contacts(
    p_user_id UUID,
    p_phone_hashes TEXT[]
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    phone_hash TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Match contacts against user phone hashes
    -- Return matched users who are not already friends
    RETURN QUERY
    SELECT DISTINCT
        p.id as user_id,
        p.full_name,
        p.email as username,  -- Use email as username since username column doesn't exist
        p.avatar_url,
        unnest(p_phone_hashes) as phone_hash
    FROM profiles p
    INNER JOIN contact_hashes ch ON ch.phone_hash = ANY(p_phone_hashes)
    WHERE 
        -- Match against stored contact hashes
        ch.phone_hash = ANY(p_phone_hashes)
        -- Exclude self
        AND p.id != p_user_id
        -- Exclude existing friends
        AND NOT EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = p_user_id AND f.friend_id = p.id)
               OR (f.user_id = p.id AND f.friend_id = p_user_id)
        )
        -- Exclude pending friend requests
        AND NOT EXISTS (
            SELECT 1 FROM friend_requests fr
            WHERE (fr.sender_id = p_user_id AND fr.receiver_id = p.id)
               OR (fr.sender_id = p.id AND fr.receiver_id = p_user_id)
            AND fr.status = 'pending'
        );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_contacts(UUID, TEXT[]) TO authenticated;

COMMENT ON FUNCTION match_contacts IS 'Matches hashed contacts against stored contact hashes, excluding existing friends';
