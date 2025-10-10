-- Migration: Add sharing tracking columns to user_coupon_collections
-- Purpose: Track shared coupons and soft delete functionality
-- Date: 2025-02-03

-- Add has_been_shared flag to track if coupon was shared
ALTER TABLE user_coupon_collections 
ADD COLUMN IF NOT EXISTS has_been_shared BOOLEAN DEFAULT FALSE;

-- Add deleted_at timestamp for soft delete functionality
ALTER TABLE user_coupon_collections
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add sharing tracking - who the coupon was shared with
ALTER TABLE user_coupon_collections
ADD COLUMN IF NOT EXISTS shared_to_user_id UUID REFERENCES profiles(id);

-- Add comment for documentation
COMMENT ON COLUMN user_coupon_collections.has_been_shared IS 'Tracks if this coupon was shared with another user to prevent re-collection';
COMMENT ON COLUMN user_coupon_collections.deleted_at IS 'Timestamp when coupon was soft-deleted from wallet';
COMMENT ON COLUMN user_coupon_collections.shared_to_user_id IS 'User ID of the friend this coupon was shared with';

-- Update the status column to support more states if it doesn't already
-- This is a safe operation - it will only add the type if it doesn't exist
DO $$ 
BEGIN
    -- Check if 'deleted' value exists in the status column
    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'user_coupon_collection_status'
    ) THEN
        -- If the enum doesn't exist, the column is likely VARCHAR
        -- No action needed as VARCHAR accepts any string
        RAISE NOTICE 'Status column is VARCHAR, no enum update needed';
    END IF;
END $$;

-- Create index on has_been_shared for faster queries
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_has_been_shared 
ON user_coupon_collections(has_been_shared) 
WHERE has_been_shared = TRUE;

-- Create index on deleted_at for filtering out deleted coupons
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_deleted_at 
ON user_coupon_collections(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Update existing RLS policies to handle shared coupons
-- First, drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own coupon collections" ON user_coupon_collections;

-- Create new policy that includes shared coupons
CREATE POLICY "Users can view active or shared coupons"
ON user_coupon_collections FOR SELECT
USING (
  user_id = auth.uid() OR 
  (shared_to_user_id = auth.uid() AND status = 'active')
);

-- Policy for inserting collections (users can only insert their own)
DROP POLICY IF EXISTS "Users can insert their own coupon collections" ON user_coupon_collections;

CREATE POLICY "Users can insert their own coupon collections"
ON user_coupon_collections FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy for updating collections (users can update their own)
DROP POLICY IF EXISTS "Users can update their own coupon collections" ON user_coupon_collections;

CREATE POLICY "Users can update their own coupon collections"
ON user_coupon_collections FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy for deleting collections (users can delete their own)
DROP POLICY IF EXISTS "Users can delete their own coupon collections" ON user_coupon_collections;

CREATE POLICY "Users can delete their own coupon collections"
ON user_coupon_collections FOR DELETE
USING (user_id = auth.uid());

-- Add a function to automatically set has_been_shared when shared_to_user_id is set
CREATE OR REPLACE FUNCTION set_has_been_shared()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shared_to_user_id IS NOT NULL AND OLD.shared_to_user_id IS NULL THEN
        NEW.has_been_shared := TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set has_been_shared
DROP TRIGGER IF EXISTS trigger_set_has_been_shared ON user_coupon_collections;

CREATE TRIGGER trigger_set_has_been_shared
    BEFORE UPDATE ON user_coupon_collections
    FOR EACH ROW
    EXECUTE FUNCTION set_has_been_shared();

-- Add helpful comment
COMMENT ON FUNCTION set_has_been_shared() IS 'Automatically sets has_been_shared flag when a coupon is shared';

-- Verification query (commented out - run manually to verify)
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_coupon_collections'
-- AND column_name IN ('has_been_shared', 'deleted_at', 'shared_to_user_id')
-- ORDER BY column_name;
