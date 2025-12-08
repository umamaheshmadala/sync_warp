# 📱 STORY 8.6.9: Smart Scroll-to-Unread

**Parent Epic:** [EPIC 8.6 - Push Notifications & Real-time Updates](../epics/EPIC_8.6_Push_Notifications.md)  
**Story Owner:** Mobile Engineering  
**Estimated Effort:** 2-3 days  
**Priority:** P1 - High  
**Status:** 📋 Not Started  
**Dependencies:** Story 8.6.8 (Messaging UX Improvements)

---

## 🎯 **Story Goal**

Implement WhatsApp-style smart scroll positioning when opening a chat:

- Scroll to **first unread message** if unread messages exist
- Show "New Messages" divider above first unread
- Scroll to **last message** if all messages are read
- Maintain scroll position for partially read conversations

---

## 📋 **Acceptance Criteria**

### Core Behavior

- [ ] When opening chat with unread messages → scroll to first unread
- [ ] When opening chat with no unread → scroll to bottom
- [ ] "New Messages" divider appears above first unread message
- [ ] Divider styling matches WhatsApp (subtle, centered, gray)
- [ ] Messages auto-mark as read when scrolled into view (Story 8.6.8)

### Edge Cases

- [ ] Opening chat during message load → shows loader, scrolls when ready
- [ ] Opening chat with 100+ unread → scrolls to FIRST unread, not last
- [ ] New message arrives during initial load → queued, updates after scroll
- [ ] Chat with 10,000+ messages → uses virtualization efficiently
- [ ] User was scrolled mid-chat when closing → restores to last scroll position

### Performance

- [ ] Load only 30-50 messages around scroll target
- [ ] Virtualized list for chats with 200+ messages
- [ ] Smooth scroll animation (no jank)
- [ ] Initial scroll completes within 300ms

---

## 🧩 **Implementation Details**

### Task 1: Track First Unread Message

#### 1.1 Extend Message Query

```typescript
// In messagingService.ts or useMessages.ts
export const getFirstUnreadMessage = async (
  conversationId: string,
  userId: string
): Promise<Message | null> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .not("sender_id", "eq", userId) // Only received messages
    .is("read_at", null) // Not read yet
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
};
```

#### 1.2 Use Existing Read Receipt Logic

Leverage `message_read_receipts` table:

```typescript
const { data } = await supabase
  .from("message_read_receipts")
  .select("message_id")
  .eq("user_id", userId)
  .eq("conversation_id", conversationId);

const readMessageIds = new Set(data?.map((r) => r.message_id));
const firstUnread = messages.find((m) => !readMessageIds.has(m.id));
```

---

### Task 2: Implement Smart Scroll Logic

#### 2.1 Update ChatScreen.tsx Initial Scroll

```typescript
// ChatScreen.tsx
const scrollToTargetMessage = useCallback((targetMessageId: string) => {
  const targetElement = document.querySelector(
    `[data-message-id="${targetMessageId}"]`
  );
  if (targetElement) {
    targetElement.scrollIntoView({
      behavior: "auto", // Instant on initial load
      block: "start", // Align to top of viewport
    });
    hasCompletedInitialScroll.current = true;
  }
}, []);

// On chat open
useEffect(() => {
  if (!messages.length) return;

  const firstUnread = messages.find(
    (m) => m.sender_id !== currentUserId && !m.read_at
  );

  if (firstUnread) {
    // Scroll to first unread
    scrollToTargetMessage(firstUnread.id);
  } else {
    // Scroll to bottom (all read)
    scrollToBottom("auto");
  }
}, [conversationId]); // Run only when conversation changes
```

#### 2.2 Load Messages Around Scroll Target

```typescript
// Smart message loading based on scroll target
const loadMessagesAroundTarget = async (targetMessageId: string) => {
  // Get target message timestamp
  const targetMessage = await getMessageById(targetMessageId);

  // Load 30 messages before and after target
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .gte("created_at", calculateTimestamp(targetMessage, -30))
    .lte("created_at", calculateTimestamp(targetMessage, +30))
    .order("created_at", { ascending: true });

  return data;
};
```

---

### Task 3: Add "New Messages" Divider

#### 3.1 Create Divider Component

```typescript
// components/messaging/NewMessagesDivider.tsx
interface Props {
  unreadCount: number
}

export const NewMessagesDivider: React.FC<Props> = ({ unreadCount }) => {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-300" />
      <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
        {unreadCount} New Message{unreadCount > 1 ? 's' : ''}
      </span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  )
}
```

#### 3.2 Insert Divider in MessageList

```typescript
// In MessageList.tsx
{messages.map((message, index) => {
  const isFirstUnread =
    message.sender_id !== currentUserId &&
    !message.read_at &&
    (index === 0 || messages[index - 1].read_at !== null)

  return (
    <Fragment key={message.id}>
      {isFirstUnread && (
        <NewMessagesDivider unreadCount={unreadCount} />
      )}
      <MessageBubble message={message} {...props} />
    </Fragment>
  )
})}
```

---

### Task 4: Virtualization for Long Chats

#### 4.1 Install React-Virtuoso

```bash
npm install react-virtuoso
```

#### 4.2 Replace MessageList with Virtuoso

```typescript
// MessageList.tsx
import { Virtuoso } from 'react-virtuoso'

<Virtuoso
  data={messages}
  initialTopMostItemIndex={firstUnreadIndex || messages.length - 1}
  itemContent={(index, message) => (
    <MessageBubble message={message} {...props} />
  )}
  followOutput="smooth"
  alignToBottom
/>
```

---

## 🔗 **WhatsApp Reference Behavior**

### Scroll Logic Pseudocode

```typescript
function onChatOpen(chatId: string, userId: string) {
  const unreadMessages = getUnreadMessages(chatId, userId);

  if (unreadMessages.length > 0) {
    const target = unreadMessages[0]; // FIRST unread
    loadChunkAround(target);
    scrollTo(target);
    insertDividerAbove(target);
  } else {
    loadLastChunk();
    scrollToBottom();
  }
}
```

### Edge Case Handling

| Case                    | WhatsApp Behavior                   |
| ----------------------- | ----------------------------------- |
| No unread messages      | Scroll to bottom                    |
| 1 unread message        | Scroll to that message              |
| 100+ unread messages    | Scroll to FIRST unread (not last)   |
| Chat loading            | Show loader → scroll when ready     |
| New message during load | Queue event → update after scroll   |
| User scrolled mid-chat  | Restore last manual scroll position |

---

## 🧪 **Testing**

### Manual Testing

---

## 🎨 **UI/UX Design**

### Divider Style (WhatsApp)

```css
.new-messages-divider {
  display: flex;
  align-items: center;
  margin: 16px 0;
  gap: 12px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #e0e0e0;
}

.divider-text {
  font-size: 13px;
  font-weight: 500;
  color: #667781;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

### Scroll Animation

- **Initial scroll:** `behavior: 'auto'` (instant)
- **Manual scroll:** `behavior: 'smooth'` (animated)
- **Scroll duration:** 200-300ms

---

## ✅ **Definition of Done**

- [ ] Smart scroll logic implemented
- [ ] "New Messages" divider displays correctly
- [ ] Virtualization working for large chats
- [ ] All edge cases handled (table above)
- [ ] Performance benchmarks met (<300ms initial scroll)
- [ ] Manual testing passed on Android + iOS
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## 📚 **References**

- WhatsApp scroll-to-unread algorithm (user-provided)
- React Virtuoso docs: https://virtuoso.dev/
- IntersectionObserver (Story 8.6.8)
- Message read receipts (Story 8.6.8)

---

## 🔄 **Related Stories**

- **Story 8.6.8** - Messaging UX Improvements (provides read receipt logic)
- **Story 8.6.7** - Long Message Expansion (text handling)
- **Story 8.2.3** - Message Status & Read Receipts (database schema)

---

**Next Story:** TBD (Epic 8.6 completion pending)
