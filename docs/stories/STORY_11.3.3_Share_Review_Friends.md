# Story 11.3.3: Share Review to Friends

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟢 P2 - LOW  
**Effort:** 2 days  
**Dependencies:** Existing messaging/chat system  
**Status:** 📋 Ready for Implementation

---

## Overview

Allow users to share reviews with their friends via the existing chat/messaging system. This leverages the already-built rich link preview and forwarding functionality from EPIC 10 (Sharing).

---

## Problem Statement

### Current State
- Users can share businesses and products
- No way to share specific reviews
- Users manually screenshot or describe reviews
- No tracking of review shares

### Desired State
- "Share" button on each review card
- Share via existing chat to friends
- Rich preview of review in chat
- Track shares in analytics

---

## User Stories

### US-11.3.3.1: Share Button on Reviews
**As a** user viewing a review  
**I want to** share it with friends  
**So that** I can recommend or discuss it

**Acceptance Criteria:**
- [ ] Share icon visible on each review card
- [ ] Click opens friend selector modal
- [ ] Can select multiple friends
- [ ] Confirm sends review link to chat

---

### US-11.3.3.2: Rich Review Preview in Chat
**As a** user receiving a shared review  
**I want to** see a preview of the review  
**So that** I can decide if I want to read more

**Acceptance Criteria:**
- [ ] Review shown as rich link preview card
- [ ] Shows: Reviewer name, rating (👍/👎), excerpt
- [ ] Shows: Business name and photo
- [ ] Tap opens full review on storefront

---

### US-11.3.3.3: Track Review Shares
**As a** platform  
**I want to** track when reviews are shared  
**So that** we can measure engagement

**Acceptance Criteria:**
- [ ] Log review shares in analytics
- [ ] Track: sharer, recipient(s), timestamp
- [ ] Include in user insights: "Your reviews shared X times"
- [ ] Include in business analytics: "Reviews shared X times"

---

### US-11.3.3.4: Contact Reviewer via Chat (Private Messaging Rules)
**As a** user viewing a review  
**I want to** message the reviewer privately  
**So that** I can ask questions about their experience

**Acceptance Criteria:**
- [ ] "Message" button visible on review card (next to Share button)
- [ ] Opens existing chat with reviewer (if conversation exists)
- [ ] Creates new conversation if none exists
- [ ] Pre-filled context: "Asking about your review of [Business Name]"

> [!IMPORTANT]
> **Private Messaging Rules:**
> - ✅ Users CAN message any reviewer
> - ❌ Business owners CANNOT initiate messages to their reviewers
> - ✅ If a user starts a conversation, the business can reply (via existing chat)
> - ✅ Users can opt out of specific conversations (block/mute)
>
> **Note:** Business-to-reviewer communication happens via the PUBLIC response on the review (Story 11.2.4), NOT private messages.

**Technical Details:**
- Check if current user is the business owner → hide button for own business reviews
- Reuse existing `startConversation()` from chat service
- Add review context metadata to message

---

### US-11.3.3.5: Opt Out of Review Conversations
**As a** reviewer  
**I want to** opt out of receiving messages about my reviews  
**So that** I can control my privacy

**Acceptance Criteria:**
- [ ] Can block/mute specific users who message about reviews
- [ ] Use existing block/mute functionality from chat
- [ ] No additional "disable review messaging" global toggle (use existing chat settings)

---

## Technical Requirements

### Share Button on ReviewCard

#### Update `ReviewCard.tsx`
```tsx
import { Share2 } from 'lucide-react';
import { shareReview } from '@/services/shareService';

// Add share button next to helpful button:
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowShareModal(true)}
  className="gap-1.5"
>
  <Share2 className="w-4 h-4" />
  Share
</Button>

// Share modal (reuse existing pattern):
<ShareToFriendsModal
  isOpen={showShareModal}
  onClose={() => setShowShareModal(false)}
  contentType="review"
  contentId={review.id}
  title={`Review of ${businessName} by ${review.user.full_name}`}
  previewData={{
    reviewerName: review.user.full_name,
    reviewerAvatar: review.user.avatar_url,
    recommendation: review.recommendation,
    excerpt: review.text?.slice(0, 100),
    businessName: businessName,
    businessImage: businessImage
  }}
/>
```

---

### Extend Share Service

#### Update `src/services/shareService.ts`

```typescript
export type ShareableContent = 'business' | 'product' | 'offer' | 'review';

interface ReviewShareData {
  reviewId: string;
  businessId: string;
  businessName: string;
  reviewerName: string;
  recommendation: boolean;
  excerpt?: string;
}

/**
 * Share a review to friends via chat
 */
export async function shareReviewToFriends(
  reviewId: string,
  friendIds: string[],
  reviewData: ReviewShareData
): Promise<void> {
  // Create shareable link
  const shareUrl = `${window.location.origin}/business/${reviewData.businessId}/reviews#review-${reviewId}`;
  
  // Send to each friend
  for (const friendId of friendIds) {
    await sendMessage({
      recipient_id: friendId,
      content: `Check out this review of ${reviewData.businessName}`,
      type: 'rich_link',
      metadata: {
        type: 'review',
        review_id: reviewId,
        business_id: reviewData.businessId,
        preview: {
          title: `Review by ${reviewData.reviewerName}`,
          subtitle: reviewData.recommendation ? '👍 Recommends' : '👎 Doesn\'t recommend',
          description: reviewData.excerpt,
          image: reviewData.businessImage,
          url: shareUrl
        }
      }
    });
  }
  
  // Log share for analytics
  await logReviewShare(reviewId, friendIds);
}

/**
 * Log review share for analytics
 */
async function logReviewShare(
  reviewId: string, 
  recipientIds: string[]
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  await supabase
    .from('review_shares')
    .insert(recipientIds.map(recipientId => ({
      review_id: reviewId,
      sharer_id: user.id,
      recipient_id: recipientId
    })));
}
```

---

### Database Schema for Share Tracking

```sql
-- Review shares tracking table
CREATE TABLE IF NOT EXISTS review_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  sharer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_shares_review ON review_shares(review_id);
CREATE INDEX idx_review_shares_sharer ON review_shares(sharer_id);

-- RLS
ALTER TABLE review_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shares"
ON review_shares FOR SELECT
USING (auth.uid() = sharer_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can share reviews"
ON review_shares FOR INSERT
WITH CHECK (auth.uid() = sharer_id);

-- Function to get share count
CREATE OR REPLACE FUNCTION get_review_share_count(p_review_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM review_shares WHERE review_id = p_review_id);
END;
$$ LANGUAGE plpgsql;
```

---

### Review Rich Link Preview in Chat

#### Create `ReviewLinkPreview.tsx`
```tsx
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface ReviewLinkPreviewProps {
  metadata: {
    review_id: string;
    business_id: string;
    preview: {
      title: string;
      subtitle: string;
      description: string;
      image: string;
      url: string;
    };
  };
}

export function ReviewLinkPreview({ metadata }: ReviewLinkPreviewProps) {
  const navigate = useNavigate();
  const { preview } = metadata;
  const isRecommend = preview.subtitle.includes('👍');
  
  const handleClick = () => {
    navigate(new URL(preview.url).pathname);
  };
  
  return (
    <div 
      onClick={handleClick}
      className="border rounded-lg overflow-hidden bg-card cursor-pointer hover:bg-accent transition-colors"
    >
      {/* Business image */}
      {preview.image && (
        <div className="h-32 overflow-hidden">
          <img 
            src={preview.image} 
            alt="" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-3 space-y-2">
        {/* Recommendation badge */}
        <div className={cn(
          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
          isRecommend 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        )}>
          {isRecommend ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
          {isRecommend ? 'Recommends' : "Doesn't Recommend"}
        </div>
        
        {/* Review title */}
        <h4 className="font-medium text-sm">{preview.title}</h4>
        
        {/* Excerpt */}
        {preview.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            "{preview.description}"
          </p>
        )}
        
        {/* View link */}
        <p className="text-xs text-primary">Tap to view full review →</p>
      </div>
    </div>
  );
}
```

---

### Register Review Link Type in Message Renderer

#### Update message rendering logic:
```tsx
// In MessageBubble.tsx or similar:
if (message.metadata?.type === 'review') {
  return <ReviewLinkPreview metadata={message.metadata} />;
}
```

---

### Deep Link to Specific Review

Add anchor handling in AllReviews page:
```tsx
// In AllReviewsPage or BusinessReviews:
useEffect(() => {
  const hash = window.location.hash;
  if (hash.startsWith('#review-')) {
    const reviewId = hash.replace('#review-', '');
    // Scroll to or highlight the specific review
    const element = document.getElementById(`review-${reviewId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      element.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary');
      }, 3000);
    }
  }
}, []);
```

---

## Testing Plan

### Unit Tests

```typescript
describe('Share Review', () => {
  it('opens friend selector modal', async () => {
    render(<ReviewCard review={mockReview} />);
    await userEvent.click(screen.getByText('Share'));
    expect(screen.getByText('Share with Friends')).toBeInTheDocument();
  });

  it('sends review to selected friends', async () => {
    // Select friends and confirm
    await userEvent.click(screen.getByText('Send'));
    expect(shareReviewToFriends).toHaveBeenCalled();
  });

  it('logs share for analytics', async () => {
    await shareReviewToFriends(reviewId, [friendId], reviewData);
    const { data } = await supabase
      .from('review_shares')
      .select('*')
      .eq('review_id', reviewId);
    expect(data.length).toBe(1);
  });
});

describe('ReviewLinkPreview', () => {
  it('shows recommendation badge', () => {
    render(<ReviewLinkPreview metadata={mockMetadata} />);
    expect(screen.getByText('Recommends')).toBeInTheDocument();
  });

  it('navigates on click', async () => {
    render(<ReviewLinkPreview metadata={mockMetadata} />);
    await userEvent.click(screen.getByText('Tap to view full review'));
    expect(navigate).toHaveBeenCalledWith('/business/123/reviews#review-456');
  });
});
```

### Manual Testing Checklist
- [ ] Share button visible on review cards
- [ ] Opens friend selector modal
- [ ] Can select multiple friends
- [ ] Message appears in chat as rich preview
- [ ] Preview shows recommendation, excerpt
- [ ] Tap preview navigates to review
- [ ] Review highlighted on destination
- [ ] Share count tracked in analytics

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_review_shares.sql` | CREATE | Tracking table |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Add share button |
| `src/components/chat/ReviewLinkPreview.tsx` | CREATE | Chat preview |
| `src/services/shareService.ts` | MODIFY | Add review sharing |
| Message renderer | MODIFY | Handle review type |
| AllReviews page | MODIFY | Deep link handling |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Review existing chat/messaging system
- [ ] Check for share functionality patterns
- [ ] Find existing contact picker or friend selector components
- [ ] Look for existing rich link preview implementations
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

**Test Route 1: Share to Chat**
1. Find a review you want to share
2. Click "Share" button → Friend picker opens
3. Select friends and/or groups
4. Confirm → Message sent with review card

**Test Route 2: Review Card in Chat**
1. Open chat where review was shared
2. Verify rich preview card displays
3. Tap card → Opens review detail
4. Verify business link works

**Test Route 3: Private Messaging**
1. Find "Message" button on review
2. Click → Opens chat with reviewer
3. Verify business owners cannot initiate

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

- [ ] Share button on all review cards
- [ ] Friend selector modal working
- [ ] Review sent as rich link in chat
- [ ] Preview shows recommendation and excerpt
- [ ] Tap navigates to review
- [ ] Share tracking in database
- [ ] Deep link highlights specific review
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
