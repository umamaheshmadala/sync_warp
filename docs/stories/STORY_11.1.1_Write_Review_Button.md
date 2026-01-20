# Story 11.1.1: Add Write Review Button to Storefront

**Epic:** [EPIC 11.1 - Reviews Core Fixes](../epics/EPIC_11.1_Reviews_Core_Fixes.md)  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Add a prominent "Write Review" button to the Reviews tab of the business storefront. Currently, the `BusinessReviewForm.tsx` component exists but is NOT surfaced to users, making it impossible for customers to submit reviews. This is a critical blocker for the entire reviews module.

---

## Problem Statement

### Current State
- The `BusinessReviewForm.tsx` component is fully implemented (~14KB)
- The Reviews tab displays existing reviews via `BusinessReviews.tsx`
- **NO "Write Review" button is visible** to customers
- Users have no way to submit reviews from the storefront

### Impact
- Zero new reviews being submitted
- Reviews module is effectively non-functional
- Business owners receive no customer feedback

---

## User Stories

### US-11.1.1.1: Write Review Button Visibility
**As a** customer viewing a business storefront  
**I want to** see a clear "Write Review" button in the Reviews tab  
**So that** I can easily submit a review for this business

**Acceptance Criteria:**
- [ ] "Write Review" button is visible in the Reviews tab
- [ ] Button appears at the TOP of the reviews section (before review list)
- [ ] Button has prominent styling (primary color, icon + text)
- [ ] Button uses the existing SynC design system
- [ ] Button text: "Write a Review" with a ✏️ or star icon

---

### US-11.1.1.2: Button State - Not Logged In
**As a** guest user (not logged in)  
**I want to** see the Write Review button prompts me to login  
**So that** I understand I need an account to leave reviews

**Acceptance Criteria:**
- [ ] Button is visible but shows different state for guests
- [ ] Clicking button redirects to login page
- [ ] After login, user returns to the same storefront Reviews tab
- [ ] Toast message: "Please log in to write a review"

---

### US-11.1.1.3: Button State - No Check-in
**As a** logged-in user who hasn't checked in  
**I want to** understand that I need to check in first  
**So that** I know why I cannot write a review

**Acceptance Criteria:**
- [ ] Button shows "Check in to review" tooltip on hover
- [ ] Clicking button shows modal: "You need to check in at this business first to leave a review"
- [ ] Modal includes a "Check In Now" button (if GPS available)
- [ ] Modal explains GPS verification requirement
- [ ] Button is visually distinct (outline/secondary style)

---

### US-11.1.1.4: Button State - Eligible to Review
**As a** logged-in user with a valid check-in  
**I want to** click the button and open the review form  
**So that** I can submit my review

**Acceptance Criteria:**
- [ ] Button is fully enabled (primary style)
- [ ] Clicking opens `BusinessReviewForm.tsx` in a modal/drawer
- [ ] Form pre-populates business ID
- [ ] GPS check-in verification passes silently
- [ ] Form remembers any previously entered draft

---

### US-11.1.1.5: Button State - Already Reviewed
**As a** user who has already reviewed this business  
**I want to** see that I've already reviewed and can edit  
**So that** I can update my existing review if needed

**Acceptance Criteria:**
- [ ] Button text changes to "Edit Your Review"
- [ ] Button icon changes to edit icon (✏️)
- [ ] Clicking opens form with existing review data pre-filled
- [ ] User can modify and resubmit
- [ ] Original review timestamp is preserved, edit timestamp added

---

## Technical Requirements

### Component Changes

#### 1. Modify `BusinessReviews.tsx`
**Location:** `src/components/reviews/BusinessReviews.tsx`

```tsx
// Add imports
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCheckIn } from '@/hooks/useCheckIn';
import { Pencil, Star, MapPin } from 'lucide-react';

// Add state for review form modal
const [showReviewForm, setShowReviewForm] = useState(false);

// Add button logic
const { user } = useAuth();
const { hasCheckedIn } = useCheckIn(businessId);
const { existingReview } = useReviews(businessId, user?.id);

// Determine button state
type ButtonState = 'not-logged-in' | 'no-checkin' | 'can-review' | 'already-reviewed';

const getButtonState = (): ButtonState => {
  if (!user) return 'not-logged-in';
  if (!hasCheckedIn) return 'no-checkin';
  if (existingReview) return 'already-reviewed';
  return 'can-review';
};

// Render button based on state
const renderWriteReviewButton = () => {
  const state = getButtonState();
  
  switch (state) {
    case 'not-logged-in':
      return (
        <Button 
          variant="outline" 
          onClick={() => navigate('/login', { state: { returnTo: location.pathname } })}
        >
          <Star className="w-4 h-4 mr-2" />
          Write a Review
        </Button>
      );
    case 'no-checkin':
      return (
        <Button 
          variant="outline" 
          onClick={() => setShowCheckInPrompt(true)}
          className="opacity-80"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Check in to Review
        </Button>
      );
    case 'already-reviewed':
      return (
        <Button 
          variant="secondary" 
          onClick={() => setShowReviewForm(true)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit Your Review
        </Button>
      );
    case 'can-review':
      return (
        <Button 
          variant="default" 
          onClick={() => setShowReviewForm(true)}
        >
          <Star className="w-4 h-4 mr-2" />
          Write a Review
        </Button>
      );
  }
};
```

#### 2. Add Check-in Prompt Modal
**Create:** `src/components/reviews/CheckInPromptModal.tsx`

```tsx
interface CheckInPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  onCheckIn: () => void;
}

export function CheckInPromptModal({ isOpen, onClose, businessName, onCheckIn }: CheckInPromptModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check In Required</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            To ensure authentic reviews, you need to check in at <strong>{businessName}</strong> before leaving a review.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>GPS verification confirms your visit</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Maybe Later
            </Button>
            <Button onClick={onCheckIn}>
              <MapPin className="w-4 h-4 mr-2" />
              Check In Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. Update Review Form Modal Integration
**Modify:** Add modal wrapper for `BusinessReviewForm.tsx`

```tsx
// In BusinessReviews.tsx
<Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        {existingReview ? 'Edit Your Review' : 'Write a Review'}
      </DialogTitle>
    </DialogHeader>
    <BusinessReviewForm 
      businessId={businessId}
      existingReview={existingReview}
      onSuccess={() => {
        setShowReviewForm(false);
        toast.success(existingReview ? 'Review updated!' : 'Review submitted!');
      }}
      onCancel={() => setShowReviewForm(false)}
    />
  </DialogContent>
</Dialog>
```

---

### Database Queries

#### Check User's Existing Review
```sql
-- Used by useReviews hook to check if user already reviewed
SELECT * FROM business_reviews 
WHERE business_id = $1 
  AND user_id = auth.uid()
  AND deleted_at IS NULL
LIMIT 1;
```

#### Check Valid Check-in
```sql
-- Used by useCheckIn hook to verify eligibility
SELECT EXISTS (
  SELECT 1 FROM business_checkins 
  WHERE business_id = $1 
    AND user_id = auth.uid()
    AND verified = true
) AS has_checked_in;
```

---

### Service Layer Updates

#### Update `reviewService.ts`
**Location:** `src/services/reviewService.ts`

```typescript
// Add function to check review eligibility
export async function checkReviewEligibility(businessId: string): Promise<{
  eligible: boolean;
  reason: 'not-logged-in' | 'no-checkin' | 'can-review' | 'already-reviewed';
  existingReview?: Review;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { eligible: false, reason: 'not-logged-in' };
  }
  
  // Check for existing review
  const { data: existingReview } = await supabase
    .from('business_reviews')
    .select('*')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();
  
  if (existingReview) {
    return { eligible: true, reason: 'already-reviewed', existingReview };
  }
  
  // Check for valid check-in
  const { data: checkIn } = await supabase
    .from('business_checkins')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('verified', true)
    .limit(1)
    .single();
  
  if (!checkIn) {
    return { eligible: false, reason: 'no-checkin' };
  }
  
  return { eligible: true, reason: 'can-review' };
}
```

---

### Hook Updates

#### Create `useReviewEligibility.ts`
**Location:** `src/hooks/useReviewEligibility.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { checkReviewEligibility } from '@/services/reviewService';

export function useReviewEligibility(businessId: string) {
  return useQuery({
    queryKey: ['review-eligibility', businessId],
    queryFn: () => checkReviewEligibility(businessId),
    staleTime: 30000, // 30 seconds
    enabled: !!businessId,
  });
}
```

---

## UI/UX Specifications

### Button Placement
```
┌─────────────────────────────────────────┐
│ REVIEWS TAB                             │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │  ⭐ Write a Review              [→] │ │  ← Primary button, full width on mobile
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Review Stats (78% recommend...)    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Filters: [All] [Recommend] [Don't] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Review Card 1                       │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Review Card 2                       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Button States Visual Design

| State | Button Style | Icon | Text | Border |
|-------|--------------|------|------|--------|
| Not Logged In | `outline` | ⭐ Star | "Write a Review" | Dashed |
| No Check-in | `outline` + `opacity-80` | 📍 MapPin | "Check in to Review" | Solid |
| Can Review | `default` (primary) | ⭐ Star | "Write a Review" | None |
| Already Reviewed | `secondary` | ✏️ Pencil | "Edit Your Review" | None |

### Mobile Responsiveness
- Button stretches full width on mobile (< 640px)
- Button is inline with text on tablet/desktop
- Modal uses Drawer component on mobile for better UX

---

## Testing Plan

### Unit Tests
**File:** `src/components/reviews/__tests__/BusinessReviews.test.tsx`

```typescript
describe('Write Review Button', () => {
  it('shows "Write a Review" for eligible user', () => {
    // Mock logged in user with check-in
    render(<BusinessReviews businessId="123" />, { 
      wrapper: createWrapper({ user: mockUser, hasCheckedIn: true })
    });
    expect(screen.getByText('Write a Review')).toBeInTheDocument();
  });

  it('shows "Check in to Review" for user without check-in', () => {
    render(<BusinessReviews businessId="123" />, { 
      wrapper: createWrapper({ user: mockUser, hasCheckedIn: false })
    });
    expect(screen.getByText('Check in to Review')).toBeInTheDocument();
  });

  it('shows "Edit Your Review" for user with existing review', () => {
    render(<BusinessReviews businessId="123" />, { 
      wrapper: createWrapper({ user: mockUser, existingReview: mockReview })
    });
    expect(screen.getByText('Edit Your Review')).toBeInTheDocument();
  });

  it('redirects to login when guest clicks button', async () => {
    const navigateMock = vi.fn();
    render(<BusinessReviews businessId="123" />, { 
      wrapper: createWrapper({ user: null })
    });
    await userEvent.click(screen.getByText('Write a Review'));
    expect(navigateMock).toHaveBeenCalledWith('/login', expect.anything());
  });

  it('opens check-in prompt modal for user without check-in', async () => {
    render(<BusinessReviews businessId="123" />, { 
      wrapper: createWrapper({ user: mockUser, hasCheckedIn: false })
    });
    await userEvent.click(screen.getByText('Check in to Review'));
    expect(screen.getByText('Check In Required')).toBeInTheDocument();
  });

  it('opens review form modal for eligible user', async () => {
    render(<BusinessReviews businessId="123" />, { 
      wrapper: createWrapper({ user: mockUser, hasCheckedIn: true })
    });
    await userEvent.click(screen.getByText('Write a Review'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
describe('Write Review Flow Integration', () => {
  it('completes full review submission flow', async () => {
    // 1. Navigate to business storefront
    // 2. Click Reviews tab
    // 3. Click Write a Review
    // 4. Fill form (recommendation, text, optional photo)
    // 5. Submit
    // 6. Verify review appears in list
    // 7. Verify button now says "Edit Your Review"
  });

  it('handles edit existing review flow', async () => {
    // 1. User with existing review visits storefront
    // 2. Clicks "Edit Your Review"
    // 3. Form pre-filled with existing data
    // 4. Modifies and submits
    // 5. Updated review shows in list with "(edited)" label
  });
});
```

### Manual Testing Checklist
- [ ] Guest user sees button and is redirected to login
- [ ] After login, user returns to same storefront
- [ ] User without check-in sees prompt modal
- [ ] User with check-in can open and submit review form
- [ ] User with existing review sees "Edit" button
- [ ] Edit flow preserves original data
- [ ] Button state updates after submit without refresh
- [ ] Works on mobile (drawer instead of modal)
- [ ] Works on tablet/desktop (modal)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/reviews/BusinessReviews.tsx` | MODIFY | Add Write Review button with state logic |
| `src/components/reviews/CheckInPromptModal.tsx` | CREATE | Modal explaining check-in requirement |
| `src/services/reviewService.ts` | MODIFY | Add `checkReviewEligibility` function |
| `src/hooks/useReviewEligibility.ts` | CREATE | Hook for checking review eligibility |
| `src/components/reviews/__tests__/BusinessReviews.test.tsx` | MODIFY | Add tests for button states |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Search for similar features in the existing codebase
- [ ] Check `src/components/reviews/` for reusable components
- [ ] Review `src/services/reviewService.ts` for existing patterns
- [ ] Identify any existing UI patterns in `src/components/` that can be reused
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

**Test Route 1: Basic Functionality**
1. Navigate to any business storefront
2. Click on the "Reviews" tab
3. Verify "Write Review" button is visible
4. Click button and verify modal opens
5. Confirm GPS check happens (if not checked in)

**Test Route 2: Edge Cases**
1. Test with already reviewed business (button should be hidden/different)
2. Test without being logged in (should prompt login)
3. Test on mobile viewport

**Test Route 3: Accessibility**
1. Tab navigation to button works
2. Screen reader announces button correctly
3. Button has proper contrast

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

- [ ] Write Review button visible in Reviews tab for all users
- [ ] Button correctly displays all 4 states based on user context
- [ ] Guest users redirected to login with return path
- [ ] Check-in prompt modal shows for users without valid check-in
- [ ] Review form opens in modal/drawer for eligible users
- [ ] Edit mode works for users with existing reviews
- [ ] Button state updates in real-time after submission
- [ ] All unit tests passing
- [ ] Manual testing checklist complete
- [ ] Code reviewed and approved
- [ ] No console errors or warnings

---

## Dependencies

- **Blocks:** EPIC 11.3 stories (engagement features depend on users being able to submit reviews)
- **Related:** Story 11.1.2 (GPS verification must work for check-in validation)

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
