# 🚀 EPIC 10: Local-First Architecture (The "LinkedIn Feel")

**Epic Owner:** Frontend Engineering
**Dependencies:** Epic 8.4 (Offline Support), Epic 7.4 (Push Notifications)
**Timeline:** TBD
**Status:** 🚧 **IN PROGRESS**

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

### 4. Image CDN Optimization (✅ COMPLETE)
*   **Problem:** Supabase Image Transformations require Pro tier ($25/mo). On free tier, large images (5-10MB) caused severe UI slowdowns.
*   **Solution:** Use a **Dedicated Image CDN Proxy** (`wsrv.nl`) as a zero-cost, zero-setup alternative.
*   **Benefit:**
    *   On-the-fly **resizing** (300-400px thumbnails).
    *   Automatic **WebP conversion** (~40% smaller files).
    *   Global **CDN caching** (via Cloudflare edge network).
    *   **Blur placeholder** effect for smooth perceived loading.

---

## ✅ **Success Criteria**

| Metric | Target | Status |
| :--- | :--- | :--- |
| **App Launch to Interactive** | < 100ms (Warm Start) | 🔲 |
| **Navigation Latency** | 0ms (Instant swap) | 🔲 |
| **Offline Storage Capacity** | > 500MB | 🔲 |
| **Background Sync Success** | > 80% of pushes trigger sync | 🔲 |
| **Image Payload Size** | < 50KB per thumbnail | ✅ Complete |

---

## 📋 **Stories**

### **Story 10.1: Async Storage Migration** `📝 PLANNING`
**Goal:** Migrate TanStack Query persister from `localStorage` to `IndexedDB`.
**Tasks:**
*   Install `idb-keyval` and `@tanstack/query-async-storage-persister`.
*   Replace `createSyncStoragePersister` with `createAsyncStoragePersister` in `App.tsx`.
*   Implement migration logic (clear old localStorage cache on first run).
*   Verify no UI blocking on large datasets.

### **Story 10.2: Background Data Sync** `📝 PLANNING`
**Goal:** Wake app invisibly to fetch fresh data.
**Tasks:**
*   Backend: Send "silent" push notifications (data-only, no alert) on new activity.
*   Mobile: Implement `Capacitor Background Runner` or `PushNotification` listener for data payloads.
*   Trigger `queryClient.prefetchQuery` in background handler.

### **Story 10.3: Aggressive Prefetching Logic** `📝 PLANNING`
**Goal:** Pre-load likely next screens.
**Tasks:**
*   Update `AppDataPrefetcher` to be smarter (prioritize active chats).
*   Add hover/touch-start prefetching for navigation links.

### **Story 10.4: Image CDN Optimization** `✅ COMPLETE`
**Goal:** Achieve Pro-tier image optimization on Free tier using a dedicated image CDN proxy.
**Implementation:** Use `wsrv.nl` as a proxy to resize, convert to WebP, and cache Supabase images globally.
**Files Modified:**
*   `src/utils/imageUtils.ts` - Core proxy logic.
*   `src/components/products/ProductCard.tsx` - Blur placeholder UI.
*   `src/components/business/ProductCard.tsx` - Blur placeholder UI.
**Completion Date:** 2026-01-06
**See:** [STORY_10.4_Image_CDN_Optimization.md](../stories/STORY_10.4_Image_CDN_Optimization.md)

---

## 🛠 **Tech Stack Additions**

*   `idb-keyval`: Lightweight Promise-based IndexedDB wrapper.
*   `@tanstack/query-async-storage-persister`: Official async persister.
*   `wsrv.nl`: Open-source image CDN/proxy (powered by Cloudflare).

