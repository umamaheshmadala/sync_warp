# Story 11.2.1: Increase Review Text Limit to 150 Words

**Epic:** [EPIC 11.2 - Reviews Content Enhancement](../epics/EPIC_11.2_Reviews_Content_Enhancement.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 1 day  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Increase the review text character/word limit from 30 words to 150 words. Also implement a minimum of 1 word if text is provided (text remains optional). This allows customers to provide more detailed and useful feedback while maintaining reasonable limits.

---

## Problem Statement

### Current State
- Review text limited to **30 words** (extremely restrictive)
- `WordCounter.tsx` shows 30-word max
- Database constraint: `CHECK (word_count <= 30)`
- Users cannot write detailed reviews
- Example at limit: "Great food, friendly staff, reasonable prices, nice ambiance, quick service, would definitely recommend." (14 words - still far from describing actual experience)

### Desired State
- Review text limit: **150 words** (5x increase)
- Minimum: **1 word** if text is provided (text is optional)
- WordCounter updated to show new limit
- More detailed, useful reviews for consumers and businesses

---

## User Stories

### US-11.2.1.1: Increased Text Limit
**As a** customer writing a review  
**I want to** write up to 150 words  
**So that** I can provide detailed feedback about my experience

**Acceptance Criteria:**
- [ ] Review form accepts up to 150 words
- [ ] WordCounter shows: "X / 150 words"
- [ ] Form validates max 150 words before submission
- [ ] Database constraint updated to 150 words
- [ ] Existing reviews under 30 words remain valid

---

### US-11.2.1.2: Minimum Word Validation
**As a** platform  
**I want to** require at least 1 word if text is entered  
**So that** we don't have empty or whitespace-only reviews

**Acceptance Criteria:**
- [ ] Empty text field is allowed (text is optional)
- [ ] If text entered, minimum 1 meaningful word required
- [ ] Whitespace-only text rejected: "Please enter at least 1 word"
- [ ] Single emoji without text is NOT valid (need actual word)
- [ ] Validation on both frontend and backend

---

### US-11.2.1.3: Word Counter Update
**As a** user typing a review  
**I want to** see accurate word count as I type  
**So that** I know how much more I can write

**Acceptance Criteria:**
- [ ] Word counter updates in real-time
- [ ] Shows: "47 / 150 words"
- [ ] Counter color changes near limit (yellow at 120, red at 140)
- [ ] Cannot type beyond 150 words
- [ ] Paste handling: trim to 150 words with warning

---

### US-11.2.1.4: Backward Compatibility
**As a** platform  
**I want to** maintain all existing reviews  
**So that** no data is lost during migration

**Acceptance Criteria:**
- [ ] Existing reviews with ≤30 words remain valid
- [ ] No migration errors or data loss
- [ ] Display of old reviews unchanged
- [ ] Edit functionality works for old reviews

---

## Technical Requirements

### Database Migration

**File:** `supabase/migrations/YYYYMMDD_increase_review_word_limit.sql`

```sql
-- ============================================
-- MIGRATION: Increase Review Word Limit to 150
-- Story: 11.2.1
-- ============================================

-- Step 1: Drop old constraint
ALTER TABLE business_reviews 
DROP CONSTRAINT IF EXISTS check_word_count;

-- Step 2: Add new constraint (150 words max, 1 word min if text exists)
ALTER TABLE business_reviews
ADD CONSTRAINT check_word_count CHECK (
  -- Text is optional (NULL or empty is OK)
  text IS NULL 
  OR text = '' 
  -- If text exists, check word count range
  OR (
    array_length(regexp_split_to_array(trim(text), '\s+'), 1) >= 1
    AND array_length(regexp_split_to_array(trim(text), '\s+'), 1) <= 150
  )
);

-- Step 3: Update word_count column default/validation
-- (if word_count column stores the count)
ALTER TABLE business_reviews
DROP CONSTRAINT IF EXISTS check_word_count_column;

ALTER TABLE business_reviews
ADD CONSTRAINT check_word_count_column CHECK (
  word_count IS NULL OR word_count <= 150
);

-- Step 4: Verify existing data is valid
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM business_reviews
  WHERE text IS NOT NULL 
    AND text != ''
    AND array_length(regexp_split_to_array(trim(text), '\s+'), 1) > 150;
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % reviews with more than 150 words', invalid_count;
  END IF;
  
  RAISE NOTICE '✅ All existing reviews are within new limit';
END $$;

-- Step 5: Update platform config (optional - for admin reference)
INSERT INTO platform_config (key, value, description)
VALUES ('review_max_words', '150', 'Maximum words allowed in a review')
ON CONFLICT (key) DO UPDATE SET value = '150';

INSERT INTO platform_config (key, value, description)
VALUES ('review_min_words', '1', 'Minimum words if text is provided')
ON CONFLICT (key) DO UPDATE SET value = '1';
```

---

### Update Word Counter Component

#### Modify `WordCounter.tsx`
**Location:** `src/components/reviews/WordCounter.tsx`

```tsx
interface WordCounterProps {
  text: string;
  maxWords?: number;
  minWords?: number;
}

const DEFAULT_MAX_WORDS = 150;
const DEFAULT_MIN_WORDS = 1;

export function WordCounter({ 
  text, 
  maxWords = DEFAULT_MAX_WORDS,
  minWords = DEFAULT_MIN_WORDS 
}: WordCounterProps) {
  const wordCount = countWords(text);
  
  // Determine color based on word count
  const getCounterColor = () => {
    if (wordCount > maxWords) return 'text-destructive font-bold';
    if (wordCount >= maxWords * 0.93) return 'text-destructive'; // 140+
    if (wordCount >= maxWords * 0.8) return 'text-yellow-600'; // 120+
    return 'text-muted-foreground';
  };
  
  // Check minimum (only if text is not empty)
  const showMinWarning = text.trim().length > 0 && wordCount < minWords;
  
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={getCounterColor()}>
        {wordCount} / {maxWords} words
      </span>
      
      {showMinWarning && (
        <span className="text-destructive text-xs">
          Minimum {minWords} word required
        </span>
      )}
      
      {wordCount > maxWords && (
        <span className="text-destructive text-xs">
          Please reduce by {wordCount - maxWords} words
        </span>
      )}
    </div>
  );
}

/**
 * Count words in text
 * Handles multiple spaces, newlines, etc.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  
  // Split by whitespace and filter empty strings
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Check if text meets word requirements
 */
export function validateWordCount(
  text: string, 
  minWords: number = 1, 
  maxWords: number = 150
): { valid: boolean; error?: string } {
  const wordCount = countWords(text);
  
  // Empty text is allowed (optional)
  if (!text || !text.trim()) {
    return { valid: true };
  }
  
  // Check minimum
  if (wordCount < minWords) {
    return { 
      valid: false, 
      error: `Please write at least ${minWords} word` 
    };
  }
  
  // Check maximum
  if (wordCount > maxWords) {
    return { 
      valid: false, 
      error: `Please keep your review under ${maxWords} words (currently ${wordCount})` 
    };
  }
  
  return { valid: true };
}
```

---

### Update Review Form

#### Modify `BusinessReviewForm.tsx`
**Location:** `src/components/reviews/BusinessReviewForm.tsx`

```tsx
import { WordCounter, validateWordCount, countWords } from './WordCounter';

const MAX_WORDS = 150;
const MIN_WORDS = 1;

// In the component:
const [text, setText] = useState(existingReview?.text || '');
const [textError, setTextError] = useState<string | null>(null);

// Handle text change with validation
const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const newText = e.target.value;
  const wordCount = countWords(newText);
  
  // Allow typing but show warning
  setText(newText);
  
  // Clear error when fixing
  if (textError) {
    const { valid } = validateWordCount(newText, MIN_WORDS, MAX_WORDS);
    if (valid) setTextError(null);
  }
};

// Handle paste - trim if too long
const handlePaste = (e: React.ClipboardEvent) => {
  const pastedText = e.clipboardData.getData('text');
  const currentText = text;
  const newText = currentText + pastedText;
  
  const wordCount = countWords(newText);
  
  if (wordCount > MAX_WORDS) {
    e.preventDefault();
    
    // Trim to max words
    const words = newText.trim().split(/\s+/).slice(0, MAX_WORDS);
    setText(words.join(' '));
    
    toast.info(`Pasted content trimmed to ${MAX_WORDS} words`);
  }
};

// Validate before submit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate text if provided
  const textValidation = validateWordCount(text, MIN_WORDS, MAX_WORDS);
  if (!textValidation.valid) {
    setTextError(textValidation.error);
    return;
  }
  
  // ... rest of submit logic
};

// In render:
<div className="space-y-2">
  <label htmlFor="review-text" className="text-sm font-medium">
    Your Review <span className="text-muted-foreground">(optional)</span>
  </label>
  
  <Textarea
    id="review-text"
    value={text}
    onChange={handleTextChange}
    onPaste={handlePaste}
    placeholder="Share your experience... What did you like or dislike? Would you recommend this business?"
    rows={5}
    className={textError ? 'border-destructive' : ''}
  />
  
  <WordCounter text={text} maxWords={MAX_WORDS} minWords={MIN_WORDS} />
  
  {textError && (
    <p className="text-sm text-destructive">{textError}</p>
  )}
</div>
```

---

### Update Service Layer Validation

#### Modify `reviewService.ts`
**Location:** `src/services/reviewService.ts`

```typescript
const MAX_WORDS = 150;
const MIN_WORDS = 1;

export async function submitReview(data: ReviewSubmission): Promise<Review> {
  // ... existing validation ...
  
  // Validate text word count
  if (data.text && data.text.trim()) {
    const wordCount = countWords(data.text);
    
    if (wordCount < MIN_WORDS) {
      throw new ReviewValidationError(
        'INVALID_TEXT',
        `Review must contain at least ${MIN_WORDS} word`
      );
    }
    
    if (wordCount > MAX_WORDS) {
      throw new ReviewValidationError(
        'INVALID_TEXT',
        `Review cannot exceed ${MAX_WORDS} words (currently ${wordCount})`
      );
    }
  }
  
  // Calculate word count for storage
  const wordCount = data.text ? countWords(data.text) : 0;
  
  // ... insert review with word_count ...
}
```

---

### Update Type Definitions

#### Verify `review.ts` types
**Location:** `src/types/review.ts`

```typescript
export interface ReviewSubmission {
  business_id: string;
  recommendation: boolean;
  text?: string;  // Optional, max 150 words
  tags?: string[];
  photo_urls?: string[];
}

export interface Review {
  // ... existing fields ...
  text: string | null;
  word_count: number;  // Ensure this stores actual count
}

// Constants (export for reuse)
export const REVIEW_TEXT_MAX_WORDS = 150;
export const REVIEW_TEXT_MIN_WORDS = 1;
```

---

## Testing Plan

### Unit Tests

```typescript
describe('countWords', () => {
  it('counts simple words correctly', () => {
    expect(countWords('hello world')).toBe(2);
  });

  it('handles multiple spaces', () => {
    expect(countWords('hello    world')).toBe(2);
  });

  it('handles newlines', () => {
    expect(countWords('hello\nworld')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace only', () => {
    expect(countWords('   ')).toBe(0);
  });

  it('counts 150 words correctly', () => {
    const loremWords = Array(150).fill('word').join(' ');
    expect(countWords(loremWords)).toBe(150);
  });
});

describe('validateWordCount', () => {
  it('passes for empty text (optional)', () => {
    expect(validateWordCount('').valid).toBe(true);
    expect(validateWordCount('  ').valid).toBe(true);
  });

  it('fails for 0 words when text has whitespace', () => {
    // Edge case handled by trim
    expect(validateWordCount('   ').valid).toBe(true);
  });

  it('passes for 1-150 words', () => {
    expect(validateWordCount('hello').valid).toBe(true);
    expect(validateWordCount(Array(150).fill('word').join(' ')).valid).toBe(true);
  });

  it('fails for 151+ words', () => {
    const result = validateWordCount(Array(151).fill('word').join(' '));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('150');
  });
});
```

### Integration Tests

```typescript
describe('Review Submission with Word Limits', () => {
  it('accepts review with 150 words', async () => {
    const text = Array(150).fill('word').join(' ');
    const review = await submitReview({
      business_id: 'test-business',
      recommendation: true,
      text
    });
    expect(review.word_count).toBe(150);
  });

  it('rejects review with 151 words', async () => {
    const text = Array(151).fill('word').join(' ');
    await expect(submitReview({
      business_id: 'test-business',
      recommendation: true,
      text
    })).rejects.toThrow(/150 words/);
  });

  it('accepts review with no text', async () => {
    const review = await submitReview({
      business_id: 'test-business',
      recommendation: true
    });
    expect(review.id).toBeDefined();
  });

  it('accepts review with 1 word', async () => {
    const review = await submitReview({
      business_id: 'test-business',
      recommendation: true,
      text: 'Amazing!'
    });
    expect(review.word_count).toBe(1);
  });
});
```

### Manual Testing Checklist
- [ ] Type 150 words - form accepts
- [ ] Type 151 words - form shows error
- [ ] Submit with no text - allowed
- [ ] Submit with only spaces - treated as empty (allowed)
- [ ] Word counter shows correct count
- [ ] Word counter color changes at 120 (yellow), 140 (red)
- [ ] Paste long text - trimmed to 150 with toast
- [ ] Edit existing review with new limit - works
- [ ] Existing reviews under 30 words display correctly

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_increase_word_limit.sql` | CREATE | Update DB constraint |
| `src/components/reviews/WordCounter.tsx` | MODIFY | Update max, add validation |
| `src/components/reviews/BusinessReviewForm.tsx` | MODIFY | Handle new limits |
| `src/services/reviewService.ts` | MODIFY | Validate word count |
| `src/types/review.ts` | MODIFY | Add constants |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Find existing `WordCounter.tsx` component
- [ ] Check current word limit validation in `reviewService.ts`
- [ ] Review database constraints on `business_reviews.text`
- [ ] Look for similar validation patterns in forms
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

**Test Route 1: Word Limit Increase**
1. Open review form
2. Type exactly 150 words → Should be accepted
3. Type 151 words → Should show error/warning
4. Verify counter shows "X / 150 words"

**Test Route 2: Minimum Validation**
1. Enter only whitespace → Should be treated as empty (allowed)
2. Enter 1 word → Should be accepted
3. Enter 0 words but have text open → Verify behavior

**Test Route 3: Edge Cases**
1. Paste long text (200+ words) → Should trim/warn
2. Edit existing review with new limit
3. Verify counter color changes at 80%/93%

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

- [ ] Database constraint updated to 150 words max
- [ ] Frontend validates 1-150 words (0 if empty)
- [ ] WordCounter shows new limit
- [ ] Color coding at 80%/93% thresholds
- [ ] Paste handling trims to limit
- [ ] Service layer validates before insert
- [ ] All existing reviews remain valid
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing complete
- [ ] Code reviewed and approved

---

**Story Owner:** Full Stack Engineering  
**Reviewer:** [TBD]
