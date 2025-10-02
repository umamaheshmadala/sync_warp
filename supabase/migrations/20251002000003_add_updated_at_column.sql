-- =====================================================
-- Add missing updated_at column to user_coupon_collections
-- =====================================================

-- Add the column if it doesn't exist
ALTER TABLE user_coupon_collections
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to auto-update the timestamp
CREATE OR REPLACE FUNCTION update_user_coupon_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_user_coupon_collections_updated_at ON user_coupon_collections;

CREATE TRIGGER set_user_coupon_collections_updated_at
  BEFORE UPDATE ON user_coupon_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_user_coupon_collections_updated_at();

-- Verify
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_coupon_collections'
  AND column_name = 'updated_at';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added updated_at column to user_coupon_collections';
  RAISE NOTICE '✅ Added auto-update trigger';
END $$;
