# Story 11.4.5: Business Recommendation Badges (3 Tiers)

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🟢 P2 - LOW  
**Effort:** 1 day  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement a 3-tier badge system for businesses based on their recommendation percentage. Badges provide quick visual trust signals to consumers and reward businesses with consistently positive reviews.

---

## Badge Tiers

| Badge | Threshold | Minimum Reviews | Color |
|-------|-----------|-----------------|-------|
| **Recommended** | 75%+ | 3+ reviews | Bronze/Silver |
| **Highly Recommended** | 90%+ | 3+ reviews | Gold |
| **Very Highly Recommended** | 95%+ | 3+ reviews | Platinum |

---

## User Stories

### US-11.4.5.1: Calculate Badge Eligibility
**As a** platform  
**I want to** automatically calculate badge tier for businesses  
**So that** badges reflect current recommendation rates

**Acceptance Criteria:**
- [ ] Calculate recommendation percentage from approved reviews only
- [ ] Require minimum 3 reviews for any badge
- [ ] Badge updates in real-time as reviews are approved
- [ ] No badge shown if <75% or <3 reviews
- [ ] Highest eligible tier displayed (not multiple badges)

---

### US-11.4.5.2: Display Badge on Storefront
**As a** customer viewing a business  
**I want to** see the recommendation badge prominently  
**So that** I can quickly assess business quality

**Acceptance Criteria:**
- [ ] Badge visible in storefront header (next to business name)
- [ ] Badge also visible in search results card
- [ ] Tooltip shows: "95% of X reviewers recommend"
- [ ] Badge icon matches tier (bronze/gold/platinum style)
- [ ] Badge links to Reviews tab when clicked

---

### US-11.4.5.3: Badge in Business Search
**As a** customer searching for businesses  
**I want to** see badges in search results  
**So that** I can find highly-rated options quickly

**Acceptance Criteria:**
- [ ] Badge icon visible on search result cards
- [ ] Smaller version for compact display
- [ ] Filter by badge tier (Story 11.4.7)
- [ ] Sort by recommendation rate (optional)

---

### US-11.4.5.4: Business Owner Badge Awareness
**As a** business owner  
**I want to** see my badge status in my dashboard  
**So that** I can track my reputation

**Acceptance Criteria:**
- [ ] Current badge shown in business dashboard
- [ ] "Next tier" progress shown: "You need 2 more thumbs up for Highly Recommended"
- [ ] Historical badge changes logged
- [ ] Celebration animation when badge achieved

---

## Technical Requirements

### Database Schema

**File:** `supabase/migrations/YYYYMMDD_add_recommendation_badges.sql`

```sql
-- ============================================
-- MIGRATION: Business Recommendation Badges
-- Story: 11.4.5
-- ============================================

-- Step 1: Add badge columns to businesses
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS recommendation_badge TEXT 
  CHECK (recommendation_badge IN ('recommended', 'highly_recommended', 'very_highly_recommended')),
ADD COLUMN IF NOT EXISTS recommendation_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge_updated_at TIMESTAMPTZ;

-- Step 2: Create function to calculate badge
CREATE OR REPLACE FUNCTION calculate_business_badge(p_business_id UUID)
RETURNS TEXT AS $$
DECLARE
  pct DECIMAL(5,2);
  review_count INTEGER;
  badge TEXT;
BEGIN
  -- Count approved reviews and calculate percentage
  SELECT 
    COUNT(*) as total,
    ROUND(100.0 * SUM(CASE WHEN recommendation = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)
  INTO review_count, pct
  FROM business_reviews
  WHERE business_id = p_business_id
    AND moderation_status = 'approved'
    AND deleted_at IS NULL;
  
  -- Determine badge tier
  IF review_count >= 3 THEN
    IF pct >= 95 THEN
      badge := 'very_highly_recommended';
    ELSIF pct >= 90 THEN
      badge := 'highly_recommended';
    ELSIF pct >= 75 THEN
      badge := 'recommended';
    ELSE
      badge := NULL;
    END IF;
  ELSE
    badge := NULL;
  END IF;
  
  -- Update business record
  UPDATE businesses
  SET 
    recommendation_badge = badge,
    recommendation_percentage = COALESCE(pct, 0),
    approved_review_count = review_count,
    badge_updated_at = NOW()
  WHERE id = p_business_id;
  
  RETURN badge;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Trigger on review moderation
CREATE OR REPLACE FUNCTION trigger_recalculate_badge()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_business_badge(COALESCE(NEW.business_id, OLD.business_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_badge_on_review ON business_reviews;
CREATE TRIGGER trigger_badge_on_review
AFTER INSERT OR UPDATE OF moderation_status, recommendation, deleted_at OR DELETE 
ON business_reviews
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_badge();

-- Step 4: Initialize badges for existing businesses
DO $$
DECLARE
  biz RECORD;
BEGIN
  FOR biz IN SELECT id FROM businesses LOOP
    PERFORM calculate_business_badge(biz.id);
  END LOOP;
END $$;
```

---

### Badge Service

**File:** `src/services/badgeService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export type BadgeTier = 'recommended' | 'highly_recommended' | 'very_highly_recommended' | null;

export interface BusinessBadge {
  tier: BadgeTier;
  percentage: number;
  reviewCount: number;
  nextTier: {
    name: string;
    percentage: number;
    reviewsNeeded?: number;
  } | null;
}

export const BADGE_CONFIG: Record<string, {
  label: string;
  shortLabel: string;
  threshold: number;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  recommended: {
    label: 'Recommended',
    shortLabel: 'Rec.',
    threshold: 75,
    icon: '👍',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100'
  },
  highly_recommended: {
    label: 'Highly Recommended',
    shortLabel: 'Highly Rec.',
    threshold: 90,
    icon: '🌟',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  very_highly_recommended: {
    label: 'Very Highly Recommended',
    shortLabel: 'Top Rated',
    threshold: 95,
    icon: '🏆',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  }
};

/**
 * Get badge info for a business
 */
export async function getBusinessBadge(businessId: string): Promise<BusinessBadge> {
  const { data, error } = await supabase
    .from('businesses')
    .select('recommendation_badge, recommendation_percentage, approved_review_count')
    .eq('id', businessId)
    .single();
  
  if (error || !data) {
    return { tier: null, percentage: 0, reviewCount: 0, nextTier: null };
  }
  
  const nextTier = calculateNextTier(
    data.recommendation_badge,
    data.recommendation_percentage,
    data.approved_review_count
  );
  
  return {
    tier: data.recommendation_badge,
    percentage: data.recommendation_percentage,
    reviewCount: data.approved_review_count,
    nextTier
  };
}

function calculateNextTier(
  currentTier: BadgeTier,
  percentage: number,
  reviewCount: number
): BusinessBadge['nextTier'] {
  // Need 3 reviews first
  if (reviewCount < 3) {
    return {
      name: 'Recommended',
      percentage: 75,
      reviewsNeeded: 3 - reviewCount
    };
  }
  
  if (!currentTier || currentTier === 'recommended') {
    if (percentage < 75) {
      return { name: 'Recommended', percentage: 75 };
    }
    return { name: 'Highly Recommended', percentage: 90 };
  }
  
  if (currentTier === 'highly_recommended') {
    return { name: 'Very Highly Recommended', percentage: 95 };
  }
  
  // Already at top tier
  return null;
}
```

---

### Badge Display Component

**File:** `src/components/business/RecommendationBadge.tsx`

```tsx
import { Award, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BADGE_CONFIG, BadgeTier } from '@/services/badgeService';
import { cn } from '@/lib/utils';

interface RecommendationBadgeProps {
  tier: BadgeTier;
  percentage?: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BADGE_ICONS = {
  recommended: Award,
  highly_recommended: Star,
  very_highly_recommended: Trophy
};

export function RecommendationBadge({
  tier,
  percentage,
  reviewCount,
  size = 'md',
  showLabel = true
}: RecommendationBadgeProps) {
  if (!tier) return null;
  
  const config = BADGE_CONFIG[tier];
  const Icon = BADGE_ICONS[tier];
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              config.color,
              config.bgColor,
              'border-0 cursor-pointer',
              sizeClasses[size]
            )}
          >
            <Icon className={cn(iconSizes[size], 'mr-1')} />
            {showLabel && (size === 'lg' ? config.label : config.shortLabel)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{config.label}</p>
            {percentage !== undefined && reviewCount !== undefined && (
              <p className="text-sm text-muted-foreground">
                {percentage}% of {reviewCount} reviewers recommend this business
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

### Integration Points

```tsx
// In BusinessHeader.tsx or StorefrontHeader.tsx:
import { RecommendationBadge } from '@/components/business/RecommendationBadge';

<div className="flex items-center gap-2">
  <h1>{business.name}</h1>
  <RecommendationBadge 
    tier={business.recommendation_badge}
    percentage={business.recommendation_percentage}
    reviewCount={business.approved_review_count}
    size="lg"
  />
</div>

// In SearchResultCard.tsx:
<RecommendationBadge 
  tier={business.recommendation_badge}
  size="sm"
  showLabel={false}
/>
```

---

## Testing Plan

### Unit Tests

```typescript
describe('Badge Calculation', () => {
  it('returns null with <3 reviews', async () => {
    const badge = await calculateBusinessBadge('business-2-reviews');
    expect(badge).toBeNull();
  });
  
  it('returns recommended at 75%+', async () => {
    const badge = await calculateBusinessBadge('business-75-pct');
    expect(badge).toBe('recommended');
  });
  
  it('returns highly_recommended at 90%+', async () => {
    const badge = await calculateBusinessBadge('business-90-pct');
    expect(badge).toBe('highly_recommended');
  });
  
  it('returns very_highly_recommended at 95%+', async () => {
    const badge = await calculateBusinessBadge('business-95-pct');
    expect(badge).toBe('very_highly_recommended');
  });
  
  it('only counts approved reviews', async () => {
    // Business with 90% but some pending reviews
    const badge = await calculateBusinessBadge('business-with-pending');
    // Should not count pending reviews
  });
});
```

### Manual Testing Checklist

- [ ] Business with no reviews → No badge
- [ ] Business with 2 reviews → No badge (need 3)
- [ ] Business with 75% → "Recommended" badge
- [ ] Business with 90% → "Highly Recommended" badge
- [ ] Business with 95%+ → "Very Highly Recommended" badge
- [ ] Badge visible on storefront header
- [ ] Badge visible in search results
- [ ] Tooltip shows percentage and count
- [ ] Badge updates after review moderation
- [ ] Business owner sees badge in dashboard

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_recommendation_badges.sql` | CREATE | Schema, functions, triggers |
| `src/services/badgeService.ts` | CREATE | Badge logic and config |
| `src/components/business/RecommendationBadge.tsx` | CREATE | Badge display component |
| `src/components/business/BusinessHeader.tsx` | MODIFY | Add badge display |
| `src/components/search/SearchResultCard.tsx` | MODIFY | Add badge icon |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check for existing badge patterns (verified, etc.)
- [ ] Review business profile header components
- [ ] Look for tooltip components in use
- [ ] Check search result card structure
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

**Test Route 1: Badge Calculation**
1. Find business with <3 reviews → No badge
2. Find business with 75%+ → "Recommended" badge
3. Find business with 90%+ → "Highly Recommended"
4. Find business with 95%+ → "Very Highly Recommended"

**Test Route 2: Badge Display**
1. Open business storefront
2. Verify badge visible in header
3. Hover/tap → Tooltip shows stats
4. Check badge in search results

**Test Route 3: Real-time Updates**
1. Submit positive review (as last reviewer)
2. Wait for moderation
3. After approval → Badge should update
4. Verify calculation is correct

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

- [ ] Three badge tiers calculated correctly
- [ ] Minimum 3 reviews required
- [ ] Only approved reviews counted
- [ ] Badge visible on storefront
- [ ] Badge visible in search results
- [ ] Tooltip shows stats
- [ ] Real-time updates on moderation
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
