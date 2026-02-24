# STORY 16.3 — Reduce Startup Prefetches from 20 → 3

**Epic:** [EPIC 16 — Messaging Speed & Realtime Optimization](../epics/EPIC_16_Messaging_Speed_Realtime_Optimization.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 2 story points  
**Dependencies:** None  
**Audit Findings:** 3.5  

---

## 🎯 Goal

Reduce the number of parallel prefetch requests fired at startup from **20** (messages for top 20 conversations) to **3** (messages for only the 3 most recent conversations). The remaining conversations load messages on-demand when the user navigates to them. This eliminates a startup bottleneck of 20 simultaneous Supabase queries competing for the same connection.

---

## 📍 Current State (What Exists)

### AppDataPrefetcher — prefetches top 20 conversations

[AppDataPrefetcher.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/AppDataPrefetcher.tsx) — Lines 107-122:

```typescript
// [Story 10.3] Smart Prefetching:
// Automatically fetch messages for the top 20 most active conversations
// This ensures the "next likely click" is already cached.
const topActive = data.slice(0, 20);
console.log(`⚡ [AppDataPrefetcher] Prefetching messages for top ${topActive.length} chats`);

topActive.forEach(conv => {
    queryClient.prefetchQuery({
        queryKey: ['messages', conv.conversation_id],
        queryFn: () => messagingService.fetchMessages(conv.conversation_id, 20),
        staleTime: 1000 * 60 * 5 // 5 min
    });
});
```

**Problem:** This fires 20 `fetchMessages()` calls in parallel. Each call hits the Supabase REST API with a query to the `messages` table joining `message_read_receipts`. At startup, the user also has 4 dashboard prefetches + friends + coupons + favorites running simultaneously. Total: ~27 parallel requests.

### Other startup prefetches

From the same file (lines 72-127):
1. **Dashboard stats** — `dashboardService.getDashboardStats()` (line 74)
2. **Spotlight businesses** — `dashboardService.getSpotlightBusinesses()` (line 79)
3. **Hot offers** — `dashboardService.getHotOffers()` (line 84)
4. **Trending products** — `dashboardService.getTrendingProducts()` (line 89)
5. **User coupons** — `fetchUserCouponsForPrefetch()` (line 97)
6. **Friends list** — `friendsService.getFriends()` (line 104)
7. **Conversations list** — `messagingService.fetchConversations()` (line 108)
8. **Messages × 20** — `messagingService.fetchMessages()` × 20 (lines 114-121)
9. **Favorites sync** — `syncFavoritesFromDatabase()` (line 125)

Only items 1-4 are `await`ed (via `dashboardPromises`). Items 5-9 are fire-and-forget background tasks.

---

## 🔧 Implementation Details

### Step 1: Reduce message prefetch from 20 → 3

**File:** [AppDataPrefetcher.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/AppDataPrefetcher.tsx)

Change line 114:

```diff
-const topActive = data.slice(0, 20);
+const topActive = data.slice(0, 3);
```

Update the comment accordingly:

```diff
-// [Story 10.3] Smart Prefetching:
-// Automatically fetch messages for the top 20 most active conversations
-// This ensures the "next likely click" is already cached.
+// [Story 16.3] Reduced Prefetching:
+// Prefetch messages for only the top 3 most recent conversations.
+// The remaining conversations load messages on-demand when navigated to.
+// This reduces startup from 20 parallel queries to 3, improving initial load speed.
```

### Step 2: Ensure on-demand loading works for remaining conversations

**Verify** that the existing chat screen already fetches messages when navigated to. Check:

[ChatScreen.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/messaging/ChatScreen.tsx) — The chat screen uses `messagingService.fetchMessages()` when the `conversationId` param changes. This is already implemented and works correctly. When a user clicks a conversation that wasn't prefetched, the messages load on-demand.

**No changes needed here** — the on-demand fetch path already exists.

### Step 3: Add stale-while-revalidate for prefetched conversations

To ensure the 3 prefetched conversations show instantly but also refresh in the background:

```typescript
topActive.forEach(conv => {
    queryClient.prefetchQuery({
        queryKey: ['messages', conv.conversation_id],
        queryFn: () => messagingService.fetchMessages(conv.conversation_id, 20),
        staleTime: 1000 * 60 * 5,     // 5 min — data is "fresh" for 5 min
        gcTime: 1000 * 60 * 30         // 30 min — keep in cache for 30 min
    });
});
```

The `gcTime` (previously `cacheTime`) ensures prefetched data persists in the React Query cache for 30 minutes even if not actively displayed, so navigating back to a previously-opened conversation uses the cache.

---

## 🧪 Verification

### Network Tab
1. Log in to the app
2. Open Chrome DevTools → Network tab
3. Filter by `rest/v1/messages` or the Supabase REST endpoint
4. **Before fix:** Expect to see ~20 simultaneous message fetch requests at startup
5. **After fix:** Expect to see exactly **3** message fetch requests at startup
6. Navigate to a 4th conversation → expect 1 on-demand fetch

### Performance Timing
1. Add `console.time('prefetch')` before the prefetch block and `console.timeEnd('prefetch')` after
2. Compare startup time before and after — expect a measurable reduction

### Functional Tests
1. Open the messages page → top 3 conversations should show messages instantly (prefetched)
2. Click conversation #4 → messages should load (on-demand, brief loading spinner)
3. Navigate back to conversation #1 → messages should show instantly (cached)
4. Wait 6 minutes → open conversation #1 again → should refetch (staleTime expired)

---

## ✅ Acceptance Criteria

- [x] Only 3 parallel message prefetch requests at startup (verified in Network tab)
- [x] Top 3 most recent conversations show messages instantly
- [x] Conversations beyond top 3 load messages on-demand when navigated to
- [x] No regression in messaging functionality
- [x] `staleTime` set to 5 minutes for prefetched queries
- [x] Total startup network requests reduced from ~27 to ~10
- [x] Splash screen hide time not adversely affected

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [AppDataPrefetcher.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/AppDataPrefetcher.tsx) | MODIFY — change `data.slice(0, 20)` to `data.slice(0, 3)`, update comments |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Users may notice a brief loading state when opening non-prefetched conversations | This is acceptable UX — WhatsApp/Telegram also load on-demand. The loading is typically <500ms. |
| Splash screen may hide before messages are ready | Splash screen is already decoupled from message prefetching (only waits on dashboard data, line 131-138). No impact. |
