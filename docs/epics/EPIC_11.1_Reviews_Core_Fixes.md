# EPIC 11.1: Reviews Module - Core Fixes

**Epic ID**: EPIC_11.1_Reviews_Core_Fixes  
**Parent**: [EPIC 11 Reviews Master](./EPIC_11_Reviews_Module_Revamp.md)  
**Created**: January 18, 2026  
**Status**: 📋 READY FOR IMPLEMENTATION  
**Duration**: Week 1-2  
**Effort**: 5 days  
**Priority**: 🔴 CRITICAL

---

## Objective

Fix critical gaps that prevent the Reviews Module from functioning properly. These are blockers that must be resolved before any enhancement work.

---

## Stories

| Story | Title | Effort | Priority | Status |
|-------|-------|--------|----------|--------|
| 11.1.1 | Add Write Review Button to Storefront | 2 days | 🔴 Critical | ✅ Verified |
| 11.1.2 | Re-enable GPS Check-in Verification | 1 day | 🚧 Partial (Testing Pending) | ✅ Verified |
| 11.1.3 | Remove 24-Hour Edit Window (Always Editable) | 0.5 days | 🟡 Medium | ✅ Complete |
| 11.1.4 | Implement Soft Delete for Reviews | 0.5 days | ✅ Complete | ✅ Complete |
| 11.1.5 | Configure All Reviews Route (/business/:id/reviews) | 0.5 days | ✅ Verified | ✅ Verified |
| 11.1.6 | Verify Driver Score Integration Works | 0.5 days | ✅ Verified | ✅ Verified |

**Total: 6 stories, 5 days effort**

---

## Issues Being Fixed

| Issue | Impact | Story |
|-------|--------|-------|
| "Write Review" button not visible | Users can't submit reviews | 11.1.1 |
| GPS check-in bypassed in code | Fake reviews possible | 11.1.2 |
| 24-hour edit restriction | Poor user experience | 11.1.3 |
| Hard delete removes legal records | Compliance risk | 11.1.4 |
| AllReviews.tsx has NO ROUTE | Full reviews page inaccessible | 11.1.5 (Fixed) |

---

## Design Decisions (Phase 1 Specific)

### Review Edit/Delete Policies

- Reviews are **always editable** (no 24-hour window)
- Show "(edited)" label on edited reviews
- Track `edit_count` in database
- **Soft delete** - hidden from public but retained for legal reasons

### GPS Check-in Gating

- Reviews require valid GPS check-in (physical visit)
- Check-in creates **permanent** review eligibility (no time limit)
- Alternative verification: **None, GPS only**
- **Admin Testing Mode:** Implemented global `system_settings` toggle to allow admins to bypass GPS requirement for testing purposes.

### Driver System Integration

Reviews contribute to driver score via existing `reviews_score`:
- Located in `src/types/campaigns.ts`
- **Scoring factors**: coupons_collected, coupons_shared, coupons_redeemed, checkins, reviews, social_interactions
- Top 10% users get gold ring badge

---

## Technical Notes

### Code Locations

| Component | Location | Action |
|-----------|----------|--------|
| `BusinessReviewForm.tsx` | `src/components/reviews/` | Surface "Write Review" button |
| `reviewService.ts` | `src/services/` | Lines 70-86 - Remove bypass comment |
| `AllReviews.tsx` | `src/components/reviews/` | Add route in Router.tsx |

### Route Configuration

```tsx
// Add to src/router/Router.tsx
<Route path="/business/:id/reviews" element={<AllReviews />} />
```

### GPS Bypass to Remove

```typescript
// reviewService.ts lines 70-86 - REMOVE THIS:
// TEMP: Check-in verification bypassed for desktop testing
console.log('⚠️  [Testing Mode] Check-in verification bypassed');
```

---

## Dependencies

- None (this is the foundation phase)

## Blocks

- EPIC 11.3 stories depend on 11.1.1 (Write Review Button)
- Story 11.3.2 depends on 11.1.2 (GPS verification)

---

## Story Files

Story files will be created during implementation phase.
