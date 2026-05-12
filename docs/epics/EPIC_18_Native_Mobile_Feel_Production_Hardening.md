# 📱 EPIC 18: Native Mobile Feel & Production Hardening

**Status:** ✅ Done  
**Created:** 2026-02-21  
**Owner:** Frontend Engineering / DevOps  
**Audit Reference:** [Codebase Audit Report — Category 6 + Findings 5.6, 5.7](../../.gemini/antigravity/brain/4990934d-85a5-413b-9a20-e2901b49f1fe/codebase_audit_report.md)  
**Dependencies:** EPIC 14 (energy fixes improve mobile experience), EPIC 17 (Capacitor config fixes)  
**Priority:** 🟠 High  
**Estimated Effort:** 10–15 story points

---

## 🎯 Epic Goal

Make the app feel truly native on iOS and Android by restoring platform-specific behaviors, hardening the production build, securing API keys with a Cloudflare Worker proxy, and removing all development artifacts from the production bundle.

### Core Objectives:
1. **Restore iOS rubber-band bounce** by removing `overscrollBehaviorY: none`
2. **Fix SplashScreen** — reduce 10s fallback to 3s
3. **Remove debug panel** from production builds (build flag)
4. **Strip `console.log`** in production via Vite plugin
5. **Scope `localStorage.clear()`** to auth keys only (not all app data)
6. **Remove `googleapis` (170KB)** from client bundle
7. **Secure API keys** via Cloudflare Worker proxy

---

## ✅ Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| iOS overscroll bounce | Native rubber-band | Disabled |
| SplashScreen max duration | 3s | 10s |
| Debug panels in prod | 0 | Present |
| `console.log` in prod bundle | 0 | Everywhere |
| `localStorage.clear()` scope | Auth keys only | All keys |
| `googleapis` in client bundle | 0 KB | 170KB |
| API keys in client code | 0 (proxied) | Exposed |

---

## 📋 Audit Findings Covered

| Finding | Description | Severity |
|---------|-------------|----------|
| 6.1 | `overscrollBehaviorY: none` kills iOS rubber-band bounce | 🟠 High |
| 6.2 | SplashScreen 10s fallback is too long | 🟠 High |
| 6.3 | Debug panel visible in production | 🟠 High |
| 6.4 | `console.log` statements everywhere in production | 🟠 High |
| 6.5 | `localStorage.clear()` on auth error wipes all app data | 🟠 High |
| 5.6 | `googleapis` package (170KB) bundled in client | 🟠 High |
| 5.7 | API keys exposed in client code (no Edge Functions) | 🟠 High |

---

## 📊 Stories Breakdown

| # | Story | Priority | Estimate | Dependencies |
|---|-------|----------|----------|--------------|
| 18.1 | Remove `overscrollBehaviorY: none` — restore iOS rubber-band bounce | 🟠 High | 1 pt | None |
| 18.2 | Reduce SplashScreen fallback from 10s to 3s | 🟠 High | 1 pt | None |
| 18.3 | Gate debug panel behind `import.meta.env.DEV` build flag | 🟠 High | 1 pt | None |
| 18.4 | Strip `console.log` in production via `vite-plugin-strip` or `terser.compress.drop_console` | 🟠 High | 1 pt | None |
| 18.5 | Scope `localStorage.clear()` to auth-specific keys on auth error | 🟠 High | 1 pt | None |
| 18.6 | Remove `googleapis` from client bundle; move Google Places API call to backend/proxy | 🟠 High | 3 pts | 18.7 |
| 18.7 | Create Cloudflare Worker proxy for API key security | 🟠 High | 5 pts | None |

### 📌 Recommended Execution Order

1. **18.1 + 18.2 + 18.3 + 18.4 + 18.5** (all parallel) — Quick independent fixes.
2. **18.7** — Cloudflare Worker proxy setup. Infrastructure prerequisite.
3. **18.6** — Remove googleapis. Depends on proxy being available.

---

## 🔑 Key Files

| File | Action |
|------|--------|
| `src/index.css` or global CSS | MODIFY — remove `overscroll-behavior-y: none` |
| `capacitor.config.ts` | MODIFY — SplashScreen `launchAutoHide` timeout |
| Debug panel component(s) | MODIFY — wrap in `import.meta.env.DEV` guard |
| `vite.config.ts` | MODIFY — add `terser.compress.drop_console: true` |
| Auth error handler | MODIFY — `localStorage.removeItem('auth_*')` instead of `clear()` |
| `package.json` | MODIFY — remove `googleapis` dependency |
| `src/services/businessSearchService.ts` | MODIFY — call proxy instead of googleapis directly |
| Cloudflare Worker project | **NEW** — API key proxy worker |

---

## 🧪 Verification Strategy

- **iOS test:** Scroll to top of list → verify rubber-band bounce effect
- **SplashScreen test:** Cold start on device → screen dismisses in ≤3s
- **Prod build test:** `npm run build && npm run preview` — no debug panels visible
- **Console test:** Open DevTools on prod build — zero `console.log` output
- **Auth error test:** Trigger auth error → verify localStorage retains non-auth data
- **Bundle analysis:** Confirm `googleapis` not in dependency graph
- **Security test:** DevTools Network tab — no raw API keys in requests

---

## ✅ Definition of Done

- [x] iOS rubber-band bounce restored on all scrollable areas
- [x] SplashScreen dismisses in ≤3s on cold start
- [x] Debug panel completely absent from production builds
- [x] Zero `console.log` in production bundle
- [x] `localStorage.clear()` replaced with key-specific removal
- [x] `googleapis` removed from `package.json` and bundle
- [x] Cloudflare Worker proxy operational; all API keys server-side
- [x] No API keys visible in client network requests
