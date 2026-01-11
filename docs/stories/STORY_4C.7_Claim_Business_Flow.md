# Story 4C.7: Claim Existing Business Flow

**Epic:** Epic 4C - Smart Business Onboarding  
**Priority:** 🟡 P2 - MEDIUM  
**Effort:** 3 days  
**Dependencies:** Story 4C.2 (Phone OTP), Story 4C.4 (Verification Step)  
**Status:** 📋 Ready for Implementation

---

## Overview

Allow users to claim businesses that already exist on SynC but don't have an owner. This enables community-added businesses to be claimed by their actual owners, and handles cases where a business was registered by someone who is no longer the owner.

---

## User Stories

### US-4C.7.1: Identify Claimable Businesses
**As a** business owner  
**I want to** see a "Claim this business" option on unclaimed listings  
**So that** I can take ownership of my business profile

**Acceptance Criteria:**
- [ ] "Claim" button visible on unclaimed businesses
- [ ] Not visible on already-claimed businesses
- [ ] Not visible to already-logged-in owners
- [ ] Shows on storefront and search results

---

### US-4C.7.2: Claim Verification Flow
**As a** business owner  
**I want to** verify ownership when claiming  
**So that** only legitimate owners can claim

**Acceptance Criteria:**
- [ ] Clicking "Claim" starts verification flow
- [ ] Uses existing phone OTP system
- [ ] Phone number must match business listing
- [ ] Alternative: different phone with admin review

---

### US-4C.7.3: Ownership Transfer
**As the** platform  
**I want to** transfer ownership after verification  
**So that** the right person controls the listing

**Acceptance Criteria:**
- [ ] Successful verification assigns new owner
- [ ] Previous owner (if any) notified
- [ ] All data preserved during transfer
- [ ] Audit trail created

---

### US-4C.7.4: Verification Badge
**As a** customer  
**I want to** see which businesses are verified  
**So that** I can trust the information

**Acceptance Criteria:**
- [ ] Verified badge on storefront
- [ ] Verified badge in search results
- [ ] Tooltip explains what verified means
- [ ] Different states: unclaimed, pending, verified

---

## Database Schema

**File:** `supabase/migrations/20260111_03_claim_system.sql`

```sql
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
CREATE INDEX idx_business_claims_business 
ON business_claims(business_id, status);

CREATE INDEX idx_business_claims_claimer 
ON business_claims(claimer_id, status);

CREATE INDEX idx_business_claims_pending 
ON business_claims(status) 
WHERE status = 'pending';

-- RLS Policies
ALTER TABLE business_claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view own claims"
ON business_claims FOR SELECT
USING (auth.uid() = claimer_id);

-- Users can create claims
CREATE POLICY "Authenticated users can create claims"
ON business_claims FOR INSERT
WITH CHECK (auth.uid() = claimer_id);

-- Users can update their pending claims
CREATE POLICY "Users can update own pending claims"
ON business_claims FOR UPDATE
USING (auth.uid() = claimer_id AND status = 'pending');

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
ON business_claims FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Admins can update claims
CREATE POLICY "Admins can update claims"
ON business_claims FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
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
    b.claim_status,
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
```

---

## Component: ClaimBusinessButton

**File:** `src/components/business/ClaimBusinessButton.tsx`

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { BusinessPhoneVerification } from './onboarding/components/BusinessPhoneVerification';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ClaimBusinessButtonProps {
  businessId: string;
  businessName: string;
  businessPhone: string;
  claimStatus: string;
  ownerId?: string;
  onClaimed?: () => void;
  className?: string;
}

export function ClaimBusinessButton({
  businessId,
  businessName,
  businessPhone,
  claimStatus,
  ownerId,
  onClaimed,
  className
}: ClaimBusinessButtonProps) {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [step, setStep] = useState<'confirm' | 'verify' | 'success'>('confirm');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(businessPhone);
  const [isVerified, setIsVerified] = useState(false);

  // Don't show if already owned by current user
  if (ownerId === user?.id) {
    return null;
  }

  // Don't show if already claimed and verified by someone else
  if (claimStatus === 'claimed_verified' && ownerId) {
    return null;
  }

  const isClaimable = claimStatus === 'unclaimed' || 
                       claimStatus === 'manual' || 
                       !ownerId;

  const handleStartClaim = async () => {
    if (!user) {
      toast.error('Please sign in to claim this business');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('initiate_business_claim', {
        p_business_id: businessId,
        p_verification_method: 'phone_otp'
      });

      if (error) throw error;

      setClaimId(data);
      setStep('verify');
    } catch (error) {
      console.error('Error initiating claim:', error);
      toast.error('Failed to start claim process');
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = async () => {
    if (!claimId) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('complete_business_claim', {
        p_claim_id: claimId,
        p_phone_verified: true
      });

      if (error) throw error;

      setIsVerified(true);
      setStep('success');
      toast.success('Business claimed successfully!');
      
      setTimeout(() => {
        setIsModalOpen(false);
        onClaimed?.();
      }, 2000);
    } catch (error) {
      console.error('Error completing claim:', error);
      toast.error('Failed to complete claim');
    } finally {
      setLoading(false);
    }
  };

  if (!isClaimable) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors",
          className
        )}
      >
        <Shield className="w-4 h-4" />
        Claim this business
      </button>

      {/* Claim Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !loading && setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Confirm Step */}
              {step === 'confirm' && (
                <>
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                    Claim {businessName}
                  </h2>
                  <p className="text-gray-600 text-center mb-6">
                    To prove you own this business, we'll verify the phone number on file.
                  </p>

                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-1">Phone on file:</p>
                    <p className="font-medium text-gray-900">
                      {businessPhone ? `+91 ${businessPhone}` : 'No phone on file'}
                    </p>
                    {!businessPhone && (
                      <p className="text-sm text-amber-600 mt-2">
                        You'll need to provide and verify your business phone.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      disabled={loading}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStartClaim}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Start Verification
                    </button>
                  </div>
                </>
              )}

              {/* Verify Step */}
              {step === 'verify' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Verify Ownership
                  </h2>
                  
                  <BusinessPhoneVerification
                    phoneNumber={phone}
                    onPhoneChange={setPhone}
                    onVerified={handleVerified}
                    isVerified={isVerified}
                    businessId={businessId}
                  />

                  <button
                    onClick={() => {
                      setStep('confirm');
                      setClaimId(null);
                    }}
                    disabled={loading}
                    className="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ← Back
                  </button>
                </>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Congratulations!
                  </h2>
                  <p className="text-gray-600">
                    You now own <strong>{businessName}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Redirecting to your dashboard...
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ClaimBusinessButton;
```

---

## Verification Badge Component

**File:** `src/components/business/VerificationBadge.tsx`

```typescript
import React from 'react';
import { Shield, ShieldCheck, ShieldQuestion, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  status: 'unclaimed' | 'claimed_pending' | 'claimed_verified' | 'claimed_manual' | 'manual';
  phoneVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const statusConfig = {
  unclaimed: {
    icon: ShieldQuestion,
    label: 'Unclaimed',
    color: 'text-gray-400 bg-gray-100',
    tooltip: 'This business has not been claimed by its owner.'
  },
  claimed_pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-amber-600 bg-amber-100',
    tooltip: 'Ownership verification in progress.'
  },
  claimed_verified: {
    icon: ShieldCheck,
    label: 'Verified',
    color: 'text-green-600 bg-green-100',
    tooltip: 'Business owner verified via phone.'
  },
  claimed_manual: {
    icon: Shield,
    label: 'Verified',
    color: 'text-blue-600 bg-blue-100',
    tooltip: 'Business verified by admin review.'
  },
  manual: {
    icon: Shield,
    label: 'Listed',
    color: 'text-gray-500 bg-gray-100',
    tooltip: 'Business registered but not verified.'
  }
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

export function VerificationBadge({
  status,
  phoneVerified = false,
  size = 'md',
  showTooltip = true,
  className
}: VerificationBadgeProps) {
  const config = statusConfig[status] || statusConfig.unclaimed;
  const Icon = config.icon;

  // Override to verified if phone is verified
  const effectiveConfig = phoneVerified && status !== 'claimed_verified' 
    ? statusConfig.claimed_verified 
    : config;
  const EffectiveIcon = effectiveConfig.icon;

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        sizeClasses[size],
        effectiveConfig.color,
        className
      )}
      title={showTooltip ? effectiveConfig.tooltip : undefined}
    >
      <EffectiveIcon className={iconSizes[size]} />
      <span>{effectiveConfig.label}</span>
    </div>
  );
}

export default VerificationBadge;
```

---

## Integration Points

### BusinessProfile.tsx
```typescript
// Add to header section
import { ClaimBusinessButton } from './ClaimBusinessButton';
import { VerificationBadge } from './VerificationBadge';

// In the header component
<div className="flex items-center gap-2">
  <h1>{business.business_name}</h1>
  <VerificationBadge 
    status={business.claim_status} 
    phoneVerified={business.phone_verified}
  />
</div>

// Below header if claimable
{!isOwner && (
  <ClaimBusinessButton
    businessId={business.id}
    businessName={business.business_name}
    businessPhone={business.business_phone}
    claimStatus={business.claim_status}
    ownerId={business.user_id}
    onClaimed={() => refetch()}
  />
)}
```

### BusinessCard.tsx (Search Results)
```typescript
// Add verification badge
<div className="flex items-center gap-1">
  <span className="font-medium">{business.business_name}</span>
  <VerificationBadge 
    status={business.claim_status} 
    size="sm" 
  />
</div>
```

---

## Acceptance Criteria

### Claim Button
- [ ] Visible on unclaimed business profiles
- [ ] Hidden when viewing own business
- [ ] Hidden when business is claimed by someone else
- [ ] Opens claim modal on click

### Claim Flow
- [ ] Shows confirmation with business details
- [ ] "Start Verification" initiates claim in database
- [ ] Phone OTP verification required
- [ ] Success transfers ownership

### Verification Badge
- [ ] Shows on all business profiles
- [ ] Correct icon/color per status
- [ ] Tooltip explains status
- [ ] Updates after claiming

### Notifications
- [ ] Previous owner notified of transfer
- [ ] New owner sees success message
- [ ] Audit trail created

---

## Definition of Done

- [ ] Database migration applied
- [ ] ClaimBusinessButton component implemented
- [ ] VerificationBadge component implemented
- [ ] Integrated into BusinessProfile
- [ ] Integrated into BusinessCard
- [ ] Notifications working
- [ ] All acceptance criteria met
- [ ] Mobile responsive

---

**Story Status:** 📋 Ready for Implementation  
**Estimated Hours:** 24 hours
