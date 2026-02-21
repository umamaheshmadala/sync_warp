# STORY 14.5 — Audit and Fix All Uncleaned Event Listeners

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 2 points  
**Dependencies:** None (independent audit)  
**Audit Finding:** 4.5 — Memory leaks from uncleaned event listeners

---

## 🎯 User Story

> As a mobile user, I want the app to properly clean up all event listeners so that memory usage doesn't grow over time and the app remains responsive.

---

## 📍 Problem

Event listeners added via `document.addEventListener`, `window.addEventListener`, or Capacitor `App.addListener` that are never removed create memory leaks. Over time, these accumulate and cause:
- Growing heap size
- Duplicate callbacks firing on the same event
- Performance degradation after extended use

---

## 🔍 Codebase Research — Known Uncleaned Listeners

### 1. `presenceService.ts` — `beforeunload` handler (line 57)
```typescript
window.addEventListener('beforeunload', () => {
    // anonymous function — CANNOT be removed
    navigator.sendBeacon(...);
});
```
**Problem:** Anonymous arrow function means `removeEventListener` can never match it.
**Resolution:** This file is deleted in Story 14.1. ✅

### 2. `presenceStore.ts` — `visibilitychange` handler (line 127)
```typescript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        untrackPresence(userId);
    } else {
        trackPresence(userId);
    }
});
```
**Problem:** Anonymous function — cleanup in `cleanup()` method does NOT remove this listener.
**Fix:** Store as a named reference:
```typescript
const handleVisibility = () => { ... };
document.addEventListener('visibilitychange', handleVisibility);
// In cleanup:
document.removeEventListener('visibilitychange', handleVisibility);
```

### 3. `presenceStore.ts` — `beforeunload` handler (line 147)
```typescript
window.addEventListener('beforeunload', () => {
    untrackPresence(userId);
});
```
**Problem:** Same anonymous function issue. Never removed.
**Fix:** Store as named reference and remove in `cleanup()`.

### 4. `presenceService.ts` — `onAuthStateChange` inside `startTracking()` (line 42)
```typescript
supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        this.stopTracking();
    }
});
```
**Problem:** Creates a NEW auth listener every time `startTracking()` is called. Supabase `onAuthStateChange` returns an unsubscribe function that is never stored or called.
**Resolution:** Deleted in Story 14.1. ✅

---

## ✅ Implementation Plan

### Step 1: Fix `presenceStore.ts` — Store listener references

Modify `src/store/presenceStore.ts` to store all event listener functions as named references in the closure scope:

```typescript
export const usePresenceStore = create<PresenceState>((set, get) => {
    let channel: any = null;
    let heartbeatInterval: any = null;
    let appStateListener: any = null;
+   let visibilityHandler: (() => void) | null = null;
+   let unloadHandler: (() => void) | null = null;

    return {
        // ... in initialize():
-       document.addEventListener('visibilitychange', () => { ... });
+       visibilityHandler = () => {
+           if (document.hidden) {
+               untrackPresence(userId);
+           } else {
+               trackPresence(userId);
+           }
+       };
+       document.addEventListener('visibilitychange', visibilityHandler);

-       window.addEventListener('beforeunload', () => { ... });
+       unloadHandler = () => {
+           untrackPresence(userId);
+       };
+       window.addEventListener('beforeunload', unloadHandler);

        // ... in cleanup():
+       if (visibilityHandler) {
+           document.removeEventListener('visibilitychange', visibilityHandler);
+           visibilityHandler = null;
+       }
+       if (unloadHandler) {
+           window.removeEventListener('beforeunload', unloadHandler);
+           unloadHandler = null;
+       }
    };
});
```

### Step 2: Full codebase scan for other uncleaned listeners

Run these searches to find any other leaks:
```bash
# Find all addEventListener calls
grep -rn "addEventListener" src/ --include="*.ts" --include="*.tsx"

# Find all removeEventListener calls
grep -rn "removeEventListener" src/ --include="*.ts" --include="*.tsx"
```

For each `addEventListener`, verify a matching `removeEventListener` exists in the cleanup path. Common patterns to check:
- Components using `useEffect` — must have cleanup in the return function
- Service classes — must have cleanup in `destroy()` or `cleanup()` method
- Standalone scripts — acceptable if they run for the lifetime of the app

### Step 3: Check Supabase `onAuthStateChange` subscriptions

Any call to `supabase.auth.onAuthStateChange(...)` returns `{ data: { subscription } }`. The subscription must be stored and unsubscribed on cleanup:
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
// In cleanup:
subscription.unsubscribe();
```

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Chrome DevTools → Memory → Take Heap Snapshot | No growing `EventListener` count after navigating 10 pages |
| Sign out → sign in → sign out → sign in | No duplicate presence tracking (single heartbeat) |
| `npm run build` | Build succeeds |
| Navigate between 5 pages 3 times | Heap size stable (±5%) |

---

## ✅ Acceptance Criteria

- [ ] All `addEventListener` calls have matching `removeEventListener` in cleanup
- [ ] All event handler functions are stored as named references
- [ ] `presenceStore.ts` cleanup removes visibility and unload listeners
- [ ] Supabase auth subscriptions properly unsubscribed
- [ ] No memory growth detected in Chrome DevTools heap comparison
- [ ] Build passes

---

## ✅ Definition of Done

- [ ] Named references for all listeners
- [ ] Cleanup verified in memory profiler
- [ ] Build passes
