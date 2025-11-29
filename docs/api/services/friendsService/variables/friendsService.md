[**sync-app v0.0.0**](../../../README.md)

***

[sync-app](../../../README.md) / [services/friendsService](../README.md) / friendsService

# Variable: friendsService

> `const` **friendsService**: `object`

Defined in: [src/services/friendsService.ts:19](https://github.com/umamaheshmadala/sync_warp/blob/7bc49d2f6f5f71a9227856923276d19db183bbd9/src/services/friendsService.ts#L19)

Friends Service - Centralized business logic for friend operations

## Type Declaration

### getFriends()

> **getFriends**(`userId`): `Promise`\<`ServiceResponse`\<`Friend`[]\>\>

Get user's friends with online status

#### Parameters

##### userId

`string`

The user ID to fetch friends for

#### Returns

`Promise`\<`ServiceResponse`\<`Friend`[]\>\>

ServiceResponse with array of friends

### sendFriendRequest()

> **sendFriendRequest**(`receiverId`, `message?`): `Promise`\<`ServiceResponse`\<`FriendRequest`\>\>

Send friend request

#### Parameters

##### receiverId

`string`

The user ID to send request to

##### message?

`string`

Optional message to include

#### Returns

`Promise`\<`ServiceResponse`\<`FriendRequest`\>\>

ServiceResponse with created friend request

### acceptFriendRequest()

> **acceptFriendRequest**(`requestId`): `Promise`\<`ServiceResponse`\<`void`\>\>

Accept friend request (uses RPC for atomic operation)

#### Parameters

##### requestId

`string`

The friend request ID to accept

#### Returns

`Promise`\<`ServiceResponse`\<`void`\>\>

ServiceResponse indicating success/failure

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
