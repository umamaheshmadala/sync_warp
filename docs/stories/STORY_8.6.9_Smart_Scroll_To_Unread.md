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

- [ ] When opening chat with unread messages → scroll to first unread **(DEFERRED: High Complexity)**
- [ ] When opening chat with no unread → scroll to bottom **(DEFERRED: High Complexity)**
- [x] "New Messages" divider appears above first unread message
- [x] Divider styling matches WhatsApp (subtle, centered, gray)
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

### Task 1: Track First Unread Message (DEFERRED)
*(Implementation details for scroll targeting are deferred)*

### Task 2: Implement Smart Scroll Logic (DEFERRED)
*(Implementation details for smart scrolling are deferred due to extreme complexity with dynamic height virtualization)*

### Task 3: Add "New Messages" Divider (COMPLETED)

**Implementation Philosophy:**
The divider must remain stable ("frozen") once the user enters the chat, even as they read messages. It should only disappear if the user leaves and re-enters.

#### 3.1 State Management (`ChatScreen.tsx`)
- **`lastReadAt`**: Fetched ONCE from `conversation_participants` on mount.
- **`frozenReadAt`**: A copy of `lastReadAt` stored in `MessageList` to ensure the divider doesn't jump as messages are marked read in real-time.
- **Race Condition Protection**:
  ```typescript
  // ChatScreen.tsx
  // CRITICAL: Do NOT execute "mark as read" logic until lastReadAt is loaded
  if (lastReadAt === undefined) return;
  ```

#### 3.2 logic Calculation (`MessageList.tsx`)
The divider position is calculated using a robust comparison of timestamps, handling edge cases where `read_at` might be null or newer than current messages.

```typescript
// Algorithm to find first unread index
let firstUnreadIndex = -1;

// 1. Defensive Check: If last message is OUTGOING, no divider needed
const lastMessage = messages[messages.length - 1];
if (lastMessage?.sender_id === currentUserId) {
  return -1; // No divider
}

// 2. Wait for Loading
if (frozenReadAt === undefined) {
  return -1; // Loading state
}

// 3. Comparison Logic
if (frozenReadAt !== null) {
  // User has read before. Find first message NEWER than last_read_at
  firstUnreadIndex = messages.findIndex(m => new Date(m.created_at) > new Date(frozenReadAt));
} else {
  // User has NEVER read (frozenReadAt is null). All messages are unread.
  firstUnreadIndex = 0;
}
```

#### 3.3 Visual Component
Rendered conditionally within the map loop:

```typescript
{index === firstUnreadIndex && (
  <div className="flex items-center gap-4 py-4 opacity-90">
    <div className="flex-1 h-px bg-blue-100" />
    <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-blue-100">
      {unreadCount} New Message{unreadCount > 1 ? 's' : ''}
    </span>
    <div className="flex-1 h-px bg-blue-100" />
  </div>
)}
```

---

## 🧪 **Testing**

### Verified Scenarios (Divider)
- [x] **Fresh Load**: User A sends 3 messages -> User B opens chat -> Divider appears above 3 messages.
- [x] **Outgoing Check**: User A replies -> Divider disappears (since they are now up to date).
- [x] **Persistence**: User B reads messages (blue ticks appear for A) -> Divider STAYS for User B until they leave page.
- [x] **Race Condition**: Verified that fast network connections don't mark messages read before the divider renders.

---

## ✅ **Definition of Done**

- [ ] Smart scroll logic implemented **(INCOMPLETE)**
- [x] "New Messages" divider displays correctly
- [x] Divider logic handles race conditions and persistence
- [ ] Virtualization working for large chats
- [ ] All edge cases handled

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
