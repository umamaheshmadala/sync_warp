-- Migration: Create user_favorites table for Story 4.13
-- Created: 2026-01-09
-- Description: Unified favorites system for Offers and Products only

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('offer', 'product')),
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate favorites
  CONSTRAINT unique_user_favorite UNIQUE(user_id, item_type, item_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_user_type ON user_favorites(user_id, item_type);
CREATE INDEX idx_user_favorites_item ON user_favorites(item_type, item_id);

-- Enable Row Level Security
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON user_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
  ON user_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON user_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Drop existing toggle_favorite function if it exists (from old implementation)
DROP FUNCTION IF EXISTS toggle_favorite(TEXT, UUID);

-- Database Function: Toggle favorite (returns true if favorited, false if unfavorited)
CREATE OR REPLACE FUNCTION toggle_favorite(
  p_item_type TEXT,
  p_item_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if already favorited
  SELECT EXISTS(
    SELECT 1 FROM user_favorites 
    WHERE user_id = v_user_id 
      AND item_type = p_item_type 
      AND item_id = p_item_id
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Unfavorite
    DELETE FROM user_favorites 
    WHERE user_id = v_user_id 
      AND item_type = p_item_type 
      AND item_id = p_item_id;
    RETURN FALSE;
  ELSE
    -- Favorite
    INSERT INTO user_favorites (user_id, item_type, item_id)
    VALUES (v_user_id, p_item_type, p_item_id)
    ON CONFLICT DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Database Function: Get user's favorited offers (CORRECTED SCHEMA)
CREATE OR REPLACE FUNCTION get_user_favorite_offers(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  offer_code TEXT,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  business_id UUID,
  business_name TEXT,
  business_logo TEXT,
  icon_image_url TEXT,
  favorited_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER,
  share_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.title,
    o.description,
    o.offer_code::TEXT,
    o.valid_from,
    o.valid_until,
    o.business_id,
    b.business_name::TEXT, -- Cast to TEXT
    b.logo_url as business_logo,
    o.icon_image_url,
    f.created_at as favorited_at,
    o.view_count,
    o.share_count
  FROM user_favorites f
  JOIN offers o ON o.id = f.item_id
  JOIN businesses b ON b.id = o.business_id
  WHERE f.user_id = p_user_id 
    AND f.item_type = 'offer'
    AND o.status = 'active'
    AND o.valid_until > NOW()
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Database Function: Get user's favorited products (CORRECTED TABLE: business_products)
CREATE OR REPLACE FUNCTION get_user_favorite_products(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  image_urls TEXT[],
  business_id UUID,
  business_name TEXT,
  is_available BOOLEAN,
  is_featured BOOLEAN,
  favorited_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.name::TEXT,
    bp.description::TEXT,
    bp.price,
    bp.image_urls,  -- business_products already has image_urls (TEXT[])
    bp.business_id,
    b.business_name::TEXT,
    bp.is_available,  -- business_products already has is_available
    bp.is_featured,
    f.created_at as favorited_at
  FROM user_favorites f
  JOIN business_products bp ON bp.id = f.item_id  -- Changed from 'products' to 'business_products'
  JOIN businesses b ON b.id = bp.business_id
  WHERE f.user_id = p_user_id 
    AND f.item_type = 'product'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION toggle_favorite TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorite_offers TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorite_products TO authenticated;

-- Comment on table
COMMENT ON TABLE user_favorites IS 'Story 4.13: Unified favorites system for offers and products only. Replaces old favorites/wishlist tables.';
