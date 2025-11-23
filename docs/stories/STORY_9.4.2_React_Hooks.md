# 📋 STORY 9.4.2: React Hooks for Friends

**Epic:** [EPIC 9.4: Friends Service Layer & Business Logic](../epics/EPIC_9.4_Friends_Service_Layer.md)  
**Story Points:** 3  
**Priority:** High  
**Status:** 📋 To Do

---

## 📝 **Story Description**

As a **developer**, I want to **create reusable React hooks for friend operations** so that **components can easily fetch, manage, and react to friend data with proper loading and error states**.

---

## 🎯 **Acceptance Criteria**

### **Hooks to Implement:**
1. ✅ `useFriends()` - Fetch and manage friends list with loading/error states
2. ✅ `useFriendRequests()` - Manage pending requests (received and sent)
3. ✅ `useFriendSearch(query)` - Debounced friend search
4. ✅ `useFriendActions()` - Actions for send/accept/reject/block/unfriend

### **Quality Requirements:**
5. ✅ All hooks use React Query for caching and state management
6. ✅ Proper cleanup of subscriptions on unmount
7. ✅ TypeScript types for all hook parameters and return values
8. ✅ Loading, error, and success states exposed
9. ✅ Optimistic updates for mutations
10. ✅ Automatic refetch on window focus

---

## 🎨 **MCP Integration**

```bash
# Context7 MCP: Analyze React Query patterns
warp mcp run context7 "show best practices for React Query hooks with TypeScript"

# Context7 MCP: Generate hook boilerplate
warp mcp run context7 "generate React Query hook for fetching friends list"
```

---

## 📦 **Implementation**

### **useFriends Hook:**
```typescript
// src/hooks/friends/useFriends.ts

import { useQuery } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { useAuthStore } from '../../store/authStore';

export function useFriends() {
  const user = useAuthStore(state => state.user);

  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: () => friendsService.getFriends(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
```

### **useFriendRequests Hook:**
```typescript
// src/hooks/friends/useFriendRequests.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export function useReceivedFriendRequests() {
  const user = useAuthStore(state => state.user);

  return useQuery({
    queryKey: ['friendRequests', 'received', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(*)
        `)
        .eq('receiver_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSentFriendRequests() {
  const user = useAuthStore(state => state.user);

  return useQuery({
    queryKey: ['friendRequests', 'sent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .eq('sender_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
```

### **useFriendSearch Hook:**
```typescript
// src/hooks/friends/useFriendSearch.ts

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { useDebounce } from '../useDebounce';

export function useFriendSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ['friendSearch', debouncedQuery],
    queryFn: () => friendsService.searchFriends(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  return {
    query,
    setQuery,
    results: data?.data || [],
    isLoading,
    error,
  };
}
```

### **useFriendActions Hook:**
```typescript
// src/hooks/friends/useFriendActions.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { toast } from 'react-hot-toast';

export function useFriendActions() {
  const queryClient = useQueryClient();

  const sendRequest = useMutation({
    mutationFn: (receiverId: string) => friendsService.sendFriendRequest(receiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request sent!');
    },
    onError: () => {
      toast.error('Failed to send friend request');
    },
  });

  const acceptRequest = useMutation({
    mutationFn: (requestId: string) => friendsService.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request accepted!');
    },
    onError: () => {
      toast.error('Failed to accept friend request');
    },
  });

  const rejectRequest = useMutation({
    mutationFn: (requestId: string) => friendsService.rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request rejected');
    },
    onError: () => {
      toast.error('Failed to reject friend request');
    },
  });

  const unfriend = useMutation({
    mutationFn: (friendId: string) => friendsService.unfriend(friendId),
    onMutate: async (friendId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['friends'] });
      const previousFriends = queryClient.getQueryData(['friends']);
      
      queryClient.setQueryData(['friends'], (old: any) => ({
        ...old,
        data: old?.data?.filter((f: any) => f.id !== friendId),
      }));

      return { previousFriends };
    },
    onError: (err, friendId, context) => {
      queryClient.setQueryData(['friends'], context?.previousFriends);
      toast.error('Failed to unfriend user');
    },
    onSuccess: () => {
      toast.success('Friend removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  const blockUser = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      friendsService.blockUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('User blocked');
    },
    onError: () => {
      toast.error('Failed to block user');
    },
  });

  return {
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
    blockUser,
  };
}
```

---

## 🧪 **Testing**

### **Hook Tests:**
```typescript
// src/hooks/friends/__tests__/useFriends.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFriends } from '../useFriends';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFriends', () => {
  it('should fetch friends on mount', async () => {
    const { result } = renderHook(() => useFriends(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

---

## 🚀 **Deployment Checklist**

- [ ] All hooks implemented
- [ ] TypeScript types defined
- [ ] React Query integration complete
- [ ] Optimistic updates working
- [ ] Hook tests written
- [ ] Integration tested in components
- [ ] Code reviewed and approved

---

**Previous Story:** [STORY 9.4.1: Friends Service Layer](./STORY_9.4.1_Friends_Service.md)  
**Next Story:** [STORY 9.4.3: Zustand Store](./STORY_9.4.3_Zustand_Store.md)
