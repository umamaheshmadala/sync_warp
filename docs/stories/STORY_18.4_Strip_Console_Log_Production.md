# STORY 18.4 — Strip `console.log` in Production via Terser

**Epic:** [EPIC 18 — Native Mobile Feel & Production Hardening](../epics/EPIC_18_Native_Mobile_Feel_Production_Hardening.md)  
**Status:** ✅ Done  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 6.4  

---

## 🎯 Goal

Remove all `console.log`, `console.warn`, and `console.info` statements from the production bundle to prevent information leakage, reduce bundle size, and improve runtime performance. Keep `console.error` for critical error tracking.

---

## 📍 Current State (What Exists)

### No `drop_console` configured

[vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) does not have any `terser` or `esbuild` console-stripping configuration. The current `build` section:

```typescript
build: {
  target: 'es2015',
  chunkSizeWarningLimit: 1000,
  rollupOptions: {
    // ... manualChunks, onwarn
  }
}
```

No `minify: 'terser'` or `esbuild.drop` settings exist.

### Extensive console.log usage throughout codebase

A rough count of console statements in src/:
- `console.log` — used extensively for debugging in service files, stores, and components
- `console.warn` — used for non-critical warnings (API key missing, deprecations)
- `console.error` — used for error tracking (should be KEPT)

Example hotspots:
- `AppDataPrefetcher.tsx` lines 45, 65, 116, 141 — prefetch logging
- `supabase.ts` lines 11, 12, 80, 89 — auth state logging
- `businessSearchService.ts` lines 204, 255, 261, 289, 322, 334, 370 — API call logging
- `performanceMonitoring.ts` lines 67-70, 104-108 — metric logging (dev-only by design)

### Vite uses `esbuild` by default for minification

Vite 5+ uses esbuild for minification (not terser). esbuild supports `drop` for removing console/debugger statements without needing the terser dependency.

---

## 🔧 Implementation Details

### Option A (Recommended): Use esbuild `pure` — zero dependencies

**File:** [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) — Add `esbuild` at the **top level** of the config (NOT inside `build`):

```diff
 export default defineConfig(({ mode }) => ({
   base: mode === 'capacitor' ? './' : '/',
+  // Strip console.log and debugger in production (Story 18.4)
+  ...(mode !== 'development' && {
+    esbuild: {
+      drop: ['debugger'],
+      pure: ['console.log', 'console.info', 'console.debug', 'console.warn'],
+    }
+  }),
   plugins: [
     react(),
```

> [!IMPORTANT]
> The `esbuild` option MUST be at the **top level** of the Vite config object, **not inside `build`**. Vite uses esbuild for both dev transforms and prod minification. The `build.esbuild` key does not exist — placing it there would silently do nothing.

**How `pure` works:** esbuild marks these functions as "pure" (side-effect-free), which allows the minifier to remove the entire call expression. The function calls are eliminated entirely — not just the output.

**Why not `drop: ['console']`?** Using `drop: ['console']` removes ALL console methods including `console.error`. We want to keep `console.error` for production error tracking.

### Option B: Use terser (heavier, more configurable)

If more granular control is needed:

```typescript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: false,  // Don't drop all
      pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
    },
  },
}
```

**Trade-off:** Terser is slower than esbuild and requires an additional dependency. Option A is preferred.

---

## 🧪 Verification

### Production Bundle Check
1. Run `npm run build`
2. Search the built output for console statements:
   ```bash
   grep -c "console.log" dist/assets/*.js
   grep -c "console.warn" dist/assets/*.js
   grep -c "console.error" dist/assets/*.js
   ```
3. **Before fix:** Hundreds of `console.log` and `console.warn` matches
4. **After fix:** 0 `console.log`, 0 `console.warn`, `console.error` still present

### Runtime Check
1. Run `npm run build && npm run preview`
2. Open DevTools Console
3. Navigate through the app
4. **Before fix:** Console fills with log messages
5. **After fix:** Console is clean (only errors if any)

### Development Mode Check
1. Run `npm run dev`
2. **Expected:** All console statements still work (esbuild `drop` only applies in production build mode)

---

## ✅ Acceptance Criteria

- [x] `console.log`, `console.info`, `console.debug`, `console.warn` stripped from production bundle
- [x] `console.error` preserved in production (for error tracking)
- [x] `debugger` statements stripped from production
- [x] Development mode console logging unchanged
- [x] Build time not significantly impacted (esbuild approach preferred over terser)
- [x] No runtime errors caused by missing console calls

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) | MODIFY — add top-level `esbuild` config with `pure` and `drop` (NOT inside `build`) |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Code that relies on console.log return value (rare) | `pure` treats calls as side-effect-free but doesn't break if someone assigns `const x = console.log(...)` — esbuild preserves the expression in that case. |
| Third-party libraries that use console.log | esbuild `pure` applies to the final bundle, including vendor code. This is desired behavior. |
| `performanceMonitoring.ts` uses console.log for dev metrics | Already gated by `if (!this.isProduction)` (line 66). In production, the console.log is inside a dead code branch that esbuild will also eliminate. No conflict. |
