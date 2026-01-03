-- Update get_deals_liked_by_friends to use offers and favorites tables
-- This replaces the previous version that used non-existent deals and user_likes tables

DROP FUNCTION IF EXISTS get_deals_liked_by_friends();

CREATE OR REPLACE FUNCTION get_deals_liked_by_friends()
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    image_url text,
    price numeric,
    original_price numeric,
    valid_until timestamptz,
    business_id uuid,
    likes_by_friends bigint,
    friend_names text[],
    friend_avatars text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.title,
        o.description,
        o.image_url,
        NULL::numeric as price,  -- offers don't have price field
        NULL::numeric as original_price,  -- offers don't have original_price field
        o.valid_until,
        o.business_id,
        COUNT(DISTINCT f.user_id)::bigint as likes_by_friends,
        ARRAY_AGG(DISTINCT p.full_name) as friend_names,
        ARRAY_AGG(DISTINCT p.avatar_url) as friend_avatars
    FROM offers o
    INNER JOIN favorites fav ON fav.entity_id = o.id AND fav.entity_type = 'offer'
    INNER JOIN friendships f ON (
        (f.friend_id = fav.user_id AND f.user_id = auth.uid()) OR
        (f.user_id = fav.user_id AND f.friend_id = auth.uid())
    )
    INNER JOIN profiles p ON p.id = fav.user_id
    WHERE 
        f.status = 'active'
        AND fav.created_at > NOW() - INTERVAL '7 days'
        AND o.is_active = true
        AND o.status = 'active'
        AND (o.valid_until IS NULL OR o.valid_until > NOW())
    GROUP BY o.id, o.title, o.description, o.image_url, o.valid_until, o.business_id
    ORDER BY likes_by_friends DESC, o.created_at DESC
    LIMIT 10;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_deals_liked_by_friends() TO authenticated;

COMMENT ON FUNCTION get_deals_liked_by_friends() IS 'Returns offers that the current user''s friends have favorited in the last 7 days';
