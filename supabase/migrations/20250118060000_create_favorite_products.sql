-- =====================================================
-- Story 4.10: Storefront Minor Enhancements
-- Migration: Create favorite_products table
-- =====================================================

-- Create favorite_products table
CREATE TABLE IF NOT EXISTS favorite_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure user can only favorite a product once
  UNIQUE(user_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorite_products_user 
  ON favorite_products(user_id);

CREATE INDEX IF NOT EXISTS idx_favorite_products_product 
  ON favorite_products(product_id);

CREATE INDEX IF NOT EXISTS idx_favorite_products_created 
  ON favorite_products(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_favorite_products_user_product 
  ON favorite_products(user_id, product_id);

-- Add comment to table
COMMENT ON TABLE favorite_products IS 'Stores customer favorite products for quick access and wishlist functionality';

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE favorite_products ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own favorite products
CREATE POLICY "Users can view own favorite products"
  ON favorite_products
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can add products to favorites
CREATE POLICY "Users can add favorite products"
  ON favorite_products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove products from favorites
CREATE POLICY "Users can remove favorite products"
  ON favorite_products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users cannot update favorite products (only insert/delete)
-- No UPDATE policy = implicit deny

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function: Get favorite product count for a user
CREATE OR REPLACE FUNCTION get_user_favorite_products_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fav_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO fav_count
  FROM favorite_products
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(fav_count, 0);
END;
$$;

-- Function: Check if product is favorited by user
CREATE OR REPLACE FUNCTION is_product_favorited(p_user_id UUID, p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_fav BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM favorite_products
    WHERE user_id = p_user_id
      AND product_id = p_product_id
  ) INTO is_fav;
  
  RETURN COALESCE(is_fav, FALSE);
END;
$$;

-- Function: Get product favorite count (how many users favorited)
CREATE OR REPLACE FUNCTION get_product_favorite_count(p_product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fav_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO fav_count
  FROM favorite_products
  WHERE product_id = p_product_id;
  
  RETURN COALESCE(fav_count, 0);
END;
$$;

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_favorite_products_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_product_favorited(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_favorite_count(UUID) TO authenticated;

-- =====================================================
-- Verification Queries (for testing)
-- =====================================================

-- To verify migration:
-- SELECT * FROM favorite_products LIMIT 1;
-- SELECT get_user_favorite_products_count(auth.uid());
-- SELECT is_product_favorited(auth.uid(), 'some-product-id');
