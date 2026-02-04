-- Create product_likes table
CREATE TABLE IF NOT EXISTS product_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_product_likes_product ON product_likes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_user ON product_likes(user_id);

-- Denormalized count on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Trigger Function
CREATE OR REPLACE FUNCTION update_product_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET like_count = like_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS product_likes_count_trigger ON product_likes;
CREATE TRIGGER product_likes_count_trigger
AFTER INSERT OR DELETE ON product_likes
FOR EACH ROW EXECUTE FUNCTION update_product_like_count();

-- RLS Policies
ALTER TABLE product_likes ENABLE ROW LEVEL SECURITY;

-- Everyone can view likes (needed for 'Liked by...' and count, though count is on products)
-- Actually, to see IF I liked it, I need to select. To see list of likers, I need select.
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON product_likes;
CREATE POLICY "Likes are viewable by everyone" 
  ON product_likes FOR SELECT 
  USING (true);

-- Authenticated users can insert their own like
DROP POLICY IF EXISTS "Users can like products" ON product_likes;
CREATE POLICY "Users can like products" 
  ON product_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own like
DROP POLICY IF EXISTS "Users can unlike products" ON product_likes;


-- RPC: Get friends who liked a product
DROP FUNCTION IF EXISTS get_friends_who_liked_product(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_friends_who_liked_product(p_product_id UUID, p_viewer_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id as user_id,
    p.full_name::TEXT,
    p.avatar_url::TEXT
  FROM product_likes pl
  JOIN profiles p ON pl.user_id = p.id
  -- Check friendship (user_id is the liker, p_viewer_id is the current user)
  JOIN friendships f ON (
    (f.user_id = p_viewer_id AND f.friend_id = pl.user_id) OR 
    (f.friend_id = p_viewer_id AND f.user_id = pl.user_id)
  )
  WHERE pl.product_id = p_product_id
  AND f.status = 'active'
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

