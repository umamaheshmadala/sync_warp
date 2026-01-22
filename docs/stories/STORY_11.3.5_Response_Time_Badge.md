# Story 11.3.5: Response Time Tracking Badge

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟢 P2 - LOW  
**Effort:** 1 day  
**Dependencies:** Story 11.3.4 (response metrics exist)  
**Status:** ⏭️ Skipped (Deferred to Phase II)

---

## Overview

Track and display business response times to reviews. Businesses that respond quickly earn a badge displayed on their storefront, encouraging prompt engagement with customers.

---

## Problem Statement

### Current State
- No tracking of response times
- No incentive for quick responses
- Customers don't know if business is responsive

### Desired State
- Track average response time per business
- Display badge for responsive businesses
- Show on storefront and review cards
- Encourage business engagement

---

## User Stories

### US-11.3.5.1: Track Response Times
**As a** platform  
**I want to** track how quickly businesses respond  
**So that** we can measure engagement

**Acceptance Criteria:**
- [ ] Record timestamp when business responds
- [ ] Calculate time difference from review creation
- [ ] Store rolling average response time
- [ ] Update metrics daily

---

### US-11.3.5.2: Response Time Badge
**As a** customer  
**I want to** see if a business responds quickly  
**So that** I know my review will be acknowledged

**Acceptance Criteria:**
- [ ] Badge: "Responds within X hours" or "Quick to respond"
- [ ] Thresholds: <24h = Quick, <48h = Responsive
- [ ] Display on storefront header
- [ ] Show only if response rate >50%
- [ ] Tooltip with details

---

### US-11.3.5.3: Response Time on Review Card
**As a** user viewing reviews  
**I want to** see how long it took to get a response  
**So that** I understand business engagement

**Acceptance Criteria:**
- [ ] Show response time on responses: "Responded in 2 hours"
- [ ] Highlight fast responses (<24h)
- [ ] Format: "Responded in X hours" or "Responded in X days"

---

## Technical Requirements

### Database Updates

```sql
-- Add response time tracking to reviews
ALTER TABLE business_review_responses
ADD COLUMN IF NOT EXISTS response_time_hours NUMERIC;

-- Trigger to calculate response time
CREATE OR REPLACE FUNCTION calculate_response_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.response_time_hours := EXTRACT(EPOCH FROM (NEW.created_at - (
    SELECT created_at FROM business_reviews WHERE id = NEW.review_id
  ))) / 3600;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_response_time
BEFORE INSERT ON business_review_responses
FOR EACH ROW EXECUTE FUNCTION calculate_response_time();

-- Business response stats view
CREATE OR REPLACE VIEW business_response_stats AS
SELECT 
  b.id AS business_id,
  b.name AS business_name,
  COUNT(DISTINCT br.id) AS total_reviews,
  COUNT(DISTINCT brr.id) AS total_responses,
  ROUND(COUNT(DISTINCT brr.id)::NUMERIC / NULLIF(COUNT(DISTINCT br.id), 0) * 100, 1) AS response_rate,
  ROUND(AVG(brr.response_time_hours), 1) AS avg_response_hours,
  CASE 
    WHEN AVG(brr.response_time_hours) <= 24 AND 
         COUNT(DISTINCT brr.id)::NUMERIC / NULLIF(COUNT(DISTINCT br.id), 0) >= 0.5 
      THEN 'quick_responder'
    WHEN AVG(brr.response_time_hours) <= 48 AND
         COUNT(DISTINCT brr.id)::NUMERIC / NULLIF(COUNT(DISTINCT br.id), 0) >= 0.5
      THEN 'responsive'
    ELSE NULL
  END AS response_badge
FROM businesses b
LEFT JOIN business_reviews br ON br.business_id = b.id AND br.deleted_at IS NULL
LEFT JOIN business_review_responses brr ON brr.review_id = br.id
GROUP BY b.id, b.name;
```

---

### Response Time Badge Component

**File:** `src/components/reviews/ResponseTimeBadge.tsx`

```tsx
import { Clock, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ResponseTimeBadgeProps {
  badge: 'quick_responder' | 'responsive' | null;
  avgHours?: number;
  responseRate?: number;
  size?: 'sm' | 'md';
}

export function ResponseTimeBadge({ 
  badge, 
  avgHours, 
  responseRate,
  size = 'sm' 
}: ResponseTimeBadgeProps) {
  if (!badge) return null;
  
  const isQuick = badge === 'quick_responder';
  const Icon = isQuick ? Zap : Clock;
  const label = isQuick 
    ? 'Quick to respond' 
    : 'Typically responds';
  
  const timeText = avgHours 
    ? avgHours < 24 
      ? `within ${Math.round(avgHours)} hours`
      : `within ${Math.round(avgHours / 24)} days`
    : '';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full',
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
          isQuick 
            ? 'bg-green-100 text-green-700' 
            : 'bg-blue-100 text-blue-700'
        )}>
          <Icon className={cn(
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          )} />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Usually responds {timeText}</p>
        {responseRate && (
          <p className="text-xs text-muted-foreground">
            Responds to {responseRate}% of reviews
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
```

---

### Response Time Display on Response Card

**File:** Update `ReviewCard.tsx`

```tsx
// In the response section:
{response && (
  <div className="ml-6 mt-3 p-3 bg-muted rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm font-medium">Owner Response</span>
      <ResponseTimeDisplay hours={response.response_time_hours} />
    </div>
    <p className="text-sm">{response.text}</p>
  </div>
)}

// Helper component
function ResponseTimeDisplay({ hours }: { hours: number | null }) {
  if (!hours) return null;
  
  const isFast = hours <= 24;
  const timeText = hours < 24 
    ? `${Math.round(hours)}h`
    : `${Math.round(hours / 24)}d`;
  
  return (
    <span className={cn(
      'text-xs',
      isFast ? 'text-green-600' : 'text-muted-foreground'
    )}>
      • Responded in {timeText}
    </span>
  );
}
```

---

### Hook for Response Stats

**File:** `src/hooks/useResponseStats.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useResponseStats(businessId: string) {
  return useQuery({
    queryKey: ['response-stats', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_response_stats')
        .select('*')
        .eq('business_id', businessId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return data || {
        response_rate: 0,
        avg_response_hours: null,
        response_badge: null
      };
    },
    enabled: !!businessId
  });
}
```

---

### Add Badge to Storefront

**Update `BusinessProfile.tsx`:**

```tsx
import { ResponseTimeBadge } from '@/components/reviews/ResponseTimeBadge';
import { useResponseStats } from '@/hooks/useResponseStats';

// In component:
const { data: responseStats } = useResponseStats(businessId);

// In header section, near review stats:
<ResponseTimeBadge 
  badge={responseStats?.response_badge}
  avgHours={responseStats?.avg_response_hours}
  responseRate={responseStats?.response_rate}
  size="md"
/>
```

---

## Testing Plan

### Unit Tests

```typescript
describe('ResponseTimeBadge', () => {
  it('shows "Quick to respond" for fast responders', () => {
    render(<ResponseTimeBadge badge="quick_responder" avgHours={12} />);
    expect(screen.getByText('Quick to respond')).toBeInTheDocument();
  });

  it('shows tooltip with details', async () => {
    render(<ResponseTimeBadge badge="quick_responder" avgHours={12} responseRate={80} />);
    await userEvent.hover(screen.getByText('Quick to respond'));
    expect(screen.getByText(/within 12 hours/)).toBeInTheDocument();
  });

  it('returns null when no badge', () => {
    const { container } = render(<ResponseTimeBadge badge={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('Response Time Calculation', () => {
  it('calculates correct response time', async () => {
    // Create review, then response after 2 hours
    const review = await createReview();
    await new Promise(r => setTimeout(r, 100)); // Simulate time
    await createResponse(review.id);
    
    const { data } = await supabase
      .from('business_review_responses')
      .select('response_time_hours')
      .eq('review_id', review.id)
      .single();
    
    expect(data.response_time_hours).toBeGreaterThan(0);
  });
});
```

### Manual Testing Checklist
- [ ] Response creates with calculated time
- [ ] Badge appears for businesses <24h avg
- [ ] Badge shows on storefront header
- [ ] Response time shows on individual responses
- [ ] Fast responses highlighted in green
- [ ] Tooltip shows details
- [ ] No badge for slow/low response rate businesses

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_response_time.sql` | CREATE | Tracking and views |
| `src/components/reviews/ResponseTimeBadge.tsx` | CREATE | Badge component |
| `src/hooks/useResponseStats.ts` | CREATE | Fetch stats hook |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Show response time |
| `src/pages/business/BusinessProfile.tsx` | MODIFY | Add badge to header |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check for existing badge components
- [ ] Review response submission flow
- [ ] Look for timestamp tracking patterns
- [ ] Find existing business profile badges
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

**Test Route 1: Response Time Tracking**
1. Submit a review on a business
2. Login as business owner
3. Respond to the review
4. Verify response_time_hours calculated correctly

**Test Route 2: Badge Display**
1. View business with quick response pattern
2. Verify "Quick Responder" badge visible
3. Check tooltip shows average time
4. Verify threshold (24hrs) is correct

**Test Route 3: Edge Cases**
1. Business with no responses → No badge
2. Business with slow responses → No badge
3. Badge updates after new responses

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

- [ ] Response time calculated on insert
- [ ] Business stats view working
- [ ] Badge displayed for qualifying businesses
- [ ] Response time shown on response cards
- [ ] Fast responses highlighted
- [ ] Tooltip with full details
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
