-- Migration: Phone OTP Verification
-- Story: 4C.2
-- Description: Adds phone verification status and claim tracking to businesses table

-- Add columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'unclaimed';

-- Add constraints
ALTER TABLE businesses
ADD CONSTRAINT chk_claim_status CHECK (claim_status IN ('unclaimed', 'claimed', 'verified'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_businesses_phone_verified ON businesses(phone_verified);
CREATE INDEX IF NOT EXISTS idx_businesses_google_place_id ON businesses(google_place_id);

-- Comments
COMMENT ON COLUMN businesses.phone_verified IS 'Whether the business phone number has been verified via OTP';
COMMENT ON COLUMN businesses.claim_status IS 'Status of business ownership: unclaimed, claimed (pending), or verified';
