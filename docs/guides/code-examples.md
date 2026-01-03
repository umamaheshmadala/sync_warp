# Code Examples & Best Practices - Friends Module

**Practical code examples and best practices for the Friends Module.**

---

## 📋 Table of Contents

1. [Common Use Cases](#common-use-cases)
2. [Best Practices](#best-practices)
3. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
4. [Performance Tips](#performance-tips)
5. [Security Best Practices](#security-best-practices)

---

## 💡 Common Use Cases

### Use Case 1: Display Friends List

```typescript
import { useFriends } from '@/hooks/friends/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendsListSkeleton } from '@/components/ui/skeletons/FriendsListSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

function FriendsList() {
  const { data, isLoading, error } = useFriends();

  if (isLoading) return <FriendsListSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  const friends = data?.data || [];

  if (friends.length === 0) {
    return <EmptyState message="No friends yet" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {friends.map((friend) => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

**Key Points:**

- ✅ Handle loading state
- ✅ Handle error state
- ✅ Handle empty state
- ✅ Use proper grid layout

---

### Use Case 2: Send Friend Request

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { toast } from 'sonner';

function SendRequestButton({ userId }: { userId: string }) {
  const { sendRequest } = useFriendActions();

  const handleSendRequest = async () => {
    try {
      await sendRequest.mutateAsync(userId);
      toast.success('Friend request sent!');
    } catch (error: any) {
      // Handle specific error codes
      if (error.code === 'already_friends') {
        toast.info('You are already friends!');
      } else if (error.code === 'request_pending') {
        toast.info('Friend request already sent');
      } else if (error.code === 'user_blocked') {
        toast.error('Cannot send request to blocked user');
      } else {
        toast.error('Failed to send friend request');
      }
    }
  };

  return (
    <button
      onClick={handleSendRequest}
      disabled={sendRequest.isPending}
      className="btn btn-primary"
    >
      {sendRequest.isPending ? 'Sending...' : 'Send Request'}
    </button>
  );
}
```

**Key Points:**

- ✅ Handle loading state (isPending)
- ✅ Handle specific error codes
- ✅ Show user-friendly messages
- ✅ Disable button during mutation

---

### Use Case 3: Accept/Reject Friend Request

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { FriendRequest } from '@/types/friends';

function FriendRequestCard({ request }: { request: FriendRequest }) {
  const { acceptRequest, rejectRequest } = useFriendActions();

  const handleAccept = async () => {
    await acceptRequest.mutateAsync(request.id);
    toast.success(`You are now friends with ${request.sender.full_name}!`);
  };

  const handleReject = async () => {
    await rejectRequest.mutateAsync(request.id);
    toast.info('Friend request rejected');
  };

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <Avatar src={request.sender.avatar_url} />
        <div className="flex-1">
          <h3>{request.sender.full_name}</h3>
          {request.message && <p className="text-sm text-gray-600">{request.message}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={acceptRequest.isPending}
            className="btn btn-primary"
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            disabled={rejectRequest.isPending}
            className="btn btn-secondary"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Key Points:**

- ✅ Separate accept/reject handlers
- ✅ Show sender information
- ✅ Display optional message
- ✅ Disable buttons during mutation

---

### Use Case 4: Search Friends

```typescript
import { useState } from 'react';
import { useFriendSearch } from '@/hooks/friends/useFriendSearch';
import { useDebounce } from '@/hooks/useDebounce';

function FriendSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useFriendSearch(debouncedQuery, {
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div>
      <input
        type="search"
        placeholder="Search friends..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input"
      />

      {isLoading && <div>Searching...</div>}

      {results && results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((friend) => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </div>
      )}

      {results && results.length === 0 && query.length >= 2 && (
        <div className="text-center text-gray-500 mt-4">
          No friends found matching "{query}"
        </div>
      )}
    </div>
  );
}
```

**Key Points:**

- ✅ Debounce search input (300ms)
- ✅ Only search when query ≥ 2 characters
- ✅ Show loading state
- ✅ Handle empty results

---

### Use Case 5: Block/Unblock User

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { useBlockedUsers } from '@/hooks/friends/useBlockedUsers';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useState } from 'react';

function BlockButton({ userId }: { userId: string }) {
  const { blockUser, unblockUser } = useFriendActions();
  const { data: blockedUsers } = useBlockedUsers();
  const [showConfirm, setShowConfirm] = useState(false);

  const isBlocked = blockedUsers?.some((u) => u.id === userId);

  const handleToggleBlock = async () => {
    if (isBlocked) {
      await unblockUser.mutateAsync(userId);
      toast.success('User unblocked');
    } else {
      await blockUser.mutateAsync(userId);
      toast.success('User blocked');
    }
    setShowConfirm(false);
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="btn btn-danger"
      >
        {isBlocked ? 'Unblock' : 'Block'}
      </button>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleToggleBlock}
        title={isBlocked ? 'Unblock User?' : 'Block User?'}
        message={
          isBlocked
            ? 'This user will be able to send you friend requests again.'
            : 'This user will not be able to send you friend requests or see your profile.'
        }
      />
    </>
  );
}
```

**Key Points:**

- ✅ Check if user is already blocked
- ✅ Show confirmation dialog
- ✅ Clear success messages
- ✅ Handle both block and unblock

---

## ✅ Best Practices

### Service Layer Best Practices

```typescript
// ✅ GOOD: Use service layer for business logic
import { friendsService } from "@/services/friendsService";

const { success, data, error } = await friendsService.getFriends(userId);

if (!success) {
  console.error("Failed to fetch friends:", error);
  return;
}

// ❌ BAD: Direct Supabase calls in components
const { data } = await supabase.from("friendships").select("*");
```

**Why?**

- Centralized business logic
- Consistent error handling
- Easier to test
- Better code organization

---

### Hook Usage Best Practices

```typescript
// ✅ GOOD: Use provided hooks
import { useFriends } from "@/hooks/friends/useFriends";

const { data, isLoading, error } = useFriends();

// ❌ BAD: Manual useState + useEffect
const [friends, setFriends] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  async function loadFriends() {
    setLoading(true);
    const data = await friendsService.getFriends();
    setFriends(data);
    setLoading(false);
  }
  loadFriends();
}, []);
```

**Why?**

- Automatic caching
- Background refetching
- Error handling
- Loading states
- Optimistic updates

---

### Component Best Practices

```typescript
// ✅ GOOD: Small, focused components
function FriendCard({ friend }: { friend: Friend }) {
  return (
    <div className="card">
      <Avatar src={friend.avatar_url} />
      <h3>{friend.full_name}</h3>
      <OnlineStatusBadge isOnline={friend.is_online} />
    </div>
  );
}

// ❌ BAD: Large, monolithic components
function FriendsPage() {
  // 500 lines of code doing everything
}
```

**Why?**

- Easier to test
- Better reusability
- Simpler maintenance
- Clearer responsibilities

---

### State Management Best Practices

```typescript
// ✅ GOOD: Use React Query for server state
const { data: friends } = useFriends();

// ✅ GOOD: Use Zustand for global client state
const onlineUsers = usePresenceStore((state) => state.onlineUsers);

// ✅ GOOD: Use useState for local component state
const [isModalOpen, setIsModalOpen] = useState(false);

// ❌ BAD: Mix server and client state
const [friends, setFriends] = useState([]);
const [onlineUsers, setOnlineUsers] = useState([]);
```

**Why?**

- Clear separation of concerns
- Automatic cache management
- Better performance
- Easier debugging

---

## 🚫 Anti-Patterns to Avoid

### Anti-Pattern 1: Not Handling Loading States

```typescript
// ❌ BAD: No loading state
function FriendsList() {
  const { data } = useFriends();
  return <div>{data?.map(...)}</div>;
}

// ✅ GOOD: Handle loading state
function FriendsList() {
  const { data, isLoading } = useFriends();

  if (isLoading) return <Skeleton />;

  return <div>{data?.map(...)}</div>;
}
```

---

### Anti-Pattern 2: Not Handling Errors

```typescript
// ❌ BAD: Ignore errors
function FriendsList() {
  const { data } = useFriends();
  return <div>{data?.map(...)}</div>;
}

// ✅ GOOD: Handle errors
function FriendsList() {
  const { data, error } = useFriends();

  if (error) return <ErrorMessage error={error} />;

  return <div>{data?.map(...)}</div>;
}
```

---

### Anti-Pattern 3: Prop Drilling

```typescript
// ❌ BAD: Prop drilling
function App() {
  const user = useAuth();
  return <Page1 user={user} />;
}

function Page1({ user }) {
  return <Page2 user={user} />;
}

function Page2({ user }) {
  return <Component user={user} />;
}

// ✅ GOOD: Use context or hooks
function Component() {
  const { user } = useAuth(); // Direct access
  return <div>{user.name}</div>;
}
```

---

### Anti-Pattern 4: Mutating State Directly

```typescript
// ❌ BAD: Direct mutation
const friends = useFriendsStore((state) => state.friends);
friends.push(newFriend); // Mutates state!

// ✅ GOOD: Use setter
const addFriend = useFriendsStore((state) => state.addFriend);
addFriend(newFriend);
```

---

## ⚡ Performance Tips

### Tip 1: Use Pagination

```typescript
// ✅ GOOD: Paginated list
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['friends'],
  queryFn: ({ pageParam = 0 }) =>
    friendsService.getFriends({ offset: pageParam, limit: 50 }),
  getNextPageParam: (lastPage, pages) =>
    lastPage.length === 50 ? pages.length * 50 : undefined,
});

// Load more button
{hasNextPage && (
  <button onClick={() => fetchNextPage()}>
    Load More
  </button>
)}
```

---

### Tip 2: Memoize Expensive Computations

```typescript
import { useMemo } from 'react';

function FriendsList({ friends }: { friends: Friend[] }) {
  // ✅ GOOD: Memoize sorting
  const sortedFriends = useMemo(() =>
    friends.sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [friends]
  );

  return <div>{sortedFriends.map(...)}</div>;
}
```

---

### Tip 3: Use React.memo for Expensive Components

```typescript
import { memo } from 'react';

// ✅ GOOD: Memoize component
export const FriendCard = memo(({ friend }: { friend: Friend }) => {
  return (
    <div className="card">
      {/* Expensive rendering */}
    </div>
  );
});
```

---

### Tip 4: Debounce Search Input

```typescript
import { useDebounce } from "@/hooks/useDebounce";

function Search() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  // ✅ Only searches after 300ms of no typing
  const { data } = useFriendSearch(debouncedQuery);
}
```

---

### Tip 5: Use React Query Caching

```typescript
// ✅ GOOD: Configure cache times
const { data } = useFriends({
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

---

## 🔐 Security Best Practices

### Best Practice 1: Always Use RLS Policies

```sql
-- ✅ GOOD: RLS enabled with policies
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
ON friendships FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());
```

---

### Best Practice 2: Validate Input

```typescript
// ✅ GOOD: Validate before sending
function sendFriendRequest(userId: string) {
  if (!userId || userId.length === 0) {
    throw new Error("User ID is required");
  }

  if (userId === currentUser.id) {
    throw new Error("Cannot send request to yourself");
  }

  return friendsService.sendFriendRequest(userId);
}
```

---

### Best Practice 3: Handle Sensitive Data Carefully

```typescript
// ✅ GOOD: Don't expose sensitive data
const publicProfile = {
  id: user.id,
  full_name: user.full_name,
  avatar_url: user.avatar_url,
  // Don't include: email, phone, etc.
};

// ❌ BAD: Exposing everything
const profile = user; // Includes sensitive data!
```

---

### Best Practice 4: Use Prepared Statements

```typescript
// ✅ GOOD: Parameterized query (Supabase does this automatically)
const { data } = await supabase
  .from("friendships")
  .select("*")
  .eq("user_id", userId); // Safe

// ❌ BAD: String concatenation (vulnerable to SQL injection)
const query = `SELECT * FROM friendships WHERE user_id = '${userId}'`;
```

---

### Best Practice 5: Implement Rate Limiting

```typescript
// ✅ GOOD: Rate limit friend requests
const MAX_REQUESTS_PER_DAY = 50;

async function sendFriendRequest(userId: string) {
  const requestsToday = await getRequestCountToday();

  if (requestsToday >= MAX_REQUESTS_PER_DAY) {
    throw new Error("Daily friend request limit reached");
  }

  return friendsService.sendFriendRequest(userId);
}
```

---

## 📚 Additional Resources

- [API Documentation](../api/) - Complete API reference
- [Migration Guide](./migration.md) - Migration instructions
- [Onboarding Guide](./onboarding.md) - Getting started
- [Troubleshooting](./troubleshooting.md) - Common issues
- [Architecture Diagrams](../architecture/) - System architecture

---

**Last Updated:** 2025-11-29  
**Version:** 1.0.0  
**Maintainer:** Engineering Team
