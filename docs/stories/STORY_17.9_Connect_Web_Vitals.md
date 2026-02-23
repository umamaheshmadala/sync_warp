# STORY 17.9 — Connect `web-vitals` to Analytics Endpoint

**Epic:** [EPIC 17 — FAANG UX, Accessibility & Build Config](../epics/EPIC_17_FAANG_UX_Accessibility_Build_Config.md)  
**Status:** 📋 Ready  
**Priority:** 🟡 Medium  
**Estimate:** 2 story points  
**Dependencies:** None  
**Audit Findings:** 7.12  

---

## 🎯 Goal

Connect the already-installed `web-vitals` library to an analytics endpoint so that Core Web Vitals (CLS, LCP, FID/INP, FCP, TTFB) are reported in production. Currently, the `performanceMonitoring.ts` utility captures these metrics but the `sendToAnalytics()` method is a stub that only fires a `gtag` event — and there's no Google Analytics set up. This story completes the pipeline.

---

## 📍 Current State (What Exists)

### `web-vitals` v5.1.0 is installed ✅

`package.json` line 155: `"web-vitals": "^5.1.0"`

### `performanceMonitoring.ts` already captures all 5 Core Web Vitals ✅

[performanceMonitoring.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/utils/performanceMonitoring.ts) — Lines 38-47:

```typescript
private initWebVitals() {
  if (typeof window === 'undefined') return;
  onCLS(this.handleMetric.bind(this));
  onFID(this.handleMetric.bind(this));   // ← DEPRECATED in web-vitals v5 — should be onINP
  onFCP(this.handleMetric.bind(this));
  onLCP(this.handleMetric.bind(this));
  onTTFB(this.handleMetric.bind(this));
}
```

> **Note:** `onFID` (First Input Delay) was deprecated in `web-vitals` v5 and replaced by `onINP` (Interaction to Next Paint). The import at line 1 (`import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric } from 'web-vitals'`) also needs updating. See Step 5 below.

### `sendToAnalytics()` is a stub — only fires `gtag` (which doesn't exist)

[performanceMonitoring.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/utils/performanceMonitoring.ts) — Lines 258-272:

```typescript
private sendToAnalytics(metric: PerformanceMetric) {
  // Implement your analytics service integration here
  // Example: Google Analytics, custom backend, etc.

  // For now, we'll just store it
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }
}
```

The `gtag` check silently fails because there's no Google Analytics script loaded. Metrics are captured but **never reported anywhere**.

### The `PerformanceMonitor` class is a singleton ✅

Line 337: `export const performanceMonitor = new PerformanceMonitor();`

It auto-initializes on import, so web vitals are tracked as soon as the module is loaded.

### In dev mode, metrics are console-logged ✅

Lines 66-71: Metrics are logged to the console in development, which is useful for debugging.

---

## 🔧 Implementation Details

### Option A: Use Supabase Edge Function as Analytics Endpoint (Recommended)

Since the app uses Supabase, create a lightweight Edge Function to receive Web Vitals data:

#### Step A1: Create a Supabase Edge Function (or simple API endpoint)

This is optional and can be deferred — for v1, we can use the Netlify analytics endpoint or simply `navigator.sendBeacon()` to a logging endpoint.

#### Step A2: Update `sendToAnalytics()` to use `navigator.sendBeacon()`

**File:** [performanceMonitoring.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/utils/performanceMonitoring.ts) — Lines 258-272:

```diff
 private sendToAnalytics(metric: PerformanceMetric) {
-  // Implement your analytics service integration here
-  // Example: Google Analytics, custom backend, etc.
-
-  // For now, we'll just store it
-  if (typeof window !== 'undefined' && (window as any).gtag) {
-    (window as any).gtag('event', 'web_vitals', {
-      event_category: 'Web Vitals',
-      event_label: metric.name,
-      value: Math.round(metric.value),
-      metric_rating: metric.rating,
-      non_interaction: true,
-    });
-  }
+  // Send Web Vitals via beacon API (non-blocking, survives page unload)
+  const body = JSON.stringify({
+    name: metric.name,
+    value: Math.round(metric.value * 100) / 100,
+    rating: metric.rating,
+    delta: metric.delta,
+    id: metric.id,
+    timestamp: metric.timestamp,
+    url: window.location.pathname,
+    userAgent: navigator.userAgent,
+  });
+
+  // Use sendBeacon for reliability (fires even during page unload)
+  if (navigator.sendBeacon) {
+    navigator.sendBeacon('/api/web-vitals', body);
+  }
+
+  // Also fire gtag if available (Google Analytics integration)
+  if ((window as any).gtag) {
+    (window as any).gtag('event', 'web_vitals', {
+      event_category: 'Web Vitals',
+      event_label: metric.name,
+      value: Math.round(metric.value),
+      metric_rating: metric.rating,
+      non_interaction: true,
+    });
+  }
 }
```

### Option B: Use Netlify Analytics (if available)

If the app is deployed on Netlify (confirmed in the project), Netlify's built-in analytics can capture custom events. Alternatively, use a Netlify serverless function:

```typescript
// netlify/functions/web-vitals.ts — NEW
export default async (req: Request) => {
  const data = await req.json();
  console.log('[Web Vitals]', JSON.stringify(data));
  // Optionally store in Supabase database
  return new Response('OK', { status: 200 });
};
```

### Step 3: Create a Supabase table for vitals storage (optional)

For persistent storage and dashboarding:

```sql
CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,            -- CLS, LCP, FID, FCP, TTFB
  value NUMERIC NOT NULL,
  rating TEXT NOT NULL,          -- good, needs-improvement, poor
  delta NUMERIC,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-series queries
CREATE INDEX idx_web_vitals_name_created ON web_vitals(name, created_at DESC);

-- RLS: Only insert (no read for regular users)
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert vitals" ON web_vitals FOR INSERT WITH CHECK (true);
```

### Step 4: Ensure `performanceMonitor` is initialized on app startup

**File:** `src/main.tsx` or `src/App.tsx`

Verify that `performanceMonitoring.ts` is imported somewhere in the app startup. It auto-initializes as a singleton:

```typescript
import './utils/performanceMonitoring'; // Ensure singleton initializes
```

If already imported via another module, no changes needed.

### Step 5: Update `onFID` → `onINP` (web-vitals v5 migration)

**File:** [performanceMonitoring.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/utils/performanceMonitoring.ts) — Lines 1 and 43

`web-vitals` v5 deprecated `onFID` (First Input Delay) and replaced it with `onINP` (Interaction to Next Paint). INP measures the latency of ALL interactions during the page lifecycle, not just the first input. Google adopted INP as a Core Web Vital in March 2024.

```diff
// Line 1 — import
-import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';
+import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

// Line 43 — usage
-  onFID(this.handleMetric.bind(this));
+  onINP(this.handleMetric.bind(this));
```

No other code changes are needed — `onINP` has the same callback signature as `onFID`.

---

## 🧪 Verification

### Dev Mode Console Check
1. Open the app in development mode
2. Open DevTools → Console
3. Wait for page to fully load (5-10 seconds)
4. **Expected:** Console logs like:
   ```
   [Performance] LCP: { value: "1250.00ms", rating: "good" }
   [Performance] CLS: { value: "0.05ms", rating: "good" }
   ```

### Production Beacon Check
1. Build and deploy to staging
2. Open DevTools → Network → filter by `web-vitals` or `/api/web-vitals`
3. Navigate through a few pages
4. **Expected:** `sendBeacon` requests visible with metric payloads
5. Verify the response is 200 OK (if endpoint exists)

### Metric Accuracy
1. Open Lighthouse → Performance
2. Note the CLS, LCP values
3. Check the console/beacon output → values should be consistent with Lighthouse

---

## ✅ Acceptance Criteria

- [ ] `sendToAnalytics()` updated to use `navigator.sendBeacon()` for reliable delivery
- [ ] Web Vitals payload includes: name, value, rating, delta, url, userAgent
- [ ] Metrics are sent in production only (not in development — dev uses console.log)
- [ ] `gtag` integration preserved as a fallback (for future Google Analytics setup)
- [ ] `performanceMonitor` singleton initializes on app startup
- [ ] Console logs Web Vitals in development mode (already working)
- [ ] Network tab shows beacon requests to analytics endpoint in production
- [ ] `onFID` replaced with `onINP` for web-vitals v5 compatibility
- [ ] Optional: Supabase `web_vitals` table created for persistent storage

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [performanceMonitoring.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/utils/performanceMonitoring.ts) | MODIFY — update `sendToAnalytics()` with `navigator.sendBeacon()` |
| `src/main.tsx` or `src/App.tsx` | VERIFY — ensure `performanceMonitoring` is imported |
| `netlify/functions/web-vitals.ts` (optional) | **NEW** — Netlify serverless function to receive vitals |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| No analytics endpoint exists yet | `navigator.sendBeacon('/api/web-vitals', ...)` will silently fail with a 404 — no page crash. The endpoint can be added later. |
| Beacon payload too large | Keep payload minimal (~200 bytes per metric). 5 metrics × 200 bytes = 1KB total — well within beacon limits. |
| Privacy/GDPR concerns with userAgent | The `userAgent` field can be removed or anonymized. It's optional and only useful for debugging browser-specific issues. |
| `web-vitals` v5 API changes | v5 replaced `onFID` with `onINP`. Step 5 migrates from FID → INP. The callback signature is identical, so no other changes are needed. |
