# Story 9.9.7: Code Examples & Best Practices

**Epic:** [EPIC 9.9: Documentation & Developer Experience](../epics/EPIC_9.9_Documentation_DX.md)  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 day  
**MCP Usage:** 🧠 Context7 MCP (Medium)  
**Dependencies:** Stories 9.9.1-9.9.6  
**Status:** 📋 Planning

---

## 📋 Story Description

Create a comprehensive collection of 20+ code examples covering common use cases, best practices guide for error handling and testing, anti-patterns to avoid, and performance optimization tips.

---

## ✅ Acceptance Criteria

### Code Examples

- [ ] 20+ code snippets covering common use cases
- [ ] Examples for all major features
- [ ] Copy-paste ready code
- [ ] TypeScript examples with proper types
- [ ] Comments explaining key concepts

### Best Practices Guide

- [ ] Error handling patterns
- [ ] Testing best practices
- [ ] Performance optimization tips
- [ ] Security best practices
- [ ] Code organization guidelines

### Anti-Patterns

- [ ] Common mistakes documented
- [ ] Why they're problematic
- [ ] How to fix them
- [ ] Better alternatives

### Interactive Examples

- [ ] CodeSandbox/StackBlitz demos
- [ ] Live playground (optional)
- [ ] Video tutorials (optional)

---

## 🎨 Implementation

### Phase 1: Common Use Cases (4 hours)

**Create `docs/examples/README.md`:**

````markdown
# Code Examples - Friends Module

## Table of Contents

1. [Basic Operations](#basic-operations)
2. [Advanced Features](#advanced-features)
3. [Error Handling](#error-handling)
4. [Performance Optimization](#performance-optimization)
5. [Testing](#testing)

---

## Basic Operations

### Example 1: Display Friends List

```typescript
import { useFriends } from '@/hooks/friends/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';
import { Skeleton } from '@/components/ui/skeleton';

function FriendsList() {
  const { data: friends, isLoading, error } = useFriends();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load friends</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  if (!friends?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No friends yet</p>
        <button>Find Friends</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {friends.map(friend => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```
````

**Key Points:**

- ✅ Handle loading state with skeleton
- ✅ Handle error state with retry option
- ✅ Handle empty state with CTA
- ✅ Responsive grid layout

---

### Example 2: Send Friend Request

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

function SendRequestButton({ userId, username }: {
  userId: string;
  username: string;
}) {
  const { sendRequest } = useFriendActions();

  const handleSendRequest = async () => {
    try {
      await sendRequest.mutateAsync(userId);
      toast.success(`Friend request sent to ${username}`);
    } catch (error: any) {
      // Handle specific error codes
      if (error.code === 'already_friends') {
        toast.info(`You're already friends with ${username}`);
      } else if (error.code === 'request_pending') {
        toast.info('Friend request already sent');
      } else if (error.code === 'blocked') {
        toast.error('Cannot send request to this user');
      } else {
        toast.error('Failed to send friend request');
        console.error('Send request error:', error);
      }
    }
  };

  return (
    <Button
      onClick={handleSendRequest}
      disabled={sendRequest.isPending}
    >
      {sendRequest.isPending ? 'Sending...' : 'Send Request'}
    </Button>
  );
}
```

**Key Points:**

- ✅ Handle specific error codes
- ✅ Show appropriate user messages
- ✅ Disable button during request
- ✅ Log errors for debugging

---

### Example 3: Accept/Reject Friend Request

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

function FriendRequestActions({ requestId }: { requestId: string }) {
  const { acceptRequest, rejectRequest } = useFriendActions();

  const handleAccept = async () => {
    try {
      await acceptRequest.mutateAsync(requestId);
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleReject = async () => {
    try {
      await rejectRequest.mutateAsync(requestId);
      toast.success('Friend request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={handleAccept}
        disabled={acceptRequest.isPending || rejectRequest.isPending}
      >
        <Check className="h-4 w-4 mr-1" />
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleReject}
        disabled={acceptRequest.isPending || rejectRequest.isPending}
      >
        <X className="h-4 w-4 mr-1" />
        Reject
      </Button>
    </div>
  );
}
```

---

### Example 4: Search Friends with Debouncing

```typescript
import { useFriendSearch } from '@/hooks/friends/useFriendSearch';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

function FriendSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useFriendSearch(debouncedQuery);

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search friends..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && <div className="mt-4">Searching...</div>}

      {results && results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map(friend => (
            <div key={friend.id} className="p-3 border rounded">
              {friend.full_name}
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && debouncedQuery && (
        <div className="mt-4 text-center text-muted-foreground">
          No results for "{debouncedQuery}"
        </div>
      )}
    </div>
  );
}
```

**Key Points:**

- ✅ Debounce search to reduce API calls
- ✅ Show loading state
- ✅ Handle empty results
- ✅ Clean up timers on unmount

---

### Example 5: Block/Unblock User

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { useBlockedUsers } from '@/hooks/friends/useBlockedUsers';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function BlockUserButton({ userId, username }: {
  userId: string;
  username: string;
}) {
  const { blockUser, unblockUser } = useFriendActions();
  const { data: blockedUsers } = useBlockedUsers();

  const isBlocked = blockedUsers?.some(u => u.id === userId);

  const handleToggleBlock = async () => {
    try {
      if (isBlocked) {
        await unblockUser.mutateAsync(userId);
        toast.success(`${username} unblocked`);
      } else {
        await blockUser.mutateAsync(userId);
        toast.success(`${username} blocked`);
      }
    } catch (error) {
      toast.error(`Failed to ${isBlocked ? 'unblock' : 'block'} user`);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {isBlocked ? 'Unblock' : 'Block'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? 'Unblock' : 'Block'} {username}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked
              ? `${username} will be able to see your profile and send you messages again.`
              : `${username} won't be able to see your profile or send you messages.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleToggleBlock}>
            {isBlocked ? 'Unblock' : 'Block'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Advanced Features

### Example 6: Infinite Scroll for Friends List

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { friendsService } from '@/services/friendsService';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

function InfiniteFriendsList() {
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['friends', 'infinite'],
    queryFn: ({ pageParam = 0 }) =>
      friendsService.getFriends({
        limit: 20,
        offset: pageParam
      }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 20) return undefined;
      return pages.length * 20;
    },
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <div className="space-y-4">
      {data?.pages.map((page, i) => (
        <div key={i} className="grid grid-cols-2 gap-4">
          {page.map(friend => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </div>
      ))}

      {hasNextPage && (
        <div ref={ref} className="text-center py-4">
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </div>
      )}
    </div>
  );
}
```

---

### Example 7: Optimistic UI Updates

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { friendsService } from "@/services/friendsService";

function useOptimisticFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => friendsService.sendFriendRequest(userId),

    // Optimistic update
    onMutate: async (userId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["friend-requests"] });

      // Snapshot previous value
      const previousRequests = queryClient.getQueryData(["friend-requests"]);

      // Optimistically update
      queryClient.setQueryData(["friend-requests"], (old: any) => [
        ...old,
        {
          id: "temp-id",
          receiver_id: userId,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);

      return { previousRequests };
    },

    // Rollback on error
    onError: (err, userId, context) => {
      queryClient.setQueryData(["friend-requests"], context?.previousRequests);
      toast.error("Failed to send request");
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.success("Request sent!");
    },
  });
}
```

---

## Best Practices

### Error Handling

✅ **DO: Use try-catch for all async operations**

```typescript
try {
  await sendFriendRequest(userId);
  toast.success("Request sent!");
} catch (error) {
  toast.error("Failed to send request");
  console.error(error);
}
```

❌ **DON'T: Silently fail without logging**

```typescript
// Bad
sendFriendRequest(userId).catch(() => {});
```

---

### Testing

✅ **DO: Test behavior, not implementation**

```typescript
test("should send friend request", async () => {
  const { result } = renderHook(() => useFriendActions());

  await act(async () => {
    await result.current.sendRequest.mutateAsync("user-123");
  });

  expect(mockSendRequest).toHaveBeenCalledWith("user-123");
});
```

❌ **DON'T: Test internal state**

```typescript
// Bad
expect(result.current.internalState).toBe("loading");
```

---

### Performance

✅ **DO: Use pagination for large lists**

```typescript
const { data } = useFriends({ limit: 50 });
```

❌ **DON'T: Load all friends at once**

```typescript
// Bad
const { data } = useFriends(); // Loads all friends
```

---

### Security

✅ **DO: Always verify permissions in RLS**

```sql
CREATE POLICY "Users can view their friendships"
ON friendships FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());
```

❌ **DON'T: Trust client-side data**

```typescript
// Bad - client can manipulate userId
await supabase.from("friendships").insert({ user_id: userId });
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Not handling loading states

```typescript
// Bad
function FriendsList() {
  const { data: friends } = useFriends();
  return <div>{friends.map(f => <FriendCard friend={f} />)}</div>;
}
```

**Problem:** Crashes when `friends` is undefined during loading.

**Solution:**

```typescript
// Good
function FriendsList() {
  const { data: friends, isLoading } = useFriends();
  if (isLoading) return <Skeleton />;
  return <div>{friends?.map(f => <FriendCard friend={f} />)}</div>;
}
```

---

### ❌ Anti-Pattern 2: Fetching in loops

```typescript
// Bad
friends.forEach(async (friend) => {
  const profile = await getProfile(friend.id);
});
```

**Problem:** Makes N API calls instead of 1.

**Solution:**

```typescript
// Good
const profiles = await getProfiles(friends.map((f) => f.id));
```

---

### ❌ Anti-Pattern 3: Not cleaning up subscriptions

```typescript
// Bad
useEffect(() => {
  const channel = supabase.channel("friends").subscribe();
}, []);
```

**Problem:** Memory leak when component unmounts.

**Solution:**

```typescript
// Good
useEffect(() => {
  const channel = supabase.channel("friends").subscribe();
  return () => {
    channel.unsubscribe();
  };
}, []);
```

---

## Performance Tips

1. **Use React Query's caching:**

   ```typescript
   const { data } = useFriends({
     staleTime: 5 * 60 * 1000, // 5 minutes
   });
   ```

2. **Debounce search queries:**

   ```typescript
   const debouncedQuery = useDebounce(query, 300);
   ```

3. **Lazy load components:**

   ```typescript
   const FriendProfileModal = lazy(() => import("./FriendProfileModal"));
   ```

4. **Use pagination:**

   ```typescript
   const { data } = useFriends({ limit: 50 });
   ```

5. **Optimize images:**
   ```typescript
   <img src={avatar} loading="lazy" />
   ```

````

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Generate code examples
warp mcp run context7 "generate code examples for useFriends hook"

# Find anti-patterns
warp mcp run context7 "find anti-patterns in src/components/friends/"

# Suggest best practices
warp mcp run context7 "suggest best practices for error handling in friendsService"
````

---

## 📦 Deliverables

1. **Code Examples:**
   - `docs/examples/README.md`
   - 20+ code snippets

2. **Best Practices Guide:**
   - Error handling
   - Testing
   - Performance
   - Security

3. **Anti-Patterns:**
   - Common mistakes
   - Solutions

4. **Interactive Examples:**
   - CodeSandbox links
   - Live demos

---

## 📈 Success Metrics

- **Code Examples:** 20+
- **Best Practices:** 10+
- **Anti-Patterns:** 5+
- **Copy-Paste Success:** > 95%

---

**Epic Complete!** All 7 stories for Epic 9.9 created.
