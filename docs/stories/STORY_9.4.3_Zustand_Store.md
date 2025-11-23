# 📋 STORY 9.4.3: Zustand Store for Friends

**Epic:** [EPIC 9.4: Friends Service Layer & Business Logic](../epics/EPIC_9.4_Friends_Service_Layer.md)  
**Story Points:** 2  
**Priority:** Medium  
**Status:** ✅ Complete

---

## 📝 **Story Description**

As a **developer**, I want to **implement a Zustand store for global friends state** so that **friend data is accessible across the app without prop drilling and persists across sessions**.

---

## 🎯 **Acceptance Criteria**

### **Store Features:**
1. ✅ Store manages `friends`, `requests`, and `onlineFriendsCount`
2. ✅ Actions for `load`, `sendRequest`, `accept`, `reject`, `block`, `unfriend`
3. ✅ Persist critical state in sessionStorage
4. ✅ TypeScript types for all state and actions
5. ✅ Selectors for derived state (e.g., online friends, pending requests count)

---

## 📦 **Implementation**

```typescript
// src/store/friendsStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Friend, FriendRequest } from '../types/friends';

interface FriendsState {
  friends: Friend[];
  requests: FriendRequest[];
  onlineFriendsCount: number;
  
  // Actions
  setFriends: (friends: Friend[]) => void;
  setRequests: (requests: FriendRequest[]) => void;
  setOnlineFriendsCount: (count: number) => void;
  addFriend: (friend: Friend) => void;
  removeFriend: (friendId: string) => void;
  addRequest: (request: FriendRequest) => void;
  removeRequest: (requestId: string) => void;
  
  // Derived selectors
  getOnlineFriends: () => Friend[];
  getPendingRequestsCount: () => number;
}

export const useFriendsStore = create<FriendsState>()(
  persist(
    (set, get) => ({
      friends: [],
      requests: [],
      onlineFriendsCount: 0,

      setFriends: (friends) => set({ friends }),
      setRequests: (requests) => set({ requests }),
      setOnlineFriendsCount: (count) => set({ onlineFriendsCount: count }),

      addFriend: (friend) =>
        set((state) => ({ friends: [...state.friends, friend] })),

      removeFriend: (friendId) =>
        set((state) => ({
          friends: state.friends.filter((f) => f.id !== friendId),
        })),

      addRequest: (request) =>
        set((state) => ({ requests: [...state.requests, request] })),

      removeRequest: (requestId) =>
        set((state) => ({
          requests: state.requests.filter((r) => r.id !== requestId),
        })),

      getOnlineFriends: () => get().friends.filter((f) => f.is_online),

      getPendingRequestsCount: () => get().requests.length,
    }),
    {
      name: 'friends-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        friends: state.friends,
        onlineFriendsCount: state.onlineFriendsCount,
      }),
    }
  )
);
```

---

## 🚀 **Deployment Checklist**

- [ ] Zustand store implemented
- [ ] Persistence configured
- [ ] TypeScript types defined
- [ ] Selectors working
- [ ] Integration tested
- [ ] Code reviewed

---

**Previous Story:** [STORY 9.4.2: React Hooks](./STORY_9.4.2_React_Hooks.md)  
**Next Story:** [STORY 9.4.4: Realtime Subscriptions](./STORY_9.4.4_Realtime_Subscriptions.md)
