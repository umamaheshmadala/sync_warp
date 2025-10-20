-- Migration 014: Create dedicated favorites table for products/coupons
-- This table is separate from business_followers which handles business following

-- Drop existing favorites table if it exists (from old implementation)
DROP TABLE IF EXISTS favorites CASCADE;

-- Create favorites table for products, coupons, and other items
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'coupon', 'event')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata (optional)
  notes TEXT,
  priority INTEGER DEFAULT 0,
  
  -- Ensure one user can't favorite the same item twice
  UNIQUE(user_id, entity_type, entity_id)
);

-- Create indexes for performance
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_entity ON favorites(entity_type, entity_id);
CREATE INDEX idx_favorites_user_entity ON favorites(user_id, entity_type);
CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_favorites_updated_at
  BEFORE UPDATE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can create own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own favorites
CREATE POLICY "Users can update own favorites"
  ON favorites FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Create view for favorite products with product details
CREATE OR REPLACE VIEW favorite_products AS
SELECT 
  f.id as favorite_id,
  f.user_id,
  f.created_at as favorited_at,
  f.notes,
  f.priority,
  p.*
FROM favorites f
JOIN products p ON f.entity_id = p.id
WHERE f.entity_type = 'product';

-- Create view for favorite coupons with coupon details
CREATE OR REPLACE VIEW favorite_coupons AS
SELECT 
  f.id as favorite_id,
  f.user_id,
  f.created_at as favorited_at,
  f.notes,
  f.priority,
  c.*
FROM favorites f
JOIN business_coupons c ON f.entity_id = c.id
WHERE f.entity_type = 'coupon';

-- Helper function to toggle favorite
CREATE OR REPLACE FUNCTION toggle_favorite(
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
  v_result BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if already favorited
  SELECT id INTO v_existing_id
  FROM favorites
  WHERE user_id = v_user_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id;
  
  IF v_existing_id IS NOT NULL THEN
    -- Remove from favorites
    DELETE FROM favorites WHERE id = v_existing_id;
    v_result := FALSE;
  ELSE
    -- Add to favorites
    INSERT INTO favorites (user_id, entity_type, entity_id)
    VALUES (v_user_id, p_entity_type, p_entity_id);
    v_result := TRUE;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if favorited
CREATE OR REPLACE FUNCTION is_favorited(
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT COUNT(*) INTO v_count
  FROM favorites
  WHERE user_id = v_user_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id;
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON favorites TO authenticated;
GRANT SELECT ON favorite_products TO authenticated;
GRANT SELECT ON favorite_coupons TO authenticated;

-- Add comments
COMMENT ON TABLE favorites IS 'Stores user favorites for products, coupons, and events. Business following is handled in business_followers table.';
COMMENT ON COLUMN favorites.entity_type IS 'Type of entity: product, coupon, or event';
COMMENT ON COLUMN favorites.entity_id IS 'UUID of the favorited entity';
COMMENT ON COLUMN favorites.priority IS 'Optional priority for sorting (higher = more important)';
