# STORY 13.1 — Delete PageTransition.tsx & Dead Layout.tsx

**EPIC:** [EPIC 13 — iOS Flickering & Animation Removal](../epics/EPIC_13_iOS_Flickering_Animation_Removal.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 1 point  
**Dependencies:** None (first story, no blockers)

---

## 🎯 User Story

> As a mobile user, I want route changes to be instant with no flickering so that the app feels native and responsive.

---

## 📍 Problem

`PageTransition.tsx` wraps every child in `<AnimatePresence>` + `<motion.div>` with three different animation variant sets (`variants`, `authVariants`, `modalVariants`). Each route change triggers:
1. **Exit animation** (opacity 0, y -20, scale 1.02) — 200ms
2. **Wait** for AnimatePresence mode="wait" to finish exit
3. **Enter animation** (opacity 0→1, y 20→0, scale 0.98→1) — 300ms

This triple animation causes visible flickering on iOS WebView.

---

## 🔍 Codebase Research — Current State

### PageTransition.tsx (165 lines — DELETE ENTIRELY)
- **Location:** `src/components/PageTransition.tsx`
- **Imports:** `motion`, `AnimatePresence` from `framer-motion`, `useLocation` from `react-router-dom`
- **Exports:**
  - `default PageTransition` — the component (used in `Layout.tsx` only)
  - `usePageTransition()` — hook (never imported anywhere in the codebase)
  - `staggerContainer` — animation config object (never imported anywhere)
  - `staggerItem` — animation config object (never imported anywhere)
- **Consumers:** Only `Layout.tsx` line 8, 224, 226

### Layout.tsx (280 lines — DELETE ENTIRELY)
- **Location:** `src/components/Layout.tsx`
- **Critical finding:** `Layout.tsx` is **never imported anywhere** in the codebase. It is **dead code**.
- **The live layout is `AppLayout.tsx`** (`src/components/layout/AppLayout.tsx`), imported in `App.tsx` line 10.
- `Layout.tsx` contains its own `BottomNavigation`, a sidebar, and wraps children in `<PageTransition>`.
- Deleting it has **zero runtime impact** since it's never rendered.

### Verification that Layout.tsx is dead:
```
grep "import Layout" src/**/*.tsx → 0 results
grep "AppLayout" src/**/*.tsx → App.tsx line 10 (the live import)
```

---

## 📋 Implementation Steps

### Step 1: Delete PageTransition.tsx
```
DELETE src/components/PageTransition.tsx
```
This file is 165 lines. All 4 exports are dead code:
- `PageTransition` — only used in dead `Layout.tsx`
- `usePageTransition()` — never imported
- `staggerContainer` — never imported
- `staggerItem` — never imported

### Step 2: Delete Layout.tsx
```
DELETE src/components/Layout.tsx
```
This file is 280 lines. It is never imported or rendered anywhere in the app. `AppLayout.tsx` is the live layout component used by `App.tsx`.

### Step 3: Verify no broken imports
Run `npm run build` to confirm no file references `PageTransition` or `Layout` from these deleted paths. Both have zero external consumers (verified via grep).

---

## ⚠️ What This Story Does NOT Do

- Does **not** touch `AppLayout.tsx` (that's Story 13.2)
- Does **not** touch `BottomNavigation.tsx` (that's Story 13.3)
- Does **not** remove `framer-motion` imports from other files (that's Story 13.4)

---

## 🧪 Verification

| Check | Expected Result |
|-------|-----------------|
| `npm run build` | Zero errors, zero warnings about missing imports |
| Grep: `PageTransition` in src/ | 0 results |
| Grep: `usePageTransition` in src/ | 0 results |
| Grep: `staggerContainer` in src/ | 0 results |
| Grep: `staggerItem` in src/ | 0 results |
| Grep: `import Layout` in src/ | 0 results |
| Route navigation | All 5 tabs navigate instantly, no difference in behavior |

---

## ✅ Acceptance Criteria

- [ ] `src/components/PageTransition.tsx` deleted
- [ ] `src/components/Layout.tsx` deleted
- [ ] `npm run build` passes with zero errors
- [ ] Zero references to `PageTransition`, `usePageTransition`, `staggerContainer`, `staggerItem` in codebase
- [ ] All 5 tab routes still navigate correctly (they were never using these files)
