# Story 11.4.1: Pre-Moderation System (Review Queue)

**Epic:** [EPIC 11.4 - Reviews Trust & Safety](../epics/EPIC_11.4_Reviews_Trust_Safety.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 4 days  
**Dependencies:** None  
**Status:** ✅ Completed

---

## Overview

Implement a pre-moderation system where all newly submitted reviews are held in a "pending" state until approved by an admin. This prevents fake, abusive, or spam reviews from appearing publicly, protecting both businesses and platform integrity.

---

## Problem Statement

### Current State
- Reviews appear immediately after submission
- No review before publication
- Fake/spam reviews visible to all users
- Business reputation can be damaged before moderation

### Desired State
- All reviews start in `pending` status
- Only admin-approved reviews visible publicly
- Reviewer sees "Pending Approval" badge on their review
- Admin notified of new reviews in queue
- Clear workflow for approve/reject

---

## User Stories

### US-11.4.1.1: Review Submission Creates Pending Status
**As a** user submitting a review  
**I want to** see my review marked as "Pending Approval"  
**So that** I understand it will be reviewed before publication

**Acceptance Criteria:**
- [x] New reviews have `moderation_status = 'pending'`
- [x] Reviewer sees their pending review in "My Reviews"
- [x] Review shows "⏳ Pending Approval" badge
- [x] Tooltip explains: "Your review will be visible after admin approval"
- [x] Review NOT visible to other users or business owner
- [x] Reviewer can still edit while pending

---

### US-11.4.1.2: Admin Approval Workflow
**As an** admin  
**I want to** approve or reject pending reviews  
**So that** only quality reviews are published

**Acceptance Criteria:**
- [x] Admin sees count of pending reviews in dashboard
- [x] Click to open moderation queue
- [x] Each review shows: content, photos, tags, reviewer info
- [x] "Approve" button → sets `moderation_status = 'approved'`
- [x] "Reject" button → opens rejection reason form
- [x] Rejection reason saved to `rejection_reason` column
- [x] Approved review immediately visible publicly
- [x] Audit log records admin action

---

### US-11.4.1.3: Review Visibility Rules
**As a** platform  
**I want to** control review visibility based on moderation status  
**So that** only approved content is publicly visible

**Acceptance Criteria:**
- [x] **Pending**: Visible ONLY to reviewer
- [x] **Approved**: Visible to all users
- [x] **Rejected**: Visible ONLY to reviewer with reason
- [x] Review counts exclude non-approved reviews
- [x] Business stats exclude non-approved reviews
- [x] All queries filter by `moderation_status = 'approved'`

---

### US-11.4.1.4: Reviewer Notification on Moderation
**As a** reviewer  
**I want to** be notified when my review is approved or rejected  
**So that** I know my review's status

**Acceptance Criteria:**
- [x] Push notification on approval: "Your review has been published!"
- [x] Push notification on rejection: "Your review was not approved"
- [x] In-app notification in notification center
- [x] Email notification (if enabled in preferences) - *Skipped (No Email Service)*
- [x] Rejected reviews show reason to reviewer

---

### US-11.4.1.5: Admin Queue Notifications
**As an** admin  
**I want to** be notified of new pending reviews  
**So that** I can review them promptly

**Acceptance Criteria:**
- [x] Badge count in admin header shows pending reviews
- [x] Daily digest email with pending review count - *Skipped (No Email Service)*
- [x] Real-time notification for new submissions (optional)
- [x] Queue sorted by submission time (oldest first)

---

## Technical Requirements

### Database Migration

**File:** `supabase/migrations/YYYYMMDD_add_review_moderation.sql`

```sql
-- ============================================
-- MIGRATION: Pre-Moderation System
-- Story: 11.4.1
-- ============================================

-- Step 1: Add moderation columns to business_reviews
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' 
  CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 2: Update existing reviews to 'approved' (grandfather clause)
UPDATE business_reviews 
SET moderation_status = 'approved', 
    moderated_at = created_at 
WHERE moderation_status IS NULL OR moderation_status = 'pending';

-- Step 3: Create index for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_pending 
ON business_reviews (created_at) 
WHERE moderation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status 
ON business_reviews (moderation_status);

-- Step 4: Update RLS policies for visibility rules
DROP POLICY IF EXISTS "Users can view approved reviews" ON business_reviews;
CREATE POLICY "Users can view approved reviews" ON business_reviews
  FOR SELECT
  USING (
    -- Approved reviews visible to all
    moderation_status = 'approved' AND deleted_at IS NULL
    -- OR own reviews (any status) visible to author
    OR (auth.uid() = user_id AND deleted_at IS NULL)
    -- OR admin can see all
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 5: Create moderation audit log
CREATE TABLE IF NOT EXISTS review_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES business_reviews(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'pending')),
  performed_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for audit log (admin only)
ALTER TABLE review_moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view moderation log" ON review_moderation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert moderation log" ON review_moderation_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### Moderation Service

**File:** `src/services/moderationService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface PendingReview {
  id: string;
  business_id: string;
  user_id: string;
  recommendation: boolean;
  text: string | null;
  tags: Array<{ id: string; label: string; icon: string }>;
  photo_urls: string[];
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  business: {
    id: string;
    name: string;
  };
}

export interface ModerationAction {
  reviewId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

/**
 * Get all pending reviews for admin moderation
 */
export async function getPendingReviews(): Promise<PendingReview[]> {
  const { data, error } = await supabase
    .from('business_reviews')
    .select(`
      *,
      user:profiles!user_id (id, full_name, avatar_url),
      business:businesses!business_id (id, name)
    `)
    .eq('moderation_status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: true }); // Oldest first (FIFO)
  
  if (error) {
    console.error('[ModerationService] Error fetching pending reviews:', error);
    throw new Error('Could not load pending reviews');
  }
  
  return data || [];
}

/**
 * Get count of pending reviews
 */
export async function getPendingReviewCount(): Promise<number> {
  const { count, error } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('moderation_status', 'pending')
    .is('deleted_at', null);
  
  if (error) {
    console.error('[ModerationService] Error fetching pending count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Approve a review
 */
export async function approveReview(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    throw new Error('Only admins can approve reviews');
  }
  
  // Update review status
  const { error: updateError } = await supabase
    .from('business_reviews')
    .update({
      moderation_status: 'approved',
      moderated_by: user.id,
      moderated_at: new Date().toISOString()
    })
    .eq('id', reviewId);
  
  if (updateError) throw new Error('Could not approve review');
  
  // Log action
  await supabase.from('review_moderation_log').insert({
    review_id: reviewId,
    action: 'approve',
    performed_by: user.id
  });
  
  // TODO: Send notification to reviewer
  await notifyReviewer(reviewId, 'approved');
}

/**
 * Reject a review
 */
export async function rejectReview(reviewId: string, reason: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    throw new Error('Only admins can reject reviews');
  }
  
  if (!reason || !reason.trim()) {
    throw new Error('Rejection reason is required');
  }
  
  // Update review status
  const { error: updateError } = await supabase
    .from('business_reviews')
    .update({
      moderation_status: 'rejected',
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
      rejection_reason: reason.trim()
    })
    .eq('id', reviewId);
  
  if (updateError) throw new Error('Could not reject review');
  
  // Log action
  await supabase.from('review_moderation_log').insert({
    review_id: reviewId,
    action: 'reject',
    performed_by: user.id,
    reason: reason.trim()
  });
  
  // TODO: Send notification to reviewer
  await notifyReviewer(reviewId, 'rejected', reason);
}

/**
 * Notify reviewer of moderation decision
 */
async function notifyReviewer(
  reviewId: string, 
  status: 'approved' | 'rejected',
  reason?: string
) {
  // Get review and user info
  const { data: review } = await supabase
    .from('business_reviews')
    .select('user_id, business:businesses!business_id(name)')
    .eq('id', reviewId)
    .single();
  
  if (!review) return;
  
  const message = status === 'approved'
    ? `Your review for "${review.business.name}" has been published!`
    : `Your review for "${review.business.name}" was not approved. Reason: ${reason}`;
  
  // Create in-app notification
  await supabase.from('notifications').insert({
    user_id: review.user_id,
    type: 'review_moderation',
    title: status === 'approved' ? 'Review Published' : 'Review Not Approved',
    message,
    data: { reviewId, status }
  });
  
  // TODO: Send push notification if enabled
  // await sendPushNotification(review.user_id, message);
}
```

---

### Update Review Service

**File:** `src/services/reviewService.ts` (modifications)

```typescript
// Add to submitReview function:
export async function submitReview(data: ReviewSubmission): Promise<Review> {
  // ... existing validation ...
  
  // Set initial moderation status to pending
  const { data: review, error } = await supabase
    .from('business_reviews')
    .insert({
      business_id: data.business_id,
      user_id: user.id,
      recommendation: data.recommendation,
      text: data.text?.trim() || null,
      tags: data.tags || [],
      photo_urls: data.photo_urls || [],
      word_count: wordCount,
      moderation_status: 'pending',  // NEW: Always start as pending
      edit_count: 0
    })
    .select('*')
    .single();
  
  if (error) throw new Error('Could not submit review');
  
  // Notify admins of new review (optional real-time)
  // This can be done via Supabase realtime or a queue
  
  return review;
}

// Update getBusinessReviews to filter by moderation_status:
export async function getBusinessReviews(businessId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('business_reviews')
    .select(`
      *,
      user:profiles!user_id (id, full_name, avatar_url),
      response:business_review_responses (*)
    `)
    .eq('business_id', businessId)
    .eq('moderation_status', 'approved')  // Only approved reviews
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error('Could not load reviews');
  return data || [];
}

// Update getUserReviews to show all statuses for own reviews:
export async function getUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('business_reviews')
    .select(`
      *,
      business:businesses!business_id (id, name, avatar_url)
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)  // Don't filter by moderation_status - show all own reviews
    .order('created_at', { ascending: false });
  
  if (error) throw new Error('Could not load reviews');
  return data || [];
}
```

---

### Pending Review Badge Component

**File:** `src/components/reviews/ModerationStatusBadge.tsx`

```tsx
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ModerationStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export function ModerationStatusBadge({ 
  status, 
  rejectionReason 
}: ModerationStatusBadgeProps) {
  if (status === 'approved') {
    // Don't show badge for approved reviews
    return null;
  }
  
  if (status === 'pending') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <Clock className="w-3 h-3 mr-1" />
              Pending Approval
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Your review will be visible after admin approval.</p>
            <p className="text-xs text-muted-foreground mt-1">
              This usually takes less than 24 hours.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (status === 'rejected') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              Not Approved
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This review was not approved.</p>
            {rejectionReason && (
              <p className="text-xs mt-1">Reason: {rejectionReason}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return null;
}
```

---

### Update ReviewCard for Moderation Status

**File:** `src/components/reviews/ReviewCard.tsx` (modifications)

```tsx
import { ModerationStatusBadge } from './ModerationStatusBadge';

// In ReviewCard component, add moderation badge:
export function ReviewCard({ review, isOwner }: ReviewCardProps) {
  return (
    <div className="...">
      {/* Header with user info */}
      <div className="flex items-start justify-between">
        <div>
          {/* User avatar and name */}
        </div>
        
        {/* Show moderation status for owner's reviews */}
        {isOwner && (
          <ModerationStatusBadge 
            status={review.moderation_status} 
            rejectionReason={review.rejection_reason}
          />
        )}
      </div>
      
      {/* Rest of review content */}
    </div>
  );
}
```

---

### Update Types

**File:** `src/types/review.ts`

```typescript
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  recommendation: boolean;
  text: string | null;
  tags: Array<{ id: string; label: string; icon: string }>;
  photo_urls: string[];
  created_at: string;
  updated_at: string | null;
  edit_count: number;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
  // Moderation fields
  moderation_status: ModerationStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  rejection_reason: string | null;
  // Relations
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  business?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  response?: ReviewResponse;
}
```

---

## Testing Plan

### Unit Tests

```typescript
describe('Moderation Service', () => {
  describe('submitReview', () => {
    it('creates review with pending status', async () => {
      const review = await submitReview({
        business_id: 'test-business',
        recommendation: true,
        text: 'Great!'
      });
      
      expect(review.moderation_status).toBe('pending');
    });
  });
  
  describe('approveReview', () => {
    it('sets status to approved and logs action', async () => {
      await approveReview('pending-review-id');
      
      const { data: review } = await supabase
        .from('business_reviews')
        .select('moderation_status, moderated_by, moderated_at')
        .eq('id', 'pending-review-id')
        .single();
      
      expect(review.moderation_status).toBe('approved');
      expect(review.moderated_by).toBeDefined();
      expect(review.moderated_at).toBeDefined();
    });
    
    it('rejects non-admin approval attempt', async () => {
      // Login as regular user
      await expect(approveReview('pending-review-id'))
        .rejects.toThrow('Only admins can approve');
    });
  });
  
  describe('rejectReview', () => {
    it('requires rejection reason', async () => {
      await expect(rejectReview('pending-review-id', ''))
        .rejects.toThrow('Rejection reason is required');
    });
    
    it('saves rejection reason and notifies user', async () => {
      await rejectReview('pending-review-id', 'Inappropriate content');
      
      const { data: review } = await supabase
        .from('business_reviews')
        .select('moderation_status, rejection_reason')
        .eq('id', 'pending-review-id')
        .single();
      
      expect(review.moderation_status).toBe('rejected');
      expect(review.rejection_reason).toBe('Inappropriate content');
    });
  });
});

describe('Review Visibility', () => {
  it('excludes pending reviews from public listings', async () => {
    const reviews = await getBusinessReviews('test-business');
    const pendingReviews = reviews.filter(r => r.moderation_status === 'pending');
    expect(pendingReviews.length).toBe(0);
  });
  
  it('shows all statuses in user\'s own reviews', async () => {
    const reviews = await getUserReviews('test-user');
    // Should include pending, approved, and rejected
    expect(reviews.some(r => r.moderation_status === 'pending')).toBe(true);
  });
});
```

### Manual Testing Checklist

- [ ] Submit a new review → Status is "pending"
- [ ] Reviewer sees "Pending Approval" badge
- [ ] Review NOT visible to other users
- [ ] Review NOT counted in business stats
- [ ] Admin sees review in moderation queue
- [ ] Admin clicks "Approve" → Review becomes visible
- [ ] Reviewer receives "Published" notification
- [ ] Admin clicks "Reject" with reason
- [ ] Reviewer sees "Not Approved" badge with reason
- [ ] Existing reviews remain "approved"
- [ ] Audit log records all actions

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_add_review_moderation.sql` | CREATE | Add moderation columns, RLS, audit log |
| `src/services/moderationService.ts` | CREATE | Approve/reject functions |
| `src/services/reviewService.ts` | MODIFY | Set pending status, filter queries |
| `src/components/reviews/ModerationStatusBadge.tsx` | CREATE | Status badge component |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Display moderation badge |
| `src/types/review.ts` | MODIFY | Add moderation types |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Check for existing moderation patterns in codebase
- [ ] Review RLS policy patterns
- [ ] Look for existing notification services
- [ ] Check admin role definitions
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

**Test Route 1: Review Submission**
1. Login as regular user
2. Submit a new review
3. Verify review status is "pending"
4. Verify review visible to reviewer with pending badge
5. Verify NOT visible in public storefront

**Test Route 2: Admin Approval**
1. Login as admin
2. Navigate to moderation queue
3. Find pending review → Approve it
4. Verify review now visible publicly
5. Verify reviewer received approval notification

**Test Route 3: Admin Rejection**
1. Find pending review → Reject with reason
2. Verify review not visible publicly
3. Verify reviewer received rejection notification
4. Check rejection reason stored in database

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

- [ ] All new reviews start with `moderation_status = 'pending'`
- [ ] Only `approved` reviews visible in public listings
- [ ] Reviewers see pending/rejected status on their reviews
- [ ] Admin can approve reviews from queue
- [ ] Admin can reject reviews with required reason
- [ ] Reviewer notified on moderation decision
- [ ] Audit log records all moderation actions
- [ ] Existing reviews marked as approved (migration)
- [ ] All unit tests passing
- [ ] RLS policies verified
- [ ] Manual testing complete
- [ ] Code reviewed and approved

---

**Story Owner:** Backend Engineering  
**Reviewer:** [TBD]
