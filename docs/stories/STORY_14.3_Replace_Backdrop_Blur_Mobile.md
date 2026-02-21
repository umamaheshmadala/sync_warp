# STORY 14.3 — Replace `backdrop-blur` → Solid `rgba()` on Mobile

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** ✅ COMPLETE
**Priority:** 🔴 Critical  
**Estimate:** 3 points  
**Dependencies:** None  
**Audit Finding:** 4.3 — 50+ `backdrop-blur` GPU filters

---

## 🎯 User Story

> As a mobile user, I want the app to use less GPU power for visual effects so that animations stay smooth and battery lasts longer.

---

## 📍 Problem

`backdrop-blur` forces the browser to create a **GPU composite layer** for each element, then applies a real-time Gaussian blur to everything behind it. On mobile GPUs (especially older Android devices), 37+ simultaneous blur layers cause:
- Choppy scrolling (dropped frames)
- Excessive GPU memory usage
- Significant battery drain

---

## 🔍 Codebase Research — 37 Files Using `backdrop-blur`

The following files contain `backdrop-blur` (via inline styles or Tailwind classes):

### Modals & Dialogs (highest impact — overlay entire screen)
1. `src/components/messaging/DeleteConfirmationDialog.tsx`
2. `src/components/messaging/VideoPreviewModal.tsx`
3. `src/components/messaging/VideoPlayer.tsx`
4. `src/components/messaging/VideoMessage.tsx`
5. `src/components/common/DeleteConfirmationModal.tsx`
6. `src/components/modals/CouponDetailsModal.tsx`
7. `src/components/reviews/ReviewPhotoGallery.tsx`
8. `src/components/reviews/ReviewRequestModal.tsx`
9. `src/components/reporting/ReportDialog.tsx`
10. `src/components/business/OperatingHoursModal.tsx`
11. `src/components/products/mobile/MobileProductModal.tsx`
12. `src/components/products/web/WebProductModal.tsx`
13. `src/components/admin/business-management/PendingEditsReviewModal.tsx`
14. `src/components/messaging/DeleteConversationSheet.tsx` (if present)

### Cards & UI Elements
15. `src/components/ui/GlassCard.tsx` — **default `blur='md'`** (used across many pages)
16. `src/components/search/BusinessCard.tsx`
17. `src/components/search/CouponCard.tsx`
18. `src/components/common/UnifiedCouponCard.tsx`
19. `src/components/business/ProductCard.tsx`
20. `src/components/products/drafts/DraftCard.tsx`
21. `src/components/products/grid/BusinessProductsTab.tsx`
22. `src/components/products/mobile/MobileProductHeader.tsx`
23. `src/components/products/web/WebProductDetailsPanel.tsx`
24. `src/components/products/creation/steps/EditArrangeStep.tsx`
25. `src/components/products/creation/ProductCreationWizard.tsx`
26. `src/components/favorites/UnifiedFavoritesPage.tsx`
27. `src/components/deals/FriendLikedDealsSection.tsx`
28. `src/components/offers/OfferAuditLogPanel.tsx`
29. `src/components/offers/OfferActionsMenu.tsx`
30. `src/components/profile/AvatarUpload.tsx`
31. `src/components/onboarding/CompletionScreen.tsx`
32. `src/components/business/RegistrationCompleteScreen.tsx`
33. `src/components/maps/GoogleMapsLocationPicker.tsx`
34. `src/components/FriendRequests.tsx`
35. `src/components/AddFriend.tsx`
36. `src/components/ads/AdCarousel.tsx`
37. `src/components/ads/AdSlot.tsx`

---

## ✅ Implementation Plan

### Approach: Global CSS Media Query (cleanest, zero per-file changes)

Instead of editing all 37 files individually, add a **single CSS rule** in `src/index.css` that disables `backdrop-blur` on mobile viewports. Desktop keeps the blur effect.

### Step 1: Add mobile blur override in `src/index.css`

Add to the bottom of `src/index.css`:
```css
/* ============================================
   EPIC 14 — Story 14.3: Disable backdrop-blur on mobile
   GPU composite layers cause battery drain & frame drops
   Desktop keeps blur; mobile gets solid rgba() fallback
   ============================================ */
@media (max-width: 768px) {
  *,
  *::before,
  *::after {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
}
```

**Why this works:** Every `backdrop-blur-sm`, `backdrop-blur-md`, `backdrop-blur-lg` in Tailwind compiles to `backdrop-filter: blur(Xpx)`. This override removes it on mobile viewports. The existing `background-color: rgba(...)` in each component provides the semi-transparent overlay effect. The blur is purely decorative — the UI is fully functional without it.

### Step 2: Verify existing `rgba()` fallbacks
Most components already have a `background-color` set alongside `backdrop-blur`. Spot-check 3-4 key components to confirm:
- `GlassCard.tsx` — has `backgroundColor: rgba(255,255,255,${opacity})` (line 43) ✅
- Modal overlays — typically have `bg-black/50` or similar ✅

### Step 3: Also add Capacitor native platform check (optional enhancement)
For Capacitor native apps, the viewport may be wider than 768px on tablets. Add an alternative approach using a CSS class on the `<body>` element:
```typescript
// In App.tsx or AppLayout.tsx:
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('native-platform');
}
```
```css
/* In index.css: */
.native-platform *,
.native-platform *::before,
.native-platform *::after {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
```

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Chrome DevTools → Layers panel (mobile viewport) | Zero `backdrop-filter` composite layers |
| Chrome DevTools → Layers panel (desktop viewport) | Blur layers still present on glass cards |
| Visual check on mobile | Cards still look good with solid rgba() backgrounds |
| Visual check on desktop | Glass blur effect preserved |
| `npm run build` | Build succeeds |
| Performance profiler → paint time | Reduced on mobile |

---

## ✅ Acceptance Criteria

- [ ] Global CSS rule disables `backdrop-blur` on `max-width: 768px`
- [ ] Optional: `native-platform` class also disables on Capacitor
- [ ] Desktop blur effect preserved
- [ ] No visual regression — rgba() fallbacks provide adequate design
- [ ] GPU composite layers reduced from 37+ to ≤5 on mobile
- [ ] Build passes

---

## ✅ Definition of Done

- [ ] CSS rule added to `index.css`
- [ ] Chrome Layers panel confirms zero blur layers on mobile
- [ ] Desktop visual unchanged
- [ ] Build passes
