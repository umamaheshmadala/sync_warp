# STORY 14.1 — Consolidate Triple Presence → Single `presenceStore`

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 3 points  
**Dependencies:** None (first story, no blockers)  
**Audit Finding:** 4.1 — Triple presence system (6 DB writes/min)

---

## 🎯 User Story

> As a mobile user, I want presence tracking to use minimal battery and data so that the app doesn't drain my phone while running in the background.

---

## 📍 Problem

Three separate systems all independently track the same online/presence status, tripling the DB writes and network calls:

| # | System | File | Heartbeat | DB Writes/min |
|---|--------|------|-----------|---------------|
| 1 | `presenceService.ts` | `src/services/presenceService.ts` | 30s `setInterval` → `profiles.last_active` | 2 |
| 2 | `presenceStore.ts` | `src/store/presenceStore.ts` | 30s `setInterval` → channel.track() + `profiles.is_online` + `profiles.last_active` | 2 |
| 3 | `useUpdateOnlineStatus.ts` | `src/hooks/useUpdateOnlineStatus.ts` | 30s `setInterval` → `profiles.last_active` | 2 |
| | **Total** | | | **6** |

All three do the exact same thing: `supabase.from('profiles').update({ is_online, last_active })`.

---

## 🔍 Codebase Research — Current State

### 1. `presenceService.ts` (246 lines)
- **Location:** `src/services/presenceService.ts`
- **Pattern:** Singleton class, exported as `presenceService`
- **Heartbeat:** `setInterval(() => this.updateLastActive(), 30000)` (line 38)
- **Auto-start on import:** Lines 236–245 register `onAuthStateChange` at module scope, calling `presenceService.startTracking()` when `SIGNED_IN` fires. This means **any file that imports presenceService.ts triggers side effects**.
- **Visibility handling:** `document.addEventListener('visibilitychange', ...)` — updates `is_online` on tab switch
- **Unload handling:** `window.addEventListener('beforeunload', ...)` — uses `navigator.sendBeacon` (line 64)
- **Consumers:** Grep for `presenceService` reveals **1 import** in the codebase (only from `presenceService.ts` itself via the auto-start block)

### 2. `presenceStore.ts` (170 lines) — THE KEEPER ✅
- **Location:** `src/store/presenceStore.ts`
- **Pattern:** Zustand store with `create<PresenceState>`
- **Features that the other two don't have:**
  - Uses Supabase **Realtime Presence channel** (`supabase.channel('online-users')`) for real-time friend online status
  - Tracks `onlineUsers: Map<string, string>` — used by UI components to show online dots
  - Handles `presence.sync`, `presence.join`, `presence.leave` events
  - Has proper **Capacitor mobile app state** handling via `App.addListener('appStateChange')`
  - Has `cleanup()` method that clears all resources
- **Heartbeat:** `setInterval(() => trackPresence(userId), 30000)` (line 121)
- **DB writes in trackPresence:** `channel.track({...})` + `supabase.from('profiles').update({is_online, last_active})` (lines 93-101)
- **Consumers:** Multiple components import `usePresenceStore` to read `onlineUsers`

### 3. `useUpdateOnlineStatus.ts` (95 lines)
- **Location:** `src/hooks/useUpdateOnlineStatus.ts`
- **Pattern:** React hook with `useEffect`
- **Heartbeat:** `setInterval(async () => { supabase.from('profiles').update({last_active}) }, 30000)` (line 77)
- **Visibility handling:** `document.addEventListener('visibilitychange', ...)` (line 73)
- **Unload handling:** `window.addEventListener('beforeunload', ...)` (line 74)
- **Cleanup:** Returns cleanup function that removes listeners + clears interval (lines 85-92)
- **Consumers:** Grep shows this hook is called in the main app layout

---

## ✅ Implementation Plan

### Step 1: Delete `presenceService.ts`
`presenceStore.ts` is the most feature-complete and is the approved keeper. Delete the entire file:
```
DELETE: src/services/presenceService.ts
```

**Why it's safe:** The only place `presenceService` is imported is inside its own auto-start block. No other file calls `presenceService.startTracking()`. The auto-start at module scope is itself a problem (Finding 4.6, handled in Story 14.6).

### Step 2: Delete `useUpdateOnlineStatus.ts`
```
DELETE: src/hooks/useUpdateOnlineStatus.ts
```

Remove the import and call from whatever component calls `useUpdateOnlineStatus()`. Expected location: `AppLayout.tsx` or `App.tsx`. Search for:
```typescript
import { useUpdateOnlineStatus } from '../hooks/useUpdateOnlineStatus';
// ...
useUpdateOnlineStatus();
```
Delete both lines.

### Step 3: Verify `presenceStore.ts` is initialized on sign-in
The store's `initialize(userId)` should be called when the user signs in. Check `App.tsx` or `AuthProvider.tsx` for:
```typescript
const { initialize } = usePresenceStore();
```
If not present, add it in the auth handler where `SIGNED_IN` is processed. Ensure `cleanup()` is called on sign-out.

### Step 4: Verify no orphan references
Run these searches to confirm clean deletion:
```
grep -r "presenceService" src/ → Should return 0 results
grep -r "useUpdateOnlineStatus" src/ → Should return 0 results
```

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| `grep -r "presenceService" src/` | 0 results |
| `grep -r "useUpdateOnlineStatus" src/` | 0 results |
| `npm run build` | Build succeeds with 0 errors |
| Browser Network tab → filter `profiles` | Only 1 system making heartbeat calls (from `presenceStore`) |
| Supabase logs → `profiles` table updates | ≤2 writes/min (down from 6) |
| Online status dot visible on friends | Still works (presenceStore handles this) |
| App background → foreground on mobile | Presence re-tracks correctly via `appStateChange` |

---

## ✅ Acceptance Criteria

- [x] `presenceService.ts` is deleted
- [x] `useUpdateOnlineStatus.ts` is deleted
- [x] All imports referencing these files are removed
- [x] `presenceStore.ts` is the single presence system
- [x] DB writes to `profiles` table reduced from 6/min to ≤2/min
- [x] Online status indicators still function correctly in UI
- [x] Build passes with zero errors
- [x] Mobile app state transitions (background/foreground) handled correctly

---

## ✅ Definition of Done

- [ ] Two files deleted, zero dangling imports
- [ ] Single presence system confirmed via network tab
- [ ] Build passes
- [ ] Manual test: online dot appears/disappears correctly
