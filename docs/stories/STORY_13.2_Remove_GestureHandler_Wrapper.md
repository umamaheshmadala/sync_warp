# STORY 13.2 — Remove GestureHandler Wrapper

**EPIC:** [EPIC 13 — iOS Flickering & Animation Removal](../epics/EPIC_13_iOS_Flickering_Animation_Removal.md)  
**Status:** ✅ Complete  
**Priority:** 🔴 Critical  
**Estimate:** 1 point  
**Dependencies:** None (can run in parallel with Story 13.1)

---

## 🎯 User Story

> As a developer, I want to remove the GestureHandler wrapper from the app layout so that unnecessary touch-event processing on every screen is eliminated, simplifying the component tree and removing a potential source of scroll/gesture conflicts.

---

## 📍 Problem

`GestureHandler.tsx` (221 lines) wraps the **entire app content** in `AppLayout.tsx`. It intercepts ALL touch events (`onTouchStart`, `onTouchMove`, `onTouchEnd`) on every screen to detect horizontal edge-swipes for "back" navigation. This:

1. Adds an unnecessary wrapper `<div>` around the entire app
2. Processes every touch event against swipe detection logic
3. Sets `touchAction: 'pan-y'` which can conflict with native iOS scrolling
4. The swipe-back gesture is only used for one action: calling `navigate(-1)` — which iOS already provides natively via edge-swipe

---

## 🔍 Codebase Research — Current State

### GestureHandler.tsx (221 lines — DELETE)
- **Location:** `src/components/GestureHandler.tsx`
- **Props interface:** `children`, `onSwipeLeft`, `onSwipeRight`, `onSwipeUp`, `onSwipeDown`, `enableTabSwitching`, `tabRoutes`, `currentRoute`, `swipeThreshold`, `enableHaptics`, `disabled`, `className`
- **Does NOT import framer-motion** — it's a pure React component with touch event handlers
- **Consumers:**
  - `src/components/layout/AppLayout.tsx` — line 12 (import), lines 119-129 (usage)
  - `src/components/Layout.tsx` — but this is dead code (deleted in Story 13.1)

### AppLayout.tsx — GestureHandler usage (lines 119-129)
```tsx
<GestureHandler
  onSwipeRight={() => {
    if (preferences.swipeGesturesEnabled) {
      console.log('[AppLayout] Swipe Right Detected -> Go Back');
      navigate(-1);
    }
  }}
  disabled={!preferences.swipeGesturesEnabled}
  enableHaptics={preferences.enableHapticFeedback}
  className="w-full h-full"
>
  <div className="fixed inset-0 ...">
    ...
  </div>
</GestureHandler>
```

### What gets removed:
- The `<GestureHandler>` wrapper tag (lines 119-129 and closing tag on line 185)
- The `GestureHandler` import (line 12)
- The `useNavigate()` hook call that's only used by GestureHandler's onSwipeRight
- The `useNavigationPreferences()` hook import IF it's only used for GestureHandler

### What gets preserved:
- The inner `<div className="fixed inset-0 ...">` and ALL its children remain untouched
- `<Header />`, `<main>`, `<BottomNavigation>` — all stay exactly as they are

---

## 📋 Implementation Steps

### Step 1: Modify AppLayout.tsx — Remove GestureHandler wrapper

**Remove import (line 12):**
```diff
-import GestureHandler from '../GestureHandler';
```

**Remove wrapper (lines 119-129, 185):**
Replace the `<GestureHandler>...</GestureHandler>` wrapping with just the inner `<div>`:

```diff
-    <GestureHandler
-      onSwipeRight={() => {
-        if (preferences.swipeGesturesEnabled) {
-          console.log('[AppLayout] Swipe Right Detected -> Go Back');
-          navigate(-1);
-        }
-      }}
-      disabled={!preferences.swipeGesturesEnabled}
-      enableHaptics={preferences.enableHapticFeedback}
-      className="w-full h-full"
-    >
       <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-gray-50">
         ...
       </div>
-    </GestureHandler>
```

**Check if `navigate` and `useNavigationPreferences` are still needed:**
- `navigate` — check if used elsewhere in AppLayout (not needed if only GestureHandler used it)
- `useNavigationPreferences` — check if `preferences` is used elsewhere in AppLayout

**Note:** After verifying, `navigate` is imported on line 10 and `useNavigationPreferences` on line 11. Check if any other code in AppLayout uses these. If not, remove the imports too.

### Step 2: Delete GestureHandler.tsx
```
DELETE src/components/GestureHandler.tsx
```

### Step 3: Verify build
```
npm run build
```

---

## ⚠️ What This Story Does NOT Do

- Does **not** remove `framer-motion` (that's Stories 13.3 + 13.4)
- Does **not** affect `BottomNavigation.tsx` (that's Story 13.3)
- Does **not** change any scroll behavior — the `overscrollBehaviorY: 'none'` on `<main>` stays (that's EPIC 18, Story 18.1)

---

## 🧪 Verification

| Check | Expected Result |
|-------|-----------------|
| `npm run build` | Zero errors |
| Grep: `GestureHandler` in src/ | 0 results |
| Navigate between all tabs | All 5 tabs load correctly |
| Scroll vertically on Dashboard | Scroll works normally, no gesture conflicts |
| iOS test (if possible) | Edge-swipe back still works (native iOS gesture, not our handler) |

---

## ✅ Acceptance Criteria

- [x] `GestureHandler` import removed from `AppLayout.tsx`
- [x] `<GestureHandler>` wrapper replaced with direct children in `AppLayout.tsx`
- [x] Unused `navigate` and `useNavigationPreferences` cleaned up if no longer needed
- [x] `src/components/GestureHandler.tsx` deleted
- [x] `npm run build` passes with zero errors
- [x] Zero references to `GestureHandler` in codebase
- [x] All 5 tab routes navigate correctly
- [x] Vertical scrolling works on all pages
