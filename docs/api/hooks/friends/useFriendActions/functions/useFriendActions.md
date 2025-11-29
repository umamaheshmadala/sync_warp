[**sync-app v0.0.0**](../../../../README.md)

***

[sync-app](../../../../README.md) / [hooks/friends/useFriendActions](../README.md) / useFriendActions

# Function: useFriendActions()

> **useFriendActions**(): `object`

Defined in: [src/hooks/friends/useFriendActions.ts:6](https://github.com/umamaheshmadala/sync_warp/blob/7bc49d2f6f5f71a9227856923276d19db183bbd9/src/hooks/friends/useFriendActions.ts#L6)

## Returns

`object`

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
