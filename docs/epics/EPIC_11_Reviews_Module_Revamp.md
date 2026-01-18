# EPIC 11: Reviews Module Revamp - Master Overview

**Epic ID**: EPIC_11_Reviews_Master  
**Created**: January 18, 2026  
**Status**: 📋 READY FOR IMPLEMENTATION  
**Total Effort**: 8-10 weeks  
**Priority**: HIGH

---

## Executive Summary

Complete revamp of the SynC Reviews Module broken into 4 focused EPICs. This master document provides an overview and links to detailed phase-specific EPICs.

---

## Sub-EPICs Overview

| EPIC | Title | Duration | Stories | Priority |
|------|-------|----------|---------|----------|
| [11.1](./EPIC_11.1_Reviews_Core_Fixes.md) | Core Fixes | Week 1-2 | 6 | 🔴 Critical |
| [11.2](./EPIC_11.2_Reviews_Content_Enhancement.md) | Content Enhancement | Week 3-4 | 4 | 🟡 Medium |
| [11.3](./EPIC_11.3_Reviews_Engagement_Analytics.md) | Engagement & Analytics | Week 5-7 | 9 | 🟡 Medium |
| [11.4](./EPIC_11.4_Reviews_Trust_Safety.md) | Trust & Safety | Week 8-10 | 8 | 🔴 Critical |

**Total Stories: 27**

---

## Key Objectives

1. **Fix Critical Gaps** (EPIC 11.1): Add missing "Write Review" button, re-enable GPS verification
2. **Enhance Content** (EPIC 11.2): Increase limits (150 words, 5 photos), progressive tag system
3. **Add Engagement** (EPIC 11.3): Helpful votes, share reviews, review request prompts
4. **Trust & Safety** (EPIC 11.4): Pre-moderation system, fraud detection, admin queue

---

## Dependencies Map

```
EPIC 11.1 (Core Fixes) ← Must complete first
    ↓
EPIC 11.2 (Content) Can start parallel
    ↓
EPIC 11.3 (Engagement) → Depends on 11.1.1, 11.1.2
    ↓
EPIC 11.4 (Trust) → Can start parallel with 11.3
```

---

## Shared Design Decisions

These decisions apply across ALL sub-EPICs:

### Binary Review System (NO CHANGE)
- 👍 Recommend / 👎 Don't Recommend
- This is intentional and will NOT change to star ratings

### One Review Per User Per Business
- UNIQUE constraint on `(user_id, business_id)`
- User can edit anytime, soft delete only

### GPS Check-in Gating
- Reviews require valid GPS check-in
- Check-in creates permanent review eligibility
- Alternative verification: None, GPS only

### No Daily/Weekly Limit
- Users can review as many businesses as they want
- No artificial caps on review activity

### Real-time Features Required
- Instant review appearance
- Live helpful vote counts
- Real-time response notifications
- Live review count on storefront

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Review volume (weekly) | TBD | +50% |
| Reviews with photos | ~20% | 40% |
| Reviews with text | ~60% | 80% |
| Business response rate | TBD | 60% |
| Avg response time | TBD | < 24 hours |
| Fake review rate | Unknown | < 5% |

---

## Deferred Features

| Feature | Status | Notes |
|---------|--------|-------|
| Video Reviews | Phase II | Rich media enhancement |
| Email/SMS/QR Review Requests | Deferred | Not needed now |
| Incentivized Reviews | No | User declined |
| Reviewer Badges/Levels | No | User declined |
| Response Templates | No | User declined |
| Reply Threading/Conversations | No | User declined |
| Location-Specific Reviews | No | Skipped |
| Follow Reviewer | No | User declined |
| AI-generated Summary | Research First | If feasible |

---

## Existing Implementation (Leverage)

| Component | Location | Status |
|-----------|----------|--------|
| `BusinessReviews.tsx` | `src/components/reviews/` | ✅ Working |
| `ReviewCard.tsx` | `src/components/reviews/` | ✅ Working |
| `ReviewStats.tsx` | `src/components/reviews/` | ✅ Working |
| `reviewService.ts` | `src/services/` | ✅ Working |
| `useReviews.ts` | `src/hooks/` | ✅ Working |
| 14 total component files | ~80KB | ✅ Complete |

---

## Related Documentation

- [Analysis Report](file:///C:/Users/umama/.gemini/antigravity/brain/0173dca4-b413-4793-84dd-1c3a4312e8b6/reviews_module_analysis_report.md)
- [Decisions Summary](file:///C:/Users/umama/.gemini/antigravity/brain/0173dca4-b413-4793-84dd-1c3a4312e8b6/reviews_decisions_summary.md)
- [Proposed Tags](file:///C:/Users/umama/.gemini/antigravity/brain/0173dca4-b413-4793-84dd-1c3a4312e8b6/proposed_review_tags.md)
