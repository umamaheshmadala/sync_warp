-- Manual application of the sharing tracking migration
-- This script is idempotent - it can be run multiple times safely
-- Based on: supabase/migrations/20250203_add_coupon_sharing_tracking.sql

-- Step 1: Add has_been_shared flag to track if coupon was shared
ALTER TABLE user_coupon_collections 
ADD COLUMN IF NOT EXISTS has_been_shared BOOLEAN DEFAULT FALSE;

-- Step 2: Add deleted_at timestamp for soft delete functionality
ALTER TABLE user_coupon_collections
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Step 3: Add sharing tracking - who the coupon was shared with
ALTER TABLE user_coupon_collections
ADD COLUMN IF NOT EXISTS shared_to_user_id UUID REFERENCES profiles(id);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN user_coupon_collections.has_been_shared IS 'Tracks if this coupon was shared with another user to prevent re-collection';
COMMENT ON COLUMN user_coupon_collections.deleted_at IS 'Timestamp when coupon was soft-deleted from wallet';
COMMENT ON COLUMN user_coupon_collections.shared_to_user_id IS 'User ID of the friend this coupon was shared with';

-- Step 5: Create index on has_been_shared for faster queries
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_has_been_shared 
ON user_coupon_collections(has_been_shared) 
WHERE has_been_shared = TRUE;

-- Step 6: Create index on deleted_at for filtering out deleted coupons
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_deleted_at 
ON user_coupon_collections(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Step 7: Update RLS policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own coupon collections" ON user_coupon_collections;
DROP POLICY IF EXISTS "Users can view active or shared coupons" ON user_coupon_collections;

-- Create policy for viewing coupons (includes shared coupons)
CREATE POLICY "Users can view active or shared coupons"
ON user_coupon_collections FOR SELECT
USING (
  user_id = auth.uid() OR 
  (shared_to_user_id = auth.uid() AND status = 'active')
);

-- Drop and recreate insert policy
DROP POLICY IF EXISTS "Users can insert their own coupon collections" ON user_coupon_collections;

CREATE POLICY "Users can insert their own coupon collections"
ON user_coupon_collections FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Drop and recreate update policy
DROP POLICY IF EXISTS "Users can update their own coupon collections" ON user_coupon_collections;

CREATE POLICY "Users can update their own coupon collections"
ON user_coupon_collections FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "Users can delete their own coupon collections" ON user_coupon_collections;

CREATE POLICY "Users can delete their own coupon collections"
ON user_coupon_collections FOR DELETE
USING (user_id = auth.uid());

-- Step 8: Create function to automatically set has_been_shared when shared_to_user_id is set
CREATE OR REPLACE FUNCTION set_has_been_shared()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shared_to_user_id IS NOT NULL AND OLD.shared_to_user_id IS NULL THEN
        NEW.has_been_shared := TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger to automatically set has_been_shared
DROP TRIGGER IF EXISTS trigger_set_has_been_shared ON user_coupon_collections;

CREATE TRIGGER trigger_set_has_been_shared
    BEFORE UPDATE ON user_coupon_collections
    FOR EACH ROW
    EXECUTE FUNCTION set_has_been_shared();

-- Add helpful comment
COMMENT ON FUNCTION set_has_been_shared() IS 'Automatically sets has_been_shared flag when a coupon is shared';

-- Step 10: Verification
SELECT 
  'Migration applied successfully!' as message,
  'Columns added: has_been_shared, deleted_at, shared_to_user_id' as details;

-- Run verification query
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_coupon_collections'
AND column_name IN ('has_been_shared', 'deleted_at', 'shared_to_user_id')
ORDER BY column_name;
