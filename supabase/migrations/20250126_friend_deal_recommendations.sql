-- Function: Get deals liked by friends
CREATE OR REPLACE FUNCTION get_deals_liked_by_friends(
  current_user_id UUID,
  limit_count INT DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL,
  original_price DECIMAL,
  image_url TEXT,
  store_name TEXT,
  expires_at TIMESTAMPTZ,
  likes_by_friends BIGINT,
  friend_avatars TEXT[],
  friend_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.description,
    d.price,
    d.original_price,
    d.image_url,
    d.store_name,
    d.expires_at,
    COUNT(DISTINCT ul.user_id)::BIGINT as likes_by_friends,
    ARRAY_AGG(DISTINCT p.avatar_url) FILTER (WHERE p.avatar_url IS NOT NULL) as friend_avatars,
    ARRAY_AGG(DISTINCT COALESCE(p.full_name, p.username)) as friend_names
  FROM deals d
  JOIN user_likes ul ON ul.deal_id = d.id
  JOIN friendships f ON (
    (f.friend_id = ul.user_id AND f.user_id = current_user_id) OR
    (f.user_id = ul.user_id AND f.friend_id = current_user_id)
  ) AND f.status = 'active'
  JOIN profiles p ON p.id = ul.user_id
  WHERE ul.created_at > NOW() - INTERVAL '7 days'
    AND d.status = 'active'
    AND d.expires_at > NOW()
    AND ul.user_id != current_user_id  -- Exclude current user's own likes
  GROUP BY d.id, d.title, d.description, d.price, d.original_price, d.image_url, d.store_name, d.expires_at
  HAVING COUNT(DISTINCT ul.user_id) >= 2  -- At least 2 friends liked
  ORDER BY likes_by_friends DESC, d.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_deals_liked_by_friends TO authenticated;
