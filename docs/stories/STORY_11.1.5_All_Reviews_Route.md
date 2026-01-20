# Story 11.1.5: Configure All Reviews Route

**Epic:** [EPIC 11.1 - Reviews Core Fixes](../epics/EPIC_11.1_Reviews_Core_Fixes.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 0.5 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

> [!NOTE]
> **Potential Overlap with Story 11.3.7**: This story configures the route and basic infinite scroll. Story 11.3.7 may enhance infinite scroll with additional features (sorting by helpfulness, etc.). The scope split will be finalized when Story 11.3.7 is created.

---

## Overview

Configure the `/business/:id/reviews` route in the router to render the existing `AllReviews.tsx` component. This component exists but has **no route configured**, making the full reviews page inaccessible. Also add a "View All Reviews" link from the storefront Reviews tab.

---

## Problem Statement

### Current State
- `AllReviews.tsx` component exists (5.4KB) at `src/components/reviews/AllReviews.tsx`
- **No route is configured** in `Router.tsx`
- Users cannot access the full reviews page
- "View All" link goes nowhere or doesn't exist

### Desired State
- Route `/business/:id/reviews` renders `AllReviews.tsx`
- "View All Reviews" link in storefront Reviews tab
- Full page shows all reviews with infinite scroll
- Proper SEO and page title

---

## User Stories

### US-11.1.5.1: Configure Route
**As a** platform  
**I want to** have `/business/:id/reviews` route working  
**So that** users can access the full reviews page

**Acceptance Criteria:**
- [ ] Route `/business/:id/reviews` configured in Router.tsx
- [ ] Route renders `AllReviews.tsx` component
- [ ] Business ID passed correctly to component
- [ ] 404 shown for invalid business IDs
- [ ] Route is publicly accessible (no auth required for viewing)

---

### US-11.1.5.2: View All Link
**As a** user viewing review snippets on storefront  
**I want to** click "View All Reviews" to see all reviews  
**So that** I can read comprehensive feedback

**Acceptance Criteria:**
- [ ] "View All Reviews" link visible in storefront Reviews tab
- [ ] Link appears below review list or in header
- [ ] Shows review count: "View All Reviews (47)"
- [ ] Clicking navigates to `/business/:id/reviews`
- [ ] Only show if business has more reviews than displayed

---

### US-11.1.5.3: All Reviews Page Layout
**As a** user on the All Reviews page  
**I want to** see all reviews with filtering options  
**So that** I can find relevant reviews

**Acceptance Criteria:**
- [ ] Business name and review summary at top
- [ ] Filter options: All, Recommends, Doesn't Recommend
- [ ] Sort options: Newest, Oldest, Most Helpful (when available)
- [ ] Infinite scroll loads more reviews as user scrolls
- [ ] Back button returns to storefront
- [ ] Mobile responsive layout

---

### US-11.1.5.4: SEO and Page Metadata
**As a** platform  
**I want to** proper page title and meta tags  
**So that** the page is properly indexed

**Acceptance Criteria:**
- [ ] Page title: "[Business Name] Reviews - SynC"
- [ ] Meta description includes business name and review count
- [ ] Canonical URL set correctly
- [ ] Open Graph tags for sharing

---

## Technical Requirements

### Route Configuration

#### Update `Router.tsx`
**Location:** `src/router/Router.tsx`

```tsx
// Add import
import AllReviews from '@/components/reviews/AllReviews';
// OR if using pages folder:
import AllReviewsPage from '@/pages/AllReviewsPage';

// Add route in the appropriate section
<Route 
  path="/business/:id/reviews" 
  element={<AllReviews />} 
/>

// OR with layout wrapper:
<Route 
  path="/business/:id/reviews" 
  element={
    <AppLayout>
      <AllReviewsPage />
    </AppLayout>
  } 
/>
```

---

### Create Page Wrapper (if needed)

**File:** `src/pages/AllReviewsPage.tsx`

```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AllReviews from '@/components/reviews/AllReviews';
import { useBusiness } from '@/hooks/useBusiness';
import { useReviewStats } from '@/hooks/useReviewStats';

export default function AllReviewsPage() {
  const { id: businessId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: business, isLoading: businessLoading } = useBusiness(businessId!);
  const { data: stats } = useReviewStats(businessId!);
  
  if (!businessId) {
    navigate('/');
    return null;
  }
  
  if (businessLoading) {
    return <ReviewsPageSkeleton />;
  }
  
  if (!business) {
    return <NotFoundPage message="Business not found" />;
  }
  
  return (
    <>
      <Helmet>
        <title>{business.name} Reviews - SynC</title>
        <meta 
          name="description" 
          content={`Read ${stats?.total || ''} reviews for ${business.name}. See what customers say about their experience.`}
        />
        <link rel="canonical" href={`https://sync.app/business/${businessId}/reviews`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${business.name} Reviews`} />
        <meta property="og:description" content={`${stats?.recommendationPercentage || 0}% recommend. Read all reviews.`} />
        <meta property="og:url" content={`https://sync.app/business/${businessId}/reviews`} />
      </Helmet>
      
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/business/${businessId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {business.name}
          </Button>
          
          <h1 className="text-2xl font-bold">
            Reviews for {business.name}
          </h1>
          
          {stats && (
            <p className="text-muted-foreground mt-1">
              {stats.total} reviews • {stats.recommendationPercentage}% recommend
            </p>
          )}
        </div>
        
        {/* Reviews Component */}
        <AllReviews businessId={businessId} />
      </div>
    </>
  );
}

function ReviewsPageSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl animate-pulse">
      <div className="h-8 bg-muted rounded w-1/4 mb-4" />
      <div className="h-12 bg-muted rounded w-1/2 mb-2" />
      <div className="h-4 bg-muted rounded w-1/3 mb-6" />
      
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-muted rounded mb-4" />
      ))}
    </div>
  );
}
```

---

### Update AllReviews Component (if needed)

#### Verify/Update `AllReviews.tsx`
**Location:** `src/components/reviews/AllReviews.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { getBusinessReviews } from '@/services/reviewService';
import ReviewCard from './ReviewCard';
import ReviewFilters from './ReviewFilters';
import { ReviewsLoadingState } from './ReviewsLoadingState';
import { ReviewsErrorState } from './ReviewsErrorState';

interface AllReviewsProps {
  businessId: string;
}

const REVIEWS_PER_PAGE = 10;

export default function AllReviews({ businessId }: AllReviewsProps) {
  const [filter, setFilter] = useState<'all' | 'recommend' | 'not-recommend'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  
  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['all-reviews', businessId, filter, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      return getBusinessReviewsPaginated(businessId, {
        filter,
        sortBy,
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
  
  // Auto-load more when scrolling into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  if (isLoading) {
    return <ReviewsLoadingState count={3} />;
  }
  
  if (isError) {
    return <ReviewsErrorState error={error} onRetry={() => window.location.reload()} />;
  }
  
  const allReviews = data?.pages.flat() || [];
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <ReviewFilters
        filter={filter}
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      
      {/* Reviews List */}
      {allReviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No reviews yet. Be the first to leave a review!
        </div>
      ) : (
        <div className="space-y-4">
          {allReviews.map(review => (
            <ReviewCard 
              key={review.id} 
              review={review}
              showBusinessContext={false}
            />
          ))}
          
          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-4" />
          
          {isFetchingNextPage && (
            <ReviewsLoadingState count={2} />
          )}
          
          {!hasNextPage && allReviews.length > 0 && (
            <p className="text-center text-muted-foreground py-4">
              You've seen all {allReviews.length} reviews
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### Add Paginated Query Function

#### Update `reviewService.ts`
**Location:** `src/services/reviewService.ts`

```typescript
interface PaginatedReviewsOptions {
  filter?: 'all' | 'recommend' | 'not-recommend';
  sortBy?: 'newest' | 'oldest';
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
    offset = 0, 
    limit = 10 
  } = options;
  
  let query = supabase
    .from('business_reviews')
    .select(`
      *,
      user:profiles!user_id (id, full_name, avatar_url),
      response:business_review_responses (*)
    `)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .range(offset, offset + limit - 1);
  
  // Apply filter
  if (filter === 'recommend') {
    query = query.eq('recommendation', true);
  } else if (filter === 'not-recommend') {
    query = query.eq('recommendation', false);
  }
  
  // Apply sort
  if (sortBy === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sortBy === 'oldest') {
    query = query.order('created_at', { ascending: true });
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[ReviewService] Paginated fetch error:', error);
    throw new Error('Could not load reviews');
  }
  
  return data || [];
}
```

---

### Add View All Link to Storefront

#### Update `BusinessReviews.tsx`
**Location:** `src/components/reviews/BusinessReviews.tsx`

```tsx
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// In the component, add link if there are more reviews than shown:
const PREVIEW_COUNT = 5; // Number of reviews shown in storefront tab

// After rendering preview reviews:
{reviews.length > PREVIEW_COUNT && (
  <Link 
    to={`/business/${businessId}/reviews`}
    className="flex items-center justify-center gap-1 py-4 text-primary hover:underline"
  >
    View All Reviews ({totalReviewCount})
    <ChevronRight className="w-4 h-4" />
  </Link>
)}

// OR as a button style:
{stats?.total > PREVIEW_COUNT && (
  <div className="text-center pt-4 border-t">
    <Button 
      variant="outline" 
      asChild
    >
      <Link to={`/business/${businessId}/reviews`}>
        View All {stats.total} Reviews
        <ChevronRight className="w-4 h-4 ml-1" />
      </Link>
    </Button>
  </div>
)}
```

---

## Testing Plan

### Unit Tests
```typescript
describe('AllReviews Route', () => {
  it('renders AllReviews component at correct path', () => {
    renderWithRouter(<App />, { route: '/business/test-123/reviews' });
    expect(screen.getByText(/reviews/i)).toBeInTheDocument();
  });

  it('passes businessId to component', () => {
    renderWithRouter(<App />, { route: '/business/abc-456/reviews' });
    // Verify component received correct businessId
  });

  it('shows 404 for invalid business', async () => {
    renderWithRouter(<App />, { route: '/business/invalid-id/reviews' });
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });
});

describe('View All Link', () => {
  it('shows link when more reviews exist than displayed', () => {
    render(<BusinessReviews businessId="123" />, {
      mockReviews: Array(10).fill(mockReview)
    });
    expect(screen.getByText(/View All Reviews/i)).toBeInTheDocument();
  });

  it('hides link when all reviews fit on page', () => {
    render(<BusinessReviews businessId="123" />, {
      mockReviews: Array(3).fill(mockReview)
    });
    expect(screen.queryByText(/View All Reviews/i)).not.toBeInTheDocument();
  });

  it('navigates to correct URL', async () => {
    const { history } = renderWithRouter(<BusinessReviews businessId="123" />);
    await userEvent.click(screen.getByText(/View All Reviews/i));
    expect(history.location.pathname).toBe('/business/123/reviews');
  });
});

describe('Infinite Scroll', () => {
  it('loads more reviews when scrolling to bottom', async () => {
    render(<AllReviews businessId="123" />);
    
    // Initially shows first page
    expect(screen.getAllByTestId('review-card').length).toBe(10);
    
    // Scroll to bottom
    fireEvent.scroll(window, { target: { scrollY: 10000 } });
    
    await waitFor(() => {
      expect(screen.getAllByTestId('review-card').length).toBeGreaterThan(10);
    });
  });
});
```

### Manual Testing Checklist
- [ ] Navigate directly to `/business/:id/reviews` - page loads
- [ ] Navigate with invalid business ID - shows 404
- [ ] Click "View All Reviews" from storefront - navigates correctly
- [ ] Back button returns to storefront
- [ ] Page title shows business name
- [ ] Filters work (All/Recommends/Doesn't)
- [ ] Sort works (Newest/Oldest)
- [ ] Infinite scroll loads more reviews
- [ ] Shows "You've seen all X reviews" at end
- [ ] Mobile responsive layout works
- [ ] SEO meta tags present in page source

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/router/Router.tsx` | MODIFY | Add /business/:id/reviews route |
| `src/pages/AllReviewsPage.tsx` | CREATE | Page wrapper with SEO |
| `src/components/reviews/AllReviews.tsx` | MODIFY | Ensure infinite scroll works |
| `src/components/reviews/BusinessReviews.tsx` | MODIFY | Add View All link |
| `src/services/reviewService.ts` | MODIFY | Add paginated query function |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check existing routing patterns in `src/router/Router.tsx`
- [ ] Review `src/pages/` for similar page structures
- [ ] Check for existing infinite scroll implementations
- [ ] Look for SEO metadata patterns in other pages
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

**Test Route 1: Navigation**
1. Navigate to a business storefront
2. Go to Reviews tab
3. Click "View All Reviews" link
4. Verify redirects to `/business/:id/reviews`
5. Verify page loads correctly

**Test Route 2: Infinite Scroll**
1. Open All Reviews page with 20+ reviews
2. Scroll to bottom of initial list
3. Verify more reviews load automatically
4. Continue scrolling until no more reviews
5. Verify loading indicators work correctly

**Test Route 3: Filters & SEO**
1. Test filter dropdowns (rating, date)
2. Apply filters → URL updates with params
3. Share filtered URL → Loads with filters applied
4. Check page meta tags in source

---

## Definition of Done

- [ ] Route `/business/:id/reviews` configured and working
- [ ] AllReviews component renders at route
- [ ] "View All Reviews" link visible in storefront
- [ ] Link shows review count
- [ ] Infinite scroll loads more reviews
- [ ] Filters and sorting work
- [ ] Page title and meta tags correct
- [ ] 404 shown for invalid business IDs
- [ ] Back navigation works
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
