# STORY 13.5 — Add Global prefers-reduced-motion Guard

**EPIC:** [EPIC 13 — iOS Flickering & Animation Removal](../epics/EPIC_13_iOS_Flickering_Animation_Removal.md)  
**Status:** ✅ Complete  
**Priority:** 🟠 High  
**Estimate:** 1 point  
**Dependencies:** Story 13.4 (all motion libs removed, only CSS animations remain)

---

## 🎯 User Story

> As a user with motion sensitivity, when I enable "Reduce Motion" in my device settings, I want ALL animations in the app to be immediately disabled so that I can use the app comfortably without vestibular triggers.

---

## 📍 Problem

Currently, only **4 CSS files** have `@media (prefers-reduced-motion: reduce)` guards:

1. `src/components/ui/OfflineBanner.css` (line 183)
2. `src/components/ui/OfflineIndicator.css` (line 98)
3. `src/components/ui/SyncStatusIndicator.css` (line 163)
4. `src/components/messaging/ChatScreen.css` (line 183)

These only cover their own component's animations. After Story 13.4 replaces all framer-motion with CSS animations/transitions, there will be 50+ components using CSS `animation` and `transition` — **none of which check `prefers-reduced-motion`**.

This is a **WCAG 2.1 Level AA violation** (SC 2.3.3 — Animation from Interactions) and violates Apple's App Store review guidelines.

---

## 🔍 Codebase Research — Current State

### Existing guards (4 files):
Each file has a pattern like:
```css
@media (prefers-reduced-motion: reduce) {
  .offline-banner-slide { animation: none; }
  .offline-banner-dot { animation: none; }
}
```
These are **scoped to individual components** and will continue to work correctly.

### Where the global guard should go:
`src/index.css` — the global stylesheet loaded by `main.tsx`. Currently has 210 lines with Tailwind directives, safe area variables, and typography rules. No existing `prefers-reduced-motion` guard exists.

### New CSS animations from Story 13.4:
After Story 13.4, the following CSS animation classes will be in `index.css`:
- `.animate-fadeIn`
- `.animate-fadeInUp`
- `.animate-fadeInDown`
- `.animate-scaleIn`
- `.animate-slideInRight`
- `.bottom-nav-enter`
- `.nav-ripple`

All of these need to be disabled when the user has `prefers-reduced-motion: reduce`.

---

## 📋 Implementation Steps

### Step 1: Add global guard to `src/index.css`

Add the following at the **end of the file** (after all other rules):

```css
/* ============================================================
   WCAG 2.1 AA — Global 'Reduce Motion' Guard
   Disables ALL CSS animations and transitions when the user
   has enabled "Reduce Motion" in their OS accessibility settings.
   Individual component guards in OfflineBanner.css, etc. still
   apply for their own scoped animations.
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Why `0.01ms` instead of `0s`:
- `animation-duration: 0s` can cause `animationend` events to never fire, breaking JS that listens for them
- `0.01ms` is imperceptible but still fires completion callbacks
- This is the recommended pattern from MDN and WCAG guidelines

### Why `!important`:
- The global guard must override all component-level animation durations
- Without `!important`, specificity battles would leave some animations active
- The existing 4 component-level guards will still work correctly (they use `animation: none` which is stronger than duration changes, so no conflict)

---

## ⚠️ What This Story Does NOT Do

- Does **not** touch the 4 existing component-level `prefers-reduced-motion` guards — they work correctly and are more specific
- Does **not** add JavaScript-based motion detection — CSS media query is sufficient
- Does **not** add a user toggle for motion preferences — that's EPIC 17 (theme/settings system)

---

## 🧪 Verification

### Desktop Browser Test:
1. **Chrome:** DevTools → Rendering tab → "Emulate CSS media feature `prefers-reduced-motion`" → set to `reduce`
2. Navigate to any page with animations
3. **Expected:** All animations complete instantly (no visible motion)

### Mobile Test:
1. **iOS:** Settings → Accessibility → Motion → "Reduce Motion" → ON
2. **Android:** Settings → Accessibility → "Remove animations" → ON
3. Open the app
4. **Expected:** No page transitions, no list stagger, no button scale, no badge pulse

| Check | Expected Result |
|-------|-----------------|
| Chrome emulation: reduce motion | All animations instant |
| Chrome emulation: no-preference | All animations play normally |
| iOS Reduce Motion ON | Zero visible animations |
| Android Remove Animations ON | Zero visible animations |
| Existing OfflineBanner.css guard | Still works (no conflict) |
| Button/link functionality | Buttons still clickable, transitions still change state |

---

## ✅ Acceptance Criteria

- [x] `@media (prefers-reduced-motion: reduce)` guard added to `src/index.css`
- [x] Guard uses `0.01ms` duration (not `0s`) to preserve JS event callbacks
- [x] All CSS animations disabled when Reduce Motion is enabled
- [x] All CSS transitions disabled when Reduce Motion is enabled
- [x] `scroll-behavior: auto` applied when Reduce Motion is enabled
- [x] Existing 4 component guards remain untouched and functional
- [x] `npm run build` passes with zero errors
- [x] Visual verification in Chrome DevTools emulation mode
