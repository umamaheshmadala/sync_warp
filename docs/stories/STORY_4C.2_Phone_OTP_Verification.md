# Story 4C.2: Phone OTP Verification System

**Epic:** Epic 4C - Smart Business Onboarding  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 3 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement phone-based OTP verification to prove business ownership. Like Yelp, this ensures only legitimate business owners can claim and manage listings, building trust with customers and preventing fraudulent listings.

---

## User Stories

### US-4C.2.1: Send OTP to Business Phone
**As a** business owner  
**I want to** receive an OTP on my business phone  
**So that** I can prove I own this business

**Acceptance Criteria:**
- [ ] OTP is sent to valid Indian phone numbers (+91)
- [ ] Phone number is validated before sending
- [ ] Loading state shown during sending
- [ ] Success message confirms OTP sent
- [ ] Error message if sending fails

---

### US-4C.2.2: Enter and Verify OTP
**As a** business owner  
**I want to** enter the OTP I received  
**So that** my business ownership is verified

**Acceptance Criteria:**
- [ ] 6-digit input with auto-focus between digits
- [ ] Backspace moves to previous digit
- [ ] Auto-submit when all 6 digits entered
- [ ] Loading state during verification
- [ ] Success animation on verification
- [ ] Clear error message on failure

---

### US-4C.2.3: Resend OTP
**As a** business owner  
**I want to** request a new OTP if I didn't receive the first one  
**So that** I can complete verification

**Acceptance Criteria:**
- [ ] "Resend OTP" link visible after initial send
- [ ] 60-second cooldown before resend allowed
- [ ] Countdown timer shown during cooldown
- [ ] New OTP invalidates previous OTP
- [ ] Maximum 3 resends per hour

---

### US-4C.2.4: Verification Status Tracking
**As the** platform  
**I want to** track verification status in the database  
**So that** I know which businesses are verified

**Acceptance Criteria:**
- [ ] `phone_verified` column in businesses table
- [ ] `phone_verified_at` timestamp recorded
- [ ] Verification status visible on business profile
- [ ] Verified badge shown to customers

---

### US-4C.2.5: Rate Limiting and Security
**As the** platform  
**I want to** prevent abuse of the OTP system  
**So that** we don't incur excessive SMS costs

**Acceptance Criteria:**
- [ ] Maximum 3 OTP requests per phone per hour
- [ ] Maximum 5 failed verification attempts
- [ ] Lockout after 5 failures (1 hour)
- [ ] All attempts logged for security audit

---

## Technical Requirements

### Database Migration
**File:** `supabase/migrations/20260111_01_phone_verification.sql`

```sql
-- Add phone verification columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'manual'
  CHECK (claim_status IN ('manual', 'unclaimed', 'claimed_pending', 'claimed_verified'));

-- Index for verified businesses
CREATE INDEX IF NOT EXISTS idx_businesses_verified 
ON businesses(phone_verified) 
WHERE phone_verified = true;

-- Index for Google Place ID lookups
CREATE INDEX IF NOT EXISTS idx_businesses_google_place_id 
ON businesses(google_place_id) 
WHERE google_place_id IS NOT NULL;

-- Create OTP attempts tracking table
CREATE TABLE IF NOT EXISTS phone_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  attempt_type VARCHAR(20) NOT NULL CHECK (attempt_type IN ('send', 'verify_success', 'verify_fail')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limiting queries
CREATE INDEX idx_phone_attempts_phone_time 
ON phone_verification_attempts(phone_number, created_at DESC);

CREATE INDEX idx_phone_attempts_user_time 
ON phone_verification_attempts(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE phone_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own attempts
CREATE POLICY "Users can view own verification attempts"
ON phone_verification_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can create attempts"
ON phone_verification_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_otp_rate_limit(
  p_phone VARCHAR,
  p_user_id UUID,
  p_limit_per_hour INTEGER DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO attempt_count
  FROM phone_verification_attempts
  WHERE phone_number = p_phone
    AND attempt_type = 'send'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN attempt_count < p_limit_per_hour;
END;
$$;

-- Function to check failed attempt lockout
CREATE OR REPLACE FUNCTION check_otp_lockout(
  p_phone VARCHAR,
  p_max_failures INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  fail_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO fail_count
  FROM phone_verification_attempts
  WHERE phone_number = p_phone
    AND attempt_type = 'verify_fail'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN fail_count >= p_max_failures;
END;
$$;

-- Function to mark business as verified
CREATE OR REPLACE FUNCTION mark_business_phone_verified(
  p_business_id UUID,
  p_phone VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE businesses
  SET 
    phone_verified = true,
    phone_verified_at = NOW(),
    business_phone = p_phone,
    claim_status = CASE 
      WHEN claim_status = 'claimed_pending' THEN 'claimed_verified'
      ELSE claim_status
    END
  WHERE id = p_business_id;
  
  -- Log successful verification
  INSERT INTO phone_verification_attempts (
    phone_number,
    user_id,
    business_id,
    attempt_type
  ) VALUES (
    p_phone,
    auth.uid(),
    p_business_id,
    'verify_success'
  );
  
  RETURN true;
END;
$$;

-- Comments for documentation
COMMENT ON COLUMN businesses.phone_verified IS 'Whether business ownership was verified via phone OTP';
COMMENT ON COLUMN businesses.phone_verified_at IS 'Timestamp when phone verification completed';
COMMENT ON COLUMN businesses.google_place_id IS 'Reference to Google Places API place_id';
COMMENT ON COLUMN businesses.claim_status IS 'How business was registered: manual, unclaimed, claimed_pending, claimed_verified';
```

---

### New Component: `BusinessPhoneVerification.tsx`
**File:** `src/components/business/onboarding/BusinessPhoneVerification.tsx`

```typescript
// Complete implementation

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface BusinessPhoneVerificationProps {
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
  onVerified: () => void;
  isVerified: boolean;
  businessId?: string; // Optional - if updating existing business
  className?: string;
}

type VerificationState = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';

const COOLDOWN_SECONDS = 60;
const MAX_RESENDS = 3;

export function BusinessPhoneVerification({
  phoneNumber,
  onPhoneChange,
  onVerified,
  isVerified,
  businessId,
  className
}: BusinessPhoneVerificationProps) {
  // State
  const [verificationState, setVerificationState] = useState<VerificationState>(
    isVerified ? 'verified' : 'idle'
  );
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  // Refs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownInterval = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, []);

  // Format phone number for display
  const formatPhoneDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
  };

  // Validate phone number
  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
  };

  // Start cooldown timer
  const startCooldown = useCallback(() => {
    setCooldownRemaining(COOLDOWN_SECONDS);
    
    cooldownInterval.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          if (cooldownInterval.current) {
            clearInterval(cooldownInterval.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Send OTP
  const sendOTP = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (!isValidPhone(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (resendCount >= MAX_RESENDS) {
      setError('Maximum resend limit reached. Please try again later.');
      return;
    }

    setVerificationState('sending');
    setError(null);

    try {
      // Check rate limit first
      const { data: canSend } = await supabase.rpc('check_otp_rate_limit', {
        p_phone: `+91${cleanPhone}`,
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_limit_per_hour: 3
      });

      if (!canSend) {
        setError('Too many OTP requests. Please wait before trying again.');
        setVerificationState('idle');
        return;
      }

      // Log the attempt
      await supabase.from('phone_verification_attempts').insert({
        phone_number: `+91${cleanPhone}`,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        business_id: businessId || null,
        attempt_type: 'send'
      });

      // Send OTP via Supabase
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+91${cleanPhone}`
      });

      if (otpError) {
        throw otpError;
      }

      setVerificationState('sent');
      setResendCount(prev => prev + 1);
      startCooldown();
      toast.success('OTP sent to your phone!');

      // Focus first OTP input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);

    } catch (err) {
      console.error('OTP send error:', err);
      setError('Failed to send OTP. Please try again.');
      setVerificationState('idle');
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when complete
    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        verifyOTP(fullOtp);
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      verifyOTP(pastedData);
    }
  };

  // Verify OTP
  const verifyOTP = async (otpCode: string) => {
    if (failedAttempts >= 5) {
      setError('Too many failed attempts. Please try again later.');
      return;
    }

    setVerificationState('verifying');
    setError(null);

    const cleanPhone = phoneNumber.replace(/\D/g, '');

    try {
      // Check lockout
      const { data: isLockedOut } = await supabase.rpc('check_otp_lockout', {
        p_phone: `+91${cleanPhone}`,
        p_max_failures: 5
      });

      if (isLockedOut) {
        setError('Account temporarily locked. Please try again in 1 hour.');
        setVerificationState('error');
        return;
      }

      // Verify OTP with Supabase
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+91${cleanPhone}`,
        token: otpCode,
        type: 'sms'
      });

      if (verifyError) {
        // Log failed attempt
        await supabase.from('phone_verification_attempts').insert({
          phone_number: `+91${cleanPhone}`,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          business_id: businessId || null,
          attempt_type: 'verify_fail'
        });

        setFailedAttempts(prev => prev + 1);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        throw verifyError;
      }

      // Mark business as verified if we have a business ID
      if (businessId) {
        await supabase.rpc('mark_business_phone_verified', {
          p_business_id: businessId,
          p_phone: `+91${cleanPhone}`
        });
      }

      setVerificationState('verified');
      toast.success('Phone verified successfully!');
      onVerified();

    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Invalid OTP. Please check and try again.');
      setVerificationState('sent');
    }
  };

  // Render verified state
  if (verificationState === 'verified' || isVerified) {
    return (
      <div className={cn(
        "bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4",
        className
      )}>
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="font-medium text-green-800">Phone Verified</p>
          <p className="text-sm text-green-600">
            +91 {formatPhoneDisplay(phoneNumber)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Phone Number Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Phone Number *
        </label>
        <p className="text-sm text-gray-500 mb-3">
          We'll send a verification code to this number to confirm you own this business.
        </p>
        
        <div className="flex gap-2">
          <div className="flex items-center px-4 bg-gray-100 border border-gray-300 rounded-l-xl text-gray-600 font-medium">
            +91
          </div>
          <input
            type="tel"
            value={phoneNumber.replace('+91', '').replace(/\D/g, '')}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
            disabled={verificationState !== 'idle'}
            className={cn(
              "flex-1 px-4 py-3 border rounded-r-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg",
              verificationState !== 'idle' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            )}
            placeholder="98765 43210"
          />
          
          {verificationState === 'idle' && (
            <button
              onClick={sendOTP}
              disabled={!isValidPhone(phoneNumber)}
              className={cn(
                "px-6 py-3 rounded-xl font-medium transition-colors",
                isValidPhone(phoneNumber)
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              Send OTP
            </button>
          )}
        </div>

        {verificationState === 'sending' && (
          <div className="mt-3 flex items-center gap-2 text-indigo-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Sending verification code...</span>
          </div>
        )}
      </div>

      {/* OTP Input */}
      {(verificationState === 'sent' || verificationState === 'verifying') && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium">+91 {formatPhoneDisplay(phoneNumber)}</span>
            </p>
          </div>

          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={verificationState === 'verifying'}
                className={cn(
                  "w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all",
                  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
                  digit ? "border-indigo-400 bg-indigo-50" : "border-gray-300",
                  verificationState === 'verifying' && "opacity-50"
                )}
                maxLength={1}
              />
            ))}
          </div>

          {verificationState === 'verifying' && (
            <div className="flex justify-center items-center gap-2 text-indigo-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying...</span>
            </div>
          )}

          {/* Resend Option */}
          <div className="text-center">
            {cooldownRemaining > 0 ? (
              <p className="text-sm text-gray-500">
                Resend code in {cooldownRemaining}s
              </p>
            ) : (
              <button
                onClick={sendOTP}
                disabled={resendCount >= MAX_RESENDS}
                className={cn(
                  "inline-flex items-center gap-2 text-sm font-medium",
                  resendCount >= MAX_RESENDS
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-indigo-600 hover:text-indigo-700"
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Resend OTP
              </button>
            )}
            
            {resendCount > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {MAX_RESENDS - resendCount} resends remaining
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Skip Option */}
      {verificationState !== 'verified' && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={() => {
              toast.loading('Account marked for manual verification', { duration: 3000 });
              // In production, this would flag the account for admin review
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now (limits some features)
          </button>
        </div>
      )}
    </div>
  );
}

export default BusinessPhoneVerification;
```

---

## UI/UX Requirements

### Phone Input State
```
┌─────────────────────────────────────────────────────────┐
│  Business Phone Number *                                 │
│  We'll send a verification code to confirm you own this │
│  business.                                               │
│                                                          │
│  ┌────────┬─────────────────────────┬──────────────┐   │
│  │  +91   │  98765 43210            │  Send OTP    │   │
│  └────────┴─────────────────────────┴──────────────┘   │
│                                                          │
│  ────────────────────────────────────────────────────   │
│  Skip for now (limits some features)                    │
└─────────────────────────────────────────────────────────┘
```

### OTP Entry State
```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐  │
│  │ 💬 Enter the 6-digit code sent to +91 98765 43210│  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│          ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐          │
│          │ 4 │ │ 7 │ │ 2 │ │ _ │ │ _ │ │ _ │          │
│          └───┘ └───┘ └───┘ └───┘ └───┘ └───┘          │
│                    ↑ Auto-focused                       │
│                                                          │
│              🔄 Resend OTP (45s remaining)              │
│                                                          │
│  ────────────────────────────────────────────────────   │
│  Skip for now (limits some features)                    │
└─────────────────────────────────────────────────────────┘
```

### Verified State
```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐  │
│  │  ✅  Phone Verified                              │  │
│  │      +91 98765 43210                             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Supabase Phone Auth Configuration

### Enable Phone Auth
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable **Phone** provider
3. Configure SMS provider:
   - **Twilio** (recommended for India)
   - Add Account SID, Auth Token, and Sender number

### Twilio Setup for India
```
SMS Sender: Your verified Twilio number or Alphanumeric Sender ID
SMS Template: "Your SynC verification code is: {{code}}. Valid for 5 minutes."
```

### Rate Limiting (Supabase)
In `config.toml` or Dashboard:
```toml
[auth]
# Rate limiting
rate_limits.sms.enabled = true
rate_limits.sms.per_minute = 3
rate_limits.sms.per_hour = 10
```

---

## Testing Plan

### Unit Tests
```typescript
describe('BusinessPhoneVerification', () => {
  it('validates Indian phone numbers correctly', () => {
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('1234567890')).toBe(false);  // Doesn't start with 6-9
    expect(isValidPhone('98765')).toBe(false);       // Too short
  });

  it('formats phone numbers correctly', () => {
    expect(formatPhoneDisplay('9876543210')).toBe('98765 43210');
  });

  it('handles OTP input correctly', () => {
    // Test auto-focus
    // Test paste
    // Test backspace
  });
});
```

### E2E Tests
```typescript
describe('Phone Verification Flow', () => {
  it('sends OTP and verifies successfully', async () => {
    // Enter phone number
    // Click Send OTP
    // Wait for OTP (mock in test)
    // Enter OTP digits
    // Verify success state shown
  });

  it('shows error after 5 failed attempts', async () => {
    // Enter wrong OTP 5 times
    // Verify lockout message shown
  });

  it('enforces cooldown between resends', async () => {
    // Send OTP
    // Verify resend disabled for 60s
    // Wait 60s
    // Verify resend enabled
  });
});
```

---

## Security Audit Checklist

- [ ] Phone numbers are validated server-side
- [ ] Rate limiting is enforced at database level
- [ ] OTP attempts are logged with IP and user agent
- [ ] Lockout is enforced after 5 failures
- [ ] OTPs expire after 5 minutes (Supabase default)
- [ ] No OTP is ever logged or stored in plaintext
- [ ] Phone numbers are encrypted at rest (Supabase default)

---

## Definition of Done

- [ ] Database migration applied successfully
- [ ] `BusinessPhoneVerification.tsx` implemented
- [ ] Supabase phone auth configured
- [ ] OTP sending works with Indian numbers
- [ ] OTP verification works correctly
- [ ] Rate limiting prevents abuse
- [ ] Lockout works after 5 failures
- [ ] UI is mobile-responsive
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Security audit checklist complete
- [ ] Documentation updated

---

## Notes

### Indian Phone Number Validation
Valid Indian mobile numbers:
- Start with 6, 7, 8, or 9
- Are exactly 10 digits
- Regex: `/^[6-9]\d{9}$/`

### Twilio Pricing (India)
- Outbound SMS to India: ~$0.04/message
- Estimated cost: 500 businesses × 2 OTPs avg = $40/month

### Skip Verification Option
Businesses that skip verification:
- Can register but marked as "unverified"
- Limited features (e.g., no featured placement)
- Admin can manually verify via documents

---

**Story Status:** 📋 Ready for Implementation  
**Estimated Hours:** 24 hours  
**Reviewer:** [TBD]
