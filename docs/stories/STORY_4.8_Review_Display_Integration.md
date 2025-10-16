# Story 4.8: Review Display Integration - COMPLETE SPECIFICATION

**Epic:** 4 - Business Features  
**Priority:** 🔴 **CRITICAL** (MVP Blocker)  
**Effort:** 2-3 days  
**Dependencies:** Story 4.6 (Reviews & Ratings Backend)

---

## 📋 Overview

This story implements the customer-facing review display system on business storefronts. While the backend review system exists (Story 4.6), customers currently cannot see reviews when browsing businesses. This adds review visibility, filtering, sorting, and interactive features to enhance social proof.

---

## 🎯 Mermaid Nodes Covered (6/6)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `n10` | Reviews (Recent) | Display recent reviews on storefront | ✅ Specified |
| `n10_Empty` | No reviews yet | Empty state when no reviews exist | ✅ Specified |
| `n96` | All Reviews Page | Complete reviews list with filters | ✅ Specified |
| `n97` | Review Detail View | Individual review with full content | ✅ Specified |
| `n98` | Sort Reviews | Sort by recent/rating/helpful | ✅ Specified |
| `n99` | Filter Reviews | Filter by rating (1-5 stars) | ✅ Specified |

**Coverage:** 6/6 nodes (100%)

---

## 💡 User Stories

### Primary User Story
**As a** customer browsing a business storefront  
**I want to** see recent customer reviews and ratings  
**So that** I can make informed decisions about visiting the business

### Secondary User Stories
1. **As a** customer, **I want to** see all reviews for a business **so that** I can read detailed feedback
2. **As a** customer, **I want to** sort reviews by date, rating, or helpfulness **so that** I can find relevant reviews
3. **As a** customer, **I want to** filter reviews by star rating **so that** I can focus on specific experiences
4. **As a** customer, **I want to** see review statistics **so that** I can understand overall sentiment

---

## 🎨 UI Components

### 1. ReviewsSection Component (`ReviewsSection.tsx`)

**Location:** `src/components/reviews/ReviewsSection.tsx`

**Purpose:** Display recent reviews on business storefront (limit 3-5)

**Props:**
```typescript
interface ReviewsSectionProps {
  businessId: string;
  limit?: number; // Default: 5
  showViewAll?: boolean; // Default: true
}
```

**Features:**
- Display 5 most recent reviews
- Overall rating summary (average + count)
- Rating distribution bar chart
- Individual review cards (compact format)
- "View All Reviews" button if more than 5 exist
- Empty state when no reviews
- Loading skeleton

**Layout:**
```
┌─────────────────────────────────────────┐
│  Customer Reviews                       │
│  ⭐ 4.5 (128 reviews)                   │
├─────────────────────────────────────────┤
│  Rating Breakdown:                      │
│  ⭐⭐⭐⭐⭐ ████████████████████ 89       │
│  ⭐⭐⭐⭐   ████████░░░░░░░░░░ 25       │
│  ⭐⭐⭐     ███░░░░░░░░░░░░░░░ 10       │
│  ⭐⭐       ██░░░░░░░░░░░░░░░░  3       │
│  ⭐         █░░░░░░░░░░░░░░░░░  1       │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │ ⭐⭐⭐⭐⭐  John D.  •  2 days ago   │ │
│  │ "Great service and..."            │ │
│  │ 👍 12  💬 Reply                    │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ ⭐⭐⭐⭐   Sarah M.  •  1 week ago  │ │
│  │ "Good experience overall..."       │ │
│  │ 👍 8  💬 Reply                     │ │
│  └───────────────────────────────────┘ │
│  [... 3 more reviews ...]              │
├─────────────────────────────────────────┤
│       [View All 128 Reviews →]          │
└─────────────────────────────────────────┘
```

---

### 2. ReviewCard Component (`ReviewCard.tsx`)

**Location:** `src/components/reviews/ReviewCard.tsx`

**Purpose:** Reusable review card for lists and grids

**Props:**
```typescript
interface ReviewCardProps {
  review: Review;
  variant?: 'compact' | 'full'; // Default: compact
  showReplyButton?: boolean; // Default: false (only business owner)
  onReplyClick?: () => void;
}

interface Review {
  id: string;
  business_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number; // 1-5
  comment: string;
  created_at: string;
  helpful_count: number;
  has_business_reply: boolean;
  business_reply?: {
    text: string;
    created_at: string;
  };
}
```

**Features:**
- User avatar with fallback (initials)
- Star rating display
- User name and relative time
- Review text (truncated in compact mode, full in detail)
- Helpful count with thumbs up icon
- Business reply indicator/display
- Reply button (business owner only)
- Click to expand to detail view

**Compact Layout:**
```
┌─────────────────────────────────────────┐
│  [👤]  John Doe  •  ⭐⭐⭐⭐⭐  •  2d ago│
│  "Excellent service and quality         │
│   products. Highly recommend!"          │
│  👍 12   [💬 Business replied]          │
└─────────────────────────────────────────┘
```

**Full Layout:**
```
┌─────────────────────────────────────────┐
│  [👤]  John Doe                         │
│  ⭐⭐⭐⭐⭐  •  March 15, 2025  •  2:30 PM│
├─────────────────────────────────────────┤
│  "Excellent service and quality         │
│   products. The staff was very helpful  │
│   and I found exactly what I needed.    │
│   The store was clean and well          │
│   organized. Highly recommend!"         │
├─────────────────────────────────────────┤
│  👍 12 people found this helpful        │
├─────────────────────────────────────────┤
│  💬 Business Reply (March 16, 2025):    │
│  "Thank you for your kind words! We     │
│   appreciate your feedback."            │
└─────────────────────────────────────────┘
```

---

### 3. AllReviews Component (`AllReviews.tsx`)

**Location:** `src/components/reviews/AllReviews.tsx`

**Purpose:** Complete reviews list with sorting and filtering

**Route:** `/business/:businessId/reviews`

**Features:**
- Full review list with pagination (10 per page)
- Sort options:
  - Most Recent (default)
  - Highest Rating
  - Lowest Rating
  - Most Helpful
- Filter by star rating (5★, 4★, 3★, 2★, 1★, All)
- Rating summary at top
- Empty state with CTA to write first review
- Back to storefront button

**Layout:**
```
┌─────────────────────────────────────────┐
│  [← Back]  All Reviews (128)           │
├─────────────────────────────────────────┤
│  ⭐ 4.5 average  •  128 reviews         │
│  [Write a Review]                       │
├─────────────────────────────────────────┤
│  Filter:  [All] [5★] [4★] [3★] [2★] [1★]│
│  Sort:    [Most Recent ▼]              │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │ Review Card (Full)                │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Review Card (Full)                │ │
│  └───────────────────────────────────┘ │
│  [... 8 more reviews ...]              │
├─────────────────────────────────────────┤
│  [← Previous] Page 1 of 13 [Next →]    │
└─────────────────────────────────────────┘
```

---

### 4. ReviewStats Component (`ReviewStats.tsx`)

**Location:** `src/components/reviews/ReviewStats.tsx`

**Purpose:** Display rating breakdown and statistics

**Props:**
```typescript
interface ReviewStatsProps {
  businessId: string;
  variant?: 'summary' | 'detailed'; // Default: summary
}

interface ReviewStatistics {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
```

**Features:**
- Average rating (large display)
- Total review count
- Rating distribution (horizontal bar chart)
- Percentage calculation
- Click on bar to filter by that rating

---

### 5. EmptyReviews Component (`EmptyReviews.tsx`)

**Location:** `src/components/reviews/EmptyReviews.tsx`

**Purpose:** Empty state for businesses with no reviews

**Features:**
- Friendly empty state illustration
- Message: "No reviews yet"
- Subtext: "Be the first to share your experience!"
- CTA button: "Write a Review" (if user has checked in)

**Layout:**
```
┌─────────────────────────────────────────┐
│              📝                         │
│                                         │
│        No reviews yet                   │
│                                         │
│  Be the first to share your experience! │
│                                         │
│        [Write a Review]                 │
└─────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Routing Configuration

**Add to `Router.tsx`:**
```typescript
// Review routes
{
  path: '/business/:businessId/reviews',
  element: <ProtectedRoute><AllReviews /></ProtectedRoute>
}
```

---

### Database Queries

#### Fetch Recent Reviews (with pagination)

```typescript
async function fetchReviews({
  businessId,
  limit = 10,
  offset = 0,
  sortBy = 'created_at',
  sortOrder = 'desc',
  filterRating = null
}: FetchReviewsParams) {
  let query = supabase
    .from('reviews')
    .select(`
      *,
      profiles:user_id (
        display_name,
        avatar_url
      ),
      business_replies (
        text,
        created_at
      )
    `, { count: 'exact' })
    .eq('business_id', businessId);

  // Filter by rating if specified
  if (filterRating) {
    query = query.eq('rating', filterRating);
  }

  // Sorting
  if (sortBy === 'helpful') {
    query = query.order('helpful_count', { ascending: false });
  } else if (sortBy === 'rating') {
    query = query.order('rating', { ascending: sortOrder === 'asc' });
  } else {
    query = query.order('created_at', { ascending: sortOrder === 'asc' });
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  return await query;
}
```

#### Fetch Review Statistics

```typescript
async function fetchReviewStats(businessId: string) {
  const { data, error } = await supabase
    .rpc('get_review_statistics', { business_id: businessId });

  return {
    average_rating: data?.average_rating || 0,
    total_reviews: data?.total_reviews || 0,
    rating_distribution: {
      5: data?.five_star || 0,
      4: data?.four_star || 0,
      3: data?.three_star || 0,
      2: data?.two_star || 0,
      1: data?.one_star || 0
    }
  };
}
```

#### Database Function for Statistics

```sql
-- Create function to calculate review statistics
CREATE OR REPLACE FUNCTION get_review_statistics(business_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'average_rating', COALESCE(AVG(rating), 0),
    'total_reviews', COUNT(*),
    'five_star', COUNT(*) FILTER (WHERE rating = 5),
    'four_star', COUNT(*) FILTER (WHERE rating = 4),
    'three_star', COUNT(*) FILTER (WHERE rating = 3),
    'two_star', COUNT(*) FILTER (WHERE rating = 2),
    'one_star', COUNT(*) FILTER (WHERE rating = 1)
  )
  INTO result
  FROM reviews
  WHERE reviews.business_id = $1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Custom Hooks

#### 1. `useReviews.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseReviewsProps {
  businessId: string;
  limit?: number;
  sortBy?: 'created_at' | 'rating' | 'helpful';
  sortOrder?: 'asc' | 'desc';
  filterRating?: number | null;
}

export function useReviews({
  businessId,
  limit = 10,
  sortBy = 'created_at',
  sortOrder = 'desc',
  filterRating = null
}: UseReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * limit;

      let query = supabase
        .from('reviews')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url),
          business_replies (text, created_at)
        `, { count: 'exact' })
        .eq('business_id', businessId);

      if (filterRating) {
        query = query.eq('rating', filterRating);
      }

      if (sortBy === 'helpful') {
        query = query.order('helpful_count', { ascending: false });
      } else if (sortBy === 'rating') {
        query = query.order('rating', { ascending: sortOrder === 'asc' });
      } else {
        query = query.order('created_at', { ascending: sortOrder === 'asc' });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setReviews(data || []);
        setTotalCount(count || 0);
      }

      setLoading(false);
    }

    if (businessId) {
      fetchReviews();
    }
  }, [businessId, limit, sortBy, sortOrder, filterRating, page]);

  return {
    reviews,
    loading,
    error,
    totalCount,
    page,
    setPage,
    totalPages: Math.ceil(totalCount / limit)
  };
}
```

#### 2. `useReviewStats.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useReviewStats(businessId: string) {
  const [stats, setStats] = useState<ReviewStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_review_statistics', { business_id: businessId });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setStats({
          average_rating: data?.average_rating || 0,
          total_reviews: data?.total_reviews || 0,
          rating_distribution: {
            5: data?.five_star || 0,
            4: data?.four_star || 0,
            3: data?.three_star || 0,
            2: data?.two_star || 0,
            1: data?.one_star || 0
          }
        });
      }

      setLoading(false);
    }

    if (businessId) {
      fetchStats();
    }
  }, [businessId]);

  return { stats, loading, error };
}
```

#### 3. `useMarkHelpful.ts`

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useMarkHelpful() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function markHelpful(reviewId: string): Promise<boolean> {
    if (!user) return false;

    setLoading(true);

    try {
      // Check if already marked helpful
      const { data: existing } = await supabase
        .from('review_helpful')
        .select('id')
        .eq('user_id', user.id)
        .eq('review_id', reviewId)
        .single();

      if (existing) {
        // Already marked - do nothing
        return false;
      }

      // Mark as helpful
      await supabase
        .from('review_helpful')
        .insert({
          user_id: user.id,
          review_id: reviewId
        });

      // Increment helpful count
      await supabase.rpc('increment_review_helpful', { review_id: reviewId });

      return true;
    } finally {
      setLoading(false);
    }
  }

  return { markHelpful, loading };
}
```

---

## 🔄 Integration with Existing Components

### Update `BusinessProfile.tsx`

**Add ReviewsSection after products:**
```typescript
import ReviewsSection from '@/components/reviews/ReviewsSection';

function BusinessProfile({ businessId }: Props) {
  return (
    <div>
      {/* Existing business info */}
      {/* Products section */}
      
      {/* NEW: Reviews Section */}
      <section className="reviews-section">
        <ReviewsSection 
          businessId={businessId}
          limit={5}
          showViewAll={true}
        />
      </section>
      
      {/* Existing offers, etc */}
    </div>
  );
}
```

### Add Database Table for Helpful Tracking

```sql
-- Track which users marked reviews as helpful
CREATE TABLE review_helpful (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, review_id)
);

CREATE INDEX idx_review_helpful_user ON review_helpful(user_id);
CREATE INDEX idx_review_helpful_review ON review_helpful(review_id);

-- RLS Policies
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view helpful marks"
  ON review_helpful FOR SELECT
  USING (true);

CREATE POLICY "Users can mark reviews as helpful"
  ON review_helpful FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to increment helpful count
CREATE OR REPLACE FUNCTION increment_review_helpful(review_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reviews
  SET helpful_count = helpful_count + 1
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🧪 Testing Requirements

### Unit Tests

```typescript
describe('ReviewsSection', () => {
  test('displays recent reviews correctly', async () => {
    const { findAllByTestId } = render(
      <ReviewsSection businessId="test" limit={5} />
    );
    const reviews = await findAllByTestId('review-card');
    expect(reviews.length).toBeLessThanOrEqual(5);
  });

  test('shows rating statistics', async () => {
    const { findByText } = render(
      <ReviewsSection businessId="test" />
    );
    expect(await findByText(/average/i)).toBeInTheDocument();
  });

  test('shows empty state when no reviews', async () => {
    const { findByText } = render(
      <ReviewsSection businessId="empty" />
    );
    expect(await findByText(/No reviews yet/i)).toBeInTheDocument();
  });
});

describe('useReviews hook', () => {
  test('fetches and paginates reviews', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useReviews({ businessId: 'test', limit: 10 })
    );

    await waitForNextUpdate();

    expect(result.current.reviews).toHaveLength(10);
    expect(result.current.totalPages).toBeGreaterThan(0);
  });

  test('filters by rating', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useReviews({ businessId: 'test', filterRating: 5 })
    );

    await waitForNextUpdate();

    expect(result.current.reviews.every(r => r.rating === 5)).toBe(true);
  });
});
```

### E2E Tests (Playwright)

```typescript
test('customer can view and filter reviews', async ({ page }) => {
  await page.goto('/business/test-business-id');
  
  // Verify reviews section exists
  await expect(page.locator('[data-testid="reviews-section"]')).toBeVisible();
  
  // Verify rating summary
  await expect(page.locator('[data-testid="average-rating"]')).toContainText(/\d\.\d/);
  
  // Click "View All Reviews"
  await page.click('text=View All');
  
  // Verify all reviews page
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(page.locator('h1')).toContainText('Reviews');
  
  // Test filter by 5 stars
  await page.click('[data-testid="filter-5-stars"]');
  const reviewCards = page.locator('[data-testid="review-card"]');
  const ratingTexts = await reviewCards.locator('[data-testid="rating"]').allTextContents();
  expect(ratingTexts.every(t => t.includes('5'))).toBe(true);
  
  // Test sort by highest rating
  await page.selectOption('[data-testid="sort-select"]', 'rating-desc');
  await page.waitForLoadState('networkidle');
  
  // Verify sorting worked
  const ratings = await page.locator('[data-testid="rating-value"]').allTextContents();
  const ratingsNum = ratings.map(r => parseFloat(r));
  expect(ratingsNum).toEqual([...ratingsNum].sort((a, b) => b - a));
});
```

---

## ✅ Acceptance Criteria

### Functional Requirements
- [x] Storefront displays 5 most recent reviews
- [x] Rating summary shows average and count
- [x] Rating distribution bar chart displayed
- [x] "View All Reviews" button navigates to full list
- [x] All reviews page shows complete list with pagination
- [x] Reviews can be sorted (recent, rating, helpful)
- [x] Reviews can be filtered by star rating (1-5)
- [x] Empty state shown when no reviews
- [x] Users can mark reviews as helpful
- [x] Business replies displayed below reviews

### Non-Functional Requirements
- [x] Reviews load with smooth transitions
- [x] Responsive on mobile and desktop
- [x] Loading states during data fetch
- [x] Error handling with user-friendly messages
- [x] Accessible (WCAG 2.1 AA)
- [x] Pagination prevents large data loads

### Performance Requirements
- [x] Reviews section loads < 1s
- [x] Sorting/filtering responds instantly
- [x] Statistics calculated efficiently (DB function)

---

## 📝 Implementation Phases

### Phase 1: Core Display (Day 1)
- [ ] Create `ReviewCard.tsx` component
- [ ] Create `ReviewsSection.tsx` component
- [ ] Create `useReviews.ts` hook
- [ ] Create `useReviewStats.ts` hook
- [ ] Integrate ReviewsSection into `BusinessProfile.tsx`
- [ ] Test basic display

### Phase 2: Statistics & Empty States (Day 1-2)
- [ ] Create `ReviewStats.tsx` component
- [ ] Create `EmptyReviews.tsx` component
- [ ] Add rating distribution bar chart
- [ ] Create `get_review_statistics()` DB function
- [ ] Test statistics calculation

### Phase 3: All Reviews Page (Day 2)
- [ ] Create `AllReviews.tsx` page
- [ ] Add routing for all reviews
- [ ] Implement pagination
- [ ] Test review list flow

### Phase 4: Sorting & Filtering (Day 2-3)
- [ ] Implement sort dropdown (recent, rating, helpful)
- [ ] Implement rating filter buttons (1-5 stars)
- [ ] Update `useReviews` hook for sort/filter
- [ ] Test all combinations

### Phase 5: Helpful Feature (Day 3)
- [ ] Create `review_helpful` table + RLS
- [ ] Implement `useMarkHelpful.ts` hook
- [ ] Add helpful button to review cards
- [ ] Create `increment_review_helpful()` DB function
- [ ] Add toast notifications
- [ ] Test helpful tracking

---

## 🔗 Related Documentation

- [Story 4.6: Reviews & Ratings](./STORY_4.6_Reviews_Ratings.md) (Backend)
- [Story 4.3: GPS Check-in](./STORY_4.3_GPS_Checkin.md) (Review prerequisite)
- [Database Schema: Reviews](../database/schema_reviews.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Mermaid Coverage:** 6/6 nodes (100%)  
**Ready for Implementation:** ✅ YES

---

*Last Updated: October 16, 2025*  
*Next Review: After implementation completion*
