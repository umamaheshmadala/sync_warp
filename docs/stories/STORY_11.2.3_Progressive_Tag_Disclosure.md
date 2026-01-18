# Story 11.2.3: Progressive Tag Disclosure System

**Epic:** [EPIC 11.2 - Reviews Content Enhancement](../epics/EPIC_11.2_Reviews_Content_Enhancement.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 3 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Implement a progressive tag disclosure system where tags are revealed in rounds: initially show 5 tags, then reveal 5 more when user selects any, up to 3 rounds (15 total tags shown). Tags are category-specific (Restaurant, Service, Retail) and India-market relevant. Users can select unlimited tags per review for analytics value.

---

## Problem Statement

### Current State
- Fixed set of 20 tags shown all at once
- Same tags for all business types
- Overwhelming for users (too many choices)
- Tags not optimized for Indian market

### Desired State
- Progressive disclosure: 5 → 5 → 5 tags (max 3 rounds)
- Category-specific tag sets
- India-market relevant tags (from Zomato, Swiggy, Google India research)
- Unlimited tag selection per review
- If user unselects a tag, keep extra options visible (best UX)

---

## User Stories

### US-11.2.3.1: Progressive Tag Revelation
**As a** user writing a review  
**I want to** see tags gradually revealed  
**So that** I'm not overwhelmed with choices

**Acceptance Criteria:**
- [ ] Initially show 5 most common tags
- [ ] When user selects any tag, reveal next 5
- [ ] Maximum 3 rounds of revelation (15 tags max)
- [ ] Smooth animation when revealing new tags
- [ ] "Show more tags" button as alternative trigger
- [ ] Once revealed, tags stay visible (don't hide on unselect)

---

### US-11.2.3.2: Category-Specific Tags
**As a** user reviewing different business types  
**I want to** see relevant tags for that category  
**So that** my feedback is specific and useful

**Acceptance Criteria:**
- [ ] Restaurant/Food businesses: Food-specific tags
- [ ] Service businesses: Service-specific tags (salon, spa, gym)
- [ ] Retail businesses: Shopping-specific tags
- [ ] Unknown category: Core/universal tags
- [ ] Tags load based on business category

---

### US-11.2.3.3: Unlimited Tag Selection
**As a** user  
**I want to** select as many tags as apply  
**So that** I can provide comprehensive feedback

**Acceptance Criteria:**
- [ ] No limit on number of tags per review
- [ ] Selected tags highlighted clearly
- [ ] Can toggle tags on/off
- [ ] All selected tags saved with review
- [ ] Tags stored as JSONB array in database (see design decision below)

---

## Design Decision: Tag Data Storage

> [!IMPORTANT]
> **Store both tag ID AND display name** for historical accuracy.

**Problem:** If a tag's display text changes in the future (e.g., "Great Value" → "Excellent Value"), reviews using the old tag would show incorrect labels.

**Solution:** Store tag data as JSONB array instead of TEXT[]:

```json
// Instead of: tags TEXT[] = ['great_value', 'fresh_ingredients']
// Use: tags JSONB =
[
  { "id": "great_value", "label": "Great Value", "icon": "💰" },
  { "id": "fresh_ingredients", "label": "Fresh Ingredients", "icon": "🌿" }
]
```

**Migration Required:**
```sql
-- Change tags column from TEXT[] to JSONB
ALTER TABLE business_reviews
ALTER COLUMN tags TYPE JSONB USING
  CASE
    WHEN tags IS NULL THEN NULL::JSONB
    ELSE (SELECT jsonb_agg(jsonb_build_object('id', t, 'label', t, 'icon', '')) FROM unnest(tags) AS t)::JSONB
  END;
```

**Impact:**
- `ReviewTagSelector` saves full tag objects
- `ReviewTagDisplay` reads from stored labels (no lookup needed)
- Future tag changes don't affect historical reviews

---

### US-11.2.3.4: Tag Display on Review
**As a** user viewing reviews  
**I want to** see which tags the reviewer selected  
**So that** I can quickly understand their experience

**Acceptance Criteria:**
- [ ] Tags displayed as colored chips/badges
- [ ] Different colors for positive vs. negative tags
- [ ] Tags are clickable (filter reviews by tag - future)
- [ ] Maximum 5 tags shown inline, "+X more" for rest
- [ ] Full list in expanded view

---

## Technical Requirements

### Tag System Data Structure

**File:** `src/data/reviewTags.ts`

```typescript
export interface TagCategory {
  id: string;
  name: string;
  rounds: TagRound[];
}

export interface TagRound {
  round: number;
  tags: Tag[];
}

export interface Tag {
  id: string;
  label: string;
  icon: string;  // Emoji or icon name
  sentiment: 'positive' | 'negative' | 'neutral';
}

// Core tags (Universal - all business types)
export const CORE_TAGS: TagCategory = {
  id: 'core',
  name: 'General',
  rounds: [
    {
      round: 1,
      tags: [
        { id: 'great_value', label: 'Great Value', icon: '💰', sentiment: 'positive' },
        { id: 'excellent_service', label: 'Excellent Service', icon: '⭐', sentiment: 'positive' },
        { id: 'clean_hygienic', label: 'Clean & Hygienic', icon: '✨', sentiment: 'positive' },
        { id: 'quick_efficient', label: 'Quick & Efficient', icon: '⚡', sentiment: 'positive' },
        { id: 'would_return', label: 'Would Return', icon: '🔄', sentiment: 'positive' },
      ]
    },
    {
      round: 2,
      tags: [
        { id: 'friendly_staff', label: 'Friendly Staff', icon: '😊', sentiment: 'positive' },
        { id: 'good_location', label: 'Good Location', icon: '📍', sentiment: 'positive' },
        { id: 'easy_parking', label: 'Easy Parking', icon: '🅿️', sentiment: 'positive' },
        { id: 'long_wait', label: 'Long Wait Time', icon: '⏰', sentiment: 'negative' },
        { id: 'overpriced', label: 'Overpriced', icon: '💸', sentiment: 'negative' },
      ]
    },
    {
      round: 3,
      tags: [
        { id: 'kid_friendly', label: 'Kid Friendly', icon: '👨‍👩‍👧', sentiment: 'positive' },
        { id: 'pet_friendly', label: 'Pet Friendly', icon: '🐕', sentiment: 'positive' },
        { id: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: '♿', sentiment: 'neutral' },
        { id: 'good_for_groups', label: 'Good for Groups', icon: '👥', sentiment: 'positive' },
        { id: 'covid_safe', label: 'COVID Safe Practices', icon: '😷', sentiment: 'positive' },
      ]
    }
  ]
};

// Restaurant/Food tags
export const RESTAURANT_TAGS: TagCategory = {
  id: 'restaurant',
  name: 'Food & Dining',
  rounds: [
    {
      round: 1,
      tags: [
        { id: 'delicious_food', label: 'Delicious Food', icon: '😋', sentiment: 'positive' },
        { id: 'fresh_ingredients', label: 'Fresh Ingredients', icon: '🌿', sentiment: 'positive' },
        { id: 'good_portions', label: 'Good Portions', icon: '🍽️', sentiment: 'positive' },
        { id: 'great_ambiance', label: 'Great Ambiance', icon: '🎵', sentiment: 'positive' },
        { id: 'worth_the_price', label: 'Worth the Price', icon: '💰', sentiment: 'positive' },
      ]
    },
    {
      round: 2,
      tags: [
        { id: 'quick_service', label: 'Quick Service', icon: '⚡', sentiment: 'positive' },
        { id: 'authentic_flavors', label: 'Authentic Flavors', icon: '🌶️', sentiment: 'positive' },
        { id: 'hygienic_kitchen', label: 'Hygienic Kitchen', icon: '✨', sentiment: 'positive' },
        { id: 'friendly_staff', label: 'Friendly Staff', icon: '😊', sentiment: 'positive' },
        { id: 'beautiful_presentation', label: 'Beautiful Presentation', icon: '🎨', sentiment: 'positive' },
      ]
    },
    {
      round: 3,
      tags: [
        { id: 'long_wait', label: 'Long Wait', icon: '⏰', sentiment: 'negative' },
        { id: 'limited_menu', label: 'Limited Menu', icon: '📋', sentiment: 'negative' },
        { id: 'overpriced', label: 'Overpriced', icon: '💸', sentiment: 'negative' },
        { id: 'not_for_kids', label: 'Not for Kids', icon: '🚫', sentiment: 'neutral' },
        { id: 'date_night', label: 'Perfect for Date Night', icon: '❤️', sentiment: 'positive' },
      ]
    }
  ]
};

// Service business tags (Salon, Spa, Fitness)
export const SERVICE_TAGS: TagCategory = {
  id: 'service',
  name: 'Services',
  rounds: [
    {
      round: 1,
      tags: [
        { id: 'professional', label: 'Professional Service', icon: '💼', sentiment: 'positive' },
        { id: 'clean_hygienic', label: 'Clean & Hygienic', icon: '✨', sentiment: 'positive' },
        { id: 'reasonable_prices', label: 'Reasonable Prices', icon: '💰', sentiment: 'positive' },
        { id: 'polite_staff', label: 'Polite Staff', icon: '😊', sentiment: 'positive' },
        { id: 'would_recommend', label: 'Would Recommend', icon: '👍', sentiment: 'positive' },
      ]
    },
    {
      round: 2,
      tags: [
        { id: 'on_time', label: 'On-Time Service', icon: '⏰', sentiment: 'positive' },
        { id: 'skilled_experts', label: 'Skilled Experts', icon: '🏆', sentiment: 'positive' },
        { id: 'relaxing_atmosphere', label: 'Relaxing Atmosphere', icon: '🧘', sentiment: 'positive' },
        { id: 'good_products', label: 'Good Products Used', icon: '🧴', sentiment: 'positive' },
        { id: 'easy_booking', label: 'Easy Booking', icon: '📅', sentiment: 'positive' },
      ]
    },
    {
      round: 3,
      tags: [
        { id: 'long_wait', label: 'Long Wait', icon: '⌛', sentiment: 'negative' },
        { id: 'too_expensive', label: 'Too Expensive', icon: '💸', sentiment: 'negative' },
        { id: 'rushed_service', label: 'Rushed Service', icon: '🏃', sentiment: 'negative' },
        { id: 'private_cabins', label: 'Private Cabins', icon: '🚪', sentiment: 'positive' },
        { id: 'ladies_only', label: 'Ladies Only', icon: '👩', sentiment: 'neutral' },
      ]
    }
  ]
};

// Retail tags
export const RETAIL_TAGS: TagCategory = {
  id: 'retail',
  name: 'Shopping',
  rounds: [
    {
      round: 1,
      tags: [
        { id: 'great_selection', label: 'Great Selection', icon: '🛍️', sentiment: 'positive' },
        { id: 'quality_products', label: 'Quality Products', icon: '⭐', sentiment: 'positive' },
        { id: 'fair_prices', label: 'Fair Prices', icon: '💰', sentiment: 'positive' },
        { id: 'helpful_staff', label: 'Helpful Staff', icon: '🙋', sentiment: 'positive' },
        { id: 'easy_returns', label: 'Easy Returns', icon: '🔄', sentiment: 'positive' },
      ]
    },
    {
      round: 2,
      tags: [
        { id: 'well_organized', label: 'Well Organized', icon: '📦', sentiment: 'positive' },
        { id: 'genuine_products', label: 'Genuine Products', icon: '✅', sentiment: 'positive' },
        { id: 'good_discounts', label: 'Good Discounts', icon: '🏷️', sentiment: 'positive' },
        { id: 'quick_billing', label: 'Quick Billing', icon: '💳', sentiment: 'positive' },
        { id: 'clean_store', label: 'Clean Store', icon: '✨', sentiment: 'positive' },
      ]
    },
    {
      round: 3,
      tags: [
        { id: 'limited_stock', label: 'Limited Stock', icon: '📉', sentiment: 'negative' },
        { id: 'overpriced', label: 'Overpriced', icon: '💸', sentiment: 'negative' },
        { id: 'pushy_staff', label: 'Pushy Staff', icon: '😤', sentiment: 'negative' },
        { id: 'good_for_gifts', label: 'Good for Gifts', icon: '🎁', sentiment: 'positive' },
        { id: 'trusted_brand', label: 'Trusted Brand', icon: '🏅', sentiment: 'positive' },
      ]
    }
  ]
};

/**
 * Get tags for a business category
 */
export function getTagsForCategory(category: string): TagCategory {
  const categoryMap: Record<string, TagCategory> = {
    'food_dining': RESTAURANT_TAGS,
    'restaurant': RESTAURANT_TAGS,
    'cafe': RESTAURANT_TAGS,
    'health_beauty': SERVICE_TAGS,
    'salon': SERVICE_TAGS,
    'spa': SERVICE_TAGS,
    'gym': SERVICE_TAGS,
    'retail': RETAIL_TAGS,
    'shopping': RETAIL_TAGS,
  };
  
  return categoryMap[category.toLowerCase()] || CORE_TAGS;
}

/**
 * Get all tags up to a specific round
 */
export function getTagsUpToRound(category: TagCategory, round: number): Tag[] {
  return category.rounds
    .filter(r => r.round <= round)
    .flatMap(r => r.tags);
}
```

---

### Progressive Tag Selector Component

**File:** `src/components/reviews/ReviewTagSelector.tsx`

```tsx
import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTagsForCategory, getTagsUpToRound, Tag } from '@/data/reviewTags';
import { cn } from '@/lib/utils';

interface ReviewTagSelectorProps {
  businessCategory: string;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const MAX_ROUNDS = 3;

export function ReviewTagSelector({ 
  businessCategory, 
  selectedTags, 
  onTagsChange 
}: ReviewTagSelectorProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const tagCategory = useMemo(() => getTagsForCategory(businessCategory), [businessCategory]);
  const visibleTags = useMemo(() => getTagsUpToRound(tagCategory, currentRound), [tagCategory, currentRound]);
  
  // Reveal more tags when user selects any
  useEffect(() => {
    if (selectedTags.length > 0 && !hasInteracted) {
      setHasInteracted(true);
    }
    
    // Reveal next round when selecting from current round
    if (hasInteracted && currentRound < MAX_ROUNDS) {
      setCurrentRound(prev => Math.min(prev + 1, MAX_ROUNDS));
    }
  }, [selectedTags, hasInteracted, currentRound]);
  
  const handleTagClick = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(t => t !== tagId)
      : [...selectedTags, tagId];
    
    onTagsChange(newTags);
  };
  
  const handleShowMore = () => {
    if (currentRound < MAX_ROUNDS) {
      setCurrentRound(prev => prev + 1);
      setHasInteracted(true);
    }
  };
  
  const canShowMore = currentRound < MAX_ROUNDS;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Tags <span className="text-muted-foreground">(optional)</span>
        </label>
        {selectedTags.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedTags.length} selected
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {visibleTags.map((tag, index) => (
            <motion.button
              key={tag.id}
              type="button"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleTagClick(tag.id)}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm',
                'border transition-all',
                selectedTags.includes(tag.id)
                  ? tag.sentiment === 'negative'
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : 'bg-primary/10 border-primary text-primary'
                  : 'bg-muted hover:bg-accent border-transparent'
              )}
            >
              <span>{tag.icon}</span>
              <span>{tag.label}</span>
              {selectedTags.includes(tag.id) && (
                <Check className="w-3 h-3 ml-1" />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      
      {canShowMore && (
        <button
          type="button"
          onClick={handleShowMore}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          Show more tags
        </button>
      )}
      
      <p className="text-xs text-muted-foreground">
        {selectedTags.length === 0 
          ? 'Select tags that describe your experience'
          : 'Keep selecting to see more tag options'}
      </p>
    </div>
  );
}
```

---

### Update Review Form Integration

#### Modify `BusinessReviewForm.tsx`

```tsx
import { ReviewTagSelector } from './ReviewTagSelector';

// In the component:
const [selectedTags, setSelectedTags] = useState<string[]>(existingReview?.tags || []);

// Get business category (from props or context)
const { data: business } = useBusiness(businessId);
const businessCategory = business?.category || 'general';

// In render:
<ReviewTagSelector
  businessCategory={businessCategory}
  selectedTags={selectedTags}
  onTagsChange={setSelectedTags}
/>

// Include tags in submission:
await submitReview({
  business_id: businessId,
  recommendation,
  text,
  tags: selectedTags,  // Array of tag IDs
  photo_urls: photos
});
```

---

### Tag Display Component

**File:** `src/components/reviews/ReviewTagDisplay.tsx`

```tsx
import { Tag as TagType, CORE_TAGS, RESTAURANT_TAGS, SERVICE_TAGS, RETAIL_TAGS } from '@/data/reviewTags';
import { cn } from '@/lib/utils';

// Build tag lookup map
const ALL_TAGS = [
  ...CORE_TAGS.rounds.flatMap(r => r.tags),
  ...RESTAURANT_TAGS.rounds.flatMap(r => r.tags),
  ...SERVICE_TAGS.rounds.flatMap(r => r.tags),
  ...RETAIL_TAGS.rounds.flatMap(r => r.tags),
];

const TAG_MAP = new Map(ALL_TAGS.map(tag => [tag.id, tag]));

interface ReviewTagDisplayProps {
  tagIds: string[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}

export function ReviewTagDisplay({ 
  tagIds, 
  maxVisible = 5,
  size = 'sm' 
}: ReviewTagDisplayProps) {
  if (!tagIds || tagIds.length === 0) return null;
  
  const visibleTags = tagIds.slice(0, maxVisible);
  const hiddenCount = tagIds.length - maxVisible;
  
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {visibleTags.map(tagId => {
        const tag = TAG_MAP.get(tagId);
        if (!tag) return null;
        
        return (
          <span
            key={tagId}
            className={cn(
              'inline-flex items-center gap-1 rounded-full',
              size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
              tag.sentiment === 'negative'
                ? 'bg-red-100 text-red-700'
                : tag.sentiment === 'positive'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            <span>{tag.icon}</span>
            <span>{tag.label}</span>
          </span>
        );
      })}
      
      {hiddenCount > 0 && (
        <span className={cn(
          'inline-flex items-center rounded-full bg-muted text-muted-foreground',
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        )}>
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
```

---

### Update ReviewCard to Display Tags

#### Modify `ReviewCard.tsx`

```tsx
import { ReviewTagDisplay } from './ReviewTagDisplay';

// In the render:
{review.tags && review.tags.length > 0 && (
  <ReviewTagDisplay tagIds={review.tags} maxVisible={5} />
)}
```

---

### Database Verification

```sql
-- Verify tags column is TEXT[]
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_reviews' AND column_name = 'tags';

-- Should return: tags | ARRAY
-- If not, run migration:
ALTER TABLE business_reviews
ALTER COLUMN tags TYPE TEXT[] USING ARRAY[tags];
```

---

## Dependencies

Add framer-motion for animations:
```bash
npm install framer-motion
```

---

## Testing Plan

### Unit Tests

```typescript
describe('getTagsForCategory', () => {
  it('returns restaurant tags for food category', () => {
    const tags = getTagsForCategory('food_dining');
    expect(tags.id).toBe('restaurant');
  });

  it('returns core tags for unknown category', () => {
    const tags = getTagsForCategory('unknown');
    expect(tags.id).toBe('core');
  });
});

describe('getTagsUpToRound', () => {
  it('returns 5 tags for round 1', () => {
    const tags = getTagsUpToRound(CORE_TAGS, 1);
    expect(tags.length).toBe(5);
  });

  it('returns 10 tags for round 2', () => {
    const tags = getTagsUpToRound(CORE_TAGS, 2);
    expect(tags.length).toBe(10);
  });

  it('returns 15 tags for round 3', () => {
    const tags = getTagsUpToRound(CORE_TAGS, 3);
    expect(tags.length).toBe(15);
  });
});

describe('ReviewTagSelector', () => {
  it('shows 5 tags initially', () => {
    render(<ReviewTagSelector businessCategory="restaurant" selectedTags={[]} onTagsChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    // 5 tags + 1 "show more" button
    expect(buttons.length).toBe(6);
  });

  it('reveals more tags when selecting', async () => {
    const onTagsChange = vi.fn();
    render(<ReviewTagSelector businessCategory="restaurant" selectedTags={[]} onTagsChange={onTagsChange} />);
    
    await userEvent.click(screen.getByText('Delicious Food'));
    
    // Should now show 10 tags
    // ...
  });

  it('keeps tags visible after unselecting', async () => {
    // Select a tag, reveal more, unselect - should still show revealed tags
  });
});
```

### Manual Testing Checklist
- [ ] Initial display shows exactly 5 tags
- [ ] Selecting any tag reveals 5 more (smooth animation)
- [ ] Selecting again reveals final 5 tags
- [ ] "Show more" button also reveals more tags
- [ ] Unselecting a tag keeps revealed tags visible
- [ ] Restaurant business shows food-specific tags
- [ ] Service business shows service-specific tags
- [ ] Retail business shows shopping-specific tags
- [ ] Unknown category shows core tags
- [ ] Can select unlimited tags
- [ ] Selected tags show checkmark
- [ ] Negative tags have different styling (red)
- [ ] Tags display correctly on saved review
- [ ] "+X more" shown when many tags selected

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/data/reviewTags.ts` | CREATE | Tag definitions and functions |
| `src/components/reviews/ReviewTagSelector.tsx` | REWRITE | Progressive disclosure component |
| `src/components/reviews/ReviewTagDisplay.tsx` | CREATE | Tag display for review cards |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Use new tag display |
| `src/components/reviews/BusinessReviewForm.tsx` | MODIFY | Integrate new tag selector |
| `package.json` | MODIFY | Add framer-motion (if not present) |

---

## Definition of Done

- [ ] Tags organized in 3 rounds of 5 each
- [ ] Progressive disclosure (5 → 10 → 15)
- [ ] Category-specific tag sets working
- [ ] Animation on tag revelation smooth
- [ ] "Show more" button alternative works
- [ ] Unselecting tags keeps revealed tags visible
- [ ] Unlimited tag selection allowed
- [ ] Tags display correctly on review cards
- [ ] Positive/negative tag styling different
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
