# Story 11.4.7: Filter by Review Score in Search

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 1 day  
**Dependencies:** Story 11.4.5 (Recommendation Badges)  
**Status:** ⏸️ Deferred (Phase II)

---

## Overview

Add a filter option in business search that allows users to filter results by recommendation percentage. Users can find "Highly Recommended" businesses or set a minimum recommendation threshold.

> **Note**: Review scores do NOT affect search ranking (per design decision). This is a user-applied filter only.

---

## User Stories

### US-11.4.7.1: Filter by Recommendation Badge
**As a** customer searching for businesses  
**I want to** filter by recommendation badge tier  
**So that** I only see highly-rated options

**Acceptance Criteria:**
- [ ] Filter dropdown in search page: "Recommendation"
- [ ] Options:
  - All businesses (default)
  - Recommended (75%+)
  - Highly Recommended (90%+)
  - Very Highly Recommended (95%+)
- [ ] Filter updates results immediately
- [ ] Clear filter option
- [ ] Shows count: "15 Highly Recommended businesses"

---

### US-11.4.7.2: Filter by Minimum Reviews
**As a** customer  
**I want to** only see businesses with enough reviews  
**So that** I can trust the recommendation percentage

**Acceptance Criteria:**
- [ ] Optional secondary filter: "Minimum Reviews"
- [ ] Options: Any, 3+, 5+, 10+, 20+
- [ ] Combines with recommendation filter
- [ ] Shows in filter summary

---

### US-11.4.7.3: Sort by Recommendation (Optional)
**As a** customer  
**I want to** sort search results by recommendation percentage  
**So that** I see best-rated first

**Acceptance Criteria:**
- [ ] Sort option: "Most Recommended"
- [ ] Sorts by recommendation_percentage DESC
- [ ] Ties broken by review count
- [ ] Search ranking still primary (not replaced)

---

## Technical Requirements

### Update Search Service

**File:** `src/services/searchService.ts` (additions)

```typescript
export interface SearchFilters {
  // ... existing filters ...
  minRecommendationPercentage?: number;
  badgeTier?: 'recommended' | 'highly_recommended' | 'very_highly_recommended';
  minReviewCount?: number;
}

export async function searchBusinesses(
  query: string,
  filters: SearchFilters = {}
): Promise<Business[]> {
  let queryBuilder = supabase
    .from('businesses')
    .select('*')
    .textSearch('name', query);
  
  // Apply recommendation filter
  if (filters.badgeTier) {
    queryBuilder = queryBuilder.eq('recommendation_badge', filters.badgeTier);
  } else if (filters.minRecommendationPercentage) {
    queryBuilder = queryBuilder.gte(
      'recommendation_percentage', 
      filters.minRecommendationPercentage
    );
  }
  
  // Apply minimum review count
  if (filters.minReviewCount) {
    queryBuilder = queryBuilder.gte('approved_review_count', filters.minReviewCount);
  }
  
  const { data, error } = await queryBuilder;
  
  if (error) throw error;
  return data || [];
}
```

---

### Filter Component

**File:** `src/components/search/RecommendationFilter.tsx`

```tsx
import { Star, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface RecommendationFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function RecommendationFilter({ value, onChange }: RecommendationFilterProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Star className="w-4 h-4" />
        Recommendation
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="All businesses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All businesses</SelectItem>
          <SelectItem value="recommended">
            👍 Recommended (75%+)
          </SelectItem>
          <SelectItem value="highly_recommended">
            🌟 Highly Recommended (90%+)
          </SelectItem>
          <SelectItem value="very_highly_recommended">
            🏆 Very Highly Recommended (95%+)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface MinReviewsFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function MinReviewsFilter({ value, onChange }: MinReviewsFilterProps) {
  return (
    <div className="space-y-2">
      <Label>Minimum Reviews</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Any</SelectItem>
          <SelectItem value="3">3+ reviews</SelectItem>
          <SelectItem value="5">5+ reviews</SelectItem>
          <SelectItem value="10">10+ reviews</SelectItem>
          <SelectItem value="20">20+ reviews</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

---

### Integration with Search Page

**File:** `src/pages/search/SearchPage.tsx` (additions)

```tsx
import { RecommendationFilter, MinReviewsFilter } from '@/components/search/RecommendationFilter';

// In SearchPage component:
const [recommendationFilter, setRecommendationFilter] = useState('all');
const [minReviews, setMinReviews] = useState('0');

// In filters section:
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {/* Existing filters */}
  <CategoryFilter ... />
  <LocationFilter ... />
  
  {/* New filters */}
  <RecommendationFilter 
    value={recommendationFilter}
    onChange={setRecommendationFilter}
  />
  <MinReviewsFilter
    value={minReviews}
    onChange={setMinReviews}
  />
</div>

// Apply to search:
const filters = {
  badgeTier: recommendationFilter !== 'all' ? recommendationFilter : undefined,
  minReviewCount: parseInt(minReviews) || undefined
};
```

---

### Active Filters Display

```tsx
// Show active filters summary:
{recommendationFilter !== 'all' && (
  <Badge variant="secondary" className="gap-1">
    {recommendationFilter === 'very_highly_recommended' && '🏆 Very Highly Recommended'}
    {recommendationFilter === 'highly_recommended' && '🌟 Highly Recommended'}
    {recommendationFilter === 'recommended' && '👍 Recommended'}
    <button onClick={() => setRecommendationFilter('all')}>×</button>
  </Badge>
)}

{parseInt(minReviews) > 0 && (
  <Badge variant="secondary" className="gap-1">
    {minReviews}+ reviews
    <button onClick={() => setMinReviews('0')}>×</button>
  </Badge>
)}
```

---

## Testing Plan

### Manual Testing Checklist

- [ ] Search shows all businesses by default
- [ ] Filter "Recommended" → Only 75%+ businesses
- [ ] Filter "Highly Recommended" → Only 90%+ businesses
- [ ] Filter "Very Highly Recommended" → Only 95%+ businesses
- [ ] Min reviews filter works correctly
- [ ] Combine filters → Both applied
- [ ] Clear filter returns all results
- [ ] Result count updates with filters
- [ ] Filter persists on page navigation (optional)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/searchService.ts` | MODIFY | Add recommendation filters |
| `src/components/search/RecommendationFilter.tsx` | CREATE | Filter components |
| `src/pages/search/SearchPage.tsx` | MODIFY | Integrate filters |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing search page components
- [ ] Review filter/facet patterns in use
- [ ] Look for existing Select/Dropdown components
- [ ] Check URL query parameter handling
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

**Test Route 1: Recommendation Filter**
1. Navigate to search page
2. Find "Recommendation" filter
3. Select "Highly Recommended"
4. Verify only 90%+ businesses shown

**Test Route 2: Minimum Reviews Filter**
1. Select "5+ reviews" filter
2. Verify businesses with <5 reviews hidden
3. Combine with recommendation filter
4. Both filters work together

**Test Route 3: Clear Filters**
1. Apply multiple filters
2. Click "Clear All" or X on filter badge
3. Verify all results return
4. URL updates correctly

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

- [ ] Recommendation filter in search
- [ ] Minimum reviews filter working
- [ ] Filters combine correctly
- [ ] Clear filter functionality
- [ ] Result count accurate
- [ ] All tests passing
- [ ] Code reviewed

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
