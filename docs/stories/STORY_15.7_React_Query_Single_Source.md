# STORY 15.7 — Migrate Server-State from Zustand → React Query Single Source

**EPIC:** [EPIC 15 — Rendering Performance & State Management](../epics/EPIC_15_Rendering_Performance_State_Management.md)  
**Status:** ✅ Complete  
**Priority:** 🟠 High  
**Estimate:** 5 points  
**Dependencies:** Stories 15.1, 15.2, 15.4 (all selectors and Map→Record must be complete)  
**Audit Finding:** 5.9 — Dual data source (React Query + Zustand) for server state

---

## 🎯 User Story

> As a developer, I want a single source of truth for all server-fetched data so that I don't have to worry about stale data, cache invalidation conflicts, or duplicated fetch logic between Zustand and React Query.

---

## 📍 Problem

The app currently has **two** independent systems managing server data:
1. **React Query** — `@tanstack/react-query` with `useQuery`/`useMutation` hooks throughout
2. **Zustand stores** — `useAuthStore`, `useMessagingStore`, and possibly others caching server data

This creates several issues:
- **Stale data:** Zustand copy diverges from React Query cache when one updates but not the other
- **Double fetching:** Both systems may independently fetch the same data
- **Confusion:** Developers don't know which source to trust
- **Cache invalidation:** `queryClient.invalidateQueries()` doesn't update Zustand, so the UI may show stale Zustand data

---

## 🔍 Codebase Research — What Should Stay in Zustand vs. Move to React Query

### Zustand Should Keep (Local/UI State Only)
These are truly client-side, not fetched from the server:

| Store | Field | Reason |
|-------|-------|--------|
| `messagingStore` | `activeConversationId` | UI navigation state |
| `messagingStore` | `isLoadingConversations`, `isLoadingMessages`, `isSendingMessage` | UI loading flags |
| `messagingStore` | `playingVideoId` | UI playback state |
| `messagingStore` | `typingUsers` | Ephemeral realtime state (not persisted) |
| `authStore` | `loading`, `initialized`, `error`, `uploadingAvatar` | UI state during auth operations |
| `presenceStore` | `onlineUsers`, `isInitialized` | Realtime ephemeral state |

### Should Migrate to React Query (Server-Fetched Data)
These are fetched from Supabase and duplicated in Zustand:

| Store | Field | React Query Alternative |
|-------|-------|------------------------|
| `authStore` | `user`, `profile` | `useQuery(['auth-user'])` + `useQuery(['profile', userId])` |
| `messagingStore` | `conversations` | `useQuery(['conversations'])` — already partially done via `useConversations.ts` |
| `messagingStore` | `messages` | `useQuery(['messages', conversationId])` — already partially done via `useMessages.ts` |
| `messagingStore` | `unreadCounts`, `totalUnreadCount` | Can be derived from conversations query or dedicated `useQuery(['unread-count'])` |

### Already Using React Query (Hooks)
Many hooks already use React Query:
- `useBusiness.ts` — `useQuery` for business data
- `useProducts.ts` — `useQuery` for products
- `useFavorites.ts` — `useQuery` for favorites
- `useCoupons.ts` — `useQuery` for coupons
- `useConversations.ts` — Hybrid: fetches with Supabase, stores in Zustand
- `useMessages.ts` — Hybrid: commented out Zustand integration

---

## ✅ Implementation Plan

> **⚠️ This is the largest and most complex story.** It should be executed incrementally, one data domain at a time.

### Phase 1: Audit Current Data Flow (Research — No Code Changes)

Map the complete data flow for each domain:
1. **Auth:** Where is `user`/`profile` fetched, cached, and read?
2. **Conversations:** Where are conversations fetched, stored, and displayed?
3. **Messages:** Where are messages fetched, stored, and rendered?
4. **Unread counts:** Where are counts calculated, stored, and displayed?

### Phase 2: Migrate `conversations` from Zustand → React Query

This is the most impactful migration. `useConversations.ts` already fetches from Supabase — the change is to stop pushing results into `messagingStore.setConversations()` and instead let React Query be the cache.

**Current flow:**
```
useConversations → supabase.from('conversations') → messagingStore.setConversations()
                                                   → Components read from messagingStore.conversations
```

**Target flow:**
```
useConversations → useQuery(['conversations']) → Components read from useConversations() hook
                                                  (React Query IS the cache)
```

### Phase 3: Migrate `messages` from Zustand → React Query

Similar pattern: `useMessages.ts` already has the query structure (the Zustand push was commented out at line 49). Enable the React Query cache as the source.

**Important:** Optimistic messages (`addOptimisticMessage`, `replaceOptimisticMessage`) must be handled via React Query's `optimisticUpdate` pattern:
```typescript
useMutation({
  mutationFn: sendMessage,
  onMutate: async (newMessage) => {
    await queryClient.cancelQueries(['messages', conversationId]);
    const previous = queryClient.getQueryData(['messages', conversationId]);
    queryClient.setQueryData(['messages', conversationId], old => [...old, optimistic]);
    return { previous };
  },
  onError: (err, newMsg, context) => {
    queryClient.setQueryData(['messages', conversationId], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['messages', conversationId]);
  },
});
```

### Phase 4: Slim Down Zustand Stores

After migration, `messagingStore` should only contain:
- `activeConversationId`
- `playingVideoId`
- UI loading/sending states
- Typing indicators (ephemeral)

> **⚠️ Architectural Note on `authStore`**: 
> Unlike typical server state, `user` and `profile` should **REMAIN** in Zustand. Supabase Auth pushes updates via `onAuthStateChange()`, making a global store the most appropriate pattern. Moving this to React Query would break the realtime auth listener pattern and require rewriting 89+ files immediately after Story 15.1 fixed them. `authStore` is deliberately excluded from this React Query migration.

---

## ⚠️ Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Realtime updates need to update React Query cache | Use `queryClient.setQueryData()` in realtime handlers |
| Optimistic updates are more complex in React Query | Use `useMutation` `onMutate` pattern |
| 89+ files reference `authStore.user` | Migrate incrementally; both systems can coexist during transition |
| IndexedDB persistence for offline | React Query already has `createAsyncStoragePersister` set up ✅ |

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Navigate to conversations page | Data loads from React Query cache |
| Send a message | Optimistic update appears instantly |
| Receive realtime message | Appears without page reload |
| Logout → Login | Fresh data fetched, no stale cached data |
| Offline → Online | Persisted cache serves data, then syncs |
| React Query DevTools | All server data visible in RQ cache |
| `npm run build` | Build succeeds |

---

## ✅ Acceptance Criteria

- [ ] `conversations` data served from React Query, not Zustand
- [ ] `messages` data served from React Query, not Zustand
- [ ] Optimistic updates work via React Query mutation pattern
- [ ] Realtime handlers update React Query cache
- [ ] Zustand stores only hold local/UI state
- [ ] Build passes

---

## ✅ Definition of Done

- [ ] React Query is the single source for server-fetched data
- [ ] Zustand stores trimmed to UI-only state
- [ ] All messaging features work correctly
- [ ] Build passes
