# STORY 14.6 — Remove `presenceService` Auto-Start on Import

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** ✅ COMPLETE
**Priority:** 🔴 Critical  
**Estimate:** 1 point  
**Dependencies:** Story 14.1 (this is part of the same cleanup)  
**Audit Finding:** 4.6 — `presenceService` auto-starts on import

---

## 🎯 User Story

> As a developer, I want modules to have zero side effects on import so that dead code can be safely tree-shaken and services only run when explicitly activated.

---

## 📍 Problem

`presenceService.ts` has a module-level side effect (lines 236–245):
```typescript
// Auto-start presence tracking when user is authenticated
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      presenceService.startTracking();
    } else if (event === 'SIGNED_OUT') {
      presenceService.stopTracking();
    }
  });
}
```

This means **any file that imports anything from `presenceService.ts`** will trigger this code at module evaluation time, even if the import is unused. It also creates an auth state listener that is never cleaned up.

---

## ✅ Resolution

**This story is automatically completed by Story 14.1.** When `presenceService.ts` is deleted entirely, the auto-start side effect is removed with it.

The approved single presence system (`presenceStore.ts`) initializes explicitly via `initialize(userId)`, which must be called from the auth handler in `App.tsx` or `AuthProvider.tsx`. This is the correct pattern — no side effects on import.

### Verification
After Story 14.1:
```bash
grep -rn "presenceService" src/ → 0 results
```
No auto-start code remains in the codebase.

---

## ✅ Acceptance Criteria

- [x] `presenceService.ts` is deleted (handled by Story 14.1)
- [x] No module-level side effects remain in any presence-related file
- [x] `presenceStore.initialize()` is called explicitly on sign-in
- [x] `presenceStore.cleanup()` is called explicitly on sign-out

---

## ✅ Definition of Done

- [x] Completed as part of Story 14.1
