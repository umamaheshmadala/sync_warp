# STORY 18.2 — Reduce SplashScreen Fallback from 10s to 3s

**Epic:** [EPIC 18 — Native Mobile Feel & Production Hardening](../epics/EPIC_18_Native_Mobile_Feel_Production_Hardening.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 6.2  

---

## 🎯 Goal

Reduce the Capacitor SplashScreen maximum display duration from 10 seconds to 3 seconds so users aren't stuck on a blank splash screen if data loading hangs. The current architecture has TWO timeout layers — both need adjustment.

---

## 📍 Current State (What Exists)

### Layer 1: Capacitor SplashScreen plugin — 10s hard fallback

[capacitor.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/capacitor.config.ts) — Lines 69-77:

```typescript
SplashScreen: {
  launchShowDuration: 10000,    // ← 10 seconds before native auto-hide
  showSpinner: false,
  launchAutoHide: false,        // ← App controls hiding (via SplashScreen.hide())
  backgroundColor: "#ffffffff",
  androidScaleType: "CENTER_INSIDE",
  splashFullScreen: true,
  splashImmersive: true
},
```

`launchAutoHide: false` means the native splash does NOT auto-dismiss — the app must call `SplashScreen.hide()` programmatically. `launchShowDuration: 10000` is the absolute maximum before the native layer force-hides it.

### Layer 2: AppDataPrefetcher — 7s safety timeout

[AppDataPrefetcher.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/AppDataPrefetcher.tsx) — Lines 42-51:

```typescript
useEffect(() => {
  // Safety timeout - ensure splash always hides after 7s max
  const timer = setTimeout(() => {
    if (!hasHiddenSplash.current) {
      console.warn('⚠️ [AppDataPrefetcher] Force hiding splash due to timeout');
      hideSplash();
    }
  }, 7000);                    // ← 7 second JS safety timeout
  return () => clearTimeout(timer);
}, []);
```

### Layer 3: Data loading race — 2.5s maxWait

[AppDataPrefetcher.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/AppDataPrefetcher.tsx) — Lines 133-139:

```typescript
const minWait = new Promise(resolve => setTimeout(resolve, 500));  // Min splash time
const maxWait = new Promise(resolve => setTimeout(resolve, 2500)); // Max wait for data

await Promise.all([
  minWait,
  Promise.race([dashboardPromises, maxWait])
]);
```

**The actual splash behavior is:**
1. Splash shows immediately on cold start
2. App waits **500ms minimum** (prevent flash) + up to **2.5s** for dashboard data
3. If data loads in time → splash hides after 500ms–2.5s (**good**)
4. If data loading hangs → JS safety timeout hides at **7s** (too long)
5. If JS completely crashes → native fallback hides at **10s** (way too long)

---

## 🔧 Implementation Details

### Step 1: Reduce Capacitor `launchShowDuration` to 3000

**File:** [capacitor.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/capacitor.config.ts) — Line 70

```diff
 SplashScreen: {
-  launchShowDuration: 10000,
+  launchShowDuration: 3000,
   showSpinner: false,
   launchAutoHide: false,
```

### Step 2: Reduce JS safety timeout to 3000

**File:** [AppDataPrefetcher.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/AppDataPrefetcher.tsx) — Line 48

```diff
-  }, 7000);
+  }, 3000);
```

### Step 3: Reduce maxWait to 2000 (optional tightening)

**File:** [AppDataPrefetcher.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/AppDataPrefetcher.tsx) — Line 134

```diff
-const maxWait = new Promise(resolve => setTimeout(resolve, 2500)); // Max wait for data
+const maxWait = new Promise(resolve => setTimeout(resolve, 2000)); // Max wait for data
```

### Resulting behavior after fix:

| Scenario | Splash Duration |
|----------|----------------|
| Data loads fast (< 500ms) | 500ms (minimum wait) |
| Data loads in 1-2s | 1-2s (normal) |
| Data loading slow | 2s (maxWait timeout) |
| Data loading hangs | 3s (JS safety timeout) |
| JS completely crashes | 3s (native fallback) |

Maximum splash time: **3 seconds** (down from 10 seconds).

---

## 🧪 Verification

### Cold Start Test (Device/Emulator)
1. Build with Capacitor: `npx cap sync && npx cap run android`
2. Force-close the app → re-open from launcher
3. Time from tap to dashboard visible
4. **Before fix:** Up to 10s on slow network
5. **After fix:** Maximum 3s

### Network Throttling Test
1. In Chrome DevTools, set Network to "Slow 3G"
2. Cold start the app
3. **Expected:** Splash dismisses at 3s maximum even if data hasn't loaded
4. Dashboard shows loading skeletons instead of waiting for data

### Crash Scenario Test
1. Temporarily add `throw new Error('test')` at the top of `prefetchData()`
2. Cold start → splash should still dismiss at 3s (JS safety timeout)
3. Remove the test error

---

## ✅ Acceptance Criteria

- [ ] `launchShowDuration` changed from `10000` to `3000` in `capacitor.config.ts`
- [ ] JS safety timeout changed from `7000` to `3000` in `AppDataPrefetcher.tsx`
- [ ] Cold start splash dismisses in ≤3s on all network conditions
- [ ] Normal cold start still shows splash for 500ms minimum (no flash)
- [ ] Dashboard shows loading skeletons if data hasn't arrived by splash dismiss time

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [capacitor.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/capacitor.config.ts) | MODIFY — line 70: `10000` → `3000` |
| [AppDataPrefetcher.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/AppDataPrefetcher.tsx) | MODIFY — line 48: `7000` → `3000`; optionally line 134: `2500` → `2000` |
