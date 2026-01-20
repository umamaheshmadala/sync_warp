# Story 11.1.3: Remove 24-Hour Edit Window (Always Editable)

**Epic:** [EPIC 11.1 - Reviews Core Fixes](../epics/EPIC_11.1_Reviews_Core_Fixes.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 0.5 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Remove the current 24-hour edit window restriction, allowing users to edit their reviews at any time. When a review is edited, display an "(edited)" label with the timestamp of the last edit. This improves user experience while maintaining transparency.

---

## Problem Statement

### Current State
- `reviewService.ts` has `canEditReview()` function checking 24-hour window
- Users cannot edit reviews after 24 hours
- No "(edited)" indicator on modified reviews
- Poor UX: Users may realize they made a mistake after 24 hours

### Desired State
- Reviews are **always editable** by the author
- "(edited)" label with timestamp shows on edited reviews
- Edit count tracked in database for potential future use
- Maintains review integrity through edit history

---

## User Stories

### US-11.1.3.1: Always Allow Edit
**As a** user who wrote a review  
**I want to** edit my review at any time  
**So that** I can update my opinion as things change

**Acceptance Criteria:**
- [ ] Edit button always visible on user's own reviews
- [ ] No time-based restriction on editing
- [ ] Edit form pre-fills with existing review data
- [ ] All fields editable (recommendation, text, tags, photos)
- [ ] Edit saves successfully regardless of review age

---

### US-11.1.3.2: Show Edited Indicator
**As a** user viewing reviews  
**I want to** see when a review was edited  
**So that** I know the content may have changed since original posting

**Acceptance Criteria:**
- [ ] "(edited)" label appears next to review date
- [ ] Label shows timestamp: "(edited Jan 15, 2026 at 3:45 PM)"
- [ ] Only shows if review has been edited at least once
- [ ] Clicking label could show edit history (future enhancement, not required now)
- [ ] Label styling is subtle (muted color, smaller font)

---

### US-11.1.3.3: Track Edit Count
**As a** platform admin  
**I want to** track how many times a review was edited  
**So that** I can identify potentially problematic reviews

**Acceptance Criteria:**
- [ ] `edit_count` column exists in `business_reviews` table
- [ ] Counter increments with each edit
- [ ] Initial reviews have `edit_count = 0`
- [ ] Edit count visible in admin dashboard (future)
- [ ] Used for fraud detection signals (Story 11.4.4)

---

### US-11.1.3.4: Preserve Original Timestamp
**As a** user  
**I want my** review's original post date preserved  
**So that** readers know when I first reviewed the business

**Acceptance Criteria:**
- [ ] `created_at` remains unchanged on edit
- [ ] `updated_at` reflects last edit time
- [ ] Display shows: "Posted Jan 10, 2026 (edited Jan 15, 2026 at 3:45 PM)"
- [ ] If never edited, just shows: "Posted Jan 10, 2026"

---

## Technical Requirements

### Remove Time Restriction

#### Update `reviewService.ts`
**Location:** `src/services/reviewService.ts`

**BEFORE (Current - Remove/Modify):**
```typescript
/**
 * Check if user can edit their review (24-hour window)
 */
export function canEditReview(review: Review): boolean {
  const createdAt = new Date(review.created_at);
  const now = new Date();
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 24;
}
```

**AFTER (Updated):**
```typescript
/**
 * Check if user can edit their review
 * Reviews are always editable by the original author
 */
export function canEditReview(review: Review, userId: string): boolean {
  // Only the original author can edit
  return review.user_id === userId;
}

/**
 * Update an existing review
 * Increments edit count and updates timestamp
 */
export async function updateReview(
  reviewId: string,
  data: Partial<ReviewSubmission>
): Promise<Review> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to edit a review');
  }
  
  // Verify ownership
  const { data: existingReview } = await supabase
    .from('business_reviews')
    .select('user_id, edit_count')
    .eq('id', reviewId)
    .single();
  
  if (!existingReview || existingReview.user_id !== user.id) {
    throw new Error('You can only edit your own reviews');
  }
  
  // Update review with incremented edit count
  const { data: updatedReview, error } = await supabase
    .from('business_reviews')
    .update({
      ...data,
      edit_count: (existingReview.edit_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', reviewId)
    .select('*')
    .single();
  
  if (error) {
    console.error('[ReviewService] Update error:', error);
    throw new Error('Could not update review. Please try again.');
  }
  
  return updatedReview;
}
```

---

### Database Migration

**File:** `supabase/migrations/YYYYMMDD_add_review_edit_tracking.sql`

```sql
-- ============================================
-- MIGRATION: Add Review Edit Tracking
-- Story: 11.1.3
-- ============================================

-- Add edit_count column if not exists
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Ensure updated_at column exists
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing reviews to have edit_count = 0
UPDATE business_reviews 
SET edit_count = 0 
WHERE edit_count IS NULL;

-- Add NOT NULL constraint
ALTER TABLE business_reviews 
ALTER COLUMN edit_count SET NOT NULL;

-- Add CHECK constraint
ALTER TABLE business_reviews
ADD CONSTRAINT check_edit_count_positive CHECK (edit_count >= 0);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_review_updated_at ON business_reviews;
CREATE TRIGGER trigger_review_updated_at
BEFORE UPDATE ON business_reviews
FOR EACH ROW
EXECUTE FUNCTION update_review_timestamp();

-- Add index for admin queries (reviews with many edits may be suspicious)
CREATE INDEX IF NOT EXISTS idx_reviews_edit_count 
ON business_reviews(edit_count) 
WHERE edit_count > 0;
```

---

### Update ReviewCard Component

#### Modify `ReviewCard.tsx`
**Location:** `src/components/reviews/ReviewCard.tsx`

```tsx
// Add to imports
import { formatDistanceToNow, format } from 'date-fns';

// Add edited indicator component
interface EditedIndicatorProps {
  createdAt: string;
  updatedAt: string | null;
  editCount: number;
}

function EditedIndicator({ createdAt, updatedAt, editCount }: EditedIndicatorProps) {
  // Don't show if never edited
  if (!updatedAt || editCount === 0) {
    return null;
  }
  
  // Don't show if updated_at is essentially the same as created_at (< 1 minute)
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  if (updated.getTime() - created.getTime() < 60000) {
    return null;
  }
  
  const formattedDate = format(updated, "MMM d, yyyy 'at' h:mm a");
  
  return (
    <span 
      className="text-muted-foreground text-xs ml-2"
      title={`Edited ${editCount} time${editCount > 1 ? 's' : ''}`}
    >
      (edited {formattedDate})
    </span>
  );
}

// In ReviewCard component render:
<div className="flex items-baseline gap-1 text-sm text-muted-foreground">
  <span>Posted {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
  <EditedIndicator 
    createdAt={review.created_at}
    updatedAt={review.updated_at}
    editCount={review.edit_count}
  />
</div>
```

---

### Update Types

#### Update `review.ts`
**Location:** `src/types/review.ts`

```typescript
export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  recommendation: boolean;
  text: string | null;
  tags: string[];
  photo_urls: string[];
  created_at: string;
  updated_at: string | null;  // ADD THIS
  edit_count: number;          // ADD THIS
  deleted_at: string | null;
  // ... other existing fields
}
```

---

### Update Edit Flow in BusinessReviewForm

#### Modify `BusinessReviewForm.tsx`
**Location:** `src/components/reviews/BusinessReviewForm.tsx`

```tsx
// Add edit mode detection
interface BusinessReviewFormProps {
  businessId: string;
  existingReview?: Review;  // If provided, we're in edit mode
  onSuccess: () => void;
  onCancel: () => void;
}

export function BusinessReviewForm({ 
  businessId, 
  existingReview, 
  onSuccess, 
  onCancel 
}: BusinessReviewFormProps) {
  const isEditMode = !!existingReview;
  
  // Pre-fill form with existing data if editing
  const [recommendation, setRecommendation] = useState(
    existingReview?.recommendation ?? null
  );
  const [text, setText] = useState(existingReview?.text ?? '');
  const [tags, setTags] = useState<string[]>(existingReview?.tags ?? []);
  const [photos, setPhotos] = useState<string[]>(existingReview?.photo_urls ?? []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && existingReview) {
        // Update existing review
        await updateReview(existingReview.id, {
          recommendation,
          text,
          tags,
          photo_urls: photos
        });
        toast.success('Review updated!');
      } else {
        // Create new review
        await submitReview({
          business_id: businessId,
          recommendation,
          text,
          tags,
          photo_urls: photos
        });
        toast.success('Review submitted!');
      }
      
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>{isEditMode ? 'Edit Your Review' : 'Write a Review'}</h2>
      
      {isEditMode && (
        <p className="text-sm text-muted-foreground mb-4">
          Your review will be marked as edited after saving.
        </p>
      )}
      
      {/* ... rest of form fields ... */}
      
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditMode ? 'Save Changes' : 'Submit Review'}
        </Button>
      </div>
    </form>
  );
}
```

---

## UI/UX Specifications

### Edited Label Display
```
┌─────────────────────────────────────────────────────────────┐
│ ┌───────┐                                                   │
│ │ Avatar │  John Doe                                        │
│ └───────┘  Posted 5 days ago (edited Jan 15, 2026 at 3:45 PM)│
│                                                             │
│  👍 Recommends this business                                │
│                                                             │
│  "Great food and amazing service! Updated: tried the new   │
│   menu items and they're even better than before."         │
│                                                             │
│  Tags: [Great Value] [Friendly Staff] [Quick Service]       │
└─────────────────────────────────────────────────────────────┘
```

### Edited Label Styling
```css
.edited-indicator {
  color: var(--muted-foreground);
  font-size: 0.75rem; /* text-xs */
  font-style: italic;
  margin-left: 0.5rem;
}
```

---

## Testing Plan

### Unit Tests
**File:** `src/services/__tests__/reviewService.test.ts`

```typescript
describe('canEditReview', () => {
  it('returns true for review owner', () => {
    const review = { id: '1', user_id: 'user-123', created_at: '2020-01-01' };
    expect(canEditReview(review, 'user-123')).toBe(true);
  });

  it('returns false for non-owner', () => {
    const review = { id: '1', user_id: 'user-123', created_at: '2020-01-01' };
    expect(canEditReview(review, 'user-456')).toBe(false);
  });

  it('allows edit after 24 hours (no time restriction)', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30); // 30 days ago
    const review = { id: '1', user_id: 'user-123', created_at: oldDate.toISOString() };
    expect(canEditReview(review, 'user-123')).toBe(true);
  });
});

describe('updateReview', () => {
  it('increments edit count on update', async () => {
    const review = await updateReview('review-123', { text: 'Updated text' });
    expect(review.edit_count).toBe(1);
  });

  it('preserves created_at on update', async () => {
    const originalCreatedAt = '2026-01-01T00:00:00Z';
    const review = await updateReview('review-123', { text: 'Updated' });
    expect(review.created_at).toBe(originalCreatedAt);
  });

  it('updates updated_at on edit', async () => {
    const before = new Date();
    const review = await updateReview('review-123', { text: 'Updated' });
    const after = new Date();
    const updatedAt = new Date(review.updated_at);
    expect(updatedAt >= before && updatedAt <= after).toBe(true);
  });

  it('rejects edit by non-owner', async () => {
    await expect(updateReview('other-user-review', { text: 'Hacked' }))
      .rejects.toThrow('You can only edit your own reviews');
  });
});
```

### Component Tests
```typescript
describe('EditedIndicator', () => {
  it('shows nothing if never edited', () => {
    render(<EditedIndicator createdAt="2026-01-01" updatedAt={null} editCount={0} />);
    expect(screen.queryByText(/edited/i)).not.toBeInTheDocument();
  });

  it('shows edited label with timestamp', () => {
    render(
      <EditedIndicator 
        createdAt="2026-01-01T10:00:00Z" 
        updatedAt="2026-01-15T15:45:00Z" 
        editCount={1} 
      />
    );
    expect(screen.getByText(/edited Jan 15, 2026 at 3:45 PM/i)).toBeInTheDocument();
  });

  it('shows tooltip with edit count', () => {
    render(
      <EditedIndicator 
        createdAt="2026-01-01T10:00:00Z" 
        updatedAt="2026-01-15T15:45:00Z" 
        editCount={3} 
      />
    );
    expect(screen.getByTitle('Edited 3 times')).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist
- [ ] Create a new review and verify edit_count = 0
- [ ] Edit review within 24 hours - verify works
- [ ] Edit review AFTER 24 hours - verify still works
- [ ] Verify "(edited [timestamp])" appears after edit
- [ ] Verify original "Posted" date unchanged
- [ ] Verify edit_count increments with each edit
- [ ] Test editing all fields (recommendation, text, tags, photos)
- [ ] Verify non-owner cannot see edit button
- [ ] Verify database trigger updates updated_at automatically

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/reviewService.ts` | MODIFY | Remove 24-hour check, add edit tracking |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Add EditedIndicator component |
| `src/components/reviews/BusinessReviewForm.tsx` | MODIFY | Support edit mode |
| `src/types/review.ts` | MODIFY | Add updated_at, edit_count fields |
| `supabase/migrations/xxx_add_review_edit_tracking.sql` | CREATE | Add columns and trigger |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Search for similar edit patterns in existing codebase
- [ ] Check `src/components/reviews/` for existing edit functionality
- [ ] Review `src/services/reviewService.ts` for update patterns
- [ ] Look for existing timestamp/label patterns (e.g., "(edited)" labels elsewhere)
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

**Test Route 1: Edit Functionality**
1. Create a new review
2. Wait for approved status (or use pending review)
3. Click Edit → Should open edit modal
4. Modify content and save
5. Verify "(edited)" label appears

**Test Route 2: Edit Tracking**
1. Edit a review multiple times
2. Verify edit_count increments correctly
3. Check updated_at timestamp updates
4. Verify edit history is tracked

**Test Route 3: Edge Cases**
1. Edit immediately after creation
2. Edit after response from business owner
3. Verify edited review still visible in all views

---

## Definition of Done

- [ ] 24-hour edit restriction removed
- [ ] `edit_count` column added to database
- [ ] `updated_at` column properly updated on edit
- [ ] "(edited [timestamp])" label displays on edited reviews
- [ ] Original `created_at` preserved after edits
- [ ] Edit works for reviews of any age
- [ ] Only review author can edit
- [ ] All unit tests passing
- [ ] Database migration applied successfully
- [ ] Manual testing complete
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
