-- Claim status enum already added in 4C.2, ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'claim_status_type'
  ) THEN
    CREATE TYPE claim_status_type AS ENUM (
      'unclaimed',
      'claimed_pending',
      'claimed_verified',
      'claimed_manual'
    );
  END IF;
END$$;

-- Add columns to businesses table if they don't exist
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS claim_status claim_status_type DEFAULT 'unclaimed';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Business claims table - tracks claim attempts and history
CREATE TABLE IF NOT EXISTS business_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  claimer_id UUID NOT NULL REFERENCES auth.users(id),
  previous_owner_id UUID REFERENCES auth.users(id),
  
  -- Claim details
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  verification_method VARCHAR(30) NOT NULL
    CHECK (verification_method IN ('phone_otp', 'email', 'document', 'admin')),
  
  -- Verification data
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  document_url TEXT,
  
  -- Admin review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_claims_business 
ON business_claims(business_id, status);

CREATE INDEX IF NOT EXISTS idx_business_claims_claimer 
ON business_claims(claimer_id, status);

CREATE INDEX IF NOT EXISTS idx_business_claims_pending 
ON business_claims(status) 
WHERE status = 'pending';

-- RLS Policies
ALTER TABLE business_claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
DROP POLICY IF EXISTS "Users can view own claims" ON business_claims;
CREATE POLICY "Users can view own claims"
ON business_claims FOR SELECT
USING (auth.uid() = claimer_id);

-- Users can create claims
DROP POLICY IF EXISTS "Authenticated users can create claims" ON business_claims;
CREATE POLICY "Authenticated users can create claims"
ON business_claims FOR INSERT
WITH CHECK (auth.uid() = claimer_id);

-- Users can update their pending claims
DROP POLICY IF EXISTS "Users can update own pending claims" ON business_claims;
CREATE POLICY "Users can update own pending claims"
ON business_claims FOR UPDATE
USING (auth.uid() = claimer_id AND status = 'pending');

-- Admins can view all claims
DROP POLICY IF EXISTS "Admins can view all claims" ON business_claims;
CREATE POLICY "Admins can view all claims"
ON business_claims FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Admins can update claims
DROP POLICY IF EXISTS "Admins can update claims" ON business_claims;
CREATE POLICY "Admins can update claims"
ON business_claims FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Function to initiate a claim
CREATE OR REPLACE FUNCTION initiate_business_claim(
  p_business_id UUID,
  p_verification_method VARCHAR DEFAULT 'phone_otp'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim_id UUID;
  v_current_owner UUID;
  v_claim_status VARCHAR;
BEGIN
  -- Check if business exists
  SELECT user_id, claim_status INTO v_current_owner, v_claim_status
  FROM businesses
  WHERE id = p_business_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;
  
  -- Check if already claimed and verified
  IF v_claim_status = 'claimed_verified' THEN
    RAISE EXCEPTION 'Business is already claimed and verified';
  END IF;
  
  -- Check for existing pending claim by this user
  SELECT id INTO v_claim_id
  FROM business_claims
  WHERE business_id = p_business_id
    AND claimer_id = auth.uid()
    AND status = 'pending';
  
  IF FOUND THEN
    RETURN v_claim_id; -- Return existing claim
  END IF;
  
  -- Create new claim
  INSERT INTO business_claims (
    business_id,
    claimer_id,
    previous_owner_id,
    verification_method
  ) VALUES (
    p_business_id,
    auth.uid(),
    v_current_owner,
    p_verification_method
  )
  RETURNING id INTO v_claim_id;
  
  -- Update business status
  UPDATE businesses
  SET claim_status = 'claimed_pending'
  WHERE id = p_business_id;
  
  RETURN v_claim_id;
END;
$$;

-- Function to complete a claim (after verification)
CREATE OR REPLACE FUNCTION complete_business_claim(
  p_claim_id UUID,
  p_phone_verified BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim RECORD;
BEGIN
  -- Get claim
  SELECT * INTO v_claim
  FROM business_claims
  WHERE id = p_claim_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found or not pending';
  END IF;
  
  -- Verify ownership
  IF auth.uid() != v_claim.claimer_id THEN
    RAISE EXCEPTION 'Not authorized to complete this claim';
  END IF;
  
  -- Update claim
  UPDATE business_claims
  SET 
    status = 'approved',
    phone_verified = p_phone_verified,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_claim_id;
  
  -- Transfer ownership
  UPDATE businesses
  SET 
    user_id = v_claim.claimer_id,
    claim_status = 'claimed_verified',
    phone_verified = p_phone_verified,
    phone_verified_at = CASE WHEN p_phone_verified THEN NOW() ELSE NULL END
  WHERE id = v_claim.business_id;
  
  -- Create notification for previous owner if exists
  IF v_claim.previous_owner_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      v_claim.previous_owner_id,
      'business_claimed',
      'Business Ownership Transferred',
      'Your business listing has been claimed by a new owner.',
      jsonb_build_object(
        'business_id', v_claim.business_id,
        'claim_id', p_claim_id
      )
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Function to get claim status
CREATE OR REPLACE FUNCTION get_business_claim_status(p_business_id UUID)
RETURNS TABLE (
  is_claimable BOOLEAN,
  current_status VARCHAR,
  owner_id UUID,
  is_verified BOOLEAN,
  pending_claim_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (b.claim_status IN ('unclaimed', 'manual') OR b.user_id IS NULL) as is_claimable,
    b.claim_status::VARCHAR,
    b.user_id as owner_id,
    COALESCE(b.phone_verified, false) as is_verified,
    (
      SELECT c.id 
      FROM business_claims c 
      WHERE c.business_id = b.id 
        AND c.status = 'pending' 
      LIMIT 1
    ) as pending_claim_id
  FROM businesses b
  WHERE b.id = p_business_id;
END;
$$;
