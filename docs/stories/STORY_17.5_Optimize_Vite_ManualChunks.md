# STORY 17.5 — Optimize Vite `manualChunks` — Split Large Dependencies

**Epic:** [EPIC 17 — FAANG UX, Accessibility & Build Config](../epics/EPIC_17_FAANG_UX_Accessibility_Build_Config.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 2 story points  
**Dependencies:** None  
**Audit Findings:** 7.6  

---

## 🎯 Goal

Split heavy third-party libraries (`recharts`, `xlsx`, `emoji-picker-react`, `@dnd-kit`) into separate Vite chunks so they load on-demand only when the user navigates to the page that uses them. Currently, only 3 manual chunks exist (react-vendor, supabase-vendor, zustand-vendor) and everything else lands in the main bundle, making it unnecessarily large.

---

## 📍 Current State (What Exists)

### Current manualChunks — only 3 splits

[vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) — Lines 94-98:

```typescript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'supabase-vendor': ['@supabase/supabase-js'],
  'zustand-vendor': ['zustand']
},
```

### Heavy libraries currently in main bundle

| Library | npm Size (approx.) | Used In | Pages |
|---------|-------------------|---------|-------|
| `recharts` | ~450KB | 6 analytics components | Admin analytics dashboards only |
| `emoji-picker-react` | ~200KB | `MessageEmojiPicker.tsx`, `MessageComposer.tsx` | Chat screen only |
| `@dnd-kit` (core + sortable + utilities) | ~80KB | 7 product management components | Product wizard only |
| `xlsx` | ~300KB | `follower.types.ts` (export type only) | Follower export only |

These libraries are NOT needed on initial page load. Users who only view the dashboard and browse businesses should not download analytics charting or emoji picker code.

### chunkSizeWarningLimit suppresses warnings

Line 85: `chunkSizeWarningLimit: 1000` — This suppresses Vite's default 500KB chunk warning, hiding the fact that the main bundle is oversized. Story 17.8 will lower this.

---

## 🔧 Implementation Details

### Step 1: Add manual chunks for heavy libraries

**File:** [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) — Lines 94-98

```diff
 manualChunks: {
   'react-vendor': ['react', 'react-dom', 'react-router-dom'],
   'supabase-vendor': ['@supabase/supabase-js'],
-  'zustand-vendor': ['zustand']
+  'zustand-vendor': ['zustand'],
+  'recharts-vendor': ['recharts'],
+  'emoji-vendor': ['emoji-picker-react'],
+  'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
+  'xlsx-vendor': ['xlsx'],
 },
```

### Step 2: Verify `xlsx` is already dynamically imported

Search for how `xlsx` is used. The `follower.types.ts` only declares an export format type (`'xlsx'`), but the actual library import should be dynamic:

```bash
grep -rn "from 'xlsx'" src/  # Should return no results (dynamic import)
grep -rn "import.*xlsx" src/ # Check for dynamic imports
```

If `xlsx` is statically imported anywhere, convert to dynamic:

```typescript
// BEFORE (if found):
import * as XLSX from 'xlsx';

// AFTER:
const XLSX = await import('xlsx');
```

Whether or not `xlsx` is dynamically imported, the `xlsx-vendor` manual chunk (Step 1) ensures it lands in a separate file rather than the main bundle.

### Step 3: Ensure lazy-loaded routes benefit from chunking

The analytics dashboard components (which use `recharts`) should be behind `React.lazy()` routes. Check [Router.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/router/Router.tsx) — if they're already lazy-loaded, the `recharts-vendor` chunk will only load when the user navigates to those pages.

The messaging components (which use `emoji-picker-react`) are partially lazy-loaded via `ChatScreen` (Story 16.4). Once `ChatScreen` is lazy, `emoji-vendor` only loads when opening a conversation.

### Step 4: (Optional) Use a function-based manualChunks for more control

For even more granular control, use a function:

```typescript
manualChunks(id) {
  if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
    return 'react-vendor';
  }
  if (id.includes('node_modules/@supabase')) {
    return 'supabase-vendor';
  }
  if (id.includes('node_modules/zustand')) {
    return 'zustand-vendor';
  }
  if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
    return 'recharts-vendor';  // recharts depends on d3 modules
  }
  if (id.includes('node_modules/emoji-picker-react')) {
    return 'emoji-vendor';
  }
  if (id.includes('node_modules/@dnd-kit')) {
    return 'dnd-vendor';
  }
  if (id.includes('node_modules/xlsx')) {
    return 'xlsx-vendor';
  }
},
```

This handles transitive dependencies (e.g., `recharts` pulls in `d3-*` modules) and prevents them from landing in the main bundle.

> **Note on `@radix-ui`:** The audit report (7.6) also mentions `@radix-ui` (~25KB gzipped) as a split candidate. However, Radix components are heavily tree-shaken and used across many pages, so splitting them into a separate chunk may not improve loading characteristics. Monitor after the other splits — if bundle size is still above target, add `'radix-vendor': ['@radix-ui']`.

---

## 🧪 Verification

### Build Output Check
1. Run `npm run build`
2. Check `dist/assets/` for the new chunk files:
   ```
   recharts-vendor-*.js
   emoji-vendor-*.js
   dnd-vendor-*.js
   ```
3. **Before fix:** These libraries are embedded in the main `index-*.js`
4. **After fix:** Separate chunk files exist, including `xlsx-vendor-*.js`

### Bundle Size Comparison
1. Note the main bundle size before the change:
   ```bash
   ls -la dist/assets/index-*.js
   ```
2. Apply the change and rebuild
3. Compare: **Expected: ≥15% reduction in main bundle size**

### Lazy Load Verification
1. Open the app → Dashboard
2. Open DevTools → Network tab
3. Verify `recharts-vendor-*.js` is NOT loaded on Dashboard
4. Navigate to Admin Analytics → Verify `recharts-vendor-*.js` loads on demand
5. Navigate to Messages → Open a conversation → Verify `emoji-vendor-*.js` loads when emoji picker opens

---

## ✅ Acceptance Criteria

- [ ] `recharts` extracted into `recharts-vendor` chunk
- [ ] `emoji-picker-react` extracted into `emoji-vendor` chunk
- [ ] `@dnd-kit` extracted into `dnd-vendor` chunk
- [ ] `xlsx` extracted into `xlsx-vendor` chunk
- [ ] Build output shows 7+ chunk files (up from 3)
- [ ] Main bundle size reduced by ≥15%
- [ ] Analytics pages load `recharts-vendor` only on navigation
- [ ] Emoji picker loads `emoji-vendor` only when activated
- [ ] Product wizard loads `dnd-vendor` only when opened
- [ ] Follower export loads `xlsx-vendor` only when triggered
- [ ] No functional regressions in charting, emoji, drag-and-drop, or export features

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) | MODIFY — add 4 new `manualChunks` entries (recharts, emoji, dnd-kit, xlsx) |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `recharts` transitive deps (`d3-*`) land in main bundle | Use function-based `manualChunks` to capture `d3-*` into `recharts-vendor` |
| Circular dependency warnings | The `onwarn` filter (line 87-91) already suppresses dynamic import warnings |
| Too many small chunks hurting HTTP/2 performance | 6 chunks is well within acceptable limits; modern browsers handle parallel chunk loads efficiently |
