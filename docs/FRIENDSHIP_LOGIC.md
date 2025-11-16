# Friendship Logic - SynC

Based on Facebook's friendship model (see `Addl modules/Facebook level friends module.txt`)

## Core Principles

### 1. Bidirectional Relationships
- Friendships are **always bidirectional**
- When A and B are friends, two rows exist:
  - `friendships(user_id=A, friend_id=B, status='active')`
  - `friendships(user_id=B, friend_id=A, status='active')`
- The `trigger_create_reverse_friendship` automatically maintains this

### 2. Friend Request Flow

```
User A → Send Request → User B
  ↓
friend_requests(sender_id=A, receiver_id=B, status='pending')
  ↓
User B → Accept
  ↓
1. friend_requests.status = 'accepted'
2. INSERT friendships(A→B, status='active')
3. INSERT friendships(B→A, status='active') [auto via trigger]
```

**Function**: `accept_friend_request(request_id UUID)`

### 3. Unfriend Operation

**KEY**: Unfriend = **HARD DELETE** (not status change)

According to Facebook model (line 151):
> "Graph link between A and B is **deleted**"

```
User A → Unfriend → User B
  ↓
DELETE friendships WHERE (user_id=A AND friend_id=B)
  ↓
Trigger auto-deletes: friendships WHERE (user_id=B AND friend_id=A)
```

**Function**: `unfriend_user(p_friend_id UUID)`

Effects:
- Both rows deleted from `friendships`
- No notification sent
- Can send friend request again later
- Messages remain unless blocked

### 4. Status Values

#### friend_requests.status
- `'pending'` - waiting for response
- `'accepted'` - request accepted
- `'rejected'` - request rejected
- `'cancelled'` - sender cancelled

#### friendships.status
- `'active'` - currently friends
- `'unfriended'` - DEPRECATED (should be deleted instead)

**Migration**: Changed to HARD DELETE instead of status='unfriended'

### 5. Block Operation (Future)

When implemented:
- DELETE friendships (both directions)
- INSERT into blocks table
- Cannot search/message/view profile
- Cannot send friend request

## Database Functions

### accept_friend_request(request_id UUID)
- Validates request is pending
- Updates request status to 'accepted'
- Creates bidirectional friendships with status='active'
- Uses SECURITY DEFINER to bypass RLS

### unfriend_user(p_friend_id UUID)
- Deletes user's friendship row
- Trigger auto-deletes reverse row
- Double-checks to ensure both deleted
- Uses SECURITY DEFINER to bypass RLS

## Frontend Hooks

### useFriendsList
- Fetches friends with `status = 'active'`
- Sorted: online first, then alphabetically
- Infinite scroll (50 per page)

### useFriendActions
- `unfriend()` - calls `unfriend_user()` DB function
- `sendMessage()` - navigates to chat
- Optimistic UI updates with rollback

## Migration Path

Old code using `status = 'unfriended'`:
```typescript
// ❌ OLD (soft delete)
.update({ status: 'unfriended' })

// ✅ NEW (hard delete via DB function)
.rpc('unfriend_user', { p_friend_id: friendId })
```

Old code using `status = 'accepted'` for friendships:
```typescript
// ❌ OLD
.eq('status', 'accepted')

// ✅ NEW
.eq('status', 'active')
```
