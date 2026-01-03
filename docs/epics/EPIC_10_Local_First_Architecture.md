# 🚀 EPIC 10: Local-First Architecture (The "LinkedIn Feel")

**Epic Owner:** Frontend Engineering
**Dependencies:** Epic 8.4 (Offline Support), Epic 7.4 (Push Notifications)
**Timeline:** TBD
**Status:** 📝 **PLANNING**

---

## 🎯 **Epic Goal**

Transform the application from a "connected client" to a true **Local-First** application. The goal is to achieve **zero-latency navigation** and the "illusion of instantness" similar to LinkedIn or Instagram.

**Core Philosophy:**
> "The UI never waits for the network. It shows local data immediately, and syncs in the background."

---

## 🏗 **Architecture Blueprint**

### 1. Storage Engine Upgrade (The bottleneck fix)
*   **Current:** `localStorage` (Synchronous, 5MB limit). Blocks UI, limited capacity.
*   **New:** `IndexedDB` (via `idb-keyval` / `tanstack-query-async-storage-persister`).
*   **Benefit:** 
    *   Asynchronous (UI never freezes).
    *   Large capacity (>1GB). 
    *   Can store full feed history, high-res images, and thousands of messages.

### 2. "Invisible" Background Sync
*   **Current:** App fetches data when opened (`AppDataPrefetcher`).
*   **New:** App wakes up silently via **Data-Only Push Notifications** to fetch data *before* the user opens it.
*   **Benefit:** Content is already there when the user taps the icon.

### 3. Aggressive Prefetching
*   **Strategy:** Predict user actions.
    *   Viewing Feed? -> Prefetch top 5 comments.
    *   Viewing list of chats? -> Prefetch last 10 messages of top 3 active chats.
    *   Idle? -> Revalidate stale queries.

---

## ✅ **Success Criteria**

| Metric | Target |
| :--- | :--- |
| **App Launch to Interactive** | < 100ms (Warm Start) |
| **Navigation Latency** | 0ms (Instant swap) |
| **Offline Storage Capacity** | > 500MB |
| **Background Sync Success** | > 80% of pushes trigger sync |

---

## 📋 **Stories**

### **Story 10.1: Async Storage Migration**
**Goal:** Migrate TanStack Query persister from `localStorage` to `IndexedDB`.
**Tasks:**
*   Install `idb-keyval` and `@tanstack/query-async-storage-persister`.
*   Replace `createSyncStoragePersister` with `createAsyncStoragePersister` in `App.tsx`.
*   Implement migration logic (clear old localStorage cache on first run).
*   Verify no UI blocking on large datasets.

### **Story 10.2: Background Data Sync**
**Goal:** Wake app invisibly to fetch fresh data.
**Tasks:**
*   Backend: Send "silent" push notifications (data-only, no alert) on new activity.
*   Mobile: Implement `Capacitor Background Runner` or `PushNotification` listener for data payloads.
*   Trigger `queryClient.prefetchQuery` in background handler.

### **Story 10.3: Aggressive Prefetching Logic**
**Goal:** Pre-load likely next screens.
**Tasks:**
*   Update `AppDataPrefetcher` to be smarter (prioritize active chats).
*   Add hover/touch-start prefetching for navigation links.

---

## 🛠 **Tech Stack Additions**

*   `idb-keyval`: Lightweight Promise-based IndexedDB wrapper.
*   `@tanstack/query-async-storage-persister`: Official async persister.
