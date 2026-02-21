# STORY 14.9 — Reduce Campaign Poll 30s → 5min; `ProfileCompletion` 50ms Interval → CSS Transition

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 1 point  
**Dependencies:** Story 14.4 (setTimeout conversion covers these files too)  
**Audit Findings:** 4.10 — Campaign polls every 30s; 4.11 — ProfileCompletion 50ms interval

---

## 🎯 User Story

> As a business owner, I want campaign analytics to refresh at reasonable intervals so that I get up-to-date data without unnecessary battery and data usage.

---

## 📍 Problem

### Campaign Analytics Polling (30s → 5min)
`useCampaignAnalytics` in `src/hooks/useCampaigns.ts` (line 375):
```typescript
// Refresh analytics every 30 seconds
const interval = setInterval(fetchAnalytics, 30000);
```

Campaign analytics data (impressions, clicks, reach) doesn't change frequently enough to justify a 30s poll. A business owner viewing their campaign dashboard would trigger 120 API calls/hour — completely unnecessary.

**Target:** 5 minutes (300,000ms). This is still responsive enough to show meaningful changes.

### ProfileCompletion Polling
`useProfileCompletion` in `src/hooks/useProfileCompletion.ts` (line 83):
```typescript
// Auto-refresh effect
useEffect(() => {
    if (autoRefresh) {
        const interval = setInterval(() => {
            loadProfileData();
        }, refreshInterval); // Default: 30000ms
        
        return () => clearInterval(interval);
    }
}, [autoRefresh, refreshInterval, businessId]);
```

The `autoRefresh` is gated — it only runs when a caller explicitly enables it. However, the default `refreshInterval` is 30,000ms (30s), which is too aggressive for profile completion data that only changes when the user actively fills in fields.

**Target:** Change default to 120,000ms (2 min) or remove auto-refresh entirely since profile data only changes on user action.

> **Note:** The audit finding says "50ms interval" which may have been a different version of the component. The current code shows 30s. Either way, the fix is the same — reduce frequency or eliminate polling in favor of event-driven updates.

---

## 🔍 Codebase Research

### `useCampaignAnalytics` (lines 326–385 of `useCampaigns.ts`)
- Fetches from Supabase: `ad_campaign_analytics` table
- Returns: `analytics`, `isLoading`, `error`, `refresh`
- The `refresh` function is exposed — callers can manually refresh
- Current auto-refresh: `setInterval(fetchAnalytics, 30000)` (line 375)
- **No callers pass a custom interval** — it's hardcoded at 30s

### `useProfileCompletion` (lines 60–371 of `useProfileCompletion.ts`)
- Accepts `autoRefresh` (default `false`) and `refreshInterval` (default `30000`)
- When `autoRefresh` is true, polls `loadProfileData()` at the interval
- `loadProfileData` makes 3+ Supabase queries (business data, customer profile, marketing goals)
- **Callers:** Search for `useProfileCompletion` to see if anyone enables `autoRefresh`

---

## ✅ Implementation Plan

### Step 1: Change campaign analytics poll to 5 minutes

In `src/hooks/useCampaigns.ts`, line 374-375:
```diff
-    // Refresh analytics every 30 seconds
-    const interval = setInterval(fetchAnalytics, 30000);
+    // Refresh analytics every 5 minutes
+    const interval = setInterval(fetchAnalytics, 300000);
```

> **Note:** Story 14.4 will convert this `setInterval` to a `setTimeout` chain. This story only changes the interval value. If Story 14.4 is done first, adjust the `setTimeout` delay instead.

### Step 2: Change `useProfileCompletion` default refresh interval

In `src/hooks/useProfileCompletion.ts`, line 60-64:
```diff
 export function useProfileCompletion({
   businessId,
   autoRefresh = false,
-  refreshInterval = 30000
+  refreshInterval = 120000 // 2 minutes — profile data changes infrequently
 }: UseProfileCompletionOptions): UseProfileCompletionReturn {
```

### Step 3 (Optional): Consider removing auto-refresh entirely

If no callers pass `autoRefresh: true`, the auto-refresh code is dead. Check:
```bash
grep -rn "autoRefresh" src/ --include="*.tsx" --include="*.ts"
```

If no caller enables it, consider removing the `autoRefresh` feature and the `setInterval`/`useEffect` block entirely, simplifying the hook.

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Open campaign analytics dashboard | First fetch happens immediately |
| Wait 5 minutes on analytics page | Only 1 refresh (not 10 as before) |
| Browser Network tab → filter `ad_campaign_analytics` | ≤1 request per 5 min |
| Profile completion page with `autoRefresh` | Refreshes at 2 min intervals (if enabled) |
| `npm run build` | Build succeeds |
| Campaign analytics data accuracy | Still shows latest data on manual page visit |

---

## ✅ Acceptance Criteria

- [ ] Campaign analytics poll changed from 30s to 300s (5 min)
- [ ] ProfileCompletion default refresh interval changed from 30s to 120s (2 min)
- [ ] Optional: Remove autoRefresh feature if no callers use it
- [ ] API calls reduced by ~10× for campaign analytics
- [ ] Build passes

---

## ✅ Definition of Done

- [ ] Intervals updated
- [ ] Network tab confirms reduced poll frequency
- [ ] Build passes
