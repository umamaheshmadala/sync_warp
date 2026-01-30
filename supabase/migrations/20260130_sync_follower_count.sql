-- Migration: Sync Follower Count
-- Created: 2026-01-30
-- Story: 4.20 - Business Storefront Interactivity
-- Purpose: Keep businesses.follower_count in sync with business_followers table count

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_business_followers_active 
ON business_followers(business_id, is_active) 
WHERE is_active = true;

-- Function to sync follower count
CREATE OR REPLACE FUNCTION sync_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the businesses table with the current follower count
  UPDATE businesses
  SET follower_count = (
    SELECT COUNT(*) 
    FROM business_followers 
    WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    AND is_active = true
  )
  WHERE id = COALESCE(NEW.business_id, OLD.business_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically sync on INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS sync_follower_count_trigger ON business_followers;
CREATE TRIGGER sync_follower_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON business_followers
FOR EACH ROW
EXECUTE FUNCTION sync_follower_count();

-- Backfill existing follower counts
UPDATE businesses b
SET follower_count = (
  SELECT COUNT(*)
  FROM business_followers bf
  WHERE bf.business_id = b.id
  AND bf.is_active = true
)
WHERE EXISTS (
  SELECT 1 FROM business_followers WHERE business_id = b.id
);

-- Comment on trigger
COMMENT ON TRIGGER sync_follower_count_trigger ON business_followers IS 
'Automatically syncs businesses.follower_count when followers are added, updated, or removed';
