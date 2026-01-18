# Story 11.3.1: Helpful Vote System

**Epic:** [EPIC 11.3 - Reviews Engagement & Analytics](../epics/EPIC_11.3_Reviews_Engagement_Analytics.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 3 days  
**Dependencies:** Story 11.1.1 (Write Review Button must exist)  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement a "Helpful" vote system for reviews. Users can mark reviews as helpful with a single button (Google-style). Votes are public (show who voted), counts are always visible (no threshold), and reviews can be sorted by "Most Helpful".

---

## Problem Statement

### Current State
- No way to indicate which reviews are most useful
- All reviews weighted equally
- Users must read all reviews to find quality ones
- No engagement mechanism beyond reading

### Desired State
- Single "Helpful" button on each review
- Public vote visibility (can see who found it helpful)
- Vote count always shown (even if 0)
- "Most Helpful" sort option
- Real-time vote count updates

---

## User Stories

### US-11.3.1.1: Vote Helpful on Review
**As a** logged-in user  
**I want to** mark a review as "Helpful"  
**So that** I can show appreciation and help others find useful reviews

**Acceptance Criteria:**
- [ ] "Helpful" button visible on each review card
- [ ] Click to vote, click again to remove vote
- [ ] Visual toggle state (filled vs outline)
- [ ] Vote count updates immediately
- [ ] Toast confirmation: "Marked as helpful"
- [ ] Only logged-in users can vote
- [ ] Cannot vote on your own review

---

### US-11.3.1.2: Public Vote Visibility
**As a** user viewing a review  
**I want to** see who found it helpful  
**So that** I can gauge the review's credibility

**Acceptance Criteria:**
- [ ] Show vote count: "X people found this helpful"
- [ ] Click count to see list of voters (names/avatars)
- [ ] Voter list in popover/modal
- [ ] Show "You" indicator if current user voted
- [ ] Maximum 10 avatars shown, "+X more" for rest

---

### US-11.3.1.3: Sort by Most Helpful
**As a** user browsing reviews  
**I want to** sort by "Most Helpful"  
**So that** I see the best reviews first

**Acceptance Criteria:**
- [ ] Add "Most Helpful" to sort dropdown
- [ ] Default sort remains "Newest"
- [ ] Most Helpful sorts by vote count descending
- [ ] Tie-breaker: newest first
- [ ] Works on storefront and All Reviews page

---

### US-11.3.1.4: Prevent Self-Voting
**As a** platform  
**I want to** prevent users from voting on their own reviews  
**So that** the system is fair

**Acceptance Criteria:**
- [ ] Hide Helpful button on own reviews
- [ ] Backend rejects self-vote attempts
- [ ] Error message if attempted via API

---

### US-11.3.1.5: Real-time Vote Updates
**As a** user viewing reviews  
**I want to** see vote counts update in real-time  
**So that** I see current engagement

**Acceptance Criteria:**
- [ ] Subscribe to vote changes via Supabase Realtime
- [ ] Vote count animates when updated
- [ ] No page refresh needed
- [ ] Works across multiple tabs

---

## Technical Requirements

### Database Schema

**File:** `supabase/migrations/YYYYMMDD_helpful_votes.sql`

```sql
-- ============================================
-- MIGRATION: Helpful Vote System
-- Story: 11.3.1
-- ============================================

-- Step 1: Create helpful votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate votes
  UNIQUE(review_id, user_id)
);

-- Step 2: Create indexes
CREATE INDEX idx_helpful_votes_review ON review_helpful_votes(review_id);
CREATE INDEX idx_helpful_votes_user ON review_helpful_votes(user_id);

-- Step 3: Enable RLS
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Anyone can view votes
CREATE POLICY "Votes are public"
ON review_helpful_votes FOR SELECT
USING (true);

-- Logged-in users can vote
CREATE POLICY "Authenticated users can vote"
ON review_helpful_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
CREATE POLICY "Users can remove own votes"
ON review_helpful_votes FOR DELETE
USING (auth.uid() = user_id);

-- Step 5: Prevent self-voting trigger
CREATE OR REPLACE FUNCTION prevent_self_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM business_reviews 
    WHERE id = NEW.review_id 
    AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot vote on your own review';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_self_vote
BEFORE INSERT ON review_helpful_votes
FOR EACH ROW EXECUTE FUNCTION prevent_self_vote();

-- Step 6: Add helpful_count to reviews view
CREATE OR REPLACE VIEW reviews_with_helpful_count AS
SELECT 
  br.*,
  COALESCE(
    (SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = br.id),
    0
  ) AS helpful_count
FROM business_reviews br
WHERE br.deleted_at IS NULL;

-- Step 7: Function to get voters for a review
CREATE OR REPLACE FUNCTION get_review_voters(p_review_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  voted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rhv.user_id,
    p.full_name,
    p.avatar_url,
    rhv.created_at AS voted_at
  FROM review_helpful_votes rhv
  JOIN profiles p ON p.id = rhv.user_id
  WHERE rhv.review_id = p_review_id
  ORDER BY rhv.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Service Layer

**File:** `src/services/helpfulVoteService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface HelpfulVote {
  id: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

export interface Voter {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  voted_at: string;
}

/**
 * Toggle helpful vote on a review
 * Returns true if now voted, false if vote removed
 */
export async function toggleHelpfulVote(reviewId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to vote');
  }
  
  // Check if already voted
  const { data: existingVote } = await supabase
    .from('review_helpful_votes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', user.id)
    .single();
  
  if (existingVote) {
    // Remove vote
    const { error } = await supabase
      .from('review_helpful_votes')
      .delete()
      .eq('id', existingVote.id);
    
    if (error) throw error;
    return false;
  } else {
    // Add vote
    const { error } = await supabase
      .from('review_helpful_votes')
      .insert({
        review_id: reviewId,
        user_id: user.id
      });
    
    if (error) {
      if (error.message.includes('own review')) {
        throw new Error('You cannot vote on your own review');
      }
      throw error;
    }
    return true;
  }
}

/**
 * Get helpful vote count for a review
 */
export async function getHelpfulCount(reviewId: string): Promise<number> {
  const { count, error } = await supabase
    .from('review_helpful_votes')
    .select('*', { count: 'exact', head: true })
    .eq('review_id', reviewId);
  
  if (error) throw error;
  return count || 0;
}

/**
 * Check if current user has voted on a review
 */
export async function hasUserVoted(reviewId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data } = await supabase
    .from('review_helpful_votes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', user.id)
    .single();
  
  return !!data;
}

/**
 * Get list of voters for a review
 */
export async function getReviewVoters(reviewId: string, limit = 10): Promise<Voter[]> {
  const { data, error } = await supabase
    .rpc('get_review_voters', { 
      p_review_id: reviewId, 
      p_limit: limit 
    });
  
  if (error) throw error;
  return data || [];
}

/**
 * Subscribe to vote changes for a review
 */
export function subscribeToVotes(
  reviewId: string, 
  callback: (newCount: number) => void
) {
  const channel = supabase
    .channel(`votes:${reviewId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'review_helpful_votes',
        filter: `review_id=eq.${reviewId}`
      },
      async () => {
        // Refetch count on any change
        const count = await getHelpfulCount(reviewId);
        callback(count);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}
```

---

### React Hook

**File:** `src/hooks/useHelpfulVote.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  toggleHelpfulVote, 
  getHelpfulCount, 
  hasUserVoted,
  subscribeToVotes 
} from '@/services/helpfulVoteService';
import { toast } from 'sonner';

export function useHelpfulVote(reviewId: string, reviewAuthorId: string) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  
  const isOwnReview = user?.id === reviewAuthorId;
  const canVote = !!user && !isOwnReview;
  
  // Fetch initial state
  useEffect(() => {
    const fetchState = async () => {
      const [voteCount, voted] = await Promise.all([
        getHelpfulCount(reviewId),
        user ? hasUserVoted(reviewId) : false
      ]);
      setCount(voteCount);
      setHasVoted(voted);
    };
    
    fetchState();
  }, [reviewId, user]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToVotes(reviewId, (newCount) => {
      setCount(newCount);
    });
    
    return unsubscribe;
  }, [reviewId]);
  
  const toggleVote = useCallback(async () => {
    if (!canVote) {
      if (!user) {
        toast.error('Please log in to vote');
      }
      return;
    }
    
    setIsVoting(true);
    
    try {
      const nowVoted = await toggleHelpfulVote(reviewId);
      setHasVoted(nowVoted);
      setCount(prev => nowVoted ? prev + 1 : prev - 1);
      
      toast.success(nowVoted ? 'Marked as helpful' : 'Vote removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to vote');
    } finally {
      setIsVoting(false);
    }
  }, [reviewId, canVote, user]);
  
  return {
    count,
    hasVoted,
    isVoting,
    toggleVote,
    canVote,
    isOwnReview
  };
}
```

---

### Helpful Button Component

**File:** `src/components/reviews/HelpfulButton.tsx`

```tsx
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useHelpfulVote } from '@/hooks/useHelpfulVote';
import { getReviewVoters, Voter } from '@/services/helpfulVoteService';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface HelpfulButtonProps {
  reviewId: string;
  reviewAuthorId: string;
  initialCount?: number;
}

export function HelpfulButton({ reviewId, reviewAuthorId, initialCount = 0 }: HelpfulButtonProps) {
  const { count, hasVoted, isVoting, toggleVote, canVote, isOwnReview } = useHelpfulVote(reviewId, reviewAuthorId);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [votersLoading, setVotersLoading] = useState(false);
  
  const handleShowVoters = async () => {
    if (count === 0) return;
    
    setVotersLoading(true);
    try {
      const voterList = await getReviewVoters(reviewId);
      setVoters(voterList);
    } finally {
      setVotersLoading(false);
    }
  };
  
  // Don't render if own review
  if (isOwnReview) return null;
  
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={hasVoted ? 'default' : 'outline'}
        size="sm"
        onClick={toggleVote}
        disabled={isVoting || !canVote}
        className={cn(
          'gap-1.5',
          hasVoted && 'bg-primary text-primary-foreground'
        )}
      >
        <ThumbsUp className={cn(
          'w-4 h-4',
          hasVoted && 'fill-current'
        )} />
        Helpful
      </Button>
      
      {/* Vote count with voter list popover */}
      {count > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button 
              onClick={handleShowVoters}
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              {count === 1 
                ? '1 person found this helpful'
                : `${count} people found this helpful`}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            {votersLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium">People who found this helpful</h4>
                <div className="space-y-2">
                  {voters.map(voter => (
                    <div key={voter.user_id} className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={voter.avatar_url || undefined} />
                        <AvatarFallback>{voter.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{voter.full_name}</span>
                    </div>
                  ))}
                  {count > 10 && (
                    <p className="text-sm text-muted-foreground">
                      +{count - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
      
      {count === 0 && (
        <span className="text-sm text-muted-foreground">
          Be the first to find this helpful
        </span>
      )}
    </div>
  );
}
```

---

### Update ReviewCard

#### Modify `ReviewCard.tsx`
```tsx
import { HelpfulButton } from './HelpfulButton';

// In the render, after review text and photos:
<div className="mt-4 pt-3 border-t">
  <HelpfulButton 
    reviewId={review.id}
    reviewAuthorId={review.user_id}
    initialCount={review.helpful_count}
  />
</div>
```

---

### Update Review Filters for "Most Helpful" Sort

#### Modify `ReviewFilters.tsx`
```tsx
// Add to sort options:
<SelectItem value="most-helpful">Most Helpful</SelectItem>

// Update types:
type SortBy = 'newest' | 'oldest' | 'most-helpful';
```

#### Modify Service Query
```typescript
// In reviewService.ts getBusinessReviewsPaginated:
if (sortBy === 'most-helpful') {
  query = query.order('helpful_count', { ascending: false })
               .order('created_at', { ascending: false });
}
```

---

## Testing Plan

### Unit Tests

```typescript
describe('toggleHelpfulVote', () => {
  it('adds vote when not voted', async () => {
    const result = await toggleHelpfulVote('review-123');
    expect(result).toBe(true);
  });

  it('removes vote when already voted', async () => {
    await toggleHelpfulVote('review-123'); // Add
    const result = await toggleHelpfulVote('review-123'); // Remove
    expect(result).toBe(false);
  });

  it('rejects self-vote', async () => {
    // Mock user as review author
    await expect(toggleHelpfulVote('own-review-id'))
      .rejects.toThrow(/own review/);
  });
});

describe('HelpfulButton', () => {
  it('hides button on own review', () => {
    render(<HelpfulButton reviewId="123" reviewAuthorId={mockUser.id} />);
    expect(screen.queryByText('Helpful')).not.toBeInTheDocument();
  });

  it('toggles vote state on click', async () => {
    render(<HelpfulButton reviewId="123" reviewAuthorId="other-user" />);
    
    const button = screen.getByText('Helpful');
    await userEvent.click(button);
    
    expect(button).toHaveClass('bg-primary');
  });

  it('shows voter list on count click', async () => {
    render(<HelpfulButton reviewId="123" reviewAuthorId="other-user" initialCount={5} />);
    
    await userEvent.click(screen.getByText('5 people found this helpful'));
    
    await waitFor(() => {
      expect(screen.getByText('People who found this helpful')).toBeInTheDocument();
    });
  });
});
```

### Manual Testing Checklist
- [ ] Click Helpful - vote added, count increases
- [ ] Click again - vote removed, count decreases
- [ ] Cannot see Helpful button on own review
- [ ] Guest user sees button but cannot vote (prompt to login)
- [ ] Click vote count - see voter list
- [ ] Sort by Most Helpful works
- [ ] Real-time update: vote in one tab, see in another
- [ ] Works on mobile (touch)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_helpful_votes.sql` | CREATE | Table, RLS, triggers |
| `src/services/helpfulVoteService.ts` | CREATE | Vote CRUD operations |
| `src/hooks/useHelpfulVote.ts` | CREATE | React hook for voting |
| `src/components/reviews/HelpfulButton.tsx` | CREATE | UI component |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Add HelpfulButton |
| `src/components/reviews/ReviewFilters.tsx` | MODIFY | Add Most Helpful sort |
| `src/services/reviewService.ts` | MODIFY | Sort by helpful_count |

---

## Definition of Done

- [ ] Database table and RLS policies created
- [ ] Self-vote prevention working
- [ ] Toggle vote functionality working
- [ ] Vote count updates in real-time
- [ ] Voter list popover working
- [ ] "Most Helpful" sort option added
- [ ] Hidden on own reviews
- [ ] Guest users prompted to login
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
