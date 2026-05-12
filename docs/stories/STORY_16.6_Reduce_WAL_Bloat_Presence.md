# STORY 16.6 — Reduce WAL Bloat: Single Presence Write per Interval, Upsert Pattern

**Epic:** [EPIC 16 — Messaging Speed & Realtime Optimization](../epics/EPIC_16_Messaging_Speed_Realtime_Optimization.md)  
**Status:** ✅ Complete
**Priority:** 🟠 High  
**Estimate:** 2 story points  
**Dependencies:** EPIC 14.1 (Presence Consolidation — ensures only `presenceStore` manages presence)  
**Audit Findings:** 5.3  

---

## 🎯 Goal

Reduce PostgreSQL WAL (Write-Ahead Log) bloat caused by frequent `UPDATE` writes to the `profiles` table for presence tracking. Currently, `presenceStore.ts` writes `is_online` and `last_active` to the `profiles` table on every heartbeat (120s), every visibility change, and every app state change. Each write generates WAL entries that bloat the database. This story reduces writes to a minimum and switches to an `ON CONFLICT ... DO UPDATE` (upsert) pattern to minimize WAL impact.

---

## 📍 Current State (What Exists)

### presenceStore.ts — DB writes on every presence event

[presenceStore.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/store/presenceStore.ts) — Two helper functions write to the `profiles` table:

**`trackPresence()` — Lines 87-105:**
```typescript
const trackPresence = async (uid: string) => {
    if (!channel) return;
    console.log('[PresenceStore] Sending heartbeat');
    await channel.track({
        user_id: uid,
        online_at: new Date().toISOString(),
        platform: Capacitor.getPlatform(),
    });

    // Update DB for persistence
    await supabase
        .from('profiles')
        .update({
            is_online: true,
            last_active: new Date().toISOString()
        })
        .eq('id', uid);
};
```

**`untrackPresence()` — Lines 107-120:**
```typescript
const untrackPresence = async (uid: string) => {
    if (!channel) return;
    console.log('[PresenceStore] Untracking');
    await channel.untrack();

    await supabase
        .from('profiles')
        .update({
            is_online: false,
            last_active: new Date().toISOString()
        })
        .eq('id', uid);
};
```

### When these functions are called

| Event | Function Called | Frequency |
|-------|---------------|-----------|
| Heartbeat tick | `trackPresence()` | Every 120 seconds |
| Tab becomes visible | `trackPresence()` | Every tab switch |
| Tab becomes hidden | `untrackPresence()` | Every tab switch |
| App becomes active (mobile) | `trackPresence()` | Every foreground |
| App goes background (mobile) | `untrackPresence()` | Every background |
| Browser unload | `untrackPresence()` | On close |

**For a user who actively switches tabs 10 times/hour, this produces:**
- 30 heartbeat writes/hour + 20 visibility writes/hour = **50 DB writes/hour per user**
- At 1,000 users: **50,000 DB writes/hour = 1.2M writes/day**

Each `UPDATE` generates WAL entries. On a 500MB free-tier database, this WAL bloat can fill up the disk.

### Supabase Presence already handles online/offline

The Supabase Presence system (via `channel.track()` / `channel.untrack()`) already manages online status perfectly. Other clients can check presence state via the presence sync events. The `profiles.is_online` column is redundant for real-time status — it's only useful for querying "who was last online" from the database.

---

## 🔧 Implementation Details

### Step 1: Remove `is_online` DB write from heartbeat

The heartbeat's purpose is to keep the Supabase Presence channel alive via `channel.track()`. There is **no reason** to also write `is_online: true` to the database every 120 seconds — the value is already `true` and hasn't changed.

**File:** [presenceStore.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/store/presenceStore.ts)

```diff
 const trackPresence = async (uid: string) => {
     if (!channel) return;
     console.log('[PresenceStore] Sending heartbeat');
     await channel.track({
         user_id: uid,
         online_at: new Date().toISOString(),
         platform: Capacitor.getPlatform(),
     });
-
-    // Update DB for persistence
-    await supabase
-        .from('profiles')
-        .update({
-            is_online: true,
-            last_active: new Date().toISOString()
-        })
-        .eq('id', uid);
 };
```

### Step 2: Write `is_online` only on state transitions (online ↔ offline)

Instead of writing on every heartbeat, write to the DB only when the user's state **actually changes**:

```typescript
let isCurrentlyOnline = false; // Track client-side state

const trackPresence = async (uid: string) => {
    if (!channel) return;
    await channel.track({
        user_id: uid,
        online_at: new Date().toISOString(),
        platform: Capacitor.getPlatform(),
    });

    // Only write to DB on transition from offline → online
    if (!isCurrentlyOnline) {
        isCurrentlyOnline = true;
        await supabase
            .from('profiles')
            .update({
                is_online: true,
                last_active: new Date().toISOString()
            })
            .eq('id', uid);
    }
};

const untrackPresence = async (uid: string) => {
    if (!channel) return;
    await channel.untrack();

    // Only write to DB on transition from online → offline
    if (isCurrentlyOnline) {
        isCurrentlyOnline = false;
        await supabase
            .from('profiles')
            .update({
                is_online: false,
                last_active: new Date().toISOString()
            })
            .eq('id', uid);
    }
};
```

**This reduces writes from ~50/hour to ~2-4/hour per user** (only on tab hide/show that triggers actual state transitions).

### Step 3: Debounce rapid visibility changes

Users who rapidly switch tabs (e.g., Alt-Tab) can trigger multiple visibility change events in quick succession. Add a debounce:

```typescript
let visibilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;

visibilityHandler = () => {
    if (visibilityDebounceTimer) clearTimeout(visibilityDebounceTimer);
    
    visibilityDebounceTimer = setTimeout(() => {
        if (document.hidden) {
            untrackPresence(userId);
        } else {
            trackPresence(userId);
        }
    }, 2000); // 2 second debounce — ignore rapid tab switches
};
```

This means if the user switches away and back within 2 seconds, **no DB write occurs at all**.

### Step 4: Update `last_active` only on meaningful actions

Instead of updating `last_active` on every heartbeat, update it only when the user performs a meaningful action:
- Sends a message
- Opens a conversation
- Interacts with the app (click/tap)

This can be deferred to a future story. For now, the state-transition-only approach (Step 2) already reduces writes by ~95%.

### Step 5: Clean up the `isCurrentlyOnline` flag on cleanup

```typescript
cleanup: async () => {
    // ... existing cleanup code ...
    isCurrentlyOnline = false;
    if (visibilityDebounceTimer) clearTimeout(visibilityDebounceTimer);
    // ... rest of cleanup ...
}
```

---

## 🧪 Verification

### Console Log Monitoring
1. Log in and keep the browser tab active for 10 minutes
2. **Before fix:** Console shows `[PresenceStore] Sending heartbeat` every 120s AND a DB write each time
3. **After fix:** Console shows heartbeat logs, but no DB write unless state transitions

### Supabase Dashboard — Query Monitoring
1. Open Supabase Dashboard → Database → Query Performance
2. Filter for `UPDATE ... profiles ... is_online`
3. **Before fix:** ~30 writes per hour per user
4. **After fix:** ~2-4 writes per hour per user

### Tab Switching Test
1. Switch tabs rapidly (5 times in 3 seconds)
2. **Before fix:** 10 DB writes (5 track + 5 untrack)
3. **After fix:** 0 DB writes (debounce absorbs all rapid changes)
4. Wait 3 seconds → 1 DB write (final state resolves)

### Functional Tests
1. User goes online → presence indicator shows for friends (via Supabase Presence, not DB)
2. User goes offline → presence indicator hides
3. Query `profiles.is_online` after user logs out → should be `false`
4. Query `profiles.last_active` → should reflect the last state transition time

---

## ✅ Acceptance Criteria

- [x] `is_online` DB write removed from heartbeat `trackPresence()` — only `channel.track()` remains
- [x] DB writes only occur on online↔offline state transitions
- [x] Visibility change handler is debounced (2s) to prevent rapid writes
- [x] `isCurrentlyOnline` flag prevents duplicate writes
- [x] Presence indicators for friends still work correctly (via Supabase Presence channel, not DB polling)
- [x] `profiles.is_online` correctly reflects user's final state (true when online, false when offline)
- [x] WAL writes reduced by ≥90% (from ~50/hour to ~2-4/hour per user)
- [x] Cleanup properly resets `isCurrentlyOnline` and clears debounce timer

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [presenceStore.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/store/presenceStore.ts) | MODIFY — remove DB write from heartbeat, add state-transition tracking, debounce visibility handler |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `profiles.is_online` becomes stale if user's browser crashes | The heartbeat `channel.track()` handles this — if the user disconnects, the Presence channel times out and other users see them offline. The `is_online` DB column is a secondary indicator; friends use real-time presence first. |
| Other code reads `profiles.is_online` from DB | Search for all reads of `is_online`: these should use the Supabase Presence system instead. If any fallback reads exist, they'll see slightly delayed state (2s debounce), which is acceptable. |
| EPIC 14.1 dependency (presence consolidation) | EPIC 14.1 ensures only `presenceStore` manages presence. If there are other presence writers, they must be removed first. Check that `presenceService.ts` (if it exists) is no longer used. |

---

## 📊 Write Reduction Estimate

| Metric | Before | After |
|--------|--------|-------|
| Heartbeat writes/hour | 30 | 0 |
| Visibility change writes/hour | 20 | 2-4 (debounced, transition-only) |
| Total writes/hour per user | 50 | 2-4 |
| Total writes/day (1K users) | 1,200,000 | 48,000-96,000 |
| **WAL reduction** | — | **~95%** |
