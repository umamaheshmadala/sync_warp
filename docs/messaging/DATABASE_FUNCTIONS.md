# 📚 Messaging Database Functions Documentation

**Story**: 8.1.4 - Message Sending & Receiving Core Logic  
**Status**: ✅ Implemented  
**Migration**: `20250204_create_messaging_functions.sql`

---

## Overview

This document describes the core database functions that power the messaging system. These functions provide atomic operations for sending messages, managing read receipts, and handling conversations.

---

## Functions

### 1. `send_message()`

**Purpose**: Atomically send a message with auto-receipt generation and share tracking

**Signature**:
```sql
send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type TEXT DEFAULT 'text',
  p_media_urls TEXT[] DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_link_preview JSONB DEFAULT NULL,
  p_shared_coupon_id UUID DEFAULT NULL,
  p_shared_deal_id UUID DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
) RETURNS UUID
```

**Features**:
- ✅ Atomic message creation
- ✅ Auto-generates read receipts for all participants (except sender)
- ✅ Updates conversation `last_message_at` timestamp
- ✅ Tracks coupon/deal shares in `shares` table
- ✅ Validates sender is a conversation participant

**Example Usage (Frontend)**:
```typescript
import { sendMessage } from '../services/messagingService';

// Send simple text message
const result = await sendMessage({
  conversationId: 'conv-uuid-here',
  content: 'Hello, how are you?'
});

// Send message with image
const result = await sendMessage({
  conversationId: 'conv-uuid-here',
  content: 'Check out this photo!',
  type: 'image',
  mediaUrls: ['storage/path/to/image.jpg'],
  thumbnailUrl: 'storage/path/to/thumbnail.jpg'
});

// Share a coupon via message
const result = await sendMessage({
  conversationId: 'conv-uuid-here',
  content: 'Found this great deal for you!',
  type: 'coupon',
  sharedCouponId: 'coupon-uuid-here'
});
```

**Errors**:
- `Conversation not found` - Invalid conversation ID
- `User is not a conversation participant` - Sender not in conversation

---

### 2. `mark_message_as_read()`

**Purpose**: Mark a message as read and update status

**Signature**:
```sql
mark_message_as_read(p_message_id UUID) RETURNS BOOLEAN
```

**Features**:
- ✅ Updates read receipt `read_at` timestamp
- ✅ Updates message status to `'read'` if all recipients have read
- ✅ Validates user is in conversation
- ✅ Prevents marking own messages as read

**Example Usage (Frontend)**:
```typescript
import { markMessageAsRead } from '../services/messagingService';

const result = await markMessageAsRead('message-uuid-here');
// result.success === true
```

**Errors**:
- `Message not found` - Invalid message ID
- `User not in conversation` - User not a participant

---

### 3. `get_unread_message_count()`

**Purpose**: Get total unread message count for current user

**Signature**:
```sql
get_unread_message_count() RETURNS INTEGER
```

**Features**:
- ✅ Counts unread messages across all conversations
- ✅ Excludes user's own messages
- ✅ Excludes deleted messages
- ✅ Optimized with `STABLE` for caching

**Example Usage (Frontend)**:
```typescript
import { getUnreadMessageCount } from '../services/messagingService';

const result = await getUnreadMessageCount();
// result.count = 5

// Display in UI badge
<Badge>{result.count}</Badge>
```

---

### 4. `create_or_get_conversation()`

**Purpose**: Create new direct conversation or return existing (prevents duplicates)

**Signature**:
```sql
create_or_get_conversation(p_participant_id UUID) RETURNS UUID
```

**Features**:
- ✅ Checks for existing direct conversation between users
- ✅ Returns existing conversation ID if found
- ✅ Creates new conversation if none exists
- ✅ Validates users are friends
- ✅ Validates no blocking exists
- ✅ Creates participant entries

**Example Usage (Frontend)**:
```typescript
import { createOrGetConversation } from '../services/messagingService';

// Start conversation with friend
const result = await createOrGetConversation('friend-uuid-here');
// result.conversationId = 'conv-uuid'

// Navigate to conversation
router.push(`/messages/${result.conversationId}`);
```

**Errors**:
- `Users must be friends to create conversation` - Not friends
- `Cannot create conversation with blocked user` - Blocking exists

---

## Trigger

### `messages_update_conversation_trigger`

**Purpose**: Auto-update conversation timestamp when new message is created

**Trigger Type**: `AFTER INSERT ON messages`

**Function**: `update_conversation_timestamp()`

**Behavior**:
- Automatically updates `conversations.last_message_at` to message `created_at`
- Updates `conversations.updated_at` to current timestamp
- Fires for every new message (including direct INSERTs)

**Note**: This is redundant with `send_message()` function's update but provides safety for any direct INSERTs.

---

## Notification Types

The following notification types have been added to the `notification_type` enum:

| Type | Description |
|------|-------------|
| `message_received` | New message in any conversation |
| `message_reply` | Reply to user's message |
| `coupon_shared_message` | Coupon shared via message |
| `deal_shared_message` | Deal/offer shared via message |

These enable push notifications for messaging events.

---

## Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| **Web** | ✅ Full | Functions called via `supabase.rpc()` |
| **iOS** | ✅ Full | Same functions via supabase-js |
| **Android** | ✅ Full | Same functions via supabase-js |

**Database functions are server-side and platform-agnostic.**

---

## Security

All functions use `SECURITY DEFINER` to enforce:
- ✅ RLS policies on tables
- ✅ `auth.uid()` for current user context
- ✅ Participant validation
- ✅ Friendship validation
- ✅ Blocking validation

**Permissions**: `GRANT EXECUTE TO authenticated` on all functions.

---

## Performance Considerations

1. **Atomicity**: All operations are atomic (single transaction)
2. **Indexing**: Functions leverage existing indexes on:
   - `conversations(participants)` - GIN index
   - `messages(conversation_id, created_at)`
   - `message_read_receipts(message_id, user_id)`
3. **Caching**: `get_unread_message_count()` marked as `STABLE` for query caching
4. **Network Efficiency**: Single RPC call vs multiple queries (reduces round trips)

---

## Testing

### Manual Testing

```sql
-- 1. Send a test message
SELECT send_message(
  'conversation-uuid-here',
  'Test message content',
  'text'
);
-- Returns: message UUID

-- 2. Verify read receipts created
SELECT * FROM message_read_receipts 
WHERE message_id = 'message-uuid-from-step-1';

-- 3. Mark message as read
SELECT mark_message_as_read('message-uuid-from-step-1');
-- Returns: true

-- 4. Get unread count
SELECT get_unread_message_count();
-- Returns: integer count

-- 5. Create/get conversation
SELECT create_or_get_conversation('friend-uuid-here');
-- Returns: conversation UUID
```

### Frontend Integration Testing

See `src/pages/test/MessagingTest.tsx` (Story 8.2.x) for interactive UI tests.

---

## Error Handling

All functions follow these patterns:

**Success**: Return expected value (UUID, BOOLEAN, INTEGER)

**Errors**: Raise PostgreSQL exceptions with descriptive messages:
- `RAISE EXCEPTION 'Message'` - Caught by Supabase client as `error.message`

Frontend should handle errors:
```typescript
const result = await sendMessage(params);
if (result.error) {
  toast.error(result.error);
} else {
  // Success: result.messageId
}
```

---

## Migration Verification

Run these queries to verify migration success:

```sql
-- 1. Verify all functions exist
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname IN (
  'send_message', 
  'mark_message_as_read', 
  'get_unread_message_count', 
  'create_or_get_conversation'
)
ORDER BY proname;

-- 2. Verify trigger exists
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'messages_update_conversation_trigger';

-- 3. Verify notification types added
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
ORDER BY enumlabel;
```

---

## Related Documentation

- [STORY 8.1.4 Specification](../stories/STORY_8.1.4_Core_Database_Functions.md)
- [RLS Policies](./RLS_POLICIES.md)
- [Storage Structure](./STORAGE_STRUCTURE.md)
- [Messaging Service API](../../src/services/messagingService.ts)

---

**Implementation Date**: 2025-02-04  
**Last Updated**: 2025-02-04
