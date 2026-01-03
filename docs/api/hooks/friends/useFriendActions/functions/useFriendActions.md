[**sync-app v0.0.0**](../../../../README.md)

***

[sync-app](../../../../README.md) / [hooks/friends/useFriendActions](../README.md) / useFriendActions

# Function: useFriendActions()

> **useFriendActions**(): `object`

Defined in: [src/hooks/friends/useFriendActions.ts:61](https://github.com/umamaheshmadala/sync_warp/blob/8d292941aaca173973ab1c4a6404fce0eac57cf4/src/hooks/friends/useFriendActions.ts#L61)

React Query hook providing mutation functions for all friend-related actions.

This hook returns mutation objects for sending, accepting, rejecting, and cancelling
friend requests, as well as unfriending and blocking users. Each mutation includes
automatic query invalidation and toast notifications for user feedback.

## Returns

`object`

Object containing mutation functions for friend actions:
- `sendRequest` - Send a friend request to a user
- `acceptRequest` - Accept a pending friend request
- `rejectRequest` - Reject a pending friend request
- `cancelRequest` - Cancel a sent friend request
- `unfriend` - Remove an existing friendship
- `blockUser` - Block a user
- `unblockUser` - Unblock a user

### sendRequest

> **sendRequest**: `UseMutationResult`\<`ServiceResponse`\<`FriendRequest`\>, `Error`, `string`, `unknown`\>

### acceptRequest

> **acceptRequest**: `UseMutationResult`\<`ServiceResponse`\<`void`\>, `Error`, `string`, `unknown`\>

### rejectRequest

> **rejectRequest**: `UseMutationResult`\<`ServiceResponse`\<`void`\>, `Error`, `string`, `unknown`\>

### cancelRequest

> **cancelRequest**: `UseMutationResult`\<`ServiceResponse`\<`void`\>, `Error`, `string`, `unknown`\>

### unfriend

> **unfriend**: `UseMutationResult`\<`ServiceResponse`\<`void`\>, `Error`, `string`, \{ `previousFriends`: `unknown`; \}\>

### blockUser

> **blockUser**: `UseMutationResult`\<`ServiceResponse`\<`void`\>, `Error`, \{ `userId`: `string`; `reason?`: `string`; \}, `unknown`\>

## Example

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';

function FriendRequestCard({ request }) {
  const { acceptRequest, rejectRequest } = useFriendActions();

  const handleAccept = () => {
    acceptRequest.mutate(request.id);
  };

  const handleReject = () => {
    rejectRequest.mutate(request.id);
  };

  return (
    <div>
      <p>{request.sender.full_name} wants to be friends</p>
      <button 
        onClick={handleAccept}
        disabled={acceptRequest.isPending}
      >
        {acceptRequest.isPending ? 'Accepting...' : 'Accept'}
      </button>
      <button 
        onClick={handleReject}
        disabled={rejectRequest.isPending}
      >
        Reject
      </button>
    </div>
  );
}
```

## See

 - [friendsService](../../../../services/friendsService/variables/friendsService.md) for the underlying service functions
 - useFriends to fetch the friends list
 - useFriendRequests to fetch friend requests
