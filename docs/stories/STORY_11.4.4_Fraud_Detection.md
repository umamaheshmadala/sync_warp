# Story 11.4.4: Fraud Detection (Velocity, IP, Device)

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 3 days  
**Dependencies:** Story 11.4.1 (Pre-Moderation System)  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement fraud detection mechanisms to identify potentially fake or manipulated reviews. This includes monitoring review velocity (how fast a user submits reviews), IP address tracking (multiple accounts from same IP), and device fingerprinting (detecting patterns across devices).

---

## Problem Statement

### Current State
- No detection of suspicious review patterns
- Users can submit many reviews in short time
- No tracking of IP addresses or devices
- Fake review rings can operate undetected

### Desired State
- Velocity monitoring flags rapid submissions
- IP tracking detects multi-account abuse
- Device fingerprinting identifies device patterns
- Fraud signals visible to admins in moderation queue
- Automatic prioritization of flagged reviews

---

## User Stories

### US-11.4.4.1: Review Velocity Monitoring
**As a** platform  
**I want to** detect users submitting reviews too quickly  
**So that** potential spam/fake review campaigns are flagged

**Acceptance Criteria:**
- [ ] Track time between user's reviews
- [ ] Flag if >3 reviews in 1 hour
- [ ] Flag if >10 reviews in 24 hours
- [ ] Velocity signal stored in fraud_signals table
- [ ] Flagged reviews get higher priority in moderation queue
- [ ] Configurable thresholds via platform settings

---

### US-11.4.4.2: IP Address Tracking
**As a** platform  
**I want to** track IP addresses of review submissions  
**So that** I can detect multiple accounts from same location

**Acceptance Criteria:**
- [ ] Store IP address with each review submission
- [ ] Flag if >3 different users submit from same IP in 24 hours
- [ ] IP signal stored in fraud_signals table
- [ ] Show IP match indicator in admin queue
- [ ] Privacy: IP stored securely, not visible to public
- [ ] IP hashed after 30 days for privacy compliance

---

### US-11.4.4.3: Device Fingerprinting
**As a** platform  
**I want to** identify device patterns across submissions  
**So that** I can detect coordinated fake reviews

**Acceptance Criteria:**
- [ ] Generate device fingerprint (browser, screen, plugins)
- [ ] Store fingerprint hash with each review
- [ ] Flag if same fingerprint across multiple accounts
- [ ] Fingerprint signal stored in fraud_signals table
- [ ] Privacy-compliant: No personally identifiable data

---

### US-11.4.4.4: Fraud Signal Dashboard
**As an** admin  
**I want to** see fraud signals alongside reviews  
**So that** I can make informed moderation decisions

**Acceptance Criteria:**
- [ ] Fraud score displayed on each review in queue
- [ ] Clickable to see breakdown of signals
- [ ] Signals: Velocity, IP Match, Device Match, New Account
- [ ] High-fraud reviews float to top of queue
- [ ] Filter queue by "High Fraud Risk"

---

### US-11.4.4.5: New Account Detection
**As a** platform  
**I want to** flag reviews from brand new accounts  
**So that** potential sockpuppet accounts are scrutinized

**Acceptance Criteria:**
- [ ] Flag if account <24 hours old when reviewing
- [ ] Flag if account has no other activity (follows, check-ins)
- [ ] Signal visible to admin
- [ ] Not blocking—just flagged for review

---

## Technical Requirements

### Database Schema

**File:** `supabase/migrations/YYYYMMDD_add_fraud_detection.sql`

```sql
-- ============================================
-- MIGRATION: Fraud Detection System
-- Story: 11.4.4
-- ============================================

-- Step 1: Create fraud signals table
CREATE TABLE IF NOT EXISTS review_fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'velocity_high', 
    'ip_match', 
    'device_match', 
    'new_account',
    'multiple_same_business'
  )),
  signal_value JSONB,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_review 
ON review_fraud_signals(review_id);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_type 
ON review_fraud_signals(signal_type);

-- Step 2: Add IP tracking to reviews
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS submission_ip_hash TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint_hash TEXT,
ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0;

-- Step 3: Create IP tracking table (temporary storage)
CREATE TABLE IF NOT EXISTS review_ip_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_id UUID REFERENCES business_reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_tracking_hash 
ON review_ip_tracking(ip_hash);

CREATE INDEX IF NOT EXISTS idx_ip_tracking_date 
ON review_ip_tracking(created_at);

-- Step 4: Function to calculate fraud score
CREATE OR REPLACE FUNCTION calculate_review_fraud_score(p_review_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  signal RECORD;
BEGIN
  FOR signal IN 
    SELECT signal_type, severity FROM review_fraud_signals 
    WHERE review_id = p_review_id
  LOOP
    CASE signal.severity
      WHEN 'high' THEN score := score + 30;
      WHEN 'medium' THEN score := score + 15;
      WHEN 'low' THEN score := score + 5;
    END CASE;
  END LOOP;
  
  -- Cap at 100
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Trigger to update fraud score
CREATE OR REPLACE FUNCTION update_review_fraud_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE business_reviews 
  SET fraud_score = calculate_review_fraud_score(NEW.review_id)
  WHERE id = NEW.review_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fraud_score ON review_fraud_signals;
CREATE TRIGGER trigger_update_fraud_score
AFTER INSERT ON review_fraud_signals
FOR EACH ROW
EXECUTE FUNCTION update_review_fraud_score();

-- Step 6: RLS policies
ALTER TABLE review_fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_ip_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fraud signals" ON review_fraud_signals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert fraud signals" ON review_fraud_signals
  FOR INSERT WITH CHECK (true);

-- Step 7: Cleanup old IP data (privacy)
CREATE OR REPLACE FUNCTION cleanup_old_ip_data()
RETURNS void AS $$
BEGIN
  DELETE FROM review_ip_tracking 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  UPDATE business_reviews 
  SET submission_ip_hash = NULL 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup daily (requires pg_cron or external scheduler)
```

---

### Fraud Detection Service

**File:** `src/services/fraudDetectionService.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { hash } from '@/lib/crypto';

export interface FraudSignal {
  type: 'velocity_high' | 'ip_match' | 'device_match' | 'new_account' | 'multiple_same_business';
  value: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

// Configurable thresholds
const VELOCITY_THRESHOLD_HOURLY = 3;
const VELOCITY_THRESHOLD_DAILY = 10;
const IP_MATCH_THRESHOLD = 3;

/**
 * Run all fraud checks on a new review
 */
export async function runFraudChecks(
  reviewId: string,
  userId: string,
  businessId: string,
  ipAddress: string,
  deviceFingerprint: string
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];
  
  // Hash IP and fingerprint for privacy
  const ipHash = await hash(ipAddress);
  const fingerprintHash = await hash(deviceFingerprint);
  
  // Store hashes with review
  await supabase
    .from('business_reviews')
    .update({
      submission_ip_hash: ipHash,
      device_fingerprint_hash: fingerprintHash
    })
    .eq('id', reviewId);
  
  // Track IP
  await supabase.from('review_ip_tracking').insert({
    ip_hash: ipHash,
    user_id: userId,
    review_id: reviewId
  });
  
  // Check 1: Velocity
  const velocitySignal = await checkVelocity(userId);
  if (velocitySignal) signals.push(velocitySignal);
  
  // Check 2: IP Match
  const ipSignal = await checkIPMatch(ipHash, userId);
  if (ipSignal) signals.push(ipSignal);
  
  // Check 3: Device Match
  const deviceSignal = await checkDeviceMatch(fingerprintHash, userId);
  if (deviceSignal) signals.push(deviceSignal);
  
  // Check 4: New Account
  const accountSignal = await checkNewAccount(userId);
  if (accountSignal) signals.push(accountSignal);
  
  // Check 5: Multiple reviews same business
  const dupeSignal = await checkDuplicateBusinessReviews(userId, businessId);
  if (dupeSignal) signals.push(dupeSignal);
  
  // Store signals
  if (signals.length > 0) {
    await supabase.from('review_fraud_signals').insert(
      signals.map(signal => ({
        review_id: reviewId,
        signal_type: signal.type,
        signal_value: signal.value,
        severity: signal.severity
      }))
    );
  }
  
  return signals;
}

/**
 * Check review velocity (reviews per hour/day)
 */
async function checkVelocity(userId: string): Promise<FraudSignal | null> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Count reviews in last hour
  const { count: hourlyCount } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', hourAgo);
  
  if ((hourlyCount || 0) >= VELOCITY_THRESHOLD_HOURLY) {
    return {
      type: 'velocity_high',
      value: { period: 'hourly', count: hourlyCount, threshold: VELOCITY_THRESHOLD_HOURLY },
      severity: 'high'
    };
  }
  
  // Count reviews in last 24 hours
  const { count: dailyCount } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', dayAgo);
  
  if ((dailyCount || 0) >= VELOCITY_THRESHOLD_DAILY) {
    return {
      type: 'velocity_high',
      value: { period: 'daily', count: dailyCount, threshold: VELOCITY_THRESHOLD_DAILY },
      severity: 'medium'
    };
  }
  
  return null;
}

/**
 * Check if multiple users reviewed from same IP
 */
async function checkIPMatch(ipHash: string, userId: string): Promise<FraudSignal | null> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('review_ip_tracking')
    .select('user_id')
    .eq('ip_hash', ipHash)
    .neq('user_id', userId)
    .gte('created_at', dayAgo);
  
  const uniqueUsers = new Set(data?.map(d => d.user_id) || []);
  
  if (uniqueUsers.size >= IP_MATCH_THRESHOLD) {
    return {
      type: 'ip_match',
      value: { matchingUsers: uniqueUsers.size, threshold: IP_MATCH_THRESHOLD },
      severity: 'high'
    };
  }
  
  return null;
}

/**
 * Check if same device fingerprint used by different users
 */
async function checkDeviceMatch(fingerprintHash: string, userId: string): Promise<FraudSignal | null> {
  const { data } = await supabase
    .from('business_reviews')
    .select('user_id')
    .eq('device_fingerprint_hash', fingerprintHash)
    .neq('user_id', userId);
  
  const uniqueUsers = new Set(data?.map(d => d.user_id) || []);
  
  if (uniqueUsers.size >= 2) {
    return {
      type: 'device_match',
      value: { matchingUsers: uniqueUsers.size },
      severity: 'medium'
    };
  }
  
  return null;
}

/**
 * Check if account is very new
 */
async function checkNewAccount(userId: string): Promise<FraudSignal | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single();
  
  if (!profile) return null;
  
  const accountAge = Date.now() - new Date(profile.created_at).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  if (accountAge < oneDayMs) {
    return {
      type: 'new_account',
      value: { ageHours: Math.floor(accountAge / (60 * 60 * 1000)) },
      severity: 'low'
    };
  }
  
  return null;
}

/**
 * Check for multiple reviews on same business (even if deleted)
 */
async function checkDuplicateBusinessReviews(userId: string, businessId: string): Promise<FraudSignal | null> {
  const { count } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('business_id', businessId);
  
  if ((count || 0) > 1) {
    return {
      type: 'multiple_same_business',
      value: { count },
      severity: 'high'
    };
  }
  
  return null;
}

/**
 * Get fraud signals for a review (admin only)
 */
export async function getReviewFraudSignals(reviewId: string): Promise<FraudSignal[]> {
  const { data, error } = await supabase
    .from('review_fraud_signals')
    .select('*')
    .eq('review_id', reviewId);
  
  if (error) throw error;
  
  return data?.map(s => ({
    type: s.signal_type,
    value: s.signal_value,
    severity: s.severity
  })) || [];
}
```

---

### Device Fingerprint Utility

**File:** `src/lib/fingerprint.ts`

```typescript
/**
 * Generate a privacy-respectful device fingerprint
 * Uses browser characteristics that don't uniquely identify users
 * but can detect patterns across accounts
 */
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!navigator.cookieEnabled,
    navigator.hardwareConcurrency || 'unknown'
  ];
  
  return components.join('|');
}
```

---

### Integration with Review Submission

**File:** `src/services/reviewService.ts` (additions)

```typescript
import { runFraudChecks } from './fraudDetectionService';
import { generateDeviceFingerprint } from '@/lib/fingerprint';

export async function submitReview(data: ReviewSubmission): Promise<Review> {
  // ... existing validation and insertion ...
  
  // Run fraud checks after review is created
  const ipAddress = await getClientIP(); // Helper to get IP
  const fingerprint = generateDeviceFingerprint();
  
  await runFraudChecks(
    review.id,
    user.id,
    data.business_id,
    ipAddress,
    fingerprint
  );
  
  return review;
}

async function getClientIP(): Promise<string> {
  // In production, this would come from server/edge function
  // For client-side, use a service or pass from API
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}
```

---

## Testing Plan

### Unit Tests

```typescript
describe('Fraud Detection', () => {
  describe('checkVelocity', () => {
    it('flags user with 3+ reviews in 1 hour', async () => {
      // Create 3 reviews in quick succession
      const signal = await checkVelocity('high-velocity-user');
      expect(signal?.type).toBe('velocity_high');
      expect(signal?.severity).toBe('high');
    });
  });
  
  describe('checkIPMatch', () => {
    it('flags when 3+ users share same IP', async () => {
      const signal = await checkIPMatch('shared-ip-hash', 'user-3');
      expect(signal?.type).toBe('ip_match');
    });
  });
  
  describe('checkNewAccount', () => {
    it('flags accounts less than 24 hours old', async () => {
      const signal = await checkNewAccount('new-user');
      expect(signal?.type).toBe('new_account');
    });
  });
});
```

### Manual Testing Checklist

- [ ] Submit multiple reviews quickly → Velocity flag appears
- [ ] Use same browser/device for different accounts → Device match flag
- [ ] New account submits review → New account flag
- [ ] Fraud score visible in admin queue
- [ ] High fraud score reviews appear at top
- [ ] Click fraud score → See breakdown of signals
- [ ] IP data cleaned up after 30 days

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_fraud_detection.sql` | CREATE | Tables, triggers, functions |
| `src/services/fraudDetectionService.ts` | CREATE | Fraud check logic |
| `src/lib/fingerprint.ts` | CREATE | Device fingerprint utility |
| `src/services/reviewService.ts` | MODIFY | Integrate fraud checks |
| `src/components/admin/FraudSignalBadge.tsx` | CREATE | Display fraud signals |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check for existing rate limiting patterns
- [ ] Review existing hashing utilities
- [ ] Look for fingerprinting libraries in package.json
- [ ] Check how IP addresses are captured
- [ ] Document findings in the implementation plan

### 2. Database Migration Execution
- [ ] Use **Supabase MCP tools** to execute SQL migrations when possible
- [ ] Use `mcp_supabase-mcp-server_execute_sql` for running scripts
- [ ] Only request manual SQL execution if MCP lacks required privileges
- [ ] Verify migration success with follow-up queries

### 3. Acceptance Criteria Verification
After implementation is complete:
- [ ] Go through EACH acceptance criterion one by one
- [ ] Mark each criterion as verified with evidence (screenshot, test result, or code reference)
- [ ] Document any deviations or edge cases discovered
- [ ] Get sign-off before proceeding to user testing

### 4. User Testing Plan
Once acceptance criteria are verified, execute this testing flow:

**Test Route 1: Velocity Detection**
1. Login as test user
2. Submit 3+ reviews in 1 hour
3. Verify fraud signal created
4. Check review flagged in admin queue

**Test Route 2: New Account Detection**
1. Create new account (<24hrs old)
2. Submit a review
3. Verify "new_account" signal created
4. Visible to admin in moderation

**Test Route 3: Admin View**
1. Login as admin
2. Open flagged review
3. Verify fraud score visible
4. Click to see signal breakdown

---

## Definition of Done

- [ ] Velocity monitoring detecting rapid submissions
- [ ] IP tracking identifying multi-account patterns
- [ ] Device fingerprinting working
- [ ] Fraud signals stored in database
- [ ] Fraud score calculated and displayed
- [ ] High-fraud reviews prioritized in queue
- [ ] Privacy-compliant (hashing, cleanup)
- [ ] All tests passing
- [ ] Code reviewed and approved

---

## Privacy Considerations

- IP addresses are hashed immediately, never stored raw
- IP hashes deleted after 30 days
- Device fingerprints use non-identifying characteristics
- No tracking of users across sites
- Signals only visible to admins

---

**Story Owner:** Backend Engineering  
**Reviewer:** [TBD]
