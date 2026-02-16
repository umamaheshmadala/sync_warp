# 📖 STORY 8.12.3: History Pagination with Scroll Anchor Maintenance

**Status:** 📋 Planned  
**Epic:** [EPIC 8.12: Chat Scroll UX](../epics/EPIC_8.12_Chat_Scroll_UX.md)  
**Priority:** 🟠 High (Critical UX — prevents most jarring scroll bug)  
**Depends On:** Story 8.12.1 (shared scroll container ref from `useScrollPosition`)

---

## 🙋‍♂️ **User Story**

**As a** SynC user scrolling through older messages in a conversation,  
**I want** earlier messages to load seamlessly as I scroll up, without the chat view "jumping" or losing my current reading position,  
**So that** I can browse through conversation history as naturally as flipping through pages of a book.

---

## ⚠️ **Pre-Implementation Audit (MANDATORY)**

> [!IMPORTANT]
> The messaging module already has pagination implemented. Audit these files to understand the existing logic before modifying anything.

### **Files to Audit:**

| File | What to Check |
| :--- | :--- |
| `src/services/messagingService.ts` | `fetchMessages(conversationId, limit, beforeMessageId)` — cursor-based pagination already exists. Check the `hasMore` return value. |
| `src/store/messagingStore.ts` | `prependMessages(conversationId, messages)` — this action already exists. Verify it correctly inserts at the beginning of the array. |
| `src/hooks/useMessages.ts` | Check for existing "load more" or infinite scroll trigger logic. This may already have a fetch-on-scroll-to-top pattern. |
| `src/components/messaging/MessageList.tsx` | Check for existing scroll event listener or `IntersectionObserver` at the top of the list. Check if there's a loading spinner. |
| `src/components/messaging/ChatScreen.tsx` | Check for `hasMore` state and any "Load earlier messages" button or auto-trigger. |

### **Reuse Recommendations:**
- **DO** reuse `messagingService.fetchMessages()` with its existing cursor-based pagination.
- **DO** reuse `messagingStore.prependMessages()` for inserting older messages.
- **DO** reuse any existing loading spinner component from the codebase (check `src/components/ui/`).
- **DO NOT** switch from cursor-based to offset-based pagination — cursor-based is already implemented and more reliable for real-time data.
- **DO NOT** load all messages at once — maintain the existing batch size of ~50 messages per fetch.
- **DO** check `src/hooks/useMessages.ts` for any existing "load more" trigger logic before building a new `IntersectionObserver`.

---

## 🎯 **Acceptance Criteria**

### **1. Trigger: Auto-Load on Scroll to Top**
- **GIVEN** the user scrolls to within 200px of the top of the message list
- **WHEN** `hasMore === true` (more older messages exist)
- **THEN** a loading spinner MUST appear at the top
- **AND** a fetch for the next batch of older messages MUST be initiated automatically.

### **2. Anchor Maintenance (The Critical Piece)**
- **GIVEN** a new batch of older messages (e.g., 50 messages) has been fetched and prepended to the DOM
- **WHEN** the DOM re-renders
- **THEN** the user's current viewport position MUST remain **pixel-perfect stable**
- **AND** the currently visible message at the top edge of the viewport before the fetch MUST remain at the exact same visual position after the prepend.

**Implementation Detail:**
```
Before prepend:
  scrollHeight_before = scrollContainer.scrollHeight

After prepend (synchronously):
  scrollHeight_after = scrollContainer.scrollHeight
  delta = scrollHeight_after - scrollHeight_before
  scrollContainer.scrollTop += delta
```

### **3. No Double Fetch**
- **GIVEN** a fetch is already in-progress for older messages
- **WHEN** the user continues scrolling up
- **THEN** the system MUST NOT initiate a second concurrent fetch
- **AND** a `isLoadingOlderMessages` flag MUST prevent duplicate requests.

### **4. End of History**
- **GIVEN** all messages in the conversation have been loaded (`hasMore === false`)
- **WHEN** the user scrolls to the top
- **THEN** no further fetches MUST be initiated
- **AND** optionally, a subtle "Start of conversation" label may appear.

### **5. Smooth Loading UX**
- **GIVEN** older messages are being fetched
- **WHEN** a loading indicator is displayed
- **THEN** it MUST be a small, unobtrusive spinner at the top of the message list
- **AND** it MUST NOT shift the existing messages downward while loading (render above the current scroll position).

---

## 🛠️ **Technical Implementation Plan**

### **1. Scroll-to-Top Observer**

In `MessageList.tsx`, add an `IntersectionObserver` on a sentinel `<div>` at the very top of the message list:

```typescript
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!sentinelRef.current || !hasMore || isLoadingOlder) return;
  
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        loadOlderMessages();
      }
    },
    { root: scrollContainerRef.current, rootMargin: '200px 0px 0px 0px' }
  );
  
  observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [hasMore, isLoadingOlder]);
```

### **2. Anchor Maintenance Logic**

Wrap the `prependMessages` call with scroll offset adjustment:

```typescript
const loadOlderMessages = async () => {
  setIsLoadingOlder(true);
  const container = scrollContainerRef.current;
  const scrollHeightBefore = container.scrollHeight;
  
  const { messages, hasMore: more } = await messagingService.fetchMessages(
    conversationId, 50, oldestMessageId
  );
  
  messagingStore.prependMessages(conversationId, messages);
  setHasMore(more);
  
  // CRITICAL: Restore scroll position after DOM update
  requestAnimationFrame(() => {
    const scrollHeightAfter = container.scrollHeight;
    container.scrollTop += (scrollHeightAfter - scrollHeightBefore);
    setIsLoadingOlder(false);
  });
};
```

### **3. CSS Considerations**
- Use `overflow-anchor: none` on the scroll container to prevent browser auto-anchoring from interfering with manual anchor maintenance.
- Ensure `contain: layout` is NOT set on the container (it can break `scrollHeight` calculations).

---

## 🧪 **Verification**

```bash
# Manual: Open a conversation with 200+ messages → scroll to top → verify messages load seamlessly
# Manual: While loading, observe the currently visible message → it MUST NOT move
# Manual: Scroll to top of a short conversation → verify "Start of conversation" state
# Manual: Rapidly scroll to top during a fetch → verify no duplicate requests
# Performance: Profile in Chrome DevTools → verify no layout thrashing during prepend
```

---

## 🛑 **Risks & Mitigation**

| Risk | Mitigation |
| :--- | :--- |
| `requestAnimationFrame` timing can vary across browsers | Use `queueMicrotask` as a fallback if rAF fires too late |
| Browser's own `overflow-anchor` fights with manual logic | Explicitly set `overflow-anchor: none` on the scroll container |
| Very large DOM (1000+ messages) causes slow re-renders | Consider virtualizing the message list (react-window) in future story |
