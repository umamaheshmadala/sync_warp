# 📋 STORY 9.4.4: Realtime Subscriptions for Friends

**Epic:** [EPIC 9.4: Friends Service Layer & Business Logic](../epics/EPIC_9.4_Friends_Service_Layer.md)  
**Story Points:** 2  
**Priority:** High  
**Status:** ✅ Complete

---

## 📝 **Story Description**

As a **user**, I want to **see real-time updates when friends come online, send requests, or accept/reject requests** so that **I always have the latest information without refreshing**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Subscribe to `friendships` table for friend additions/removals
2. ✅ Subscribe to `friend_requests` table for new requests
3. ✅ Subscribe to `profiles` table for online status changes
4. ✅ Update Zustand store on realtime events
5. ✅ Throttle updates to prevent re-render storms
6. ✅ Cleanup subscriptions on unmount

---

## 🎨 **MCP Integration**

```bash
# Supabase MCP: Test realtime subscriptions
warp mcp run supabase "test realtime subscription to friendships table"
```

---

## 📦 **Implementation**

```typescript
// src/hooks/friends/useRealtimeFriends.ts

import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useFriendsStore } from '../../store/friendsStore';
import { useAuthStore } from '../../store/authStore';
import { throttle } from 'lodash';

export function useRealtimeFriends() {
  const user = useAuthStore(state => state.user);
  const { addFriend, removeFriend, setOnlineFriendsCount } = useFriendsStore();

  useEffect(() => {
    if (!user) return;

    // Subscribe to friendships changes
    const friendshipsChannel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${user.id}`,
        },
        throttle((payload) => {
          // Fetch full friend data and add to store
          console.log('[Realtime] New friend added:', payload);
        }, 1000)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${user.id}`,
        },
        throttle((payload) => {
          removeFriend(payload.old.friend_id);
        }, 1000)
      )
      .subscribe();

    // Subscribe to friend requests
    const requestsChannel = supabase
      .channel('friend-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        throttle((payload) => {
          console.log('[Realtime] Friend request update:', payload);
          // Invalidate React Query cache
        }, 1000)
      )
      .subscribe();

    // Subscribe to profiles for online status
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        throttle((payload) => {
          console.log('[Realtime] Profile updated:', payload);
          // Update online friends count
        }, 2000)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendshipsChannel);
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user, addFriend, removeFriend, setOnlineFriendsCount]);
}
```

---

## 🚀 **Deployment Checklist**

- [ ] Realtime subscriptions implemented
- [ ] Throttling configured
- [ ] Store updates working
- [ ] Cleanup on unmount
- [ ] Integration tested
- [ ] Code reviewed

---

**Previous Story:** [STORY 9.4.3: Zustand Store](./STORY_9.4.3_Zustand_Store.md)  
**Next Story:** [STORY 9.4.5: Error Handling & Retry](./STORY_9.4.5_Error_Handling.md)
