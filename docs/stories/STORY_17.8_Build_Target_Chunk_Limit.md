# STORY 17.8 — Change Build Target to `es2020` & Lower `chunkSizeWarningLimit` to 500

**Epic:** [EPIC 17 — FAANG UX, Accessibility & Build Config](../epics/EPIC_17_FAANG_UX_Accessibility_Build_Config.md)  
**Status:** 📋 Ready  
**Priority:** 🟡 Medium  
**Estimate:** 1 story point  
**Dependencies:** STORY 17.5 (chunk splitting must be done first so the warning limit is useful)  
**Audit Findings:** 7.9, 7.10  

---

## 🎯 Goal

Fix two Vite build configuration issues:
1. **`build.target: 'es2015'`** — Too conservative. ES2015 (ES6) forces Vite to transpile modern syntax (`async/await`, `??`, `?.`, `BigInt`, `Promise.allSettled`, etc.) into verbose polyfills. Modern browsers (Chrome 80+, Safari 14+, Firefox 80+) support ES2020 natively. This inflates the bundle with unnecessary code.
2. **`chunkSizeWarningLimit: 1000`** — Raised from Vite's default 500KB to 1000KB, which hides oversized chunks. After Story 17.5 splits heavy libraries, the limit should be lowered back to 500KB to catch future regressions.

---

## 📍 Current State (What Exists)

[vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts):

```typescript
// Line 81 — too conservative target
build: {
  target: 'es2015',

// Line 85 — suppresses size warnings
  chunkSizeWarningLimit: 1000,
```

### ES2020 features NOT transpiled with `es2020` target

| Feature | ES Version | Usage in App |
|---------|-----------|-------------|
| `async/await` | ES2017 | Everywhere — services, hooks, stores |
| Optional chaining `?.` | ES2020 | Used extensively in business components |
| Nullish coalescing `??` | ES2020 | Used in defaults and fallbacks |
| `Promise.allSettled` | ES2020 | Likely used in prefetch/parallel calls |
| `BigInt` | ES2020 | Not used, but no cost |
| Dynamic `import()` | ES2020 | Used for code splitting (React.lazy) |
| `globalThis` | ES2020 | Used by libraries internally |

All target browsers in the app's user base support ES2020:
- Chrome 80+ (released March 2020)
- Safari 14+ (released September 2020)
- Firefox 80+ (released August 2020)
- Edge 80+ (released March 2020)

Capacitor mobile (Android WebView / iOS WKWebView) also supports ES2020.

---

## 🔧 Implementation Details

### Step 1: Change build target to `es2020`

**File:** [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) — Line 81

```diff
 build: {
-  target: 'es2015',
+  target: 'es2020',
```

### Step 2: Lower chunkSizeWarningLimit to 500

**File:** [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) — Line 85

```diff
-  chunkSizeWarningLimit: 1000,
+  chunkSizeWarningLimit: 500,
```

This restores Vite's default threshold. After Story 17.5 splits `recharts`, `emoji-picker-react`, and `@dnd-kit`, no chunk should exceed 500KB. If any do, the build will warn — which is the desired behavior.

---

## 🧪 Verification

### Build Size Comparison
1. Build with `es2015` target: `npm run build` → note total output size
2. Apply changes → rebuild → note new total output size
3. **Expected:** 5-15% reduction in total bundle size (polyfill elimination)

### No Warnings Check
1. After applying both changes, run `npm run build`
2. **Expected:** No `chunkSizeWarningLimit` warnings (if 17.5 is done first)
3. If warnings appear, investigate which chunk exceeds 500KB

### Browser Compatibility
1. Open the built app in Chrome 80+ → works correctly
2. Open in Safari 14+ → works correctly
3. Run Capacitor build (`npx cap sync && npx cap run android`) → works on Android 8+
4. No syntax errors in any browser console

### Polyfill Verification
1. Open `dist/assets/index-*.js` in a text editor
2. Search for `__async` or `_asyncToGenerator` patterns
3. **Before fix (es2015):** These polyfill wrappers exist around every async function
4. **After fix (es2020):** Native `async/await` syntax preserved — no wrapper functions

---

## ✅ Acceptance Criteria

- [ ] `build.target` changed from `'es2015'` to `'es2020'`
- [ ] `chunkSizeWarningLimit` changed from `1000` to `500`
- [ ] Total bundle size reduced (measured before/after)
- [ ] No polyfill wrappers for `async/await`, `?.`, `??` in output
- [ ] `npm run build` completes without chunk size warnings (after Story 17.5)
- [ ] App works correctly in Chrome 80+, Safari 14+, Firefox 80+
- [ ] Capacitor builds work on Android 8+ and iOS 14+

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) | MODIFY — line 81: `'es2015'` → `'es2020'`; line 85: `1000` → `500` |
