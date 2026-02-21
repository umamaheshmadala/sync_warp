# 🔴 EPIC 13: iOS Flickering & Animation Removal

**Status:** 📋 Planning  
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
1. **Delete `PageTransition.tsx`** — triple animation per route change causing flickering on iOS
2. **Rewrite `BottomNavigation.tsx`** — replace 21 framer-motion nodes with CSS transitions
3. **Remove `framer-motion` entirely** — eliminate ~60KB duplicate bundle weight
4. **Remove `GestureHandler` wrapper** — unused wrapper around entire app
5. **Add global `prefers-reduced-motion`** — WCAG 2.1 AA compliance

---

## ✅ Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| iOS route-change flickering | Zero flicker | Triple animation per nav |
| Bundle size (animation libs) | 0 KB | ~60KB (framer-motion + motion) |
| framer-motion imports | 0 files | 50+ component files |
| `prefers-reduced-motion` coverage | 100% global | 4 CSS files only |
| BottomNavigation motion nodes | 0 | 21 |

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
| 13.1 | Delete `PageTransition.tsx` and unwrap from `Layout.tsx` | 🔴 Critical | 1 pt | None |
| 13.2 | Remove `GestureHandler` from `Layout.tsx` and `AppLayout.tsx` | 🔴 Critical | 1 pt | None |
| 13.3 | Rewrite `BottomNavigation.tsx` — framer-motion → CSS transitions | 🔴 Critical | 3 pts | 13.1 |
| 13.4 | Remove `framer-motion` from all 50+ component files | 🔴 Critical | 5 pts | 13.3 |
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
| `src/components/PageTransition.tsx` | **DELETE** |
| `src/components/Layout.tsx` | MODIFY — remove PageTransition + GestureHandler imports/wrappers |
| `src/components/layout/AppLayout.tsx` | MODIFY — remove GestureHandler wrapper |
| `src/components/BottomNavigation.tsx` | MODIFY — rewrite all motion→CSS |
| `src/index.css` | MODIFY — add `prefers-reduced-motion` media query |
| 50+ component files | MODIFY — remove framer-motion imports and `motion.*` elements |
| `package.json` | MODIFY — uninstall `framer-motion` and `motion` |

---

## 🧪 Verification Strategy

- **Build check:** `npm run build` — zero errors after framer-motion removal
- **Visual test:** Navigate all 5 tab routes — no flickering, smooth CSS transitions
- **Mobile test:** iOS + Android Capacitor build — confirm flicker eliminated
- **Accessibility:** Enable "Reduce Motion" in OS settings → verify all animations disabled
- **Bundle audit:** Confirm framer-motion absent from production build

---

## ✅ Definition of Done

- [ ] `PageTransition.tsx` deleted, no orphan imports
- [ ] `GestureHandler` removed from all layouts
- [ ] `BottomNavigation.tsx` uses zero framer-motion — CSS-only transitions
- [ ] `framer-motion` and `motion` uninstalled from `package.json`
- [ ] Zero `framer-motion` or `motion` imports in entire codebase
- [ ] Global `prefers-reduced-motion` guard active in `index.css`
- [ ] iOS WebView shows zero flickering on route changes
- [ ] All 5 bottom nav routes highlight correctly
