-- Create favorites table for products, coupons, and events
-- This is separate from business_followers which handles business following

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS favorites CASCADE;

-- Create the favorites table
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'coupon', 'event')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  priority INTEGER DEFAULT 0,
  
  -- Ensure unique favorites per user per entity
  UNIQUE(user_id, entity_type, entity_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_entity ON favorites(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_entity ON favorites(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
  ON favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
  ON favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own favorites
CREATE POLICY "Users can update their own favorites"
  ON favorites
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_favorites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_favorites_updated_at_trigger
  BEFORE UPDATE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_favorites_updated_at();

-- Function to toggle favorite
CREATE OR REPLACE FUNCTION toggle_favorite(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if favorite exists
  SELECT EXISTS(
    SELECT 1 FROM favorites
    WHERE user_id = v_user_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove favorite
    DELETE FROM favorites
    WHERE user_id = v_user_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id;
    RETURN FALSE;
  ELSE
    -- Add favorite
    INSERT INTO favorites (user_id, entity_type, entity_id)
    VALUES (v_user_id, p_entity_type, p_entity_id)
    ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if entity is favorited
CREATE OR REPLACE FUNCTION is_favorited(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 FROM favorites
    WHERE user_id = v_user_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's favorites by type
CREATE OR REPLACE FUNCTION get_user_favorites(
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  notes TEXT,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.entity_type,
    f.entity_id,
    f.created_at,
    f.updated_at,
    f.notes,
    f.priority
  FROM favorites f
  WHERE f.user_id = auth.uid()
    AND (p_entity_type IS NULL OR f.entity_type = p_entity_type)
  ORDER BY f.priority DESC, f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION toggle_favorite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_favorited(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorites(TEXT) TO authenticated;

-- Add comment to table
COMMENT ON TABLE favorites IS 'Stores user favorites for products, coupons, and events (NOT businesses - use business_followers for that)';
