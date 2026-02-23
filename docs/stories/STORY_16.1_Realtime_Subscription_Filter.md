# STORY 16.1 — Add `conversation_id` Filter to Realtime Message Subscriptions

**Epic:** [EPIC 16 — Messaging Speed & Realtime Optimization](../epics/EPIC_16_Messaging_Speed_Realtime_Optimization.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 3 story points  
**Dependencies:** None  
**Audit Findings:** 3.1, 5.1  

---

## 🎯 Goal

Eliminate the realtime "firehose" pattern where the conversation-list subscription listens to **all** changes on the `conversations` and `notification_log` tables without any user-scoped filter. Currently, every INSERT on `notification_log` and every change on `conversations` — regardless of which user it belongs to — triggers a callback for **every** connected client. At 1,000 users this burns through the 2M realtime-messages/month quota in days.

---

## 📍 Current State (What Exists)

### Per-conversation subscriptions — already filtered ✅

[realtimeService.ts — subscribeToMessages()](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts#L237-L302) already uses a `conversation_id=eq.${conversationId}` filter on `postgres_changes`:

```typescript
// Line 268 — ALREADY filtered (Story 8.11.1 fix)
filter: `conversation_id=eq.${conversationId}`
```

The same filter pattern is applied in:
- `subscribeToMessageUpdates()` (line 326) — `conversation_id=eq.${conversationId}`
- `subscribeToReadReceipts()` (line 373) — `conversation_id=eq.${conversationId}`

**These per-conversation subscriptions are already correct and do NOT need changes.**

### Conversation-list subscription — firehose 🔴

[realtimeService.ts — subscribeToConversations()](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts#L687-L724) is the problem:

```typescript
// Line 703-706 — NO filter → firehose
.on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, ...)
// Line 709-712 — NO filter → firehose
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_log' }, ...)
```

This channel listens to **ALL** conversation changes and **ALL** notification_log inserts across **ALL** users. Every connected client receives every event.

### Conversation-list subscription — no-op stub 🟡

[realtimeService.ts — subscribeToConversationList()](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts#L476-L490) is currently a **no-op stub** — it creates a channel name but immediately returns the unsubscribe function without actually subscribing to any tables. The comments suggest subscribing to `conversation_participants` was considered but not implemented. This method can be safely removed.

### In-app notifications — firehose on `notification_log` 🔴

[realtimeService.ts — subscribeToInAppNotifications()](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts#L500-L560) subscribes to `notification_log` inserts **without any user-scoped filter** — this is another firehose:

```typescript
// Line 519-525 — NO user_id filter → firehose
.on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: 'notification_log'
  },
  (payload) => { ... }
)
```

**Every notification for every user triggers a callback on every connected client.** This must be fixed by adding `filter: \`user_id=eq.${userId}\``.

---

## 🔧 Implementation Details

### Step 1: Filter `subscribeToConversations()` by user's conversation IDs

**File:** [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts)

The `conversations` table does not have a `user_id` column — it uses a join table `conversation_participants`. Supabase Realtime only supports filters on columns of the subscribed table. Therefore, **we cannot filter `conversations` by user on the server side.**

**Solution — switch to a `conversation_participants`-based subscription:**

Replace the current `subscribeToConversations()` approach:

```typescript
// BEFORE (firehose — lines 703-712)
.on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, ...)
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_log' }, ...)

// AFTER — subscribe to conversation_participants filtered by user_id
.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'conversation_participants',
    filter: `user_id=eq.${userId}`
  },
  (payload) => {
    // Participant row changed → conversation was created, archived, pinned, muted, or deleted for this user
    onUpdate(payload);
  }
)
```

This ensures only changes relevant to the current user trigger callbacks.

**The `notification_log` listener should be removed** from `subscribeToConversations()` entirely — it is redundant once `subscribeToInAppNotifications()` is fixed with a user-scoped filter (see Step 1b below).

### Step 2: Update `subscribeToConversations()` signature to accept `userId`

**File:** [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts)

Current signature:
```typescript
subscribeToConversations(onUpdate: ConversationUpdateCallback): () => void
```

New signature:
```typescript
subscribeToConversations(userId: string, onUpdate: ConversationUpdateCallback): () => void
```

### Step 3: Update all callers of `subscribeToConversations()`

Search all call sites of `realtimeService.subscribeToConversations(` and pass `userId`:

```bash
# Expected callers (grep for subscribeToConversations):
# - src/hooks/useConversations.ts or wherever the conversation list hook is
# - src/components/messaging/MessagingLayout.tsx
```

Each caller must pass the authenticated user's ID. Since these components already have access to the user via `useAuthStore`, this is straightforward:

```typescript
// BEFORE
realtimeService.subscribeToConversations((payload) => { ... });

// AFTER
realtimeService.subscribeToConversations(user.id, (payload) => { ... });
```

### Step 4: Add `user_id` filter to `subscribeToInAppNotifications()`

**File:** [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts#L500-L560)

This method subscribes to ALL `notification_log` inserts without a user filter. Add the filter:

```typescript
// BEFORE (firehose — line 519-525)
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_log' }, ...)

// AFTER — filter by user_id
.on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: 'notification_log',
    filter: `user_id=eq.${userId}`
  },
  (payload) => { ... }
)
```

The `userId` parameter already exists in the method signature — it just isn't used for filtering.

### Step 5: Remove the no-op `subscribeToConversationList()` stub

**File:** [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts#L476-L490)

This is a no-op stub that creates a channel name but never subscribes. Remove it entirely — its intended functionality is covered by the updated `subscribeToConversations()` method.

Check for callers first:
```bash
grep -rn "subscribeToConversationList" src/
```

If callers exist, redirect them to `subscribeToConversations()`. If none, delete the method.

### Step 6: Verify client-side filtering remains as safety net

Keep the existing client-side `conversation_id` check in `subscribeToMessages()` (line 273) as a defense-in-depth layer:

```typescript
if (newMessage.conversation_id === conversationId) {
  onNewMessage(newMessage);
}
```

This costs nothing and protects against Supabase filter bugs.

---

## 🧪 Verification

### Dev Tools Checks
1. **WebSocket Inspector (Chrome DevTools → Network → WS):**
   - Open the messages page
   - Inspect the WebSocket frames
   - Verify the subscription payload includes `filter: "user_id=eq.<your-user-id>"` for conversation_participants
   - Verify NO unfiltered subscriptions to `conversations` or `notification_log` tables

2. **Console Logs:**
   - Open a conversation
   - Have a second user send a message in a **different** conversation
   - Verify the first user's console does NOT log any callback from the second user's conversation

3. **Channel Count:**
   - Call `realtimeService.getActiveChannelCount()` in console
   - Verify the channel count matches expectations (1 for conversation list, N for active conversations)

### Quota Verification
1. **Supabase Dashboard → Realtime → Messages:**
   - Monitor over 24 hours
   - With 2 test users chatting, verify message count grows only proportional to actual messages sent, NOT proportional to total messages across all users

---

## ✅ Acceptance Criteria

- [ ] `subscribeToConversations()` accepts `userId` parameter and filters `conversation_participants` by `user_id`
- [ ] The `notification_log` listener is removed from `subscribeToConversations()` (handled by `subscribeToInAppNotifications()` after fix)
- [ ] `subscribeToInAppNotifications()` adds `filter: \`user_id=eq.${userId}\`` to the `notification_log` subscription
- [ ] `subscribeToConversationList()` no-op stub is removed
- [ ] Client-side safety filter retained in `subscribeToMessages()`
- [ ] WebSocket inspector shows NO unfiltered table subscriptions
- [ ] Second user's messages and notifications do NOT trigger callbacks in first user's client
- [ ] All existing messaging features work: send, receive, read receipts, typing indicators, conversation list updates, notification toasts
- [ ] Console shows no errors on subscription setup
- [ ] No regression in conversation list refresh when user receives a new message

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts) | MODIFY — `subscribeToConversations()` add userId filter, remove notification_log listener |
| [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts) | MODIFY — `subscribeToInAppNotifications()` add `user_id` filter to notification_log subscription |
| [realtimeService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/realtimeService.ts) | DELETE — `subscribeToConversationList()` no-op stub |
| Callers of `subscribeToConversations()` | MODIFY — pass `userId` argument |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `conversation_participants` might not have realtime enabled | Verify in Supabase Dashboard → Database → Replication that `conversation_participants` is included |
| Breaking conversation list refresh | Keep client-side safety checks; test with 2 users actively chatting |
| Supabase Realtime filter bugs on non-PK columns | `user_id` in `conversation_participants` should be reliable as it's part of a composite key; keep client-side filtering as fallback |
