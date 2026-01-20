# Story 11.1.2: Re-enable GPS Check-in Verification

**Epic:** [EPIC 11.1 - Reviews Core Fixes](../epics/EPIC_11.1_Reviews_Core_Fixes.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 1 day  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Re-enable the GPS check-in verification that was temporarily bypassed for desktop testing. This verification ensures that only users who have physically visited a business can submit reviews, which is fundamental to SynC's trust model.

---

## Problem Statement

### Current State
- GPS verification code exists in `reviewService.ts` (lines 70-86)
- Code is **COMMENTED OUT** with note: "TEMP: Check-in verification bypassed for desktop testing"
- Console logs show: `⚠️  [Testing Mode] Check-in verification bypassed`
- **Any user can submit reviews without visiting the business**

### Impact
- Fake reviews can be submitted from anywhere
- Undermines platform trust and authenticity
- Makes GPS check-in feature meaningless
- Business owners may receive fraudulent negative reviews

### Code Location
```typescript
// reviewService.ts lines 70-86 - CURRENTLY BYPASSED:
// TEMP: Check-in verification bypassed for desktop testing
console.log('⚠️  [Testing Mode] Check-in verification bypassed');
// TODO: Re-enable before production
```

---

## User Stories

### US-11.1.2.1: GPS Verification Enforcement
**As a** platform  
**I want to** require GPS-verified check-ins before reviews  
**So that** only genuine visitors can submit reviews

**Acceptance Criteria:**
- [ ] GPS verification code is re-enabled (bypass removed)
- [ ] Review submission checks for valid check-in record
- [ ] Check-in must have `verified = true` in database
- [ ] No time limit on check-in (permanent eligibility per user decision)
- [ ] Appropriate error shown if no valid check-in exists

---

### US-11.1.2.2: Graceful GPS Failure Handling
**As a** user attempting to check in  
**I want to** receive clear feedback if GPS fails  
**So that** I understand why I cannot submit a review

**Acceptance Criteria:**
- [ ] GPS unavailable: Show "Location services required" message
- [ ] GPS denied: Show "Please enable location permissions" message
- [ ] GPS timeout: Show "Couldn't determine location. Please try again."
- [ ] GPS too inaccurate: Show "Please move to a better location for GPS signal"
- [ ] Offer manual option: "Contact support if you're having trouble"

---

### US-11.1.2.3: Check-in Radius Verification
**As a** platform  
**I want to** verify users are within acceptable distance of business  
**So that** check-ins are authentic

**Acceptance Criteria:**
- [ ] User must be within 100 meters of business location (configurable)
- [ ] GPS accuracy must be better than 50 meters
- [ ] Business location is derived from `businesses.location` field
- [ ] Distance calculation uses Haversine formula
- [ ] Log verification result for fraud detection

---

### US-11.1.2.4: Check-in Creates Permanent Review Eligibility
**As a** user who has checked in  
**I want to** retain review eligibility forever  
**So that** I can write my review when convenient

**Acceptance Criteria:**
- [ ] Once checked in, eligibility never expires
- [ ] User can write review days/weeks/months later
- [ ] Check-in record preserved in `business_checkins` table
- [ ] Multiple check-ins at same business are recorded separately
- [ ] Only most recent check-in needed for eligibility

---

## Technical Requirements

### Remove GPS Bypass

#### Update `reviewService.ts`
**Location:** `src/services/reviewService.ts`

**BEFORE (Current - Remove this):**
```typescript
// Lines 70-86 - Currently bypassed
export async function submitReview(data: ReviewSubmission): Promise<Review> {
  // TEMP: Check-in verification bypassed for desktop testing
  console.log('⚠️  [Testing Mode] Check-in verification bypassed');
  
  // Skip check-in verification for testing
  // const hasValidCheckIn = await verifyCheckIn(data.businessId);
  // if (!hasValidCheckIn) {
  //   throw new Error('You must check in at this business before leaving a review');
  // }
  
  // ... rest of function
}
```

**AFTER (Corrected):**
```typescript
export async function submitReview(data: ReviewSubmission): Promise<Review> {
  // STEP 1: Verify user has a valid check-in for this business
  const hasValidCheckIn = await verifyUserCheckIn(data.businessId);
  
  if (!hasValidCheckIn) {
    throw new ReviewValidationError(
      'CHECKIN_REQUIRED',
      'You must check in at this business before leaving a review. ' +
      'Please visit the business and check in using your GPS location.'
    );
  }
  
  // STEP 2: Proceed with review submission
  // ... rest of existing function
}
```

---

### Implement Check-in Verification

#### Add Verification Function
**Location:** `src/services/reviewService.ts`

```typescript
/**
 * Verify that the current user has a valid GPS check-in for the specified business.
 * A valid check-in:
 * - Exists for this user + business combination
 * - Has verified = true (GPS validation passed)
 * - Has no expiry (permanent eligibility per design decision)
 */
export async function verifyUserCheckIn(businessId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('[ReviewService] No authenticated user');
    return false;
  }
  
  const { data: checkIn, error } = await supabase
    .from('business_checkins')
    .select('id, verified, created_at')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('verified', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('[ReviewService] Check-in verification error:', error);
    return false;
  }
  
  if (!checkIn) {
    console.log(`[ReviewService] No valid check-in found for user ${user.id} at business ${businessId}`);
    return false;
  }
  
  console.log(`[ReviewService] Valid check-in found: ${checkIn.id} from ${checkIn.created_at}`);
  return true;
}
```

---

### GPS Check-in Service Update

#### Update `checkInService.ts` (if exists) or add to `reviewService.ts`
**Location:** `src/services/checkInService.ts`

```typescript
import { supabase } from '@/lib/supabase';

// Configuration
const CHECK_IN_RADIUS_METERS = 100; // Max distance from business
const MIN_GPS_ACCURACY_METERS = 50;  // Required GPS accuracy

export interface CheckInResult {
  success: boolean;
  error?: string;
  errorCode?: 'GPS_UNAVAILABLE' | 'GPS_DENIED' | 'GPS_TIMEOUT' | 'GPS_INACCURATE' | 'TOO_FAR' | 'UNKNOWN';
  checkInId?: string;
  distanceMeters?: number;
}

export interface BusinessLocation {
  latitude: number;
  longitude: number;
}

/**
 * Attempt to check in at a business using GPS
 */
export async function performCheckIn(
  businessId: string,
  businessLocation: BusinessLocation
): Promise<CheckInResult> {
  try {
    // Get current GPS position
    const position = await getCurrentPosition();
    
    if (!position) {
      return { success: false, error: 'Could not determine your location', errorCode: 'GPS_UNAVAILABLE' };
    }
    
    // Check GPS accuracy
    if (position.coords.accuracy > MIN_GPS_ACCURACY_METERS) {
      return { 
        success: false, 
        error: `GPS accuracy is too low (${Math.round(position.coords.accuracy)}m). Please move to a location with better signal.`,
        errorCode: 'GPS_INACCURATE'
      };
    }
    
    // Calculate distance to business
    const distanceMeters = calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      businessLocation.latitude,
      businessLocation.longitude
    );
    
    // Check if within radius
    if (distanceMeters > CHECK_IN_RADIUS_METERS) {
      return { 
        success: false, 
        error: `You are ${Math.round(distanceMeters)}m away from this business. Please get closer to check in.`,
        errorCode: 'TOO_FAR',
        distanceMeters
      };
    }
    
    // Record check-in in database
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Please log in to check in', errorCode: 'UNKNOWN' };
    }
    
    const { data: checkIn, error } = await supabase
      .from('business_checkins')
      .insert({
        business_id: businessId,
        user_id: user.id,
        verified: true,
        location: `POINT(${position.coords.longitude} ${position.coords.latitude})`,
        accuracy_meters: position.coords.accuracy,
        distance_meters: distanceMeters,
        device_info: navigator.userAgent.substring(0, 255)
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[CheckIn] Database error:', error);
      return { success: false, error: 'Could not save check-in. Please try again.', errorCode: 'UNKNOWN' };
    }
    
    return { 
      success: true, 
      checkInId: checkIn.id,
      distanceMeters 
    };
    
  } catch (error) {
    console.error('[CheckIn] Unexpected error:', error);
    return { success: false, error: 'Something went wrong. Please try again.', errorCode: 'UNKNOWN' };
  }
}

/**
 * Get current GPS position with promise wrapper
 */
async function getCurrentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        console.error('[GPS] Error:', error.code, error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Accept 1-minute old position
      }
    );
  });
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
```

---

### Database Schema (Verify Exists)

```sql
-- Ensure business_checkins table has all required columns
ALTER TABLE business_checkins
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT),
ADD COLUMN IF NOT EXISTS accuracy_meters FLOAT,
ADD COLUMN IF NOT EXISTS distance_meters FLOAT,
ADD COLUMN IF NOT EXISTS device_info TEXT;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_checkins_user_business_verified 
ON business_checkins(user_id, business_id) 
WHERE verified = true;
```

---

### Custom Error Class

```typescript
// src/errors/ReviewValidationError.ts

export class ReviewValidationError extends Error {
  public code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ReviewValidationError';
    this.code = code;
  }
}

// Error codes
export const REVIEW_ERROR_CODES = {
  CHECKIN_REQUIRED: 'CHECKIN_REQUIRED',
  ALREADY_REVIEWED: 'ALREADY_REVIEWED',
  INVALID_CONTENT: 'INVALID_CONTENT',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;
```

---

## Testing Plan

### Unit Tests
**File:** `src/services/__tests__/reviewService.test.ts`

```typescript
describe('verifyUserCheckIn', () => {
  it('returns true when user has valid check-in', async () => {
    // Mock supabase to return a verified check-in
    const result = await verifyUserCheckIn('business-123');
    expect(result).toBe(true);
  });

  it('returns false when user has no check-in', async () => {
    // Mock supabase to return no rows
    const result = await verifyUserCheckIn('business-456');
    expect(result).toBe(false);
  });

  it('returns false when check-in is not verified', async () => {
    // Mock supabase to return unverified check-in
    const result = await verifyUserCheckIn('business-789');
    expect(result).toBe(false);
  });

  it('returns false when user is not logged in', async () => {
    // Mock no auth user
    const result = await verifyUserCheckIn('business-123');
    expect(result).toBe(false);
  });
});

describe('submitReview with GPS enforcement', () => {
  it('throws error when no valid check-in exists', async () => {
    await expect(submitReview({ 
      businessId: 'no-checkin-business',
      recommendation: true,
      text: 'Great!'
    })).rejects.toThrow('You must check in at this business');
  });

  it('succeeds when valid check-in exists', async () => {
    // Mock valid check-in
    const result = await submitReview({
      businessId: 'has-checkin-business',
      recommendation: true,
      text: 'Great!'
    });
    expect(result.id).toBeDefined();
  });
});
```

### GPS Check-in Tests
```typescript
describe('performCheckIn', () => {
  it('succeeds when within radius with good accuracy', async () => {
    mockGeolocation({ lat: 12.9716, lng: 77.5946, accuracy: 20 });
    const result = await performCheckIn('business-123', { latitude: 12.9716, longitude: 77.5946 });
    expect(result.success).toBe(true);
  });

  it('fails when GPS accuracy is too low', async () => {
    mockGeolocation({ lat: 12.9716, lng: 77.5946, accuracy: 200 });
    const result = await performCheckIn('business-123', { latitude: 12.9716, longitude: 77.5946 });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('GPS_INACCURATE');
  });

  it('fails when user is too far from business', async () => {
    mockGeolocation({ lat: 12.9716, lng: 77.5946, accuracy: 20 });
    const result = await performCheckIn('business-123', { latitude: 13.0, longitude: 77.6 }); // ~5km away
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOO_FAR');
  });

  it('calculates distance correctly using Haversine', () => {
    const distance = calculateDistance(12.9716, 77.5946, 12.9726, 77.5956);
    expect(distance).toBeCloseTo(148, 0); // ~148 meters
  });
});
```

### Integration Tests
```typescript
describe('Full Check-in to Review Flow', () => {
  it('blocks review without check-in', async () => {
    // 1. Login as test user
    // 2. Navigate to business storefront
    // 3. Attempt to submit review
    // 4. Verify error: "You must check in"
  });

  it('allows review after GPS check-in', async () => {
    // 1. Login as test user
    // 2. Mock GPS location at business
    // 3. Perform check-in
    // 4. Submit review
    // 5. Verify review saved
  });
});
```

### Manual Testing Checklist
- [ ] Remove bypass code from reviewService.ts
- [ ] Test review submission WITHOUT check-in → Blocked
- [ ] Test review submission WITH valid check-in → Allowed
- [ ] Test GPS check-in on mobile (Android/iOS)
- [ ] Test GPS check-in on desktop (should work if GPS available)
- [ ] Test error messages for GPS failures
- [ ] Test distance calculation accuracy
- [ ] Verify check-in creates permanent eligibility
- [ ] Test check-in at edge of radius (99m vs 101m)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/reviewService.ts` | MODIFY | Remove bypass, add verification call |
| `src/services/checkInService.ts` | CREATE or MODIFY | Add GPS check-in functions |
| `src/errors/ReviewValidationError.ts` | CREATE | Custom error class for review validation |
| `src/services/__tests__/reviewService.test.ts` | MODIFY | Add verification tests |
| `supabase/migrations/xxx_ensure_checkin_columns.sql` | CREATE | Ensure DB columns exist |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Search for similar features in the existing codebase
- [ ] Check `src/components/reviews/` for reusable components
- [ ] Review `src/services/reviewService.ts` for existing verification patterns
- [ ] Check `src/services/checkinService.ts` for GPS/location utilities
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

**Test Route 1: Basic GPS Verification**
1. Open mobile device with GPS enabled
2. Navigate to a business storefront
3. Click "Check In" and allow location access
4. Verify check-in is recorded
5. Click "Write Review" and confirm it opens

**Test Route 2: Rejection Scenarios**
1. Try submitting review without check-in → Should be blocked
2. Try submitting review far from business → Should be blocked
3. Try using expired check-in (if applicable)

**Test Route 3: Error Handling**
1. Test with GPS disabled
2. Test with location permission denied
3. Verify error messages are user-friendly

### 5. Browser Testing & Evidence Collection

> **IMPORTANT**: All features must be browser-tested with evidence collected before confirming completion.

**Test Environment:**
- Local dev server: `http://localhost:5173`
- Do NOT start the dev server (it's already running)
- Only restart if necessary

**Test Credentials:**
| User | Email | Password |
|------|-------|----------|
| Test User 1 | testuser1@gmail.com | Testuser@1 |
| Test User 3 | testuser3@gmail.com | Testuser@1 |
| Test User 4 | testuser4@gmail.com | Testuser@1 |
| Test User 5 | testuser5@gmail.com | Testuser@1 |

**Evidence Collection Requirements:**
- [ ] **Screenshot each test step** using browser automation
- [ ] **Record browser session** for key user flows
- [ ] **Save screenshots** to artifacts folder with descriptive names
- [ ] **Document actual vs expected** behavior for each test

**Completion Criteria:**
- [ ] All browser tests pass with visual evidence
- [ ] Screenshots/recordings saved as artifacts
- [ ] Only confirm implementation complete when ALL evidence collected
- [ ] Any failing tests must be fixed before marking complete

---

## Definition of Done

- [ ] GPS bypass code completely removed from `reviewService.ts`
- [ ] `verifyUserCheckIn` function implemented and called
- [ ] Review submission blocked without valid check-in
- [ ] Appropriate error messages shown to users
- [ ] GPS check-in service working with proper error handling
- [ ] Distance calculation accurate (Haversine formula)
- [ ] Check-in creates permanent review eligibility
- [ ] All unit tests passing
- [ ] Manual testing on mobile devices complete
- [ ] No console warnings/errors
- [ ] Code reviewed and approved

---

## Security Considerations

1. **No bypass flags in production**: Ensure no environment variable can bypass GPS check
2. **Server-side validation**: All check-in verification must happen server-side (RLS or Edge Function)
3. **GPS spoofing awareness**: Be aware that GPS can be spoofed; this is accepted for MVP
4. **Logging**: Log all check-in attempts for fraud analysis (Story 11.4.4)

---

## Dependencies

- **Blocks:** Story 11.3.2 (Review Request after Check-in depends on working GPS)
- **Related:** Story 11.1.1 (Write Review button shows check-in state)
- **Related:** Story 11.4.6 (Verified GPS badge on reviews)

---

**Story Owner:** Backend Engineering  
**Reviewer:** [TBD]
