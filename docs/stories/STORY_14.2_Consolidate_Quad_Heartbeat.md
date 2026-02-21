# STORY 14.2 — Consolidate Quad Heartbeat → Single 120s Heartbeat

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 2 points  
**Dependencies:** Story 14.1 (triple presence must be consolidated first)  
**Audit Finding:** 4.2 — Quad heartbeat (8 network ops/min)

---

## 🎯 User Story

> As a mobile user, I want heartbeat frequency to be reduced so that battery and data usage are minimized without losing online status accuracy.

---

## 📍 Problem

After Story 14.1 removes two of the three presence systems, there remain **two** independent heartbeats:

| # | System | File | Interval | Network Ops |
|---|--------|------|----------|-------------|
| 1 | `presenceStore.ts` | `src/store/presenceStore.ts` line 121 | 30s | `channel.track()` + DB `profiles.update` = 2 ops per beat |
| 2 | `networkService.ts` | `src/services/networkService.ts` line 131 | 30s | `fetch(supabase health endpoint)` = 1 op per beat |
| | **Total @ 30s** | | | **6 ops/min** |

**Target:** 1 heartbeat at 120s → **~1 op/min**. Also skip heartbeat entirely when the mobile app is in the background.

---

## 🔍 Codebase Research — Current State

### `presenceStore.ts` heartbeat (line 121)
```typescript
// Heartbeat (30s)
heartbeatInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
        trackPresence(userId);
    }
}, 30000);
```
- Already checks `document.visibilityState` — only beats when tab is visible ✅
- `trackPresence()` does: `channel.track({...})` + `supabase.from('profiles').update({is_online, last_active})`
- This is the **presence heartbeat** — keeps the user's green dot alive

### `networkService.ts` heartbeat (line 131)
```typescript
this.heartbeatInterval = setInterval(async () => {
    if (!navigator.onLine) return;
    const isConnected = await this.verifyConnectivity();
    // ... handles failure counting and fallback
}, this.HEARTBEAT_INTERVAL); // HEARTBEAT_INTERVAL = 30000
```
- **Purpose:** Verifies actual internet connectivity (Slack-style pattern)
- `verifyConnectivity()` pings the Supabase health endpoint with a 5s timeout
- Tracks `consecutiveFailures` and notifies subscribers when connectivity changes
- This is the **network verification heartbeat** — a completely different concern from presence

---

## ✅ Implementation Plan

### Step 1: Increase `presenceStore` heartbeat to 120s
In `src/store/presenceStore.ts`, change line 121:
```diff
-            heartbeatInterval = setInterval(() => {
-                if (document.visibilityState === 'visible') {
-                    trackPresence(userId);
-                }
-            }, 30000);
+            heartbeatInterval = setInterval(() => {
+                if (document.visibilityState === 'visible') {
+                    trackPresence(userId);
+                }
+            }, 120000); // 120 seconds — approved cadence
```

### Step 2: Increase `networkService` heartbeat to 120s
In `src/services/networkService.ts`, change the `HEARTBEAT_INTERVAL` constant:
```diff
Search for: private HEARTBEAT_INTERVAL (or readonly HEARTBEAT_INTERVAL)

-  private readonly HEARTBEAT_INTERVAL = 30000
+  private readonly HEARTBEAT_INTERVAL = 120000 // 120 seconds
```
Also update the log line on line 155:
```diff
-    console.log('[NetworkService] Heartbeat started (30s interval)')
+    console.log('[NetworkService] Heartbeat started (120s interval)')
```

### Step 3: Skip presence heartbeat when mobile app is backgrounded
The `presenceStore.ts` already handles mobile `appStateChange` (lines 139–147), calling `untrackPresence` when the app goes to the background. However, the `setInterval` keeps firing even though the callback has the `visibilityState` check.

For native mobile, we should also **pause** the interval when the app enters background. Modify the mobile listener in `presenceStore.ts`:

```typescript
if (Capacitor.isNativePlatform()) {
    appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
            trackPresence(userId);
            // Resume heartbeat
            if (!heartbeatInterval) {
                heartbeatInterval = setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        trackPresence(userId);
                    }
                }, 120000);
            }
        } else {
            untrackPresence(userId);
            // Pause heartbeat in background
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
        }
    });
}
```

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Browser Network tab (2.5 min observation) | ≤2 heartbeat calls (1 presence, 1 network) |
| Supabase logs → `profiles` table | ≤1 update per 2 minutes |
| Online dot on friends list | Still appears/disappears correctly |
| Mobile: put app in background for 5 min | Zero heartbeat network calls during background |
| Mobile: return to foreground | Presence re-tracked immediately |
| `npm run build` | Build succeeds |

---

## ✅ Acceptance Criteria

- [ ] `presenceStore.ts` heartbeat interval changed from 30s to 120s
- [ ] `networkService.ts` heartbeat interval changed from 30s to 120s
- [ ] Mobile app pauses heartbeat entirely when backgrounded
- [ ] Mobile app resumes heartbeat immediately on foreground
- [ ] Network ops reduced from ~8/min to ~1/min
- [ ] Online status indicators still function correctly
- [ ] Build passes with zero errors

---

## ✅ Definition of Done

- [ ] Both intervals set to 120000ms
- [ ] Mobile background pausing implemented
- [ ] Network tab confirms ≤1 op/min
- [ ] Manual test on mobile device
