# Story 11.3.7: All Reviews Page Enhancements

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 2 days  
**Dependencies:** Story 11.1.5 (Route Configuration), Story 11.3.1 (Helpful Votes)  
**Status:** 📋 Ready for Implementation

> [!NOTE]
> **Relationship with Story 11.1.5**: Story 11.1.5 configures the base route and basic infinite scroll. This story adds enhancements: "Most Helpful" sort (from 11.3.1), advanced filters, photo-only filter, and improved infinite scroll UX.

---

## Overview

Enhance the All Reviews page with advanced features including "Most Helpful" sorting, photo-only filter, advanced filtering options, and improved infinite scroll experience.

---

## Problem Statement

### Current State (After Story 11.1.5)
- Basic route working at `/business/:id/reviews`
- Basic infinite scroll implemented
- Simple filters (All, Recommend, Don't Recommend)
- Sort by Newest/Oldest only

### Desired State
- "Most Helpful" sort option (uses helpful vote counts)
- "With Photos" filter
- Tag-based filtering
- Smooth infinite scroll with loading states
- Jump to specific review via URL hash

---

## User Stories

### US-11.3.7.1: Most Helpful Sort
**As a** user browsing all reviews  
**I want to** sort by "Most Helpful"  
**So that** I see the most useful reviews first

**Acceptance Criteria:**
- [ ] "Most Helpful" option in sort dropdown
- [ ] Sorts by helpful_count descending
- [ ] Tie-breaker: newest first
- [ ] Works with all filters

---

### US-11.3.7.2: With Photos Filter
**As a** user  
**I want to** filter to reviews with photos  
**So that** I can see visual evidence

**Acceptance Criteria:**
- [ ] "With Photos" toggle/chip
- [ ] Only shows reviews where photo_urls is not empty
- [ ] Shows photo count on toggle: "With Photos (15)"
- [ ] Combine with other filters

---

### US-11.3.7.3: Tag-Based Filtering
**As a** user  
**I want to** filter reviews by tag  
**So that** I can find reviews mentioning specific aspects

**Acceptance Criteria:**
- [ ] Popular tags shown as chips below filters
- [ ] Click tag to filter reviews containing it
- [ ] Multiple tags = OR filter (any match)
- [ ] Clear filter option
- [ ] Show review count per tag

---

### US-11.3.7.4: Improved Infinite Scroll UX
**As a** user scrolling through reviews  
**I want to** see smooth loading  
**So that** the experience feels polished

**Acceptance Criteria:**
- [ ] Skeleton loading while fetching next page
- [ ] "Load more" button as fallback
- [ ] Scroll position preserved on filter change
- [ ] "Back to top" floating button
- [ ] Count indicator: "Showing 20 of 47 reviews"

---

### US-11.3.7.5: Deep Link to Specific Review
**As a** user clicking a shared review link  
**I want to** land directly on that review  
**So that** I can see the specific review that was shared

**Acceptance Criteria:**
- [ ] URL hash: `/business/:id/reviews#review-{reviewId}`
- [ ] Auto-scroll to review on load
- [ ] Briefly highlight the review
- [ ] Works even if review is below fold

---

## Technical Requirements

### Enhanced Filters Component

**File:** `src/components/reviews/EnhancedReviewFilters.tsx`

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedReviewFiltersProps {
  filter: 'all' | 'recommend' | 'not-recommend';
  onFilterChange: (filter: 'all' | 'recommend' | 'not-recommend') => void;
  sortBy: 'newest' | 'oldest' | 'most-helpful';
  onSortChange: (sort: 'newest' | 'oldest' | 'most-helpful') => void;
  withPhotosOnly: boolean;
  onWithPhotosChange: (value: boolean) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  popularTags: { tag: string; count: number }[];
  photoCount: number;
  totalCount: number;
}

export function EnhancedReviewFilters({
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  withPhotosOnly,
  onWithPhotosChange,
  selectedTags,
  onTagsChange,
  popularTags,
  photoCount,
  totalCount
}: EnhancedReviewFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Top row: Filters and Sort */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('all')}
          >
            All ({totalCount})
          </Button>
          <Button
            variant={filter === 'recommend' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('recommend')}
          >
            👍 Recommend
          </Button>
          <Button
            variant={filter === 'not-recommend' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('not-recommend')}
          >
            👎 Don't
          </Button>
        </div>
        
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="most-helpful">Most Helpful</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Second row: Photo filter and tags */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* With Photos toggle */}
        <Button
          variant={withPhotosOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => onWithPhotosChange(!withPhotosOnly)}
          className="gap-1"
        >
          <Camera className="w-4 h-4" />
          With Photos ({photoCount})
        </Button>
        
        {/* Popular tags */}
        {popularTags.slice(0, 5).map(({ tag, count }) => (
          <Button
            key={tag}
            variant={selectedTags.includes(tag) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              if (selectedTags.includes(tag)) {
                onTagsChange(selectedTags.filter(t => t !== tag));
              } else {
                onTagsChange([...selectedTags, tag]);
              }
            }}
            className="text-xs"
          >
            {tag} ({count})
          </Button>
        ))}
        
        {/* Clear filters */}
        {(withPhotosOnly || selectedTags.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onWithPhotosChange(false);
              onTagsChange([]);
            }}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

### Enhanced All Reviews Component

**Update `AllReviews.tsx`:**

```tsx
import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBusinessReviewsPaginated, getPopularTags, getPhotoReviewCount } from '@/services/reviewService';
import ReviewCard from './ReviewCard';
import { EnhancedReviewFilters } from './EnhancedReviewFilters';
import { ReviewsLoadingState } from './ReviewsLoadingState';

const REVIEWS_PER_PAGE = 10;

interface AllReviewsProps {
  businessId: string;
}

export default function AllReviews({ businessId }: AllReviewsProps) {
  const location = useLocation();
  const [filter, setFilter] = useState<'all' | 'recommend' | 'not-recommend'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-helpful'>('newest');
  const [withPhotosOnly, setWithPhotosOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const { ref: loadMoreRef, inView } = useInView();
  const highlightedReviewRef = useRef<HTMLDivElement>(null);
  
  // Get review counts for filters
  const { data: popularTags = [] } = useQuery({
    queryKey: ['popular-tags', businessId],
    queryFn: () => getPopularTags(businessId)
  });
  
  const { data: photoCount = 0 } = useQuery({
    queryKey: ['photo-review-count', businessId],
    queryFn: () => getPhotoReviewCount(businessId)
  });
  
  // Infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['all-reviews', businessId, filter, sortBy, withPhotosOnly, selectedTags],
    queryFn: async ({ pageParam = 0 }) => {
      return getBusinessReviewsPaginated(businessId, {
        filter,
        sortBy,
        withPhotos: withPhotosOnly,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        offset: pageParam,
        limit: REVIEWS_PER_PAGE
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < REVIEWS_PER_PAGE) return undefined;
      return allPages.length * REVIEWS_PER_PAGE;
    },
    initialPageParam: 0
  });
  
  // Auto-load more
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Handle deep link to specific review
  useEffect(() => {
    const hash = location.hash;
    if (hash.startsWith('#review-')) {
      const reviewId = hash.replace('#review-', '');
      // Wait for reviews to load, then scroll
      setTimeout(() => {
        const element = document.getElementById(`review-${reviewId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 500);
    }
  }, [location.hash, data]);
  
  // Show back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const allReviews = data?.pages.flat() || [];
  const totalCount = allReviews.length; // Would need total from API for accuracy
  
  if (isLoading) {
    return <ReviewsLoadingState count={3} />;
  }
  
  return (
    <div className="space-y-4">
      {/* Enhanced Filters */}
      <EnhancedReviewFilters
        filter={filter}
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        withPhotosOnly={withPhotosOnly}
        onWithPhotosChange={setWithPhotosOnly}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        popularTags={popularTags}
        photoCount={photoCount}
        totalCount={totalCount}
      />
      
      {/* Review count */}
      {allReviews.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {allReviews.length} reviews
        </p>
      )}
      
      {/* Reviews List */}
      {allReviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No reviews match your filters
        </div>
      ) : (
        <div className="space-y-4">
          {allReviews.map(review => (
            <div key={review.id} id={`review-${review.id}`}>
              <ReviewCard 
                review={review}
                showBusinessContext={false}
              />
            </div>
          ))}
          
          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-4" />
          
          {/* Loading more */}
          {isFetchingNextPage && (
            <ReviewsLoadingState count={2} />
          )}
          
          {/* Load more fallback button */}
          {hasNextPage && !isFetchingNextPage && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => fetchNextPage()}
              >
                Load More Reviews
              </Button>
            </div>
          )}
          
          {/* End of list */}
          {!hasNextPage && allReviews.length > 0 && (
            <p className="text-center text-muted-foreground py-4">
              You've seen all reviews
            </p>
          )}
        </div>
      )}
      
      {/* Back to top */}
      {showBackToTop && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-6 right-6 rounded-full shadow-lg"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
```

---

### Update Service for Advanced Queries

**Update `reviewService.ts`:**

```typescript
interface PaginatedReviewsOptions {
  filter?: 'all' | 'recommend' | 'not-recommend';
  sortBy?: 'newest' | 'oldest' | 'most-helpful';
  withPhotos?: boolean;
  tags?: string[];
  offset?: number;
  limit?: number;
}

export async function getBusinessReviewsPaginated(
  businessId: string,
  options: PaginatedReviewsOptions = {}
): Promise<Review[]> {
  const { 
    filter = 'all', 
    sortBy = 'newest', 
    withPhotos = false,
    tags,
    offset = 0, 
    limit = 10 
  } = options;
  
  let query = supabase
    .from('business_reviews')
    .select(`
      *,
      user:profiles!user_id (id, full_name, avatar_url),
      response:business_review_responses (*),
      helpful_count:review_helpful_votes(count)
    `)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .range(offset, offset + limit - 1);
  
  // Apply recommendation filter
  if (filter === 'recommend') {
    query = query.eq('recommendation', true);
  } else if (filter === 'not-recommend') {
    query = query.eq('recommendation', false);
  }
  
  // Apply photos filter
  if (withPhotos) {
    query = query.not('photo_urls', 'is', null)
                 .gt('array_length(photo_urls, 1)', 0);
  }
  
  // Apply tag filter (any match)
  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags);
  }
  
  // Apply sort
  if (sortBy === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sortBy === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else if (sortBy === 'most-helpful') {
    query = query.order('helpful_count', { ascending: false })
                 .order('created_at', { ascending: false });
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getPopularTags(businessId: string): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await supabase
    .rpc('get_business_tag_analysis', { p_business_id: businessId, p_days: 365 });
  
  if (error) throw error;
  return (data || []).slice(0, 10);
}

export async function getPhotoReviewCount(businessId: string): Promise<number> {
  const { count, error } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .not('photo_urls', 'is', null);
  
  if (error) throw error;
  return count || 0;
}
```

---

## Testing Plan

### Manual Testing Checklist
- [ ] Most Helpful sort orders by vote count
- [ ] With Photos filter works
- [ ] Tag chips filter reviews
- [ ] Multiple tags = OR filter
- [ ] Clear filters resets all
- [ ] Infinite scroll loads more
- [ ] Load More button appears
- [ ] Back to top button shows on scroll
- [ ] Deep link scrolls and highlights review
- [ ] Filters work together correctly

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/reviews/EnhancedReviewFilters.tsx` | CREATE | New filter component |
| `src/components/reviews/AllReviews.tsx` | MODIFY | Add enhancements |
| `src/services/reviewService.ts` | MODIFY | Advanced query options |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing AllReviews component from Story 11.1.5
- [ ] Review existing filter/sort patterns
- [ ] Look for infinite scroll implementations
- [ ] Check URL query parameter handling patterns
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

**Test Route 1: Filtering**
1. Open All Reviews page
2. Select "Most Recent" sort
3. Select "GPS Verified" filter
4. Verify results update immediately

**Test Route 2: Search**
1. Type in search box
2. Verify reviews filter by text content
3. Clear search → All reviews return
4. Search with filters → Combined results

**Test Route 3: URL Persistence**
1. Apply filters and sort
2. Copy URL and open in new tab
3. Verify same filters/sort applied
4. Share URL → Works for others

---

## Definition of Done

- [ ] Most Helpful sort working with vote counts
- [ ] With Photos filter working
- [ ] Tag-based filtering working
- [ ] Back to top button working
- [ ] Deep link scrolling and highlighting
- [ ] Smooth infinite scroll UX
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
