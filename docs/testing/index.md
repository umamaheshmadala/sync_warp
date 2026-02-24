# Friends Module API Documentation

Welcome to the comprehensive API documentation for the Friends Module. This documentation covers all services, hooks, and utilities for managing friendships, friend requests, and social interactions.

---

## 📚 Quick Navigation

### Services

- [**friendsService**](./api/services/friendsService/README.md) - Core business logic for friend operations

### Hooks

- [**useFriends**](./api/hooks/friends/useFriends/README.md) - Fetch and manage friends list
- [**useFriendRequests**](./api/hooks/friends/useFriendRequests/README.md) - Manage friend requests
- [**useFriendActions**](./api/hooks/friends/useFriendActions/README.md) - Perform friend actions (send, accept, reject, etc.)
- [**useFriendSearch**](./api/hooks/friends/useFriendSearch/README.md) - Search for friends

### Stores

- [**friendsStore**](./api/store/friendsStore/README.md) - Global state management for friends

---

## 🚀 Quick Start

### Displaying Friends List

```typescript
import { useFriends } from '@/hooks/friends/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';

function FriendsList() {
  const { data, isLoading, error } = useFriends();

  if (isLoading) return <Skeleton count={5} />;
  if (error) return <ErrorMessage error={error} />;

  const friends = data?.data || [];

  return (
    <div className="grid grid-cols-2 gap-4">
      {friends.map(friend => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

### Sending a Friend Request

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';

function SendRequestButton({ userId }) {
  const { sendRequest } = useFriendActions();

  const handleSend = () => {
    sendRequest.mutate(userId);
  };

  return (
    <button
      onClick={handleSend}
      disabled={sendRequest.isPending}
    >
      {sendRequest.isPending ? 'Sending...' : 'Send Request'}
    </button>
  );
}
```

### Accepting a Friend Request

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';

function AcceptRequestButton({ requestId }) {
  const { acceptRequest } = useFriendActions();

  return (
    <button onClick={() => acceptRequest.mutate(requestId)}>
      Accept
    </button>
  );
}
```

---

## 📖 Common Use Cases

### 1. Display Friends List with Online Status

```typescript
import { useFriends } from '@/hooks/friends/useFriends';

function OnlineFriendsList() {
  const { data } = useFriends();
  const friends = data?.data || [];

  const onlineFriends = friends.filter(f => f.is_online);
  const offlineFriends = friends.filter(f => !f.is_online);

  return (
    <div>
      <h3>Online ({onlineFriends.length})</h3>
      {onlineFriends.map(friend => (
        <FriendCard key={friend.id} friend={friend} showOnlineStatus />
      ))}

      <h3>Offline ({offlineFriends.length})</h3>
      {offlineFriends.map(friend => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

### 2. Search Friends

```typescript
import { useFriendSearch } from '@/hooks/friends/useFriendSearch';
import { useState } from 'react';

function FriendSearch() {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useFriendSearch(query);

  return (
    <div>
      <input
        type="search"
        placeholder="Search friends..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading && <p>Searching...</p>}

      {results?.data?.map(friend => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

### 3. Handle Friend Requests

```typescript
import { useFriendRequests } from '@/hooks/friends/useFriendRequests';
import { useFriendActions } from '@/hooks/friends/useFriendActions';

function FriendRequestsList() {
  const { data } = useFriendRequests();
  const { acceptRequest, rejectRequest } = useFriendActions();

  const requests = data?.data || [];

  return (
    <div>
      <h2>Friend Requests ({requests.length})</h2>
      {requests.map(request => (
        <div key={request.id}>
          <p>{request.sender.full_name}</p>
          <button onClick={() => acceptRequest.mutate(request.id)}>
            Accept
          </button>
          <button onClick={() => rejectRequest.mutate(request.id)}>
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 4. Unfriend a User

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';

function UnfriendButton({ friendId, friendName }) {
  const { unfriend } = useFriendActions();

  const handleUnfriend = () => {
    if (confirm(`Remove ${friendName} from your friends?`)) {
      unfriend.mutate(friendId);
    }
  };

  return (
    <button onClick={handleUnfriend}>
      Unfriend
    </button>
  );
}
```

### 5. Block a User

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';

function BlockUserButton({ userId, userName }) {
  const { blockUser } = useFriendActions();

  const handleBlock = () => {
    if (confirm(`Block ${userName}?`)) {
      blockUser.mutate(userId);
    }
  };

  return (
    <button onClick={handleBlock} className="text-red-500">
      Block User
    </button>
  );
}
```

---

## 🔧 API Reference

### Services

#### friendsService

The core service layer providing all friend-related business logic.

**Key Functions:**

- `getFriends(userId)` - Fetch user's friends list
- `sendFriendRequest(receiverId, message?)` - Send a friend request
- `acceptFriendRequest(requestId)` - Accept a friend request
- `rejectFriendRequest(requestId)` - Reject a friend request
- `cancelFriendRequest(requestId)` - Cancel a sent request
- `unfriend(friendId)` - Remove a friendship
- `blockUser(userId, reason?)` - Block a user
- `unblockUser(userId)` - Unblock a user
- `searchMyFriends(query)` - Search within friends
- `searchUsers(query, limit?)` - Global user search

[View Full API Documentation →](./api/services/friendsService/README.md)

---

### Hooks

#### useFriends

React Query hook to fetch and manage the current user's friends list.

**Features:**

- Automatic caching (5 minutes)
- Refetch on window focus
- Loading and error states
- Automatic retry on failure

[View Full Documentation →](./api/hooks/friends/useFriends/README.md)

---

#### useFriendActions

React Query hook providing mutation functions for all friend actions.

**Available Actions:**

- `sendRequest` - Send friend request
- `acceptRequest` - Accept request
- `rejectRequest` - Reject request
- `cancelRequest` - Cancel sent request
- `unfriend` - Remove friendship
- `blockUser` - Block user
- `unblockUser` - Unblock user

[View Full Documentation →](./api/hooks/friends/useFriendActions/README.md)

---

#### useFriendRequests

React Query hook to fetch pending friend requests (received and sent).

**Features:**

- Separate queries for received and sent requests
- Real-time updates via Supabase subscriptions
- Automatic cache invalidation

[View Full Documentation →](./api/hooks/friends/useFriendRequests/README.md)

---

#### useFriendSearch

React Query hook for searching friends by name or username.

**Features:**

- Debounced search queries
- Cached results
- Minimum query length validation

[View Full Documentation →](./api/hooks/friends/useFriendSearch/README.md)

---

## 🎯 Best Practices

### 1. Always Handle Loading States

```typescript
const { data, isLoading, error } = useFriends();

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;

// Use data safely
const friends = data?.data || [];
```

### 2. Use Optimistic Updates

```typescript
const { acceptRequest } = useFriendActions();

// The hook automatically invalidates queries after success
acceptRequest.mutate(requestId);
```

### 3. Provide User Feedback

```typescript
const { sendRequest } = useFriendActions();

// Mutations include automatic toast notifications
sendRequest.mutate(userId); // Shows "Friend request sent!" on success
```

### 4. Handle Errors Gracefully

```typescript
const { data, error, refetch } = useFriends();

if (error) {
  return (
    <div>
      <p>Failed to load friends</p>
      <button onClick={() => refetch()}>Try Again</button>
    </div>
  );
}
```

---

## 📚 Additional Resources

- [Migration Guide](../guides/migration.md) - Migrating from old Friends module
- [Troubleshooting Guide](../guides/troubleshooting.md) - Common issues and solutions
- [Architecture Diagrams](../architecture/) - System architecture and data flow
- [Code Examples](../examples/) - More code examples and patterns

---

## 🤝 Contributing

Found an issue or want to improve the documentation?

1. Check existing [GitHub Issues](https://github.com/your-org/sync_warp/issues)
2. Create a new issue or pull request
3. Follow the contribution guidelines

---

## 📝 License

This documentation is part of the Sync Warp project.

---

**Last Updated:** 2025-11-29  
**Version:** 1.0.0  
**Generated by:** TypeDoc
