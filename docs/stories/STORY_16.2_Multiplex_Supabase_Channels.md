# STORY 16.2 — Multiplex Supabase Realtime Channels (≤3 per User)

**Epic:** [EPIC 16 — Messaging Speed & Realtime Optimization](../epics/EPIC_16_Messaging_Speed_Realtime_Optimization.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 3 story points  
**Dependencies:** STORY 16.1 (subscription filter must be in place first)  
**Audit Findings:** 5.2  

---

## 🎯 Goal

Reduce the number of Supabase Realtime WebSocket channels from ~4+ per active conversation to a maximum of **3 channels per user session** (global + active-chat + presence), fitting comfortably under the Supabase free-tier 200-connection cap. Currently, at ~4+ channels per user, only ~50 concurrent users can be supported before hitting the limit. After this story, **~66 concurrent users** can be supported (200 / 3).

---

## 📍 Current State (What Exists)

### Channel creation pattern in RealtimeService

[realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts) creates a **separate channel** for each subscription type per conversation. When a user opens a chat, up to 4 channels are created:

| Channel Name Pattern | Table | Created By |
|---------------------|-------|-----------|
| `messages:${conversationId}` | `messages` (INSERT) | `subscribeToMessages()` L253 |
| `message-updates:${conversationId}` | `messages` (UPDATE) | `subscribeToMessageUpdates()` L314 |
| `read-receipts:${conversationId}` | `message_read_receipts` (INSERT) | `subscribeToReadReceipts()` L354 |
| `typing:${conversationId}` | Broadcast channel | `subscribeToTyping()` L572 |

Plus global channels:
| Channel Name | Table | Created By |
|-------------|-------|-----------|
| `user-conversations` | `conversations`, `notification_log` | `subscribeToConversations()` L694 |
| `online-users` | Presence | `presenceStore.ts` L30 |
| `in-app-notifications:${userId}` | `notification_log` | `subscribeToInAppNotifications()` L504 |
| `connection-status` | — | `monitorConnectionStatus()` L736 |

**At any time, a user may have 4 (per-convo) + 4 (global) = 8 channels open.** Each channel = 1 WebSocket connection on the Supabase side.

### Channel storage in RealtimeService

```typescript
// Line 43-44 of realtimeService.ts
private channels: Map<string, RealtimeChannel> = new Map();
```

Each channel is stored by name, cleaned up by `unsubscribe(channelName)`.

### PresenceStore — separate channel

[presenceStore.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/store/presenceStore.ts#L30) creates its own channel independently of `realtimeService`:

```typescript
channel = supabase.channel('online-users', { ... });
```

This does NOT go through `realtimeService` so it's not tracked in `this.channels`.

---

## 🔧 Implementation Details

### Architecture: 2-Channel Design

**Channel 1 — `user-global`:** Handles all user-scoped postgres_changes + presence + typed broadcast events.

**Channel 2 — `chat-active:${conversationId}`:** Handles the currently-active conversation's postgres_changes + typing broadcast.

When the user navigates to a different conversation, Channel 2 is unsubscribed and re-subscribed with the new `conversationId`.

### Step 1: Create a multiplexed global channel

**File:** [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts)

Create a single `setupGlobalChannel(userId: string)` method that combines:

```typescript
setupGlobalChannel(userId: string): void {
  const channelName = 'user-global';
  this.unsubscribe(channelName);

  const channel = supabase
    .channel(channelName)
    // 1. Conversation list updates (from Story 16.1 — filtered by user_id)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        this.globalCallbacks.onConversationUpdate?.(payload);
      }
    )
    // 2. In-app notifications (already filtered by user_id)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_log',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        this.globalCallbacks.onNotification?.(payload);
      }
    )
    .subscribe();

  this.channels.set(channelName, channel);
}
```

**Callbacks are registered via setter methods** instead of being passed at channel creation time:

```typescript
private globalCallbacks: {
  onConversationUpdate?: ConversationUpdateCallback;
  onNotification?: (payload: any) => void;
} = {};

registerConversationUpdateCallback(cb: ConversationUpdateCallback): void {
  this.globalCallbacks.onConversationUpdate = cb;
}

registerNotificationCallback(cb: (payload: any) => void): void {
  this.globalCallbacks.onNotification = cb;
}
```

### Step 2: Create a multiplexed active-chat channel

**File:** [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts)

Replace the 3 per-conversation channels + typing with a single:

```typescript
setupActiveChatChannel(conversationId: string): void {
  const channelName = 'chat-active';

  // Clean up previous active chat channel
  this.unsubscribe(channelName);

  const channel = supabase
    .channel(channelName)
    // 1. New messages (INSERT)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        this.chatCallbacks.onNewMessage?.(payload.new as Message);
      }
    )
    // 2. Message updates (UPDATE — edits, deletes)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        this.chatCallbacks.onMessageUpdate?.(payload.new as Message);
      }
    )
    // 3. Read receipts
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        this.chatCallbacks.onReadReceipt?.(payload.new);
      }
    )
    // 4. Typing indicators (broadcast — no postgres_changes, zero cost)
    .on(
      'broadcast',
      { event: 'typing' },
      (payload) => {
        this.chatCallbacks.onTypingChange?.(payload.payload);
      }
    )
    .subscribe();

  this.channels.set(channelName, channel);
  this.activeConversationId = conversationId;
}
```

**Note:** Supabase allows multiple `.on()` calls on the same channel. This is the documented way to multiplex — one channel, multiple event listeners.

### Step 3: Update original subscribe methods to delegate

Keep the existing `subscribeToMessages()`, `subscribeToMessageUpdates()`, etc. as **public API** but change their implementation to register callbacks on the multiplexed channel:

```typescript
subscribeToMessages(conversationId: string, onNewMessage: MessageCallback): () => void {
  // If this is for the active conversation, register on the multiplexed channel
  if (this.activeConversationId === conversationId) {
    this.chatCallbacks.onNewMessage = onNewMessage;
    return () => { this.chatCallbacks.onNewMessage = undefined; };
  }

  // For background conversations (e.g., unread count updates), the global channel handles it
  // No separate channel needed
  return () => {};
}
```

### Step 4: Migrate presenceStore to use the global channel

**File:** [presenceStore.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/store/presenceStore.ts)

Currently creates its own `supabase.channel('online-users')`. Migrate to use `realtimeService`'s global channel or keep as a standalone presence channel (presence is a different protocol from postgres_changes).

**Decision: Keep presence as a separate channel** because Supabase Presence uses a different protocol (track/untrack) vs postgres_changes. This means our 2-channel target becomes:
- Channel 1: `user-global` (postgres_changes)
- Channel 2: `chat-active` (postgres_changes + broadcast)
- Channel 3: `online-users` (presence) — already exists, no change needed

**Final target: ≤3 channels per user** (acceptable — 200 / 3 = 66 concurrent users, and presence channel is shared via Supabase's internal multiplexing for the same channel name).

### Step 5: Clean up deprecated methods

Mark the following as deprecated or remove:
- `subscribeToConversations()` — replaced by `setupGlobalChannel()`
- `subscribeToConversationList()` — merged into `setupGlobalChannel()`
- `subscribeToInAppNotifications()` — merged into `setupGlobalChannel()`
- `monitorConnectionStatus()` — can monitor on the global channel's status callback

### Step 6: Update initialization flow

**File:** [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts)

Update `init()` to call `setupGlobalChannel(userId)` on authentication. The active-chat channel is set up lazily when the user navigates to a conversation.

---

## 🧪 Verification

## Verification Steps

1. [x] **Compile Check:** Run `npm run build` or `npm run type-check` to ensure no TypeScript API mismatches.
2. [x] **Client Initialization:** Add console logs in `useConversations` and `useMessages` to confirm `setupGlobalChannel` and `setupActiveChatChannel` are called appropriately.
3. [x] **Network Monitoring:** Open browser dev tools (Network -> WS). Verify that only a maximum of 3 Supabase connections exist (Global, Active Chat, and Presence).
4. [x] **Message Sending/Receiving:** Send a message from one user to another. Verify the message is immediately received and displayed in the active chat.
5. [x] **Message Updates:** Edit a message and verify the update is reflected in real-time.
6. [x] **Read Receipts:** Open a chat with unread messages and verify the read status updates for the sender.
7. [x] **Typing Indicator:** Start typing in a chat and verify the typing indicator appears for the other user.
8. [x] **Conversation List Updates:** Have a background conversation receive a new message. Verify the unread badge or conversation list preview updates.
9. [x] **In-App Notifications:** Trigger an action that should create an in-app notification and verify it is received.
10. [x] **Context Switching:** Navigate between two different active chats. Verify the `chat-active` channel correctly unsubscribes from the old chat and binds to the newly active chat.

## ✅ Acceptance Criteria

- [x] Web client establishes a maximum of 3 Supabase Realtime WebSocket connections (Global, Chat, Presence).
- [x] All real-time messaging features (new messages, edits, deletes, read receipts, typing) function exactly as they did before the refactor.
- [x] Global events (conversation list updates, notifications) are received regardless of which chat is currently active.
- [x] The application handles navigating between different chats without leaking listeners or opening duplicate WebSocket channels.
- [x] TypeScript build passes without errors related to the `realtimeService` or its dependents.
- [ ] No increase in console errors or WebSocket failures
- [ ] Supabase Dashboard shows connection count proportional to users × 3

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts) | MODIFY — add `setupGlobalChannel()`, `setupActiveChatChannel()`, callback registry; refactor existing subscribe methods |
| Callers of `subscribeToMessages/Updates/ReadReceipts/Typing/Conversations` | MODIFY — use new callback registration pattern |
| [presenceStore.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/store/presenceStore.ts) | NO CHANGE — presence stays as separate channel |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Multiple `.on()` on one channel might miss events | This is Supabase's documented pattern; test thoroughly with concurrent send + edit + read receipt |
| Active-chat channel teardown/setup causes brief gap | Use `subscribe()` callback to confirm `SUBSCRIBED` before clearing old channel |
| Broadcast (typing) on the same channel as postgres_changes | Supabase supports this — `broadcast` events are protocol-level, not postgres_changes |
| Presence channel shared name collision | Supabase handles presence channels by name — `online-users` is global and shared, which is the intended behavior |
