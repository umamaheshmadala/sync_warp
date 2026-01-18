# Story 11.1.4: Implement Soft Delete for Reviews

**Epic:** [EPIC 11.1 - Reviews Core Fixes](../epics/EPIC_11.1_Reviews_Core_Fixes.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 0.5 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement soft delete for reviews instead of hard delete. When a user deletes their review, it should be hidden from public view but retained in the database for legal/compliance reasons. This ensures data integrity while honoring user requests to remove content.

---

## Problem Statement

### Current State
- Review deletion performs **hard delete** (removes row from database)
- No audit trail of deleted content
- Legal/compliance risk: Cannot provide evidence if disputes arise
- Business owners lose access to historical feedback data

### Desired State
- Reviews are **soft deleted** (marked with `deleted_at` timestamp)
- Deleted reviews hidden from all public views
- Admin can still access deleted reviews for moderation disputes
- Business can see "1 review was removed" count (optional)
- Data retained for legal compliance (configurable retention period)

---

## User Stories

### US-11.1.4.1: Soft Delete Review
**As a** user who wrote a review  
**I want to** delete my review  
**So that** it no longer appears publicly

**Acceptance Criteria:**
- [ ] Delete button available on user's own review
- [ ] Confirmation dialog: "Are you sure you want to delete this review?"
- [ ] After deletion, review disappears from public view immediately
- [ ] Review marked with `deleted_at` timestamp in database
- [ ] Review NOT removed from database (soft delete only)

---

### US-11.1.4.2: Hide Deleted Reviews from Public
**As a** customer viewing reviews  
**I want to** only see active reviews  
**So that** I'm not confused by deleted content

**Acceptance Criteria:**
- [ ] All review queries filter out `deleted_at IS NOT NULL`
- [ ] Review count excludes deleted reviews
- [ ] Review stats exclude deleted reviews
- [ ] Deleted reviews don't appear in any public feed

---

### US-11.1.4.3: Admin Access to Deleted Reviews
**As a** platform admin  
**I want to** access deleted reviews when needed  
**So that** I can investigate disputes and policy violations

**Acceptance Criteria:**
- [ ] Admin dashboard can toggle "Show deleted reviews"
- [ ] Deleted reviews show "(Deleted by user on [date])" label
- [ ] Admin can see original content of deleted review
- [ ] Admin cannot un-delete a review (user privacy)
- [ ] Audit log records admin access to deleted reviews

---

### US-11.1.4.4: User Can Re-review After Delete
**As a** user who deleted their review  
**I want to** write a new review for the same business  
**So that** I can share an updated experience

**Acceptance Criteria:**
- [ ] After deleting review, user sees "Write a Review" button again
- [ ] User can submit a completely new review
- [ ] New review is independent of deleted one
- [ ] UNIQUE constraint allows one ACTIVE review per user/business

---

## Technical Requirements

### Database Migration

**File:** `supabase/migrations/YYYYMMDD_implement_soft_delete_reviews.sql`

```sql
-- ============================================
-- MIGRATION: Implement Soft Delete for Reviews
-- Story: 11.1.4
-- ============================================

-- Ensure deleted_at column exists
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Ensure deleted_by column exists (for admin deletions)
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;

-- Ensure deletion_reason exists (for admin/moderation deletions)
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;

-- Drop the old UNIQUE constraint if it exists
ALTER TABLE business_reviews 
DROP CONSTRAINT IF EXISTS business_reviews_user_business_unique;

-- Create new UNIQUE constraint that only applies to non-deleted reviews
-- This allows users to have one active review per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_active_per_user_business
ON business_reviews (user_id, business_id)
WHERE deleted_at IS NULL;

-- Create index for efficient filtering of active reviews
CREATE INDEX IF NOT EXISTS idx_reviews_active
ON business_reviews (business_id)
WHERE deleted_at IS NULL;

-- Create index for admin queries on deleted reviews
CREATE INDEX IF NOT EXISTS idx_reviews_deleted
ON business_reviews (deleted_at)
WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude deleted reviews for regular users
DROP POLICY IF EXISTS "Users can view active reviews" ON business_reviews;
CREATE POLICY "Users can view active reviews" ON business_reviews
  FOR SELECT
  USING (deleted_at IS NULL OR auth.uid() = user_id);

-- Policy for admins to see all reviews including deleted
DROP POLICY IF EXISTS "Admins can view all reviews" ON business_reviews;
CREATE POLICY "Admins can view all reviews" ON business_reviews
  FOR SELECT
  USING (
    deleted_at IS NULL 
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can only "delete" (update deleted_at) their own reviews
DROP POLICY IF EXISTS "Users can soft delete own reviews" ON business_reviews;
CREATE POLICY "Users can soft delete own reviews" ON business_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND (
      -- Only allow setting deleted_at, not clearing it
      (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
      OR OLD.deleted_at = NEW.deleted_at
    )
  );
```

---

### Update Review Service

#### Modify `reviewService.ts`
**Location:** `src/services/reviewService.ts`

```typescript
/**
 * Soft delete a review
 * Marks the review as deleted without removing from database
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to delete a review');
  }
  
  // Verify ownership
  const { data: review, error: fetchError } = await supabase
    .from('business_reviews')
    .select('id, user_id, deleted_at')
    .eq('id', reviewId)
    .single();
  
  if (fetchError || !review) {
    throw new Error('Review not found');
  }
  
  if (review.user_id !== user.id) {
    throw new Error('You can only delete your own reviews');
  }
  
  if (review.deleted_at) {
    throw new Error('This review has already been deleted');
  }
  
  // Perform soft delete
  const { error: deleteError } = await supabase
    .from('business_reviews')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    })
    .eq('id', reviewId);
  
  if (deleteError) {
    console.error('[ReviewService] Soft delete error:', deleteError);
    throw new Error('Could not delete review. Please try again.');
  }
  
  console.log(`[ReviewService] Review ${reviewId} soft deleted by ${user.id}`);
}

/**
 * Get reviews for a business (excludes deleted reviews)
 */
export async function getBusinessReviews(
  businessId: string,
  options?: {
    includeDeleted?: boolean; // Only for admin use
  }
): Promise<Review[]> {
  let query = supabase
    .from('business_reviews')
    .select(`
      *,
      user:profiles!user_id (
        id, full_name, avatar_url
      ),
      response:business_review_responses (*)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  
  // Only include deleted if explicitly requested (admin only)
  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[ReviewService] Fetch error:', error);
    throw new Error('Could not load reviews');
  }
  
  return data || [];
}

/**
 * Admin: Get deleted reviews for moderation
 */
export async function getDeletedReviews(
  options?: {
    businessId?: string;
    userId?: string;
    limit?: number;
  }
): Promise<Review[]> {
  let query = supabase
    .from('business_reviews')
    .select(`
      *,
      user:profiles!user_id (id, full_name, avatar_url),
      business:businesses!business_id (id, name)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(options?.limit || 100);
  
  if (options?.businessId) {
    query = query.eq('business_id', options.businessId);
  }
  
  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[ReviewService] Fetch deleted error:', error);
    throw new Error('Could not load deleted reviews');
  }
  
  return data || [];
}
```

---

### Update Review Stats

#### Modify `useReviewStats.ts`
**Location:** `src/hooks/useReviewStats.ts`

```typescript
/**
 * Get review statistics (excludes deleted reviews)
 */
export function useReviewStats(businessId: string) {
  return useQuery({
    queryKey: ['review-stats', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_reviews')
        .select('recommendation')
        .eq('business_id', businessId)
        .is('deleted_at', null);  // IMPORTANT: Exclude deleted
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const recommended = data?.filter(r => r.recommendation === true).length || 0;
      const notRecommended = total - recommended;
      const recommendationPercentage = total > 0 
        ? Math.round((recommended / total) * 100) 
        : 0;
      
      return {
        total,
        recommended,
        notRecommended,
        recommendationPercentage
      };
    },
    enabled: !!businessId
  });
}
```

---

### Add Delete Confirmation Dialog

#### Create `DeleteReviewDialog.tsx`
**Location:** `src/components/reviews/DeleteReviewDialog.tsx`

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface DeleteReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteReviewDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isDeleting 
}: DeleteReviewDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Delete Review?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete your review? This action will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Remove the review from public view</li>
              <li>Update business review statistics</li>
              <li>Allow you to write a new review if you wish</li>
            </ul>
            <p className="mt-3 text-sm">
              <strong>Note:</strong> For legal compliance, review data is retained 
              in our system but will not be visible to anyone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Review'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

### Update ReviewCard with Delete Button

#### Modify `ReviewCard.tsx`
**Location:** `src/components/reviews/ReviewCard.tsx`

```tsx
// Add to ReviewCard component
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const { user } = useAuth();
const queryClient = useQueryClient();

const isOwner = user?.id === review.user_id;

const handleDelete = async () => {
  setIsDeleting(true);
  try {
    await deleteReview(review.id);
    toast.success('Review deleted');
    
    // Invalidate queries to refresh the UI
    queryClient.invalidateQueries(['business-reviews', review.business_id]);
    queryClient.invalidateQueries(['review-stats', review.business_id]);
    queryClient.invalidateQueries(['review-eligibility', review.business_id]);
    
    setShowDeleteDialog(false);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delete review');
  } finally {
    setIsDeleting(false);
  }
};

// In the render, add delete button for owner:
{isOwner && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreVertical className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
        <Pencil className="w-4 h-4 mr-2" />
        Edit Review
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        onClick={() => setShowDeleteDialog(true)}
        className="text-destructive"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Review
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}

<DeleteReviewDialog
  isOpen={showDeleteDialog}
  onClose={() => setShowDeleteDialog(false)}
  onConfirm={handleDelete}
  isDeleting={isDeleting}
/>
```

---

### Update Types

#### Modify `review.ts`
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
  updated_at: string | null;
  edit_count: number;
  deleted_at: string | null;    // ENSURE THIS EXISTS
  deleted_by: string | null;    // ADD THIS
  deletion_reason: string | null;  // ADD THIS (for admin/moderation)
  // ... other fields
}
```

---

## Testing Plan

### Unit Tests
**File:** `src/services/__tests__/reviewService.test.ts`

```typescript
describe('deleteReview (soft delete)', () => {
  it('marks review with deleted_at timestamp', async () => {
    await deleteReview('review-123');
    
    const { data } = await supabase
      .from('business_reviews')
      .select('deleted_at')
      .eq('id', 'review-123')
      .single();
    
    expect(data.deleted_at).not.toBeNull();
  });

  it('does not remove review from database', async () => {
    await deleteReview('review-123');
    
    // Direct query without RLS filter
    const { data } = await supabase
      .from('business_reviews')
      .select('id')
      .eq('id', 'review-123')
      .single();
    
    expect(data).not.toBeNull();
  });

  it('prevents deleting other user reviews', async () => {
    await expect(deleteReview('other-user-review'))
      .rejects.toThrow('You can only delete your own reviews');
  });

  it('prevents double deletion', async () => {
    await deleteReview('review-123');
    await expect(deleteReview('review-123'))
      .rejects.toThrow('already been deleted');
  });
});

describe('getBusinessReviews', () => {
  it('excludes deleted reviews by default', async () => {
    const reviews = await getBusinessReviews('business-123');
    const deletedReviews = reviews.filter(r => r.deleted_at !== null);
    expect(deletedReviews.length).toBe(0);
  });

  it('includes deleted reviews when requested by admin', async () => {
    const reviews = await getBusinessReviews('business-123', { includeDeleted: true });
    const hasDeleted = reviews.some(r => r.deleted_at !== null);
    expect(hasDeleted).toBe(true);
  });
});

describe('UNIQUE constraint with soft delete', () => {
  it('allows new review after deleting old one', async () => {
    // Delete existing review
    await deleteReview('old-review-123');
    
    // Create new review for same business
    const newReview = await submitReview({
      business_id: 'business-123',
      recommendation: true,
      text: 'New review!'
    });
    
    expect(newReview.id).toBeDefined();
  });

  it('prevents multiple active reviews for same business', async () => {
    // User already has active review
    await expect(submitReview({
      business_id: 'business-with-existing-review',
      recommendation: true
    })).rejects.toThrow();
  });
});
```

### Manual Testing Checklist
- [ ] Delete own review - disappears from public view
- [ ] Verify review still exists in database (admin query)
- [ ] Verify review stats update after deletion
- [ ] Verify "Write a Review" button appears after deletion
- [ ] Create new review after deleting old one
- [ ] Cannot delete other user's reviews
- [ ] Cannot delete same review twice
- [ ] Admin can see deleted reviews in dashboard
- [ ] RLS policies working correctly

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_soft_delete_reviews.sql` | CREATE | Add columns, indexes, update RLS |
| `src/services/reviewService.ts` | MODIFY | Add deleteReview, update queries |
| `src/components/reviews/DeleteReviewDialog.tsx` | CREATE | Confirmation dialog |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Add delete button and dialog |
| `src/hooks/useReviewStats.ts` | MODIFY | Filter deleted reviews |
| `src/types/review.ts` | MODIFY | Add deleted_by, deletion_reason |

---

## Definition of Done

- [ ] Soft delete implemented (sets deleted_at, doesn't remove row)
- [ ] Deleted reviews hidden from all public views
- [ ] Review stats exclude deleted reviews
- [ ] UNIQUE constraint allows new review after delete
- [ ] Delete confirmation dialog implemented
- [ ] Admin access to deleted reviews working
- [ ] RLS policies updated correctly
- [ ] All unit tests passing
- [ ] Manual testing complete
- [ ] Code reviewed and approved

---

## Compliance Note

Deleted review data will be retained for legal compliance. A separate data retention policy (Story 11.4.x or admin settings) can define:
- How long deleted reviews are retained
- Automated purge of old deleted reviews
- GDPR/privacy compliance for permanent deletion requests

---

**Story Owner:** Backend Engineering  
**Reviewer:** [TBD]
