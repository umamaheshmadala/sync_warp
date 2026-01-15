# 📝 STORY 10.2.1: Async Storage Migration

**Story Owner:** Frontend Engineering
**Epic:** [Epic 10.2: Local-First Architecture](../epics/EPIC_10.2_Local_First_Architecture.md)
**Status:** 📝 **PLANNING**
**Priority:** High

---

## 🎯 **Goal**

Replace the current **Synchronous `localStorage` Persister** for TanStack Query with an **Asynchronous `IndexedDB` Persister**.

**Why?**
1.  **Performance:** `localStorage` is synchronous and blocks the main thread. Reading large JSON blobs freezes the UI.
2.  **Capacity:** `localStorage` is limited to ~5MB. `IndexedDB` allows storing hundreds of megabytes (GBs), essential for "infinite" message history.
3.  **Reliability:** Large writes to `localStorage` can fail silently or crash the tab if quotas are exceeded.

---

## 📋 **Implementation Tasks**

### 1. **Install Dependencies**
- [ ] Install `idb-keyval` (Lightweight IndexedDB wrapper).
- [ ] Install `@tanstack/query-async-storage-persister`.

### 2. **Create Async Storage Utility**
- [ ] Create `src/lib/asyncStorage.ts`.
- [ ] Implement `getItem`, `setItem`, `removeItem` using `idb-keyval`.
- [ ] Ensure it matches the `AsyncStorage` interface expected by the persister.

### 3. **Update Query Client Configuration (`App.tsx`)**
- [ ] Replace `createSyncStoragePersister` with `createAsyncStoragePersister`.
- [ ] Pass the new `asyncStorage` utility.
- [ ] Update `PersistQueryClientProvider` props (if needed).

### 4. **Migration Logic (Important)**
- [ ] On app launch, check if `localStorage` has the old query cache key.
- [ ] If found:
    1.  Read it.
    2.  Write it to `IndexedDB`.
    3.  Delete it from `localStorage`.
- [ ] This ensures users don't lose their cached data (like login state/profile) during the update.

### 5. **Verification**
- [ ] **Capacity Test:** Try caching >10MB of dummy data. (Should succeed vs fail on old).
- [ ] **Performance Test:** Measure "Time to Interactive" with a large cache.
- [ ] **Offline Test:** Ensure app still loads data offline.

---

## 🧪 **Testing Strategy**

*   **Manual:** Load the app, disconnect network, reload. Verify data appears.
*   **DevTools:** Check Application -> Storage -> IndexedDB -> `reactQuery` (or similar key).
*   **DevTools:** Check Application -> Local Storage (should be empty of query cache).

---

## 🛑 **Risks & Mitigations**

*   **Risk:** Race condition during migration (user closes tab).
    *   *Mitigation:* Keep localStorage copy until IndexedDB write is confirmed success.
*   **Risk:** `idb-keyval` behavior on very old browsers.
    *   *Mitigation:* It has excellent support, but we can fallback to localStorage if needed (unlikely for our target).

---

## 🧠 **MCP Commands**

```bash
# Install packages
npm install idb-keyval @tanstack/query-async-storage-persister

# Create utility
warp mcp run write_to_file src/lib/asyncStorage.ts
```
