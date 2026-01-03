[**sync-app v0.0.0**](../../../README.md)

***

[sync-app](../../../README.md) / [services/friendsService](../README.md) / friendsService

# Variable: friendsService

> `const` **friendsService**: `object`

Defined in: [src/services/friendsService.ts:19](https://github.com/umamaheshmadala/sync_warp/blob/8d292941aaca173973ab1c4a6404fce0eac57cf4/src/services/friendsService.ts#L19)

Friends Service - Centralized business logic for friend operations

## Type Declaration

### getFriends()

> **getFriends**(`userId`): `Promise`\<`ServiceResponse`\<`Friend`[]\>\>

Retrieves the list of friends for a specific user with their online status.

This function fetches all active friendships for the given user and returns
detailed profile information including online status and last active time.
Implements retry logic and circuit breaker pattern for reliability.

#### Parameters

##### userId

`string`

The UUID of the user whose friends to fetch

#### Returns

`Promise`\<`ServiceResponse`\<`Friend`[]\>\>

Promise resolving to ServiceResponse containing array of Friend objects

#### Example

```typescript
const { success, data: friends, error } = await friendsService.getFriends('user-123');

if (success) {
  console.log(`User has ${friends.length} friends`);
  friends.forEach(friend => {
    console.log(`${friend.full_name} - ${friend.is_online ? 'Online' : 'Offline'}`);
  });
} else {
  console.error('Failed to fetch friends:', error);
}
```

#### See

 - Friend for the structure of friend objects
 - ServiceResponse for response format

### sendFriendRequest()

> **sendFriendRequest**(`receiverId`, `message?`): `Promise`\<`ServiceResponse`\<`FriendRequest`\>\>

Sends a friend request to another user.

This function creates a new friend request with privacy checks and offline support.
If the user is offline, the request is queued for later processing.
Checks privacy settings before sending to ensure the receiver accepts friend requests.

#### Parameters

##### receiverId

`string`

The UUID of the user to send the friend request to

##### message?

`string`

Optional personal message to include with the request

#### Returns

`Promise`\<`ServiceResponse`\<`FriendRequest`\>\>

Promise resolving to ServiceResponse with the created FriendRequest

#### Throws

If user is not authenticated

#### Throws

If receiver's privacy settings block friend requests

#### Example

```typescript
// Send a friend request with a message
const { success, data: request, queued } = await friendsService.sendFriendRequest(
  'user-456',
  'Hey! I saw your profile and would love to connect!'
);

if (queued) {
  toast.info('Request will be sent when you\'re back online');
} else if (success) {
  toast.success('Friend request sent!');
} else {
  toast.error('Failed to send request');
}
```

#### See

 - FriendRequest for the structure of friend request objects
 - offlineQueue for offline request handling

### acceptFriendRequest()

> **acceptFriendRequest**(`requestId`): `Promise`\<`ServiceResponse`\<`void`\>\>

Accepts a pending friend request and creates a bidirectional friendship.

This function uses a database RPC (Remote Procedure Call) to atomically:
1. Update the friend request status to 'accepted'
2. Create bidirectional friendship records
3. Send notification to the requester

The atomic operation ensures data consistency even under concurrent requests.

#### Parameters

##### requestId

`string`

The UUID of the friend request to accept

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

Promise resolving to ServiceResponse indicating success or failure

#### Throws

If the request doesn't exist or is not in pending status

#### Throws

If the RPC call fails

#### Example

```typescript
const { success, error } = await friendsService.acceptFriendRequest('request-789');

if (success) {
  toast.success('You are now friends!');
  // Invalidate friends list query to show new friend
  queryClient.invalidateQueries(['friends']);
} else {
  toast.error(`Failed to accept request: ${error}`);
}
```

#### See

 - [rejectFriendRequest](#rejectfriendrequest) to reject a friend request instead
 - [unfriend](#unfriend) to remove an existing friendship

### rejectFriendRequest()

> **rejectFriendRequest**(`requestId`): `Promise`\<`ServiceResponse`\<`void`\>\>

Reject friend request

#### Parameters

##### requestId

`string`

The friend request ID to reject

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

ServiceResponse indicating success/failure

### cancelFriendRequest()

> **cancelFriendRequest**(`requestId`): `Promise`\<`ServiceResponse`\<`void`\>\>

Cancel friend request (delete pending request)

#### Parameters

##### requestId

`string`

The friend request ID to cancel

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

ServiceResponse indicating success/failure

### unfriend()

> **unfriend**(`friendId`): `Promise`\<`ServiceResponse`\<`void`\>\>

Unfriend user (uses RPC for atomic operation)

#### Parameters

##### friendId

`string`

The friend's user ID to unfriend

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

ServiceResponse indicating success/failure

### blockUser()

> **blockUser**(`userId`, `reason?`): `Promise`\<`ServiceResponse`\<`void`\>\>

Block user (uses RPC)

#### Parameters

##### userId

`string`

The user ID to block

##### reason?

`string`

Optional reason for blocking

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

ServiceResponse indicating success/failure

### unblockUser()

> **unblockUser**(`userId`): `Promise`\<`ServiceResponse`\<`void`\>\>

Unblock user

#### Parameters

##### userId

`string`

The user ID to unblock

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

ServiceResponse indicating success/failure

### searchMyFriends()

> **searchMyFriends**(`query`): `Promise`\<`ServiceResponse`\<`Friend`[]\>\>

Search friends by name or username (Search My Friends)

#### Parameters

##### query

`string`

Search query string

#### Returns

`Promise`\<`ServiceResponse`\<`Friend`[]\>\>

ServiceResponse with array of matching friends

### searchUsers()

> **searchUsers**(`query`, `limit`): `Promise`\<`ServiceResponse`\<`any`[]\>\>

Search for users globally (Friend Discovery)

#### Parameters

##### query

`string`

##### limit

`number` = `20`

#### Returns

`Promise`\<`ServiceResponse`\<`any`[]\>\>

### getSentRequests()

> **getSentRequests**(): `Promise`\<`ServiceResponse`\<`FriendRequest`[]\>\>

Get pending requests sent by current user

#### Returns

`Promise`\<`ServiceResponse`\<`FriendRequest`[]\>\>

### getMutualFriends()

> **getMutualFriends**(`userId`): `Promise`\<`ServiceResponse`\<`Friend`[]\>\>

Get mutual friends with another user

#### Parameters

##### userId

`string`

The user ID to find mutual friends with

#### Returns

`Promise`\<`ServiceResponse`\<`Friend`[]\>\>

ServiceResponse with array of mutual friends

### getOnlineFriendsCount()

> **getOnlineFriendsCount**(`userId`): `Promise`\<`ServiceResponse`\<`number`\>\>

Get count of online friends

#### Parameters

##### userId

`string`

The user ID to count online friends for

#### Returns

`Promise`\<`ServiceResponse`\<`number`\>\>

ServiceResponse with count of online friends

### getFriendRequests()

> **getFriendRequests**(`userId`): `Promise`\<`ServiceResponse`\<`FriendRequest`[]\>\>

Get pending friend requests for user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`ServiceResponse`\<`FriendRequest`[]\>\>

### updateOnlineStatus()

> **updateOnlineStatus**(`userId`, `isOnline`): `Promise`\<`ServiceResponse`\<`void`\>\>

Update user online status

#### Parameters

##### userId

`string`

##### isOnline

`boolean`

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

### getFriendActivity()

> **getFriendActivity**(`userId`, `limit`): `Promise`\<`ServiceResponse`\<`any`[]\>\>

Get friend activity feed

#### Parameters

##### userId

`string`

##### limit

`number` = `20`

#### Returns

`Promise`\<`ServiceResponse`\<`any`[]\>\>

### createActivity()

> **createActivity**(`userId`, `activityType`, `activityData`): `Promise`\<`ServiceResponse`\<`void`\>\>

Create activity for user

#### Parameters

##### userId

`string`

##### activityType

`string`

##### activityData

`any`

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

### shareDeal()

> **shareDeal**(`senderId`, `receiverId`, `dealData`): `Promise`\<`ServiceResponse`\<`void`\>\>

Share deal with friend

#### Parameters

##### senderId

`string`

##### receiverId

`string`

##### dealData

`any`

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

### areFriends()

> **areFriends**(`userId`, `friendId`): `Promise`\<`boolean`\>

Check if two users are friends (O(1) lookup)

#### Parameters

##### userId

`string`

##### friendId

`string`

#### Returns

`Promise`\<`boolean`\>

### getFriendCount()

> **getFriendCount**(`userId`): `Promise`\<`number`\>

Get friend count for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`number`\>

### getPymkSuggestions()

> **getPymkSuggestions**(`userId`, `limit`): `Promise`\<`ServiceResponse`\<`any`[]\>\>

Get People You May Know suggestions

#### Parameters

##### userId

`string`

##### limit

`number` = `10`

#### Returns

`Promise`\<`ServiceResponse`\<`any`[]\>\>

### dismissPymkSuggestion()

> **dismissPymkSuggestion**(`suggestedUserId`): `Promise`\<`ServiceResponse`\<`void`\>\>

Dismiss a PYMK suggestion

#### Parameters

##### suggestedUserId

`string`

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

### subscribeToFriendUpdates()

> **subscribeToFriendUpdates**(`userId`, `callback`): `RealtimeChannel`

Subscribe to real-time friend status updates

#### Parameters

##### userId

`string`

##### callback

(`friend`) => `void`

#### Returns

`RealtimeChannel`

### subscribeToFriendshipChanges()

> **subscribeToFriendshipChanges**(`userId`, `callback`): `RealtimeChannel`

Subscribe to friendship changes (realtime)

#### Parameters

##### userId

`string`

##### callback

(`payload`) => `void`

#### Returns

`RealtimeChannel`

### saveFriendSearchQuery()

> **saveFriendSearchQuery**(`query`): `Promise`\<`void`\>

Save search query to history

#### Parameters

##### query

`string`

#### Returns

`Promise`\<`void`\>

### getFriendSearchHistory()

> **getFriendSearchHistory**(): `Promise`\<`ServiceResponse`\<`any`[]\>\>

Get user's search history

#### Returns

`Promise`\<`ServiceResponse`\<`any`[]\>\>

### clearFriendSearchHistory()

> **clearFriendSearchHistory**(): `Promise`\<`ServiceResponse`\<`void`\>\>

Clear all search history

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>
