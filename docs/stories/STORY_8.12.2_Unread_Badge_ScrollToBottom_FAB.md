# 📖 STORY 8.12.2: Unread Badge & Scroll-to-Bottom Floating Action Button

**Status:** 🧪 Implementation Complete — User Testing Pending  
**Epic:** [EPIC 8.12: Chat Scroll UX](../epics/EPIC_8.12_Chat_Scroll_UX.md)  
**Priority:** 🔴 Critical (Direct dependency on Story 8.12.1)  
**Depends On:** Story 8.12.1 (`isAtBottom` state from `useScrollPosition` hook)

---

## 🙋‍♂️ **User Story**

**As a** SynC user who has scrolled up in a conversation to read older messages,  
**I want** to see a floating badge showing how many new unread messages have arrived, and tap it to instantly jump back to the latest message,  
**So that** I can quickly catch up on new activity without manually scrolling through the entire conversation.

---

## ⚠️ **Pre-Implementation Audit (MANDATORY)**

> [!IMPORTANT]
> Check these existing files for any scroll-to-bottom or unread badge functionality that can be extended rather than rebuilt.

### **Files to Audit:**

| File | What to Check |
| :--- | :--- |
| `src/components/messaging/ChatScreen.tsx` | Existing `scrollToBottom()` function — reuse this directly for the FAB tap action. |
| `src/components/messaging/MessageList.tsx` | Check if there's already a "new messages" indicator or separator component. |
| `src/store/messagingStore.ts` | `unreadCounts` Map and `incrementUnreadCount()` action — use these for the badge counter. `totalUnreadCount` may also already be tracked. |
| `src/components/messaging/UnreadBadge.tsx` | May already exist as a component from Epic 8.2. If so, adapt its styling for the floating FAB context rather than creating a new one. |
| `src/services/realtimeService.ts` | `subscribeToMessages` callback — this is where the counter should increment when `isAtBottom === false`. |
| `src/components/messaging/ReplyContext.tsx` | **Confirmed to exist.** Reply context component — check for any existing "jump to original message" logic that this story should coordinate with. |
| `src/hooks/useSwipeToReply.ts` | **Confirmed to exist.** Swipe-to-reply hook — the reply_to message ID is available here and needed for jump-to-context scrolling. |
| `src/components/messaging/MessageContextMenu.tsx` | **Confirmed to exist.** Context menu — check if "Reply" action already captures the target message ID. |

### **Reuse Recommendations:**
- **DO** reuse `messagingStore.incrementUnreadCount(conversationId)` for counting.
- **DO** reuse the existing `scrollToBottom()` from `ChatScreen.tsx` as the FAB's `onClick` handler.
- **DO** reuse `messagingStore.clearUnreadCount(conversationId)` when the user returns to bottom.
- **DO NOT** create a new unread tracking system — the store already has one from Story 8.2.8.

---

## 🎯 **Acceptance Criteria**

### **1. FAB Visibility**
- **GIVEN** the user scrolls up beyond the bottom threshold (> 100px from bottom)
- **WHEN** a new message arrives from the other participant
- **THEN** a floating circular button (⬇) MUST appear at the bottom-right of the message list
- **AND** if no new messages have arrived while scrolled up, the FAB appears as a simple "↓" arrow without a counter.

### **2. Unread Counter**
- **GIVEN** the FAB is visible
- **WHEN** additional messages arrive while the user remains scrolled up
- **THEN** a counter badge MUST appear on the FAB showing the exact number of unread messages
- **AND** the counter MUST update in real-time (within 100ms of each new message).

### **3. Tap to Scroll**
- **GIVEN** the user taps the FAB
- **WHEN** the tap is registered
- **THEN** the chat MUST smoothly animate to the very bottom of the conversation
- **AND** the unread counter MUST reset to 0
- **AND** the FAB MUST disappear once the bottom is reached.

### **4. Auto-Dismiss on Manual Scroll**
- **GIVEN** the FAB is visible
- **WHEN** the user manually scrolls back to the bottom (within threshold)
- **THEN** the FAB MUST disappear
- **AND** the unread counter MUST reset to 0.

### **5. Multi-Platform Consistency**
- **GIVEN** the FAB is visible
- **WHEN** viewed on Web, iOS, or Android
- **THEN** the FAB position MUST respect safe areas (especially iOS bottom notch)
- **AND** on mobile, the FAB MUST not overlap with the message composer input.

### **6. Jump to Context (Reply Tap)**
- **GIVEN** a message contains a reply preview (showing the quoted original message)
- **WHEN** the user taps the reply preview
- **THEN** the chat MUST scroll to the original (quoted) message
- **AND** the target message MUST flash with a subtle highlight animation (e.g., grey fade-out over ~1 second)
- **AND** if the quoted message is not in the currently loaded message set, it MUST be fetched first.

### **7. Jump to Context (Search Result)**
- **GIVEN** the user selects a message from search results
- **WHEN** the search result is tapped
- **THEN** the chat MUST open to the conversation and scroll to the target message
- **AND** the target message MUST be highlighted with the same flash animation as reply jumps.

---

## 🛠️ **Technical Implementation Plan**

### **1. Component: `ScrollToBottomFAB`**

Create `src/components/messaging/ScrollToBottomFAB.tsx`:

```typescript
interface ScrollToBottomFABProps {
  isVisible: boolean;
  unreadCount: number;
  onPress: () => void;
}
```

**Design:**
- Circular button (40px diameter) with a down-arrow icon (↓)
- Badge overlay (top-right of circle) showing count when > 0
- Positioned `bottom: 80px` (above composer), `right: 16px`
- Entry/exit animation: scale + fade (150ms, ease-out)
- iOS: Respect `env(safe-area-inset-bottom)` in positioning

### **2. State Management**
- Track a **local** `newMessagesSinceScrollUp` counter in the `ChatScreen` component (not global store — this is per-view state)
- Increment counter when `addMessage` fires AND `isAtBottom === false`
- Reset counter when user scrolls to bottom OR taps FAB

### **3. Integration in `ChatScreen.tsx`**
```typescript
const { isAtBottom, scrollToBottom } = useScrollPosition(containerRef);
const [newMessageCount, setNewMessageCount] = useState(0);

// On new message received (from realtime subscription)
useEffect(() => {
  if (!isAtBottom && latestMessage?.sender_id !== currentUserId) {
    setNewMessageCount(prev => prev + 1);
  }
}, [latestMessage]);

// Reset on return to bottom
useEffect(() => {
  if (isAtBottom) setNewMessageCount(0);
}, [isAtBottom]);
```

### **4. Jump-to-Message Utility**

Add a `scrollToMessage` function in `ChatScreen.tsx` or the `useScrollPosition` hook:

```typescript
const scrollToMessage = async (messageId: string) => {
  // 1. Check if message is already in DOM
  const el = document.getElementById(`msg-${messageId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // 2. Flash highlight
    el.classList.add('message-highlight');
    setTimeout(() => el.classList.remove('message-highlight'), 1500);
    return;
  }
  // 3. If not loaded, fetch messages around the target
  // (requires a new `fetchMessagesAround(messageId)` endpoint or cursor-based seek)
};
```

**CSS for highlight flash:**
```css
.message-highlight {
  animation: highlight-fade 1.5s ease-out;
}
@keyframes highlight-fade {
  0% { background-color: rgba(59, 130, 246, 0.2); }
  100% { background-color: transparent; }
}
```

---

## 🧪 **Verification**

```bash
# Manual: Scroll up → have partner send 3 messages → FAB with "3" badge must appear
# Manual: Tap FAB → smooth scroll to bottom, badge resets, FAB disappears
# Manual: Scroll up → NO new messages → FAB shows ↓ without badge
# Manual: Scroll up → manually scroll back to bottom → FAB disappears automatically
# iOS: Verify FAB doesn't overlap keyboard or safe area
```

---

## 🛑 **Risks & Mitigation**

| Risk | Mitigation |
| :--- | :--- |
| FAB overlaps with composer on small screens | Use dynamic positioning relative to composer height |
| Counter keeps incrementing in background | Reset counter when component unmounts or conversation changes |
| Animation jank on low-end Android | Use CSS `transform` + `opacity` for GPU-accelerated animations |
