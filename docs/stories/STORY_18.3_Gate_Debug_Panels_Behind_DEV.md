# STORY 18.3 — Gate Debug Panels Behind `import.meta.env.DEV`

**Epic:** [EPIC 18 — Native Mobile Feel & Production Hardening](../epics/EPIC_18_Native_Mobile_Feel_Production_Hardening.md)  
**Status:** ✅ Done  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 6.3  

---

## 🎯 Goal

Ensure all debug panels and development menus are completely absent from production builds. Currently, two components either leak into production or are dead code that inflates the bundle.

---

## 📍 Current State (What Exists)

### Component Inventory — 3 debug components found

| Component | File | Dev Guard? | Imported In | Problem |
|-----------|------|-----------|-------------|---------|
| `PageDebugPanel` | [PageDebugPanel.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/PageDebugPanel.tsx) | ✅ Line 14: `import.meta.env.MODE !== 'development'` → returns null | Unknown | Already guarded correctly |
| `DevMenu` | [DevMenu.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/DevMenu.tsx) | ⚠️ Line 35: `!isDevelopment && !isNativePlatform` | [App.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/App.tsx) line 19 | **Leaks to native production builds** |
| `ReachDebugPanel` | [ReachDebugPanel.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/campaign/ReachDebugPanel.tsx) | ❌ No guard at all | Not imported anywhere | Dead code (218 lines in bundle) |

### DevMenu — leaks to native production

[DevMenu.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/DevMenu.tsx) — Lines 14-37:

```typescript
const isDevelopment = import.meta.env.MODE === 'development'
const isNativePlatform = Capacitor.isNativePlatform()

// Show in development mode OR on native platforms (for testing)
if (!isDevelopment && !isNativePlatform) {
  return null
}
```

The logic: renders if `isDevelopment` OR `isNativePlatform`. This means:
- Web dev → shows ✅ (intended)
- Web prod → hidden ✅ (intended)
- Native dev → shows ✅ (intended)
- **Native prod → SHOWS** ❌ (unintended — `isNativePlatform` is true on prod builds)

The DevMenu shows git branch, commit hash, and build timestamp — sensitive info for production users.

### DevMenu imported in App.tsx

[App.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/App.tsx) — Line 19:

```typescript
import DevMenu from './components/DevMenu'
```

Even with the runtime guard, the entire component (137 lines including `virtual:build-info` import) is bundled in production.

### ReachDebugPanel — no guard, not imported

[ReachDebugPanel.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/campaign/ReachDebugPanel.tsx) — 218 lines, no dev guard. However, it's not imported anywhere in the app (confirmed via grep). It's dead code that inflates the bundle through tree-shaking failure if any other file re-exports from the `campaign/` directory.

---

## 🔧 Implementation Details

### Step 1: Fix DevMenu guard — remove `isNativePlatform` escape hatch

**File:** [DevMenu.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/DevMenu.tsx) — Lines 14-37

```diff
-  const isDevelopment = import.meta.env.MODE === 'development'
-  const isNativePlatform = Capacitor.isNativePlatform()
-
-  // Show in development mode OR on native platforms (for testing)
-  if (!isDevelopment && !isNativePlatform) {
-    return null
-  }
+  // Only show in development mode — never in production
+  if (!import.meta.env.DEV) {
+    return null
+  }
```

Using `import.meta.env.DEV` is preferred over `import.meta.env.MODE === 'development'` because Vite statically replaces `import.meta.env.DEV` with `false` during production builds, enabling **dead code elimination** by the minifier. This means the entire component body is stripped from the production bundle automatically.

### Step 2: Guard DevMenu import in App.tsx with lazy loading

**File:** [App.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/App.tsx) — Line 19

```diff
-import DevMenu from './components/DevMenu'
+const DevMenu = import.meta.env.DEV
+  ? (await import('./components/DevMenu')).default
+  : () => null;
```

Or simpler approach — keep the static import but rely on the in-component guard and Vite's dead code elimination:

```typescript
// The import.meta.env.DEV guard inside DevMenu ensures it's tree-shaken in prod
import DevMenu from './components/DevMenu'
```

The in-component `import.meta.env.DEV` check is sufficient for tree-shaking because Vite replaces it at build time.

### Step 3: Delete `ReachDebugPanel.tsx` (dead code) — OR add dev guard

**Option A (Recommended): Delete the entire file:**

```bash
rm src/components/campaign/ReachDebugPanel.tsx
```

It's 218 lines of dead code (confirmed: not imported anywhere).

**Option B: Add a dev guard if it may be used in the future:**

[ReachDebugPanel.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/campaign/ReachDebugPanel.tsx) — Add at line 37:

```diff
 export function ReachDebugPanel({
   ...
 }: ReachDebugPanelProps) {
+  // Only render in development mode
+  if (!import.meta.env.DEV) return null;
+
   const [showSQL, setShowSQL] = useState(false);
```

### Step 4: Clean up unused imports in DevMenu

[DevMenu.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/DevMenu.tsx) — Remove the Capacitor import if no longer used after removing `isNativePlatform`:

```diff
-import { Capacitor } from '@capacitor/core'
```

Also clean up the long block of unused comments (lines 18-31) about push notification hooks.

---

## 🧪 Verification

### Production Build Check
1. Run `npm run build`
2. Search the built output for debug panel strings:
   ```bash
   grep -r "Dev Menu" dist/assets/
   grep -r "PageDebugPanel" dist/assets/
   grep -r "ReachDebugPanel" dist/assets/
   ```
3. **Before fix:** "Dev Menu" and component code found in bundle
4. **After fix:** Zero matches — all debug code tree-shaken

### Runtime Check — Production Preview
1. Run `npm run build && npm run preview`
2. Open the app → inspect bottom-left corner
3. **Before fix:** Purple floating `</>` button visible (DevMenu)
4. **After fix:** No debug UI visible

### Native Production Build
1. Build with Capacitor: `npx cap sync && npx cap run android`
2. **Before fix:** DevMenu FAB visible on native prod
3. **After fix:** No DevMenu on native prod

### Development Mode Check
1. Run `npm run dev`
2. **Expected:** DevMenu still visible and functional (not removed from dev builds)
3. **Expected:** PageDebugPanel still works on pages that use it

---

## ✅ Acceptance Criteria

- [x] `DevMenu` uses `import.meta.env.DEV` guard (not `isNativePlatform`)
- [x] DevMenu hidden on native production builds (verified on device)
- [x] DevMenu still visible in development mode
- [x] `ReachDebugPanel.tsx` deleted (dead code) OR guarded with `import.meta.env.DEV`
- [x] `PageDebugPanel` guard unchanged (already correct)
- [x] Production bundle does not contain debug panel code (verified via grep on dist/)
- [x] Unused Capacitor import and comment block removed from DevMenu

---

## 📁 Files to Modify / Delete

| File | Action |
|------|--------|
| [DevMenu.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/DevMenu.tsx) | MODIFY — fix guard to `import.meta.env.DEV`; remove Capacitor import + unused comments |
| [ReachDebugPanel.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/campaign/ReachDebugPanel.tsx) | **DELETE** (dead code) or MODIFY (add dev guard) |
| [App.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/App.tsx) | VERIFY — DevMenu import is tree-shaken in prod |
