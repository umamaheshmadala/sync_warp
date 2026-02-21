# STORY 14.4 — Convert All `setInterval` → `setTimeout` Chains with Cleanup

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 3 points  
**Dependencies:** None (can be done in parallel with 14.3)  
**Audit Finding:** 4.4 — 22 `setInterval` calls across services

---

## 🎯 User Story

> As a developer, I want all timers to use self-restarting `setTimeout` chains instead of `setInterval` so that timer drift is eliminated, cleanup is reliable, and no orphaned intervals leak memory.

---

## 📍 Problem

`setInterval` has three issues: (1) callbacks can stack up if execution takes longer than the interval, (2) intervals can't adapt their delay dynamically, and (3) forgotten cleanups create uncollectable memory leaks. `setTimeout` chains naturally solve all three because each timer only fires once.

---

## 🔍 Codebase Research — All 22 `setInterval` Call Sites

| # | File | Line | Purpose | Current Interval | Action |
|---|------|------|---------|-----------------|--------|
| 1 | `src/store/presenceStore.ts` | 121 | Presence heartbeat | 30s → 120s (Story 14.2) | Convert to `setTimeout` |
| 2 | `src/services/presenceService.ts` | 38 | Presence heartbeat | 30s | **Deleted in Story 14.1** |
| 3 | `src/services/networkService.ts` | 131 | Network verification heartbeat | 30s → 120s (Story 14.2) | Convert to `setTimeout` |
| 4 | `src/hooks/useUpdateOnlineStatus.ts` | 77 | Online status heartbeat | 30s | **Deleted in Story 14.1** |
| 5 | `src/hooks/useCampaigns.ts` | 375 | Campaign analytics poll | 30s → 5min (Story 14.9) | Convert to `setTimeout` |
| 6 | `src/hooks/useProfileCompletion.ts` | 83 | Profile data refresh | 30s (configurable) | Convert to `setTimeout` |
| 7 | `src/hooks/useDeleteMessage.tsx` | 64 | Check delete eligibility | 1s | Convert to `setTimeout` |
| 8 | `src/hooks/useEditMessage.ts` | 74 | Check edit eligibility | 1s | Convert to `setTimeout` |
| 9 | `src/hooks/useSharingLimits.ts` | 173 | Sharing cooldown countdown | varies | Convert to `setTimeout` |
| 10 | `src/hooks/useRateLimit.ts` | 123 | Rate limit countdown | varies | Convert to `setTimeout` |
| 11 | `src/hooks/useReviewStats.ts` | 74 | Review stats refresh | varies | Convert to `setTimeout` |
| 12 | `src/components/favorites/SaveButton.tsx` | 68 | Debounce animation | varies | Convert to `setTimeout` |
| 13 | `src/components/user/CouponRedemption.tsx` | 146 | Coupon timer countdown | 1s | Convert to `setTimeout` |
| 14 | `src/components/messaging/DeleteConversationSheet.tsx` | 149 | Countdown timer | 1s | Convert to `setTimeout` |
| 15 | `src/components/messaging/DeleteConversationDialog.tsx` | 181 | Countdown timer | 1s | Convert to `setTimeout` |
| 16 | `src/components/campaign/ReachEstimator.tsx` | 158 | Reach estimate polling | varies | Convert to `setTimeout` |
| 17 | `src/components/business/CouponCreator.tsx` | 275 | Preview refresh | varies | Convert to `setTimeout` |
| 18 | `src/components/ads/AdCarousel.tsx` | 16 | Auto-rotate slides | varies | Convert to `setTimeout` |
| 19 | `src/services/mediaUploadService.ts` | 208 | Upload progress simulation | varies | Convert to `setTimeout` |
| 20 | `src/services/mediaUploadService.ts` | 523 | Upload progress simulation | varies | Convert to `setTimeout` |
| 21 | `src/utils/uuidHelpers.ts` | 271 | UUID cache cleanup | varies | Convert to `setTimeout` |
| 22 | `src/utils/registerServiceWorker.ts` | 41 | SW update check | varies | Convert to `setTimeout` |

**After Story 14.1 removes 2 files:** 20 remaining sites to convert.

---

## ✅ Implementation Plan

### Conversion Pattern

For every `setInterval`, apply this standard transformation:

**Before:**
```typescript
const intervalId = setInterval(() => {
  doWork();
}, delay);

// Cleanup
clearInterval(intervalId);
```

**After:**
```typescript
let timeoutId: ReturnType<typeof setTimeout> | null = null;

const tick = () => {
  doWork();
  timeoutId = setTimeout(tick, delay);
};
timeoutId = setTimeout(tick, delay);

// Cleanup
if (timeoutId) clearTimeout(timeoutId);
```

### For React hooks (useEffect pattern):
```typescript
useEffect(() => {
  let timeoutId: ReturnType<typeof setTimeout>;

  const tick = () => {
    doWork();
    timeoutId = setTimeout(tick, delay);
  };
  timeoutId = setTimeout(tick, delay);

  return () => clearTimeout(timeoutId);
}, [deps]);
```

### For class services (presenceStore, networkService):
Store the timeout ID in the existing variable and clear it in the `cleanup()` / `destroy()` method.

### Execution Approach
Process files in this order (grouped by pattern):

**Group 1 — Hooks with `useEffect` cleanup (already have cleanup returns):**
Files 5-11 — all follow `useEffect(() => { setInterval; return () => clearInterval; }, [])` pattern.

**Group 2 — Components with ref-based cleanup:**
Files 12-18 — use `useRef` or local variables with cleanup in `useEffect` return.

**Group 3 — Service singletons:**
Files 1, 3 — class methods with `clearInterval` in `stopX()` / `destroy()`.

**Group 4 — Utility files:**
Files 19-22 — standalone scripts.

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| `grep -rn "setInterval" src/` | 0 results |
| `grep -rn "clearInterval" src/` | 0 results |
| `npm run build` | Build succeeds |
| Ad carousel auto-rotates | Still works |
| Message delete countdown timer | Still counts down correctly |
| Coupon redemption timer | Still works |
| Upload progress indicator | Still animates |

---

## ✅ Acceptance Criteria

- [ ] All 20 remaining `setInterval` calls converted to `setTimeout` chains
- [ ] All cleanup functions use `clearTimeout` instead of `clearInterval`
- [ ] Zero `setInterval` or `clearInterval` in `src/` directory
- [ ] All existing timer behavior unchanged (countdowns, polls, heartbeats)
- [ ] Build passes with zero errors

---

## ✅ Definition of Done

- [ ] `grep "setInterval" src/` returns 0 results
- [ ] `grep "clearInterval" src/` returns 0 results
- [ ] Build passes
- [ ] All timers manually tested and functional
