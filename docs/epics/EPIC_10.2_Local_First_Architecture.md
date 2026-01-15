# 🚀 EPIC 10.2: Local-First Architecture (The "LinkedIn Feel")

**Epic Owner:** Frontend Engineering
**Dependencies:** Epic 8.4 (Offline Support), Epic 7.4 (Push Notifications)
**Timeline:** TBD
**Status:** ✅ **COMPLETE**

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
| **App Launch to Interactive** | < 100ms (Warm Start) | ✅ Complete |
| **Navigation Latency** | 0ms (Instant swap) | ✅ Complete |
| **Offline Storage Capacity** | > 500MB | ✅ Complete |
| **Background Sync Success** | > 80% of pushes trigger sync | ✅ Complete |
| **Image Payload Size** | < 50KB per thumbnail | ✅ Complete |

---

## 📋 **Stories**

### **Story 10.2.1: Async Storage Migration** `✅ COMPLETE`
**Goal:** Migrate TanStack Query persister from `localStorage` to `IndexedDB`.
**Implementation:**
*   Installed `idb-keyval` and `@tanstack/query-async-storage-persister`.
*   Created `src/lib/asyncStorage.ts` with IndexedDB wrapper.
*   Updated `App.tsx` to use `createAsyncStoragePersister`.
*   Migration logic from localStorage to IndexedDB implemented.
**See:** [STORY_10.2.1_Async_Storage_Migration.md](../stories/STORY_10.2.1_Async_Storage_Migration.md)

### **Story 10.2.2: Background Data Sync** `✅ COMPLETE`
**Goal:** Wake app invisibly to fetch fresh data.
**Implementation:**
*   `useNotificationHandler.ts` triggers `queryClient.prefetchQuery` on push receipt.
*   Messages prefetched for conversation on notification.
*   Silent background sync working on iOS/Android.
**See:** [STORY_10.2.2_Background_Data_Sync.md](../stories/STORY_10.2.2_Background_Data_Sync.md)

### **Story 10.2.3: Aggressive Prefetching Logic** `✅ COMPLETE`
**Goal:** Pre-load likely next screens.
**Implementation:**
*   `AppDataPrefetcher.tsx` prefetches dashboard, businesses, coupons, favorites.
*   Smart prefetching: top 3 active chats messages prefetched.
*   Splash screen hidden after critical data loaded.
**See:** [STORY_10.2.3_Aggressive_Prefetching.md](../stories/STORY_10.2.3_Aggressive_Prefetching.md)

### **Story 10.2.4: Image CDN Optimization** `✅ COMPLETE`
**Goal:** Achieve Pro-tier image optimization on Free tier using a dedicated image CDN proxy.
**Implementation:** Use `wsrv.nl` as a proxy to resize, convert to WebP, and cache Supabase images globally.
**Files Modified:**
*   `src/utils/imageUtils.ts` - Core proxy logic.
*   `src/components/products/ProductCard.tsx` - Blur placeholder UI.
*   `src/components/business/ProductCard.tsx` - Blur placeholder UI.
**Completion Date:** 2026-01-06
**See:** [STORY_10.2.4_Image_CDN_Optimization.md](../stories/STORY_10.2.4_Image_CDN_Optimization.md)

---

## 🛠 **Tech Stack Additions**

*   `idb-keyval`: Lightweight Promise-based IndexedDB wrapper.
*   `@tanstack/query-async-storage-persister`: Official async persister.
*   `wsrv.nl`: Open-source image CDN/proxy (powered by Cloudflare).

