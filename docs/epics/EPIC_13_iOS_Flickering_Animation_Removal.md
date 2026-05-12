# 🔴 EPIC 13: iOS Flickering & Animation Removal

**Status:** ✅ Complete  
**Created:** 2026-02-21  
**Owner:** Frontend Engineering  
**Audit Reference:** [Codebase Audit Report — Category 2 + Finding 7.1](../../.gemini/antigravity/brain/4990934d-85a5-413b-9a20-e2901b49f1fe/codebase_audit_report.md)  
**Dependencies:** None (first in execution order)  
**Priority:** 🔴 Critical  
**Estimated Effort:** 5–8 story points

---

## 🎯 Epic Goal

Eliminate all iOS WebView flickering and animation jank by removing the framer-motion animation layer entirely and replacing it with lightweight CSS transitions. This epic also adds a global `prefers-reduced-motion` accessibility guard (WCAG 2.1 AA compliance).

### Core Objectives:
1. **Delete `PageTransition.tsx` + dead `Layout.tsx`** — triple animation per route causing flickering. `Layout.tsx` is dead code (never imported; `AppLayout.tsx` is the live layout)
2. **Rewrite `BottomNavigation.tsx`** — replace 4 framer-motion nodes with CSS transitions
3. **Remove `framer-motion` from 92 files** — eliminate ~60KB bundle weight (both `framer-motion` ^12.23.18 and `motion` ^12.23.22 installed)
4. **Remove `GestureHandler` wrapper** — wraps entire app in `AppLayout.tsx` for edge-swipe detection (iOS handles natively)
5. **Add global `prefers-reduced-motion`** — WCAG 2.1 AA compliance

---

## ✅ Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| iOS route-change flickering | Zero flicker | Triple animation per nav |
| Bundle size (animation libs) | 0 KB | ~60KB (framer-motion + motion) |
| framer-motion imports | 0 files | 92 component files |
| `prefers-reduced-motion` coverage | 100% global | 4 CSS files only |
| BottomNavigation motion nodes | 0 | 4 (nav, icon div, label span, ripple div) |

---

## 📋 Audit Findings Covered

| Finding | Description | Severity |
|---------|-------------|----------|
| 2.1 | `PageTransition.tsx` — triple animation per route causing iOS flicker | 🔴 Critical |
| 2.2 | `BottomNavigation.tsx` — 21 framer-motion nodes cause jank | 🔴 Critical |
| 2.3 | `framer-motion` + `motion` duplicate packages (~60KB) | 🔴 Critical |
| 2.4 | `GestureHandler` wraps entire app unnecessarily | 🔴 Critical |
| 7.1 | Incomplete `prefers-reduced-motion` coverage (only 4/50+ files guarded) | 🔴 Critical |

---

## 📊 Stories Breakdown

| # | Story | Priority | Estimate | Dependencies |
|---|-------|----------|----------|--------------|
| 13.1 | Delete dead `PageTransition.tsx` + dead `Layout.tsx` (never imported) | 🔴 Critical | 1 pt | None |
| 13.2 | Remove `GestureHandler` wrapper from `AppLayout.tsx`; delete `GestureHandler.tsx` | 🔴 Critical | 1 pt | None |
| 13.3 | Rewrite `BottomNavigation.tsx` — 4 framer-motion nodes → CSS transitions | 🔴 Critical | 3 pts | 13.1 |
| 13.4 | Remove `framer-motion` from remaining 89 files; uninstall both packages | 🔴 Critical | 5 pts | 13.3 |
| 13.5 | Add global `prefers-reduced-motion` guard in `index.css` | 🟠 High | 1 pt | 13.4 |

### 📌 Recommended Execution Order

1. **13.1 + 13.2** (parallel) — Remove dead wrappers. Immediate flicker reduction.
2. **13.3** — Rewrite BottomNavigation to CSS. Most user-visible improvement.
3. **13.4** — Sweep all 50+ files to remove framer-motion. Largest scope story.
4. **13.5** — Add global motion guard after all motion libs are removed. Clean finish.

---

## 🔑 Key Files

| File | Action |
|------|--------|
| `src/components/PageTransition.tsx` | **DELETE** (165 lines, 4 exports — all dead) |
| `src/components/Layout.tsx` | **DELETE** (280 lines — dead code, never imported anywhere) |
| `src/components/GestureHandler.tsx` | **DELETE** (221 lines — only used by AppLayout) |
| `src/components/layout/AppLayout.tsx` | MODIFY — remove GestureHandler wrapper |
| `src/components/BottomNavigation.tsx` | MODIFY — replace 4 motion nodes → CSS |
| `src/index.css` | MODIFY — add animation utilities + `prefers-reduced-motion` |
| 89 component files | MODIFY — remove framer-motion imports and `motion.*` elements |
| `package.json` | MODIFY — uninstall `framer-motion` (^12.23.18) and `motion` (^12.23.22) |

---

## 🧪 Verification Strategy

- **Build check:** `npm run build` — zero errors after framer-motion removal
- **Visual test:** Navigate all 5 tab routes — no flickering, smooth CSS transitions
- **Mobile test:** iOS + Android Capacitor build — confirm flicker eliminated
- **Accessibility:** Enable "Reduce Motion" in OS settings → verify all animations disabled
- **Bundle audit:** Confirm framer-motion absent from production build

---

## ✅ Definition of Done

- [x] `PageTransition.tsx` deleted, no orphan imports
- [x] `GestureHandler` removed from all layouts
- [x] `BottomNavigation.tsx` uses zero framer-motion — CSS-only transitions
- [x] `framer-motion` and `motion` uninstalled from `package.json`
- [x] Zero `framer-motion` or `motion` imports in entire codebase
- [x] Global `prefers-reduced-motion` guard active in `index.css`
- [x] iOS WebView shows zero flickering on route changes
- [x] All 5 bottom nav routes highlight correctly
