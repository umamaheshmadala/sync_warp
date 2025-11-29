[**sync-app v0.0.0**](../../../../README.md)

***

[sync-app](../../../../README.md) / [hooks/friends/useFriends](../README.md) / useFriends

# Function: useFriends()

> **useFriends**(): `UseQueryResult`\<`ServiceResponse`\<`Friend`[]\>, `Error`\>

Defined in: [src/hooks/friends/useFriends.ts:40](https://github.com/umamaheshmadala/sync_warp/blob/8d292941aaca173973ab1c4a6404fce0eac57cf4/src/hooks/friends/useFriends.ts#L40)

React Query hook to fetch and manage the current user's friends list.

This hook automatically fetches the friends list for the authenticated user
and provides loading states, error handling, and automatic refetching capabilities.
The data is cached for 5 minutes and refetches when the window regains focus.

## Returns

`UseQueryResult`\<`ServiceResponse`\<`Friend`[]\>, `Error`\>

UseQueryResult containing friends data, loading state, and error information

## Example

```typescript
import { useFriends } from '@/hooks/friends/useFriends';

function FriendsList() {
  const { data, isLoading, error, refetch } = useFriends();

  if (isLoading) return <Skeleton count={5} />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  const friends = data?.data || [];
  
  return (
    <div>
      <h2>My Friends ({friends.length})</h2>
      {friends.map(friend => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

## See

 - [friendsService.getFriends](../../../../services/friendsService/variables/friendsService.md#getfriends) for the underlying service function
 - Friend for the structure of friend objects
