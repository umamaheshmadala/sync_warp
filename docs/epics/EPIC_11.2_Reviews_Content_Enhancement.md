# EPIC 11.2: Reviews Module - Content Enhancement

**Epic ID**: EPIC_11.2_Reviews_Content_Enhancement  
**Parent**: [EPIC 11 Reviews Master](./EPIC_11_Reviews_Module_Revamp.md)  
**Created**: January 18, 2026  
**Status**: 📋 READY FOR IMPLEMENTATION  
**Duration**: Week 3-4  
**Effort**: 7.5 days  
**Priority**: 🟡 MEDIUM

---

## Objective

Enhance review content quality by increasing limits, supporting multiple photos, and implementing a progressive tag disclosure system.

---

## Stories

| Story | Title | Effort | Priority | Status |
|-------|-------|--------|----------|--------|
| 11.2.1 | Increase Review Text Limit to 150 Words + Min 1 Word | 1 day | 🟡 Medium | ✅ Verified |
| 11.2.2 | Multi-Photo Support (Up to 5 Photos, <1MB each) | 3 days | 🟡 Medium | ✅ Verified |
| 11.2.3 | Progressive Tag Disclosure System | 3 days | 🟡 Medium | ✅ Verified |
| 11.2.4 | Business Response Word Limit to 150 | 0.5 days | 🟢 Low | ✅ Verified |

**Total: 4 stories, 7.5 days effort**

---

## Design Decisions (Phase 2 Specific)

### Review Text Requirements

- **Maximum**: 150 words (up from 30)
- **Minimum**: 1 word (if text is provided at all)
- **Optional**: Text is not required for submission

### Photo Requirements

- **Maximum**: 5 photos per review
- **Size limit**: <1MB per photo
- Storage: `photo_urls TEXT[]` array

### Tag System

- **Common Tags**: Apply to all business types
- **Category-Specific Tags**: Vary by business category (Restaurant, Retail, Service)
- **Progressive Disclosure**: 5 → 5 → 5 (max 3 rounds, 15 tags max shown)
- **Unlimited Selection**: No limit per review for analytics value
- **Storage**: `tags TEXT[]` in business_reviews table
- **Custom tags**: NO (user declined)
- **India-market relevant**: Tags researched from Zomato, Swiggy, Google India

### Business Response Requirements

- **Word limit**: 150 words (up from 50)
- **Response templates**: NO (user declined)

---

## Database Schema Changes

```sql
-- Update word limit constraint
ALTER TABLE business_reviews 
DROP CONSTRAINT check_word_count,
ADD CONSTRAINT check_word_count CHECK (word_count <= 150);

-- Update response word limit
ALTER TABLE business_review_responses
DROP CONSTRAINT check_response_word_count,
ADD CONSTRAINT check_response_word_count CHECK (word_count <= 150);

-- Ensure photo_urls is array
ALTER TABLE business_reviews
ALTER COLUMN photo_urls TYPE TEXT[] USING ARRAY[photo_url],
ADD CONSTRAINT check_photo_count CHECK (array_length(photo_urls, 1) <= 5);
```

---

## Technical Notes

### Components to Modify

| Component | Changes |
|-----------|---------|
| `BusinessReviewForm.tsx` | Update word counter, add multi-photo |
| `ReviewPhotoUpload.tsx` | Support multiple photos, size validation |
| `ReviewTagSelector.tsx` | Progressive disclosure logic |
| `WordCounter.tsx` | Update max to 150 |
| `ReviewResponseForm.tsx` | Update max to 150 |

### Tag Categories

See [Proposed Tags Document](file:///C:/Users/umama/.gemini/antigravity/brain/0173dca4-b413-4793-84dd-1c3a4312e8b6/proposed_review_tags.md) for complete tag list.

---

## Dependencies

- EPIC 11.1 should be completed first (but can start in parallel)

---

## Story Files

Story files will be created during implementation phase.
