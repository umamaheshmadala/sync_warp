-- Optimized match_contacts function
-- Matches user's contact hashes against other users' phone hashes
-- Uses proper indexes and avoids cartesian products

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
    -- Match the user's contact hashes against other users' stored hashes
    -- This finds which of the user's contacts are also SynC users
    RETURN QUERY
    SELECT DISTINCT
        ch.user_id,
        p.full_name,
        COALESCE(p.email, '') as username,
        p.avatar_url,
        ch.phone_hash
    FROM contact_hashes ch
    INNER JOIN profiles p ON p.id = ch.user_id
    WHERE 
        -- Match: other users whose phone hashes are in my contact list
        ch.phone_hash = ANY(p_phone_hashes)
        -- Exclude self
        AND ch.user_id != p_user_id
        -- Exclude existing friends
        AND NOT EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = p_user_id AND f.friend_id = ch.user_id)
               OR (f.user_id = ch.user_id AND f.friend_id = p_user_id)
        )
        -- Exclude pending friend requests
        AND NOT EXISTS (
            SELECT 1 FROM friend_requests fr
            WHERE (fr.sender_id = p_user_id AND fr.receiver_id = ch.user_id)
               OR (fr.sender_id = ch.user_id AND fr.receiver_id = p_user_id)
            AND fr.status = 'pending'
        )
    LIMIT 100;  -- Limit results to prevent huge result sets
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_contacts(UUID, TEXT[]) TO authenticated;

COMMENT ON FUNCTION match_contacts IS 'Matches user contact hashes against other users stored phone hashes, excluding existing friends';
