# 🧩 EPIC 9.4: Friends Service Layer & Business Logic

**Epic Owner:** Frontend Engineering / Backend Engineering  
**Stakeholders:** Product, QA  
**Dependencies:** Epic 9.1, 9.2, 9.3  
**Timeline:** Week 5-6 (parallel with 9.3)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Implement the **complete service layer** and reusable business logic for the Friends Module:
- TypeScript `friendsService.ts` with all friend operations
- React hooks for data fetching and realtime state
- Zustand store for global friends state
- Real-time subscriptions (Supabase Realtime)
- Error handling & retry logic
- Offline support for friend requests

---

## 🎯 **MCP Integration**

- 🧠 Context7 MCP (Heavy): Analyze/refactor code, dependency graph
- 🛢 Supabase MCP (Medium): Test RPC functions, realtime
- 🤖 Puppeteer MCP (Light): E2E service-level flows

---

## ✅ **Success Criteria**

| Metric | Target |
|--------|--------|
| **Error Rate** | < 0.5% of requests |
| **Realtime Latency** | < 2s for updates |
| **Offline Queue Delivery** | 100% delivery on reconnect |
| **Type Coverage** | 100% TS types for services/hooks |

---

## 🗂️ **Stories**

### **STORY 9.4.1: friendsService.ts Rewrite** ⏱️ 3 days
- `getFriends(userId)` - With online status
- `sendFriendRequest(receiverId, message?)`
- `acceptFriendRequest(requestId)` - RPC
- `rejectFriendRequest(requestId)`
- `unfriend(userId)` - RPC
- `blockUser(userId, reason?)` - RPC
- `unblockUser(userId)`
- `searchFriends(query)`
- `getMutualFriends(userId)`
- `getOnlineFriendsCount(userId)`
- Unit tests for all functions

### **STORY 9.4.2: React Hooks** ⏱️ 2 days
- `useFriends()` - Friends list with loading/error
- `useFriendRequests()` - Pending requests (received/sent)
- `useFriendSearch()` - Debounced search
- `useFriendActions()` - Send/accept/reject/block
- Cleanup subscriptions on unmount

### **STORY 9.4.3: Zustand Store** ⏱️ 1 day
- `friendsStore` with:
  - `friends: Friend[]`
  - `requests: FriendRequest[]`
  - `onlineFriendsCount: number`
  - `actions: { load, sendRequest, accept, reject, block, unfriend }`
- Persist critical state in sessionStorage

### **STORY 9.4.4: Realtime Subscriptions** ⏱️ 1 day
- Subscriptions to `friendships`, `friend_requests`, `profiles`
- Update store on inserts/updates/deletes
- Throttle updates to avoid re-render storms

### **STORY 9.4.5: Error Handling & Retry** ⏱️ 1 day
- Exponential backoff with jitter
- Centralized error handler with user-friendly messages
- Circuit breaker for failing endpoints

### **STORY 9.4.6: Offline Support** ⏱️ 1 day
- Queue outgoing friend requests when offline
- Retry on reconnect (Capacitor Network plugin)
- Conflict resolution on duplicate requests

---

## 📦 **Deliverables**

```
src/services/
  friendsService.ts
  recommendationService.ts
  contactSyncService.ts

src/hooks/
  useFriends.ts
  useFriendRequests.ts
  useFriendSearch.ts
  useFriendActions.ts

src/store/
  friendsStore.ts
```

---

**Next Epic:** [EPIC 9.5: Privacy Controls & Settings](./EPIC_9.5_Privacy_Settings.md)
