# Story 8.6.8: Messaging UX Improvements & Bug Fixes

**Epic:** 8.6 - Push Notifications & Real-Time Updates  
**Priority:** High  
**Story Points:** 8  
**Date Created:** 2025-12-08

## User Story

As a user, I want a polished messaging experience with reliable read receipts, proper notifications, and clean UI so that my chat experience matches industry standards like WhatsApp.

## Acceptance Criteria

### ✅ Completed

#### 1. Global Unread Badge Reliability

- [x] Badge updates globally across all pages (Home, Settings, Messages, etc.)
- [x] Uses proven `fetchConversations()` logic instead of unreliable RPC
- [x] Listens to realtime `notifications` and `message_read_receipts` tables
- [x] Badge count always accurate and in sync

**Files Modified:**

- `src/hooks/useUnreadCountSubscription.ts`

#### 2. In-App Notification Resizing (WhatsApp-style)

- [x] Notifications are compact (80x60px footprint)
- [x] Message preview limited to 2 lines with ellipsis
- [x] Reduced padding: 12px → 8px
- [x] Font sizes: title 13px, body 12px
- [x] Border radius: 12px → 8px
- [x] Only custom banner shows (no duplicate toasts)

**Files Modified:**

- `src/components/NotificationToast.css`
- `src/hooks/useRealtimeNotifications.ts`

#### 3. Visibility-Based Read Receipts

- [x] Messages only marked as read when scrolled into view (50% visible)
- [x] Uses IntersectionObserver API for detection
- [x] Batching logic (500ms window) to prevent excessive RPCs
- [x] Tracks already-visible messages to prevent duplicates
- [x] Only tracks incoming messages (skips own messages)

**Files Modified:**

- `src/hooks/useMessageVisibility.ts` (NEW)
- `src/components/messaging/MessageBubble.tsx`
- `src/components/messaging/MessageList.tsx`
- `src/components/messaging/ChatScreen.tsx`

**Implementation:**

```typescript
// Hook for visibility detection
useMessageVisibility({
  messageId: message.id,
  onVisible: (messageId) => {
    onMessageVisible?.(messageId);
  },
  enabled: !isOwn && !message._optimistic,
});

// Batching logic in ChatScreen
const handleMessageVisible = useCallback(
  (messageId: string) => {
    visibleMessagesRef.current.add(messageId);
    pendingReadReceiptsRef.current.add(messageId);

    // Wait 500ms, then send batch
    clearTimeout(batchTimerRef.current);
    batchTimerRef.current = setTimeout(async () => {
      const messages = Array.from(pendingReadReceiptsRef.current);
      await conversationManagementService.markConversationAsRead(
        conversationId
      );
    }, 500);
  },
  [conversationId]
);
```

#### 4. Smart Auto-Scroll Behavior

- [x] Only auto-scrolls if:
  - User sent the message (own messages), OR
  - User is already at bottom of chat
- [x] "New Messages" floating button when scrolled up
- [x] Button disappears when scrolling to bottom
- [x] Scroll position tracking (within 100px = "at bottom")
- [x] Scroll listener with position detection

**Files Modified:**

- `src/components/messaging/ChatScreen.tsx`

**Implementation:**

```typescript
// Check if at bottom
const checkIfAtBottom = useCallback(() => {
  const container = document.querySelector(".message-list-scroll");
  const { scrollTop, scrollHeight, clientHeight } = container;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  return distanceFromBottom < 100;
}, []);

// Smart scroll logic
if (isOwnMessage) {
  scrollToBottom("smooth"); // Always scroll for own messages
} else if (userIsAtBottom) {
  scrollToBottom("smooth"); // Auto-scroll if at bottom
} else {
  setHasNewMessages(true); // Show button instead
}
```

### ⚠️ Pending / Not Fully Resolved

#### 5. Message Bubble Width Constraint

- [x] Set max-width to 80% of screen
- [x] Added `break-words` CSS for word wrapping
- [x] Added `overflow-wrap-anywhere` for aggressive wrapping
- [x] Added `max-w-full` to bubble container
- [ ] **ISSUE:** Still overflowing in some cases (long URLs, code blocks)
- [ ] **TODO:** Add `overflow-x: hidden` as fallback
- [ ] **TODO:** Test with various content types (URLs, code, markdown)

**Files Modified:**

- `src/components/messaging/MessageBubble.tsx`

**Current State:**

```typescript
// Parent container
<div className="flex flex-col gap-1 max-w-[80%]">

// Bubble container
className={cn(
  "px-4 py-2 rounded-2xl break-words max-w-full ...",
)}

// Text element
<p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
```

**Remaining Work:**

- Add `overflow-x: hidden` to bubble
- Test with edge cases
- Consider CSS `word-break: break-all` for URLs

## Technical Details

### Badge Update Flow

```
1. Realtime event fires (new notification or read receipt)
2. useUnreadCountSubscription triggers
3. Calls messagingService.fetchConversations()
4. Store recalculates totalUnreadCount
5. Badge updates globally ✓
```

### Read Receipt Flow

```
1. Message enters viewport (50% visible)
2. IntersectionObserver fires callback
3. messageId added to batch queue
4. After 500ms, mark conversation as read
5. Sender sees "read" status update ✓
```

### Auto-Scroll Decision Tree

```
New message arrives
├─ Is own message? → Always scroll
├─ User at bottom? → Auto-scroll
└─ User scrolled up → Show "New Messages" button
```

## Testing Performed

### ✅ Tested & Working

- Badge updates on new message
- Badge updates on mark as read
- Compact notification appearance
- No duplicate notification toasts
- Read receipts fire on scroll
- Batching prevents spam RPCs
- Auto-scroll for own messages
- "New Messages" button appears when scrolled up
- Button click scrolls to bottom smoothly

### ⚠️ Needs Testing

- Message width with very long URLs
- Message width with code blocks
- Message width with special characters
- Horizontal scroll prevention

## Dependencies

- None (standalone improvements)

## Related Stories

- Story 8.6.7: Long Message Text Expansion (Read More)
- Epic 8.6: Push Notifications & Real-Time Updates

## Notes

### Design Decisions

1. **Badge Update:** Chose `fetchConversations()` over RPC because it's proven reliable
2. **Read Receipts:** IntersectionObserver more accurate than scroll listeners
3. **Batching:** 500ms window balances responsiveness vs. performance
4. **Auto-Scroll:** WhatsApp-style UX prevents disrupting reading flow

### Known Issues

1. **Message Width:** Still needs `overflow-x: hidden` for edge cases
2. **Performance:** Consider virtualizing message list for 1000+ messages
3. **Animation:** Read More expand could use height animation

### Future Enhancements

- Persist "Read More" expanded state across navigation
- Add visual feedback when batch read receipt sends
- Smooth scroll animation for "New Messages" button
- Configurable batch window (settings)
