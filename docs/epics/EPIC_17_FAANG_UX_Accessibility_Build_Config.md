# 🌐 EPIC 17: FAANG UX, Accessibility & Build Config

**Status:** 📋 Planning  
**Created:** 2026-02-21  
**Owner:** Frontend Engineering / UX  
**Audit Reference:** [Codebase Audit Report — Category 7 (findings 7.2–7.14)](../../.gemini/antigravity/brain/4990934d-85a5-413b-9a20-e2901b49f1fe/codebase_audit_report.md)  
**Dependencies:** EPIC 13 (framer-motion removal unblocks chunking/build optimizations)  
**Priority:** 🟠 High  
**Estimated Effort:** 15–20 story points

---

## 🎯 Epic Goal

Close the gap between "good app" and "FAANG-level app" by re-enabling PWA/Service Worker support, fixing WCAG accessibility violations, adding auto dark mode detection, optimizing Vite build configuration, and cleaning up HTML meta tags. Every FAANG mobile app and PWA addresses these concerns.

### Core Objectives:
1. **Re-enable PWA / Service Worker** for offline app shell caching
2. **Fix `user-scalable=no`** — WCAG 2.1 Level AA violation
3. **Fix `Keyboard.resize: 'none'`** — input hidden behind keyboard on mobile
4. **Add `prefers-color-scheme` detection** — auto dark mode
5. **Optimize Vite chunking** — split `recharts`, `xlsx`, `emoji-picker-react`
6. **Add missing SEO meta tags** — `<meta name="description">`
7. **Increase touch targets to 48px** — Apple HIG + Material Design 3 compliance
8. **Fix build target** — `es2015` → `es2020` to eliminate unnecessary polyfills
9. **Clean up HTML meta issues** — duplicates, format-detection, web-vitals

---

## ✅ Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Service Worker | Active (precache app shell) | Disabled (commented out) |
| Pinch-to-zoom on web | Allowed | Blocked (`user-scalable=no`) |
| Dark mode auto-detection | System preference respected | None |
| Vite manual chunks | 6+ | 3 |
| Main bundle size reduction | -15% | Baseline |
| Touch target size | ≥48px | 44px |
| Build target | `es2020` | `es2015` |
| `<meta name="description">` | Present | Missing |
| Duplicate meta tags | 0 | 1 (`mobile-web-app-capable`) |

---

## 📋 Audit Findings Covered

| Finding | Description | Severity |
|---------|-------------|----------|
| 7.2 | PWA / Service Worker completely disabled | 🔴 Critical |
| 7.3 | `user-scalable=no` blocks accessibility zoom (WCAG violation) | 🟠 High |
| 7.4 | `Keyboard.resize: 'none'` hides input behind keyboard | 🟠 High |
| 7.5 | No `prefers-color-scheme` / auto dark mode detection | 🟠 High |
| 7.6 | Vite only splits 3 chunks — heavy main bundle | 🟠 High |
| 7.7 | Missing `<meta name="description">` — SEO gap | 🟡 Medium |
| 7.8 | Touch targets only 44px (need 48px minimum) | 🟡 Medium |
| 7.9 | `chunkSizeWarningLimit: 1000` hides bundle issues | 🟡 Medium |
| 7.10 | `build.target: 'es2015'` — too conservative | 🟡 Medium |
| 7.11 | Capacitor config has broken comment syntax | 🟡 Medium |
| 7.12 | No Web Vitals reporting to analytics | 🟡 Medium |
| 7.13 | Duplicate `mobile-web-app-capable` meta tag | 🟡 Medium |
| 7.14 | `format-detection` prevents clickable phone numbers | 🟡 Medium |

---

## 📊 Stories Breakdown

| # | Story | Priority | Estimate | Dependencies |
|---|-------|----------|----------|--------------|
| 17.1 | Re-enable `VitePWA` with minimal precache strategy for app shell | 🔴 Critical | 3 pts | EPIC 13 complete |
| 17.2 | Fix viewport: remove `user-scalable=no` and `maximum-scale=1.0` | 🟠 High | 1 pt | None |
| 17.3 | Change Capacitor `Keyboard.resize` from `'none'` to `'ionic'`; fix broken comment syntax | 🟠 High | 1 pt | None |
| 17.4 | Add `useTheme()` hook with `prefers-color-scheme` detection + Zustand persistence | 🟠 High | 3 pts | None |
| 17.5 | Optimize Vite `manualChunks` — split `recharts`, `xlsx`, `emoji-picker-react`, `@dnd-kit` | 🟠 High | 2 pts | None |
| 17.6 | Fix HTML meta: add description, remove duplicate `mobile-web-app-capable`, add `tel:` links | 🟡 Medium | 1 pt | None |
| 17.7 | Increase global touch targets to 48px minimum | 🟡 Medium | 1 pt | None |
| 17.8 | Change `build.target` to `'es2020'`; lower `chunkSizeWarningLimit` to 500 | 🟡 Medium | 1 pt | 17.5 |
| 17.9 | Connect `web-vitals` to analytics endpoint (CLS, LCP, FID reporting) | 🟡 Medium | 2 pts | None |

### 📌 Recommended Execution Order

1. **17.2 + 17.3 + 17.6** (parallel) — Quick config fixes. Immediate a11y + SEO wins.
2. **17.5 + 17.8** — Vite build optimizations. Measurable bundle reduction.
3. **17.7** — Touch target increase. Global CSS change.
4. **17.4** — Dark mode detection. Requires theme system design.
5. **17.1** — PWA re-enable. Requires framer-motion removed (EPIC 13).
6. **17.9** — Web Vitals. Polish layer.

---

## 🔑 Key Files

| File | Action |
|------|--------|
| `vite.config.ts` | MODIFY — re-enable VitePWA, add manualChunks, lower chunk limit, es2020 |
| `index.html` | MODIFY — fix viewport, add meta description, remove duplicate meta |
| `capacitor.config.ts` | MODIFY — `Keyboard.resize: 'ionic'`, fix broken comment |
| `src/hooks/useTheme.ts` | **NEW** — `prefers-color-scheme` detection hook |
| `src/stores/themeStore.ts` | **NEW** — persist theme preference |
| `src/index.css` | MODIFY — global 48px touch targets |
| Business profile components | MODIFY — add `<a href="tel:...">` links |
| `src/reportWebVitals.ts` or equivalent | **NEW** — connect web-vitals |

---

## 🧪 Verification Strategy

- **Lighthouse audit:** Score ≥90 on Accessibility, SEO, PWA categories
- **Offline test:** Disconnect network → verify app shell loads from service worker
- **Zoom test:** Pinch-to-zoom works on web; keyboard doesn't hide input on mobile
- **Dark mode test:** Toggle OS dark mode → app switches automatically
- **Bundle analyzer:** Verify 6+ chunks, main bundle ≤500KB
- **DevTools audit:** No duplicate meta tags, description present
- **Touch target test:** Verify all buttons ≥48px via computed styles

---

## ✅ Definition of Done

- [ ] Service Worker active, app shell cached, offline load works
- [ ] `user-scalable=no` and `maximum-scale=1.0` removed from viewport
- [ ] Keyboard resize set to `'ionic'`; Capacitor comment syntax fixed
- [ ] Auto dark mode toggles based on `prefers-color-scheme`
- [ ] Vite produces 6+ chunks; `recharts`/`xlsx` in separate chunks
- [ ] `<meta name="description">` present in `index.html`
- [ ] All interactive elements ≥48px touch targets
- [ ] Build target is `es2020`; chunk warning at 500KB
- [ ] Web Vitals reporting connected and functional
- [ ] Zero duplicate meta tags in `index.html`
- [ ] Phone numbers use `<a href="tel:...">` in business profiles
