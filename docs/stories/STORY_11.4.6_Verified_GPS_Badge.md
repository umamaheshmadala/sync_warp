# Story 11.4.6: Verified GPS Badge on Reviews

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🟢 P2 - LOW  
**Effort:** 0.5 days  
**Dependencies:** Story 11.1.2 (GPS Check-in Verification)  
**Status:** 📋 Ready for Implementation

---

## Overview

Display a "Verified Visit" badge on reviews from users who checked in via GPS at the business location. This visual indicator helps consumers identify reviews from people who definitely visited the business.

---

## User Stories

### US-11.4.6.1: Display GPS Verified Badge
**As a** customer reading reviews  
**I want to** see which reviews are from verified visitors  
**So that** I can trust those reviews more

**Acceptance Criteria:**
- [ ] Badge shows on reviews where reviewer had GPS-verified check-in
- [ ] Badge text: "✓ Verified Visit" or "📍 Verified"
- [ ] Badge appears near reviewer name/date
- [ ] Tooltip explains: "Reviewer visited this location"
- [ ] Subtle design - informative not distracting

---

### US-11.4.6.2: Verification Status Storage
**As a** platform  
**I want to** store GPS verification status with reviews  
**So that** badge can be displayed efficiently

**Acceptance Criteria:**
- [ ] `gps_verified` column on reviews (boolean)
- [ ] Set to true when review has matching verified check-in
- [ ] Denormalized for fast display (no join needed)
- [ ] Backfill existing reviews with verified check-ins

---

## Technical Requirements

### Database Migration

**File:** `supabase/migrations/YYYYMMDD_add_gps_verified_badge.sql`

```sql
-- ============================================
-- MIGRATION: GPS Verified Badge
-- Story: 11.4.6
-- ============================================

-- Step 1: Add gps_verified column
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS gps_verified BOOLEAN DEFAULT false;

-- Step 2: Backfill existing reviews that have verified check-ins
UPDATE business_reviews r
SET gps_verified = true
WHERE EXISTS (
  SELECT 1 FROM business_checkins c
  WHERE c.user_id = r.user_id
    AND c.business_id = r.business_id
    AND c.verified = true
    AND c.created_at <= r.created_at
);

-- Step 3: Create index for filtering
CREATE INDEX IF NOT EXISTS idx_reviews_gps_verified
ON business_reviews(gps_verified)
WHERE gps_verified = true;
```

---

### Update Review Submission

**File:** `src/services/reviewService.ts` (additions)

```typescript
export async function submitReview(data: ReviewSubmission): Promise<Review> {
  // ... existing code ...
  
  // Check if user has verified check-in for this business
  const { data: checkIn } = await supabase
    .from('business_checkins')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', data.business_id)
    .eq('verified', true)
    .limit(1)
    .single();
  
  const gpsVerified = !!checkIn;
  
  // Insert review with gps_verified flag
  const { data: review, error } = await supabase
    .from('business_reviews')
    .insert({
      // ... other fields ...
      gps_verified: gpsVerified
    })
    .select('*')
    .single();
  
  // ...
}
```

---

### Badge Component

**File:** `src/components/reviews/VerifiedVisitBadge.tsx`

```tsx
import { MapPin, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VerifiedVisitBadgeProps {
  verified: boolean;
  compact?: boolean;
}

export function VerifiedVisitBadge({ verified, compact = false }: VerifiedVisitBadgeProps) {
  if (!verified) return null;
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <MapPin className="w-4 h-4 text-green-600" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Verified Visit - Reviewer checked in at this location</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="bg-green-50 text-green-700 border-green-200 text-xs"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified Visit
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Verified Visit</p>
          <p className="text-sm text-muted-foreground">
            This reviewer checked in at the business location via GPS
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

### Update ReviewCard

**File:** `src/components/reviews/ReviewCard.tsx` (additions)

```tsx
import { VerifiedVisitBadge } from './VerifiedVisitBadge';

// In the ReviewCard header section:
<div className="flex items-center gap-2">
  <span className="font-medium">{review.user.full_name}</span>
  <VerifiedVisitBadge verified={review.gps_verified} />
  <span className="text-muted-foreground text-sm">
    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
  </span>
</div>
```

---

### Update Types

**File:** `src/types/review.ts` (additions)

```typescript
export interface Review {
  // ... existing fields ...
  gps_verified: boolean;
}
```

---

## Testing Plan

### Manual Testing Checklist

- [ ] Review from GPS check-in → Shows "Verified Visit" badge
- [ ] Review without check-in → No badge shown
- [ ] Tooltip explains what badge means
- [ ] Badge visible in All Reviews page
- [ ] Badge visible in storefront Reviews tab
- [ ] Existing reviews with check-ins show badge (backfill)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_gps_verified_badge.sql` | CREATE | Add column, backfill |
| `src/components/reviews/VerifiedVisitBadge.tsx` | CREATE | Badge component |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Display badge |
| `src/services/reviewService.ts` | MODIFY | Set gps_verified on submit |
| `src/types/review.ts` | MODIFY | Add field |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing check-in verification system
- [ ] Review Story 11.1.2 GPS implementation
- [ ] Look for existing badge components
- [ ] Check ReviewCard component structure
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

**Test Route 1: Badge Display**
1. Find review from GPS-verified check-in
2. Verify "Verified Visit" badge visible
3. Hover/tap → Tooltip explains badge
4. Badge visible in All Reviews page

**Test Route 2: Non-verified Reviews**
1. Find review without GPS check-in
2. Verify no badge displayed
3. Check backfill worked for old reviews

**Test Route 3: New Reviews**
1. Check in to business (GPS verified)
2. Submit review
3. Verify gps_verified=true
4. Badge appears immediately

---

## Definition of Done

- [ ] `gps_verified` column added to reviews
- [ ] Flag set correctly on new reviews
- [ ] Existing reviews backfilled
- [ ] Badge displays on verified reviews
- [ ] Tooltip provides explanation
- [ ] All tests passing
- [ ] Code reviewed

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
