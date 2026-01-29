-- Migration: Offer Lifecycle Updates for Story 4.14
-- Date: 2026-01-29
-- Description: Add soft delete, pause/terminate reasons, and auto-archive trigger

-- 1. Add new columns to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS pause_reason VARCHAR(255) DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS terminate_reason VARCHAR(255) DEFAULT NULL;

-- 2. Update status check constraint to include 'terminated'
-- Note: We drop the old constraint and add a new one to ensure all valid statuses are covered
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check 
  CHECK (status IN ('draft', 'active', 'paused', 'expired', 'archived', 'terminated'));

-- 3. Create Trigger: Auto-archive expired offers
-- When valid_until passes, active offers should be moved to 'archived' (via expired state conceptually)
CREATE OR REPLACE FUNCTION auto_archive_expired_offers()
RETURNS trigger AS $$
BEGIN
  -- Only archive if currently active and validity has passed
  IF NEW.status = 'active' AND NEW.valid_until < NOW() THEN
    NEW.status := 'archived';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_archive_expired ON offers;
CREATE TRIGGER trigger_auto_archive_expired
BEFORE INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION auto_archive_expired_offers();

-- 4. Update RLS Policies for Soft Delete
-- Drop existing read policies to replace them with soft-delete aware ones
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;
DROP POLICY IF EXISTS "Business owners can manage own offers" ON offers;

-- Re-create: Anyone can view active offers (AND not deleted)
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

-- Re-create: Business owners can manage own offers (AND not deleted, generally)
-- Note: Owners might want to see deleted offers in a "Trash" view later, 
-- but for now requirements say "Hidden from queries" -> "WHERE deleted_at IS NULL"
CREATE POLICY "Business owners can manage own offers" ON offers
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- 5. Add comments
COMMENT ON COLUMN offers.deleted_at IS 'Soft delete timestamp. If set, offer is effectively deleted.';
COMMENT ON COLUMN offers.pause_reason IS 'Reason for pausing the offer (internal note).';
COMMENT ON COLUMN offers.terminate_reason IS 'Reason for terminating the offer permanently.';
