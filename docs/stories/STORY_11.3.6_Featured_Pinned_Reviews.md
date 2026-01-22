# Story 11.3.6: Featured/Pinned Reviews

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟢 P2 - LOW  
**Effort:** 1 day  
**Dependencies:** None  
**Status:** ✅ Completed

---

## Overview

Allow business owners to pin/feature up to 3 reviews that appear at the top of their reviews section. Featured reviews are highlighted and shown before other reviews regardless of sort order.

---

## Problem Statement

### Current State
- All reviews sorted chronologically or by helpfulness
- Business cannot highlight best testimonials
- Excellent reviews may be buried

### Desired State
- Business can pin up to 3 reviews
- Pinned reviews appear first
- Visual distinction for featured reviews
- Easy pin/unpin interface

---

## User Stories

### US-11.3.6.1: Pin a Review
**As a** business owner  
**I want to** pin my best reviews  
**So that** new customers see them first

**Acceptance Criteria:**
- [x] "Pin" option in review card menu (owner only)
- [x] Maximum 3 pinned reviews per business
- [x] Confirmation when limit reached
- [x] Visual indicator: "📌 Featured" badge

---

### US-11.3.6.2: Unpin a Review
**As a** business owner  
**I want to** unpin reviews when I have better ones  
**So that** I can update my featured reviews

**Acceptance Criteria:**
- [x] "Unpin" option on pinned reviews
- [x] Instant removal from featured section
- [x] Review moves to normal chronological position

---

### US-11.3.6.3: Display Featured Reviews
**As a** customer viewing reviews  
**I want to** see featured reviews highlighted  
**So that** I can quickly find notable testimonials

**Acceptance Criteria:**
- [x] Featured section at top of reviews list
- [x] "Featured Reviews" header
- [x] Pinned icon on each featured review
- [x] Featured reviews excluded from main list (no duplicates)

---

## Technical Requirements

### Database Updates

```sql
-- Add featured column to reviews
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS featured_by UUID REFERENCES profiles(id);

-- Index for featured reviews
CREATE INDEX idx_featured_reviews 
ON business_reviews(business_id, is_featured) 
WHERE is_featured = TRUE;

-- Constraint: max 3 featured per business
CREATE OR REPLACE FUNCTION check_featured_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = TRUE THEN
    IF (
      SELECT COUNT(*) 
      FROM business_reviews 
      WHERE business_id = NEW.business_id 
        AND is_featured = TRUE 
        AND id != NEW.id
        AND deleted_at IS NULL
    ) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 featured reviews allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_featured_limit
BEFORE UPDATE ON business_reviews
FOR EACH ROW EXECUTE FUNCTION check_featured_limit();

-- RLS: Only business owner can feature
CREATE POLICY "Owner can feature reviews"
ON business_reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE id = business_reviews.business_id 
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE id = business_reviews.business_id 
    AND owner_id = auth.uid()
  )
);
```

---

### Service Layer

**File:** Update `src/services/reviewService.ts`

```typescript
/**
 * Feature/Pin a review (business owner only)
 */
export async function featureReview(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  // Check ownership via RLS
  const { error } = await supabase
    .from('business_reviews')
    .update({
      is_featured: true,
      featured_at: new Date().toISOString(),
      featured_by: user.id
    })
    .eq('id', reviewId);
  
  if (error) {
    if (error.message.includes('Maximum 3')) {
      throw new Error('You can only feature up to 3 reviews. Unpin one first.');
    }
    throw error;
  }
}

/**
 * Unfeature/Unpin a review
 */
export async function unfeatureReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('business_reviews')
    .update({
      is_featured: false,
      featured_at: null,
      featured_by: null
    })
    .eq('id', reviewId);
  
  if (error) throw error;
}

/**
 * Get featured reviews for a business
 */
export async function getFeaturedReviews(businessId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('business_reviews')
    .select(`
      *,
      user:profiles!user_id (id, full_name, avatar_url),
      response:business_review_responses (*)
    `)
    .eq('business_id', businessId)
    .eq('is_featured', true)
    .is('deleted_at', null)
    .order('featured_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}
```

---

### Featured Reviews Section Component

**File:** `src/components/reviews/FeaturedReviews.tsx`

```tsx
import { Pin } from 'lucide-react';
import ReviewCard from './ReviewCard';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedReviews } from '@/services/reviewService';

interface FeaturedReviewsProps {
  businessId: string;
  isOwner: boolean;
}

export function FeaturedReviews({ businessId, isOwner }: FeaturedReviewsProps) {
  const { data: featuredReviews = [] } = useQuery({
    queryKey: ['featured-reviews', businessId],
    queryFn: () => getFeaturedReviews(businessId)
  });
  
  if (featuredReviews.length === 0) return null;
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Pin className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Featured Reviews</h3>
      </div>
      
      <div className="space-y-4">
        {featuredReviews.map(review => (
          <ReviewCard 
            key={review.id}
            review={review}
            isFeatured={true}
            isOwner={isOwner}
            showFeaturedBadge={true}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### Update ReviewCard for Featured State

**Update `ReviewCard.tsx`:**

```tsx
interface ReviewCardProps {
  review: Review;
  isFeatured?: boolean;
  isOwner?: boolean;
  showFeaturedBadge?: boolean;
  onFeatureToggle?: () => void;
}

export default function ReviewCard({ 
  review, 
  isFeatured = false,
  isOwner = false,
  showFeaturedBadge = false,
  onFeatureToggle
}: ReviewCardProps) {
  const handleFeatureClick = async () => {
    try {
      if (isFeatured) {
        await unfeatureReview(review.id);
        toast.success('Review unpinned');
      } else {
        await featureReview(review.id);
        toast.success('Review pinned!');
      }
      onFeatureToggle?.();
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      isFeatured && 'border-primary bg-primary/5'
    )}>
      {/* Featured badge */}
      {showFeaturedBadge && (
        <div className="flex items-center gap-1 text-xs text-primary mb-2">
          <Pin className="w-3 h-3" />
          Featured
        </div>
      )}
      
      {/* ... rest of card content ... */}
      
      {/* Owner menu with feature option */}
      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleFeatureClick}>
              <Pin className="w-4 h-4 mr-2" />
              {isFeatured ? 'Unpin Review' : 'Pin Review'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
```

---

### Update BusinessReviews to Exclude Featured from Main List

```tsx
// In BusinessReviews.tsx:
const { data: allReviews } = useReviews(businessId);
const { data: featuredReviews } = useFeaturedReviews(businessId);

// Filter out featured from main list
const nonFeaturedReviews = allReviews.filter(
  r => !featuredReviews.some(f => f.id === r.id)
);

return (
  <div>
    <FeaturedReviews businessId={businessId} isOwner={isOwner} />
    
    <div className="space-y-4">
      {nonFeaturedReviews.map(review => (
        <ReviewCard key={review.id} review={review} isOwner={isOwner} />
      ))}
    </div>
  </div>
);
```

---

## Testing Plan

### Unit Tests

```typescript
describe('Feature/Unfeature Review', () => {
  it('pins a review', async () => {
    await featureReview(reviewId);
    
    const { data } = await supabase
      .from('business_reviews')
      .select('is_featured')
      .eq('id', reviewId)
      .single();
    
    expect(data.is_featured).toBe(true);
  });

  it('enforces 3 review limit', async () => {
    // Pin 3 reviews
    await featureReview(review1Id);
    await featureReview(review2Id);
    await featureReview(review3Id);
    
    // Try to pin 4th
    await expect(featureReview(review4Id))
      .rejects.toThrow(/Maximum 3/);
  });

  it('unpins and allows new pin', async () => {
    await unfeatureReview(review1Id);
    await expect(featureReview(review4Id)).resolves.not.toThrow();
  });
});

describe('FeaturedReviews Component', () => {
  it('shows featured section when reviews exist', () => {
    render(<FeaturedReviews businessId="123" isOwner={false} />);
    expect(screen.getByText('Featured Reviews')).toBeInTheDocument();
  });

  it('hides when no featured reviews', () => {
    render(<FeaturedReviews businessId="123-no-featured" isOwner={false} />);
    expect(screen.queryByText('Featured Reviews')).not.toBeInTheDocument();
  });
});
```

### Manual Testing Checklist
- [ ] Owner sees "Pin" option in menu
- [ ] Pinning shows success toast
- [ ] Pinned review appears in Featured section
- [ ] Featured badge visible
- [ ] Try to pin 4th - error shown
- [ ] Unpin removes from Featured
- [ ] Non-owners don't see pin option
- [ ] Featured reviews excluded from main list

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_featured_reviews.sql` | CREATE | Schema updates |
| `src/services/reviewService.ts` | MODIFY | Add feature functions |
| `src/components/reviews/FeaturedReviews.tsx` | CREATE | Featured section |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Add feature toggle |
| `src/components/reviews/BusinessReviews.tsx` | MODIFY | Exclude featured |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check for existing pin/featured patterns in codebase
- [ ] Review review card component structure
- [ ] Look for existing toggle/switch patterns
- [ ] Check business owner dashboard components
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

**Test Route 1: Pin Functionality**
1. Login as business owner
2. Navigate to business reviews
3. Find a positive review
4. Click "Pin" button → Review marked as pinned

**Test Route 2: Display Verification**
1. View business storefront as customer
2. Verify pinned reviews appear first
3. Check "Featured" badge visible
4. Verify max 3 pinned limit

**Test Route 3: Management**
1. Try pinning 4th review → Error/warning
2. Unpin a review → Moves to normal position
3. Verify only owner can pin their business reviews

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

- [x] Is_featured column added
- [x] Max 3 limit enforced
- [x] Pin/Unpin working for owners
- [x] Featured section displays correctly
- [x] Badge visible on featured reviews
- [x] Main list excludes featured
- [x] All tests passing
- [x] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
