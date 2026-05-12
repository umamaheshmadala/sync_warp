# STORY 13.4 — Remove framer-motion From All Component Files

**EPIC:** [EPIC 13 — iOS Flickering & Animation Removal](../epics/EPIC_13_iOS_Flickering_Animation_Removal.md)  
**Status:** ✅ Complete  
**Priority:** 🔴 Critical  
**Estimate:** 5 points  
**Dependencies:** Story 13.3 (BottomNavigation already converted — this story handles the remaining 89 files)

---

## 🎯 User Story

> As a developer, I want all framer-motion imports and usage removed from the codebase, and the packages uninstalled, so that the ~60KB animation library is eliminated from the production bundle and all animations are CSS-only.

---

## 📍 Problem

After Stories 13.1–13.3, **89 files still import `framer-motion`**. Each file uses some combination of:
- `motion.div`, `motion.button`, `motion.span`, etc.
- `AnimatePresence` for enter/exit animations
- `useAnimation`, `useMotionValue`, `useSpring` hooks
- `Reorder.Group` / `Reorder.Item` for drag-and-drop reordering
- `useDragControls`, `drag="x"`, `drag="y"` for drag gestures
- `useInView` from framer-motion (not `react-intersection-observer`)
- `whileTap`, `whileHover` props (40+ usages each)
- `PanInfo` type import

All of these must be replaced with CSS equivalents or lightweight alternative libraries.

---

## 🔍 Codebase Research — Full File List

The following **92 files** import `framer-motion`. After Stories 13.1 (PageTransition) and 13.3 (BottomNavigation), **89 remain**:

### Already handled (skip these):
1. ~~`src/components/PageTransition.tsx`~~ — deleted in Story 13.1
2. ~~`src/components/Layout.tsx`~~ — deleted in Story 13.1
3. ~~`src/components/BottomNavigation.tsx`~~ — converted in Story 13.3

### ⚠️ HIGH-COMPLEXITY FILES (need special attention — not simple find/replace)

These files use **advanced framer-motion features** beyond simple `motion.div` animations:

| # | File | Special Feature | Replacement Strategy |
|---|------|----------------|---------------------|
| ⚠️1 | `src/hooks/useSwipeToReply.ts` | `useMotionValue`, `useAnimation`, `PanInfo` type | Rewrite with plain touch events + `useState` for x offset |
| ⚠️2 | `src/components/messaging/ImagePreviewModal.tsx` | `Reorder.Group`, `Reorder.Item`, `useDragControls` | Replace with `@dnd-kit/core` + `@dnd-kit/sortable` (already in project deps via `ImagePreviewList.tsx`) |
| ⚠️3 | `src/components/ui/TiltedCard.tsx` | `useMotionValue`, `useSpring`, 3D tilt effect | Rewrite with CSS `perspective` + `transform: rotateX/rotateY` via `onMouseMove` event |
| ⚠️4 | `src/components/products/mobile/MobileProductModal.tsx` | `drag="y"`, `useAnimation`, `PanInfo`, drag-to-dismiss | Rewrite with touch events: `onTouchStart/Move/End` + CSS `transform: translateY()` |
| ⚠️5 | `src/components/messaging/MessageBubble.tsx` | `drag="x"` for swipe-to-reply gesture | This is driven by `useSwipeToReply.ts` hook — fix hook first (⚠️1), then update component |
| ⚠️6 | `src/components/ui/AnimatedList.tsx` | `useInView` from framer-motion | Replace with `useInView` from `react-intersection-observer` (already installed in project) |

### 🧪 TEST FILE (need mock removal)
| # | File | Issue |
|---|------|-------|
| ⚠️7 | `src/components/checkins/__tests__/checkinIntegration.test.tsx` | Contains `jest.mock('framer-motion', ...)` — remove mock after framer-motion is uninstalled |
| # | File | Primary motion usage |
|---|------|---------------------|
| 1 | `src/components/ui/AnimatedList.tsx` | `motion.div` for staggered list items |
| 2 | `src/components/ui/GlassCard.tsx` | `motion.div` for hover/tap animations |
| 3 | `src/components/ui/MagicBento.tsx` | `motion.div` for grid item animations |
| 4 | `src/components/ui/TiltedCard.tsx` | `motion.div` for tilt effect |
| 5 | `src/components/NavigationBadge.tsx` | `motion.span` for count animation |

### Batch 2: Business Components
| # | File | Primary motion usage |
|---|------|---------------------|
| 6 | `src/components/business/BadgeStatusCard.tsx` | `motion.div` pop-in |
| 7 | `src/components/business/BusinessAnalyticsPage.tsx` | `motion.div` chart containers |
| 8 | `src/components/business/BusinessDashboard.tsx` | `motion.div` sections |
| 9 | `src/components/business/BusinessProfile.tsx` | `motion.div` profile sections |
| 10 | `src/components/business/BusinessQRCodePage.tsx` | `motion.div` QR container |
| 11 | `src/components/business/BusinessRegistration.tsx` | `AnimatePresence` step transitions |
| 12 | `src/components/business/BusinessSearchInput.tsx` | `motion.div` results list |
| 13 | `src/components/business/ClaimBusinessButton.tsx` | `motion.button` |
| 14 | `src/components/business/CouponAnalytics.tsx` | `motion.div` chart sections |
| 15 | `src/components/business/CouponCreator.tsx` | `motion.div` form sections |
| 16 | `src/components/business/CouponManager.tsx` | `motion.div` list items |
| 17 | `src/components/business/FeaturedProducts.tsx` | `motion.div` product cards |
| 18 | `src/components/business/OnboardingReminderBanner.tsx` | `motion.div` banner |
| 19 | `src/components/business/PendingChangesWarning.tsx` | `AnimatePresence` warning |
| 20 | `src/components/business/ProductCard.tsx` | `motion.div` card |
| 21 | `src/components/business/ProductForm.tsx` | `motion.div` form sections |
| 22 | `src/components/business/ProductManager.tsx` | `motion.div` list |
| 23 | `src/components/business/ProductView.tsx` | `motion.div` detail view |
| 24 | `src/components/business/RegistrationCompleteScreen.tsx` | `motion.div` celebration |
| 25 | `src/components/business/SuspiciousActivityReporter.tsx` | `motion.div` form |

### Batch 3: Onboarding Steps
| # | File | Primary motion usage |
|---|------|---------------------|
| 26 | `src/components/business/onboarding/steps/Step0_SmartSearch.tsx` | `motion.div` search |
| 27 | `src/components/business/onboarding/steps/Step1_PhoneVerify.tsx` | `motion.div` verification |
| 28 | `src/components/business/onboarding/steps/Step2_BasicDetails.tsx` | `motion.div` form |
| 29 | `src/components/business/onboarding/steps/Step4_OperatingHours.tsx` | `motion.div` hours |

### Batch 4: Products
| # | File | Primary motion usage |
|---|------|---------------------|
| 30 | `src/components/products/actions/ProductFavoriteButton.tsx` | `motion.button` heart |
| 31 | `src/components/products/creation/ProductCreationWizard.tsx` | `AnimatePresence` steps |
| 32 | `src/components/products/mobile/MobileProductActions.tsx` | `motion.div` action bar |
| 33 | `src/components/products/mobile/MobileProductCarousel.tsx` | `motion.div` carousel |
| 34 | `src/components/products/mobile/MobileProductModal.tsx` | `AnimatePresence` modal |
| 35 | `src/components/products/social/ProductLikeButton.tsx` | `motion.button` like |
| 36 | `src/components/products/web/WebProductModal.tsx` | `AnimatePresence` modal |

### Batch 5: Messaging
| # | File | Primary motion usage |
|---|------|---------------------|
| 37 | `src/components/messaging/ImageLightbox.tsx` | `AnimatePresence` lightbox |
| 38 | `src/components/messaging/ImagePreviewModal.tsx` | `AnimatePresence` modal |
| 39 | `src/components/messaging/MessageBubble.tsx` | `motion.div` bubble |
| 40 | `src/components/messaging/PinnedMessagesBanner.tsx` | `AnimatePresence` banner |
| 41 | `src/components/messaging/VideoPreviewModal.tsx` | `AnimatePresence` modal |

### Batch 6: Following/Friends
| # | File | Primary motion usage |
|---|------|---------------------|
| 42 | `src/components/following/FollowButton.tsx` | `motion.button` |
| 43 | `src/components/following/FollowerFeed.tsx` | `motion.div` feed items |
| 44 | `src/components/following/FollowerNotificationBell.tsx` | `motion.div` bell shake |
| 45 | `src/components/following/NotificationPreferencesModal.tsx` | `AnimatePresence` modal |
| 46 | `src/components/FriendActivityFeed.tsx` | `motion.div` activity items |
| 47 | `src/components/FriendManagement.tsx` | `motion.div` list |
| 48 | `src/components/FriendRequestCard.tsx` | `motion.div` card |
| 49 | `src/components/FriendRequests.tsx` | `AnimatePresence` list |
| 50 | `src/components/FriendsManagementPage.tsx` | `motion.div` sections |
| 51 | `src/components/friends/GlobalUserSearch.tsx` | `AnimatePresence` results |
| 52 | `src/components/AddFriend.tsx` | `motion.div` search |

### Batch 7: Favorites
| # | File | Primary motion usage |
|---|------|---------------------|
| 53 | `src/components/favorites/FavoritesPage.tsx` | `AnimatePresence` tabs |
| 54 | `src/components/favorites/UnifiedFavoritesPage.tsx` | `AnimatePresence` list |
| 55 | `src/components/favorites/SaveButton.tsx` | `motion.button` |
| 56 | `src/components/favorites/SimpleSaveButton.tsx` | `motion.button` |

### Batch 8: Reviews
| # | File | Primary motion usage |
|---|------|---------------------|
| 57 | `src/components/reviews/BusinessReviewForm.tsx` | `motion.div` form |
| 58 | `src/components/reviews/BusinessReviews.tsx` | `AnimatePresence` reviews |
| 59 | `src/components/reviews/ReviewCard.tsx` | `motion.div` card |
| 60 | `src/components/reviews/ReviewFilters.tsx` | `AnimatePresence` filter tags |
| 61 | `src/components/reviews/ReviewRequestModal.tsx` | `AnimatePresence` modal |
| 62 | `src/components/reviews/ReviewResponseForm.tsx` | `motion.div` form |
| 63 | `src/components/reviews/ReviewStats.tsx` | `motion.div` stats |
| 64 | `src/components/reviews/ReviewTagSelector.tsx` | `motion.button` tags |
| 65 | `src/components/reviews/UserReviewsList.tsx` | `AnimatePresence` list |
| 66 | `src/components/reviews/WordCounter.tsx` | `motion.div` counter |

### Batch 9: Sharing / Coupons / Other
| # | File | Primary motion usage |
|---|------|---------------------|
| 67 | `src/components/ShareDealSimple.tsx` | `motion.div` |
| 68 | `src/components/ShareDealWithFriend.tsx` | `motion.div` |
| 69 | `src/components/Sharing/FriendSelector.tsx` | `AnimatePresence` results |
| 70 | `src/components/Sharing/ShareCouponModal.tsx` | `AnimatePresence` modal |
| 71 | `src/components/user/CouponBrowser.tsx` | `AnimatePresence` list |
| 72 | `src/components/user/CouponRedemption.tsx` | `AnimatePresence` steps |
| 73 | `src/components/user/CouponWallet.tsx` | `AnimatePresence` list |
| 74 | `src/components/modals/CouponDetailsModal.tsx` | `AnimatePresence` modal |
| 75 | `src/components/offers/OfferDetailModal.tsx` | `AnimatePresence` modal |

### Batch 10: Contacts / Campaigns / Check-ins / Ads / Pages
| # | File | Primary motion usage |
|---|------|---------------------|
| 76 | `src/components/ContactsSidebar.tsx` | `motion.div` sidebar |
| 77 | `src/components/ContactsSidebarEnhanced.tsx` | `motion.div` sidebar |
| 78 | `src/components/ContactsSidebarWithTabs.tsx` | `AnimatePresence` tabs |
| 79 | `src/components/campaigns/FollowerSegmentSelector.tsx` | `motion.div` |
| 80 | `src/components/checkins/BusinessCheckinAnalytics.tsx` | `motion.div` |
| 81 | `src/components/checkins/CheckinRewards.tsx` | `AnimatePresence` rewards |
| 82 | `src/components/ads/AdCarousel.tsx` | `AnimatePresence` carousel |
| 83 | `src/components/ads/AdSlot.tsx` | `motion.div` ad container |
| 84 | `src/components/location/CityPicker.tsx` | `AnimatePresence` dropdown |
| 85 | `src/pages/MyReviewsPage.tsx` | `motion.div` page sections |
| 86-89 | 4 more files (overflow from grep truncation) | Various motion usage |

---

## 📋 Implementation Strategy

### Pattern: motion.div → div with CSS class

The most common pattern across all 89 files is:
```tsx
// BEFORE (framer-motion)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// AFTER (CSS)
<div className="animate-fadeInUp">
```

### Pattern: AnimatePresence → conditional render with CSS

```tsx
// BEFORE
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>

// AFTER
{isOpen && (
  <div className="animate-fadeIn">
    {content}
  </div>
)}
```

> **Note:** CSS cannot replicate exit animations. When `AnimatePresence` + `exit` is used, either drop the exit animation (acceptable for most cases) or use a `closing` state with `setTimeout` for critical modals.

### Pattern: `whileTap={{ scale: X }}` → CSS `active:scale-*`

> **40+ usages** across the codebase. This is the most common pattern.

```tsx
// BEFORE (framer-motion)
<motion.button whileTap={{ scale: 0.95 }}>

// AFTER (CSS — Tailwind)
<button className="active:scale-95 transition-transform duration-150">
```

Common scale values found:
- `scale: 0.95` → `active:scale-95` (buttons)
- `scale: 0.98` → `active:scale-[0.98]` (cards, filters)
- `scale: 0.9` → `active:scale-90` (icon buttons)
- `scale: 0.8` → `active:scale-[0.8]` (small icon buttons)

### Pattern: `whileHover={{ scale: X }}` → CSS `hover:scale-*`

> **40+ usages** across the codebase.

```tsx
// BEFORE
<motion.div whileHover={{ scale: 1.02 }}>

// AFTER (CSS — Tailwind — use safe-hover to avoid mobile ghost hovers)
<div className="safe-hover-scale transition-transform duration-150">
```

Common scale values found:
- `scale: 1.02` → `hover:scale-[1.02]`
- `scale: 1.05` → `hover:scale-105`
- `scale: 1.1` → `hover:scale-110`

> **Note on mobile:** On touch devices, `:hover` states can "stick" after tap. If the app already has a `safe-hover` utility, use it. Otherwise, use `@media (hover: hover)` to scope hover effects to pointer devices only.

### Recommended CSS utilities to add to `index.css`:

```css
/* Shared animation utilities for framer-motion replacement */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-fadeIn { animation: fadeIn 0.2s ease-out; }
.animate-fadeInUp { animation: fadeInUp 0.3s ease-out; }
.animate-fadeInDown { animation: fadeInDown 0.3s ease-out; }
.animate-scaleIn { animation: scaleIn 0.2s ease-out; }
.animate-slideInRight { animation: slideInRight 0.3s ease-out; }
```

### File-by-file execution:
1. Open each file
2. Remove `import { motion, AnimatePresence } from 'framer-motion'`
3. Replace `<motion.X>` → `<X>` with appropriate CSS class
4. Replace `<AnimatePresence>` wrappers → remove (keep conditional render)
5. Remove any `useAnimation()`, `useMotionValue()`, `useTransform()` hooks
6. Verify each file compiles

### Step: Uninstall packages from package.json
After all 89 files are converted:
```bash
npm uninstall framer-motion motion
```

---

## 🧪 Verification

| Check | Expected Result |
|-------|-----------------|
| `npm run build` | Zero errors, zero warnings |
| Grep: `framer-motion` in src/ | 0 results |
| Grep: `motion\.` in src/ (except CSS `motion` media queries) | 0 results |
| Grep: `AnimatePresence` in src/ | 0 results |
| `package.json` | No `framer-motion` or `motion` dependency |
| Bundle analyzer | ~60KB reduction in production bundle |
| Visual smoke test | All pages render, animations feel smooth |

---

## ✅ Acceptance Criteria

- [x] Zero `framer-motion` or `motion` imports in any `.tsx` or `.ts` file
- [x] `framer-motion` and `motion` uninstalled from `package.json`
- [x] CSS animation utilities added to `index.css`
- [x] All modals still animate in (CSS `fadeIn` / `scaleIn`)
- [x] All list items still animate in (CSS `fadeInUp`)
- [x] All buttons have CSS `active:scale-95` where previously using `whileTap`
- [x] `npm run build` passes with zero errors
- [x] Production bundle ~60KB smaller (verify with `npx vite-bundle-visualizer`)
