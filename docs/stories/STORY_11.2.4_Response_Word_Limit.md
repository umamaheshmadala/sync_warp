# Story 11.2.4: Business Response Word Limit to 150

**Epic:** [EPIC 11.2 - Reviews Content Enhancement](../epics/EPIC_11.2_Reviews_Content_Enhancement.md)  
**Priority:** 🟢 P2 - LOW  
**Effort:** 0.5 days  
**Dependencies:** Story 11.2.1 (shared WordCounter component)  
**Status:** ✅ User Testing Complete | 🤖 Automated Browser Testing Pending

---

## Overview

Increase the business owner response word limit from 50 words to 150 words, matching the review text limit. This allows business owners to provide more thoughtful and detailed responses to customer reviews.

---

## Problem Statement

### Current State
- Business response limited to **50 words**
- Not enough space for detailed replies
- Business owners struggle to address complex feedback
- Database constraint: `CHECK (word_count <= 50)`

### Desired State
- Business response limit: **150 words** (3x increase)
- Matches review text limit for consistency
- WordCounter updated for responses
- No templates (user declined)

---

## User Stories

### US-11.2.4.1: Increased Response Limit
**As a** business owner responding to reviews  
**I want to** write up to 150 words  
**So that** I can provide thoughtful responses to feedback

**Acceptance Criteria:**
- [ ] Response form accepts up to 150 words
- [ ] WordCounter shows: "X / 150 words"
- [ ] Form validates max 150 words before submission
- [ ] Database constraint updated to 150 words
- [ ] Existing responses under 50 words remain valid

---

### US-11.2.4.2: Response Form UX
**As a** business owner  
**I want to** see real-time word count  
**So that** I know how much space I have

**Acceptance Criteria:**
- [ ] Word counter updates in real-time
- [ ] Counter color changes near limit
- [ ] Helpful placeholder text provided
- [ ] Submit button disabled when over limit
- [ ] Error message if over limit on submit

---

## Technical Requirements

### Database Migration

**File:** `supabase/migrations/YYYYMMDD_increase_response_word_limit.sql`

```sql
-- ============================================
-- MIGRATION: Increase Response Word Limit to 150
-- Story: 11.2.4
-- ============================================

-- Step 1: Drop old constraint
ALTER TABLE business_review_responses 
DROP CONSTRAINT IF EXISTS check_response_word_count;

-- Step 2: Add new constraint (150 words max)
ALTER TABLE business_review_responses
ADD CONSTRAINT check_response_word_count CHECK (
  word_count IS NULL OR word_count <= 150
);

-- Step 3: Verify existing data is valid
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM business_review_responses
  WHERE word_count > 150;
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % responses with more than 150 words', invalid_count;
  END IF;
  
  RAISE NOTICE '✅ All existing responses are within new limit';
END $$;

-- Step 4: Update platform config
UPDATE platform_config 
SET value = '150' 
WHERE key = 'response_max_words';

INSERT INTO platform_config (key, value, description)
VALUES ('response_max_words', '150', 'Maximum words in business response')
ON CONFLICT (key) DO NOTHING;
```

---

### Update Response Form Component

#### Modify `ReviewResponseForm.tsx`
**Location:** `src/components/reviews/ReviewResponseForm.tsx`

```tsx
import { useState } from 'react';
import { WordCounter, validateWordCount, countWords } from './WordCounter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { submitReviewResponse } from '@/services/reviewService';
import { toast } from 'sonner';

const MAX_WORDS = 150;

interface ReviewResponseFormProps {
  reviewId: string;
  existingResponse?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReviewResponseForm({ 
  reviewId, 
  existingResponse, 
  onSuccess, 
  onCancel 
}: ReviewResponseFormProps) {
  const [responseText, setResponseText] = useState(existingResponse || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wordCount = countWords(responseText);
  const isOverLimit = wordCount > MAX_WORDS;
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResponseText(e.target.value);
    if (error) setError(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validation = validateWordCount(responseText, 1, MAX_WORDS);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    
    if (!responseText.trim()) {
      setError('Please enter a response');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await submitReviewResponse(reviewId, responseText);
      toast.success('Response posted!');
      onSuccess();
    } catch (err) {
      toast.error('Could not post response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="response" className="text-sm font-medium">
          Your Response
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Respond professionally to this customer's feedback
        </p>
        
        <Textarea
          id="response"
          value={responseText}
          onChange={handleTextChange}
          placeholder="Thank the customer for their feedback and address any concerns they raised..."
          rows={4}
          className={error || isOverLimit ? 'border-destructive' : ''}
        />
        
        <WordCounter text={responseText} maxWords={MAX_WORDS} />
        
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
      
      <div className="flex gap-3 justify-end">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || isOverLimit || !responseText.trim()}
        >
          {isSubmitting ? 'Posting...' : existingResponse ? 'Update Response' : 'Post Response'}
        </Button>
      </div>
    </form>
  );
}
```

---

### Update Service Layer

#### Modify `reviewService.ts`

```typescript
const RESPONSE_MAX_WORDS = 150;

/**
 * Submit or update a business owner's response to a review
 */
export async function submitReviewResponse(
  reviewId: string,
  text: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to respond');
  }
  
  // Validate word count
  const wordCount = countWords(text);
  if (wordCount > RESPONSE_MAX_WORDS) {
    throw new ReviewValidationError(
      'RESPONSE_TOO_LONG',
      `Response cannot exceed ${RESPONSE_MAX_WORDS} words (currently ${wordCount})`
    );
  }
  
  if (wordCount < 1) {
    throw new ReviewValidationError(
      'RESPONSE_EMPTY',
      'Please enter a response'
    );
  }
  
  // Verify user is business owner
  const { data: review } = await supabase
    .from('business_reviews')
    .select('business_id, businesses!inner(owner_id)')
    .eq('id', reviewId)
    .single();
  
  if (!review || review.businesses.owner_id !== user.id) {
    throw new Error('You can only respond to reviews for your business');
  }
  
  // Upsert response
  const { error } = await supabase
    .from('business_review_responses')
    .upsert({
      review_id: reviewId,
      responder_id: user.id,
      text: text.trim(),
      word_count: wordCount,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'review_id'
    });
  
  if (error) {
    console.error('[ReviewService] Response error:', error);
    throw new Error('Could not save response');
  }
}
```

---

### Update Types

#### Verify `review.ts` types
**Location:** `src/types/review.ts`

```typescript
export interface ReviewResponse {
  id: string;
  review_id: string;
  responder_id: string;
  text: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

// Constants
export const RESPONSE_MAX_WORDS = 150;
```

---

## Testing Plan

### Unit Tests

```typescript
describe('submitReviewResponse', () => {
  it('accepts response with 150 words', async () => {
    const text = Array(150).fill('word').join(' ');
    await expect(submitReviewResponse('review-123', text)).resolves.not.toThrow();
  });

  it('rejects response with 151 words', async () => {
    const text = Array(151).fill('word').join(' ');
    await expect(submitReviewResponse('review-123', text))
      .rejects.toThrow(/150 words/);
  });

  it('rejects empty response', async () => {
    await expect(submitReviewResponse('review-123', ''))
      .rejects.toThrow();
  });
});

describe('ReviewResponseForm', () => {
  it('shows word counter with 150 max', () => {
    render(<ReviewResponseForm reviewId="123" onSuccess={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/\/ 150 words/)).toBeInTheDocument();
  });

  it('disables submit when over limit', async () => {
    render(<ReviewResponseForm reviewId="123" onSuccess={() => {}} onCancel={() => {}} />);
    
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, Array(151).fill('word').join(' '));
    
    expect(screen.getByRole('button', { name: /post/i })).toBeDisabled();
  });
});
```

### Manual Testing Checklist
- [ ] Open response form on a review
- [ ] Type 150 words - allowed
- [ ] Type 151 words - blocked/error shown
- [ ] Word counter updates in real-time
- [ ] Counter changes color near limit
- [ ] Submit with valid response - saves
- [ ] Existing responses under 50 words - editable
- [ ] Edit existing response to 150 words - saves

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_response_word_limit.sql` | CREATE | Update DB constraint |
| `src/components/reviews/ReviewResponseForm.tsx` | MODIFY | Update max words |
| `src/services/reviewService.ts` | MODIFY | Validate 150 words |
| `src/types/review.ts` | MODIFY | Add constant |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Find existing `ReviewResponseForm.tsx` component
- [ ] Check response word limit in database constraints
- [ ] Review shared `WordCounter.tsx` from Story 11.2.1
- [ ] Look for response submission service functions
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

**Test Route 1: Response Word Limit**
1. Login as business owner
2. Find a review on your business
3. Click "Respond" → Form opens
4. Type 150 words → Should be accepted
5. Type 151 words → Error/disabled submit

**Test Route 2: Word Counter**
1. Type in response field
2. Verify counter shows "X / 150 words"
3. Verify color changes near limit
4. Submit valid response → Saves successfully

**Test Route 3: Existing Responses**
1. Edit existing response (<50 words from before)
2. Extend to 150 words → Should save
3. Verify display of longer responses

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

- [ ] Database constraint updated to 150 words
- [ ] Response form accepts up to 150 words
- [ ] WordCounter shows correct limit
- [ ] Validation on frontend and backend
- [ ] Existing responses remain valid
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
