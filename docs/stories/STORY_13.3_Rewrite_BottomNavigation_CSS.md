# STORY 13.3 — Rewrite BottomNavigation to CSS-Only

**EPIC:** [EPIC 13 — iOS Flickering & Animation Removal](../epics/EPIC_13_iOS_Flickering_Animation_Removal.md)  
**Status:** ✅ Complete  
**Priority:** 🔴 Critical  
**Estimate:** 3 points  
**Dependencies:** Story 13.1 (PageTransition deleted, so framer-motion is no longer re-triggered per route)

---

## 🎯 User Story

> As a mobile user, I want the bottom navigation to animate smoothly using CSS instead of JavaScript-driven framer-motion, so that transitions are GPU-accelerated and don't cause jank on my device.

---

## 📍 Problem

`BottomNavigation.tsx` (193 lines) uses **4 framer-motion nodes** that fire JavaScript-driven animations on every tab switch:

1. **`<motion.nav>`** (line 115) — slide-up spring animation on mount (`initial={{ y: 100 }}`)
2. **`<motion.div>` for icon** (lines 137-147) — scale + wiggle on active state
3. **`<motion.span>` for label** (lines 155-163) — y offset + font-weight change
4. **`<motion.div>` for ripple** (lines 166-176) — background color pulse

Each of these runs through framer-motion's JS animation engine, which:
- Recomputes layout on every frame (not compositor-accelerated)
- Depends on React state (`isAnimating`) toggled via `setTimeout`
- Creates unnecessary `requestAnimationFrame` overhead

---

## 🔍 Codebase Research — Current State

### framer-motion usage in BottomNavigation.tsx

**Line 4 — Import:**
```tsx
import { motion, AnimatePresence } from 'framer-motion';
```
Note: `AnimatePresence` is imported but **never used** in this file.

**Line 115-118 — `<motion.nav>` (mount slide-up):**
```tsx
<motion.nav
  className="w-full z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
  initial={{ y: 100 }}
  animate={{ y: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
```
Replacement: Plain `<nav>` with a CSS class that uses `animation: slideUp 0.3s ease-out`

**Lines 137-147 — `<motion.div>` for icon container:**
```tsx
<motion.div
  className="relative z-10"
  animate={{
    scale: active ? 1.1 : 1,
    rotate: active && isAnimating ? [0, -10, 10, 0] : 0
  }}
  transition={{
    type: "spring",
    stiffness: 400,
    damping: 25,
    rotate: { duration: 0.3 }
  }}
>
```
Replacement: Plain `<div>` with CSS `transition: transform 0.2s ease; transform: scale(1.1)` when active.

**Lines 155-163 — `<motion.span>` for label:**
```tsx
<motion.span
  className={`mt-0.5 text-[10px] font-medium ...`}
  animate={{
    y: active ? -1 : 0,
    fontWeight: active ? 600 : 500
  }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
```
Replacement: Plain `<span>` with CSS `transition: transform 0.2s ease, font-weight 0.2s ease;`

**Lines 166-176 — `<motion.div>` for ripple:**
```tsx
<motion.div
  className="absolute inset-0 rounded-lg"
  initial={false}
  animate={isAnimating && lastActiveTab === item.id ? {
    background: [
      'rgba(99, 102, 241, 0)',
      'rgba(99, 102, 241, 0.1)',
      'rgba(99, 102, 241, 0)'
    ]
  } : {}}
  transition={{ duration: 0.3 }}
/>
```
Replacement: Plain `<div>` with a CSS `@keyframes ripple` animation triggered via class.

### State used only for framer-motion animations:
- **`isAnimating`** (line 36) — `useState(false)` toggled by `setTimeout` on line 97, 112
- **`lastActiveTab`** (line 35) — tracks previous tab for wiggle comparison

Both can be removed or simplified since CSS handles the timing.

---

## 📋 Implementation Steps

### Step 1: Remove framer-motion import
```diff
-import { motion, AnimatePresence } from 'framer-motion';
```

### Step 2: Replace `<motion.nav>` → `<nav>`
```diff
-<motion.nav
-  className="w-full z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
-  initial={{ y: 100 }}
-  animate={{ y: 0 }}
-  transition={{ type: "spring", stiffness: 300, damping: 30 }}
->
+<nav
+  className="w-full z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] bottom-nav-enter"
+>
```
Close tag: `</motion.nav>` → `</nav>`

### Step 3: Replace `<motion.div>` icon → plain `<div>`
```diff
-<motion.div
-  className="relative z-10"
-  animate={{
-    scale: active ? 1.1 : 1,
-    rotate: active && isAnimating ? [0, -10, 10, 0] : 0
-  }}
-  transition={{
-    type: "spring",
-    stiffness: 400,
-    damping: 25,
-    rotate: { duration: 0.3 }
-  }}
->
+<div
+  className="relative z-10 transition-transform duration-200 ease-out"
+  style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }}
+>
```
Close tag: `</motion.div>` → `</div>`

### Step 4: Replace `<motion.span>` label → plain `<span>`
```diff
-<motion.span
-  className={`mt-0.5 text-[10px] font-medium transition-all duration-200 relative z-10 ${...}`}
-  animate={{
-    y: active ? -1 : 0,
-    fontWeight: active ? 600 : 500
-  }}
-  transition={{ type: "spring", stiffness: 400, damping: 25 }}
->
+<span
+  className={`mt-0.5 text-[10px] relative z-10 transition-all duration-200 ease-out ${
+    active ? 'font-semibold -translate-y-px' : 'font-medium'
+  } ${active ? (item.activeColor || 'text-indigo-600') : (item.color || 'text-gray-500')}`}
+>
```
Close tag: `</motion.span>` → `</span>`

### Step 5: Replace `<motion.div>` ripple → CSS-animated `<div>`
```diff
-<motion.div
-  className="absolute inset-0 rounded-lg"
-  initial={false}
-  animate={isAnimating && lastActiveTab === item.id ? {
-    background: [
-      'rgba(99, 102, 241, 0)',
-      'rgba(99, 102, 241, 0.1)',
-      'rgba(99, 102, 241, 0)'
-    ]
-  } : {}}
-  transition={{ duration: 0.3 }}
-/>
+{active && (
+  <div className="absolute inset-0 rounded-lg nav-ripple" />
+)}
```

### Step 6: Add CSS to a scoped stylesheet or Tailwind `@layer`

Add to `src/index.css` or a new `BottomNavigation.css` file:
```css
/* Bottom Navigation CSS animations */
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.bottom-nav-enter {
  animation: slideUp 0.3s ease-out;
}

@keyframes navRipple {
  0% { background: rgba(99, 102, 241, 0); }
  50% { background: rgba(99, 102, 241, 0.1); }
  100% { background: rgba(99, 102, 241, 0); }
}

.nav-ripple {
  animation: navRipple 0.3s ease-out;
}
```

### Step 7: Clean up unused state
Remove or simplify `isAnimating` and `lastActiveTab` if they're only used for framer-motion:
- `isAnimating` — used in icon animate and ripple animate. After CSS replacement, can be removed entirely.
- `lastActiveTab` — used only with `isAnimating`. Can be removed.
- Remove `setTimeout(() => setIsAnimating(false), 300)` calls from `handleNavClick` and `useEffect`.

---

## ⚠️ What This Story Does NOT Do

- Does **not** remove `framer-motion` from `package.json` — other files still import it (Story 13.4)
- Does **not** touch other component files that use `motion.*` (Story 13.4)

---

## 🧪 Verification

| Check | Expected Result |
|-------|-----------------|
| `npm run build` | Zero errors |
| Grep: `motion` in BottomNavigation.tsx | 0 results |
| Visual: Tap each bottom tab | Smooth icon scale, label shift, ripple pulse |
| Visual: First load | Nav slides up from bottom |
| iOS WebView | No flickering on tab switches |
| Chrome DevTools → Animations | CSS transitions visible (not JS-driven) |

---

## ✅ Acceptance Criteria

- [x] Zero `framer-motion` imports in `BottomNavigation.tsx`
- [x] Zero `motion.*` elements in `BottomNavigation.tsx`
- [x] `AnimatePresence` removed (was imported but unused)
- [x] Nav enters with CSS `slideUp` animation
- [x] Active icon scales to 1.1x with CSS transition
- [x] Active label shifts up 1px with CSS transition
- [x] Ripple effect plays on tab tap via CSS `@keyframes`
- [x] `isAnimating` and `lastActiveTab` state removed or simplified
- [x] All 5 tabs highlight correctly when active
- [x] `npm run build` passes
