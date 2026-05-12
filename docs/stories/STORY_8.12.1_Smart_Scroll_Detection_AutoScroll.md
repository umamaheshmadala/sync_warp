# 📖 STORY 8.12.1: Smart Scroll Position Detection & Conditional Auto-Scroll

**Status:** 🧪 Implementation Complete — User Testing Pending  
**Epic:** [EPIC 8.12: Chat Scroll UX](../epics/EPIC_8.12_Chat_Scroll_UX.md)  
**Priority:** 🔴 Critical (Foundation — all other stories depend on this)

---

## 🙋‍♂️ **User Story**

**As a** SynC user in a chat conversation,  
**I want** the chat to automatically scroll to show new messages only when I'm already viewing the latest messages,  
**So that** I can see incoming messages in real-time without losing my place when I'm reading older history.

---

## ⚠️ **Pre-Implementation Audit (MANDATORY)**

> [!IMPORTANT]
> Before writing ANY new code, thoroughly audit these existing files for scroll-related logic that may already be partially or fully implemented. Document what exists and what needs to change.

### **Files to Audit:**

| File | What to Check |
| :--- | :--- |
| `src/components/messaging/ChatScreen.tsx` | Existing `scrollToBottom()` function, `useEffect` that calls it on keyboard show. Check if `scrollBehavior` is already parameterized. |
| `src/components/messaging/MessageList.tsx` | Check for existing `onScroll` handlers, `useRef` for scroll container, any `IntersectionObserver` usage. |
| `src/store/messagingStore.ts` | Check `addMessage()` and `prependMessages()` — these are the trigger points for auto-scroll decisions. |
| `src/services/realtimeService.ts` | Check `subscribeToMessages` callback — this is where new messages arrive and trigger UI updates. |
| `src/components/layout/AppLayout.tsx` | `isKeyboardVisible` state is already managed here. Reuse this state rather than duplicating keyboard detection. |
| `src/hooks/usePlatform.ts` | Platform detection hook — reuse for platform-conditional scroll behavior (rubber-band, drag-to-dismiss). |
| `capacitor.config.ts` or `capacitor.config.json` | Check for existing `Keyboard` plugin configuration (e.g., `resize` mode, `scrollPadding`). `resize: 'none'` with manual handling gives best control. |
| `src/hooks/useConversationKeyboardShortcuts.ts` | Keyboard shortcut hook — check if it handles keyboard-related scroll behavior that should be coordinated. |
| `src/components/messaging/ReplyContext.tsx` | Reply context component — check for any scroll-to-message logic that should be coordinated with `scrollToBottom`. |
| `src/hooks/useSwipeToReply.ts` | Swipe-to-reply hook — check for scroll interaction during swipe gestures. |
| `src/hooks/useMessages.ts` | Message fetching hook — likely contains pagination and "load more" logic already. |

### **Reuse Recommendations:**
- **DO** reuse the existing `scrollToBottom()` function in `ChatScreen.tsx` — extend it, don't replace it.
- **DO** reuse the Capacitor `Keyboard` listeners already set up in `AppLayout.tsx` and `ChatScreen.tsx`.
- **DO** leverage the existing `messagingStore.addMessage()` flow rather than adding parallel listeners.
- **DO NOT** create a new scroll container ref if `MessageList` already has one.

---

## 🎯 **Acceptance Criteria**

### **1. Bottom Detection (`isAtBottom` State)**
- **GIVEN** the user is viewing a chat conversation
- **WHEN** the scroll position is within 50-100px of the absolute bottom
- **THEN** the system MUST report `isAtBottom = true`
- **AND** the threshold MUST account for dynamic message heights and input field visibility.

### **2. Auto-Scroll on New Message (At Bottom)**
- **GIVEN** the user is at the bottom (`isAtBottom === true`)
- **WHEN** a new message arrives (from either the user or the other participant)
- **THEN** the chat MUST smoothly auto-scroll to show the new message
- **AND** the scroll animation MUST complete within one frame budget (< 16ms visual delay).

### **3. No Auto-Scroll When Scrolled Up**
- **GIVEN** the user is scrolled up (`isAtBottom === false`)
- **WHEN** a new message arrives from the other participant
- **THEN** the chat MUST NOT auto-scroll
- **AND** the user's current viewport position MUST remain perfectly stable.

### **4. Auto-Scroll on Own Message Send**
- **GIVEN** the user sends a message (regardless of scroll position)
- **WHEN** the message is committed to the UI (optimistic or confirmed)
- **THEN** the chat MUST always auto-scroll to the bottom
- **AND** this must happen *before* the server confirms delivery.

### **5. Keyboard Interaction Scroll Maintenance**
- **GIVEN** the user is at the bottom of the chat
- **WHEN** the keyboard opens (`keyboardWillShow` on native, or resize on web)
- **THEN** the viewport MUST adjust so the user remains at the bottom
- **AND** when the keyboard closes, the bottom anchor MUST be maintained.

### **6. Default Loading Position**
- **GIVEN** the user opens a chat conversation
- **WHEN** the conversation loads
- **THEN** the view MUST scroll to the very bottom (most recent message) by default
- **AND** if there are unread messages that don't fit on one screen, the view SHOULD open at the *first unread message* with an "Unread Messages" banner separating read and unread history.

### **7. Native Overscroll (Rubber-Band) Preservation**
- **GIVEN** the user scrolls past the top or bottom boundary of the message list
- **WHEN** on iOS (rubber-band bounce) or Android (Material edge glow)
- **THEN** the native overscroll behavior MUST be preserved (not suppressed by `overflow: hidden` or `overscroll-behavior: none`)
- **AND** the overscroll MUST NOT trigger unintended side effects (e.g., triggering a page refresh or navigation).

### **8. Drag-to-Dismiss Keyboard (Interactive Keyboard)**
- **GIVEN** the keyboard is open and the user drags the scroll view downward
- **WHEN** on iOS or Android native
- **THEN** the keyboard SHOULD interactively slide down as the user swipes (not just snap open/closed)
- **AND** this requires Capacitor's `Keyboard` plugin configured with `resize: 'none'` and `keyboardResize: Keyboard.ResizeMode.None` to allow manual control.

### **9. Bulk Message Handling (Throttled Auto-Scroll)**
- **GIVEN** the user is at the bottom and 50+ messages arrive in rapid succession
- **WHEN** the burst is ongoing
- **THEN** the auto-scroll SHOULD throttle (batch scroll updates) rather than scrolling per-message
- **AND** once the burst slows, the view MUST settle at the very bottom.
- **AND** if the user is scrolled up during the burst, the view MUST NOT auto-scroll at all.

---

## 🛠️ **Technical Implementation Plan**

### **1. Custom Hook: `useScrollPosition`**

Create `src/hooks/useScrollPosition.ts`:

```typescript
interface ScrollPositionState {
  isAtBottom: boolean;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}
```

**Implementation Notes:**
- Use a scroll event listener (throttled to ~100ms via `requestAnimationFrame`) on the message list container.
- Calculate `isAtBottom` as: `scrollHeight - scrollTop - clientHeight < THRESHOLD` where `THRESHOLD = 80`.
- Expose `scrollToBottom` that calls `scrollContainerRef.current.scrollTo({ top: scrollHeight, behavior })`.

### **2. Integration Points**
- **`ChatScreen.tsx`**: Consume `useScrollPosition` hook. Pass `isAtBottom` to the auto-scroll decision logic.
- **`messagingStore.ts` → `addMessage()`**: After state update, check `isAtBottom` to decide whether to call `scrollToBottom()`.
- **Keyboard listeners**: Modify existing `keyboardWillShow` handler in `ChatScreen.tsx` to use `scrollToBottom('auto')` only when `isAtBottom`.

### **3. Platform-Specific Considerations**
- **iOS**: Use `Keyboard.addListener('keyboardWillShow')` (already exists in `ChatScreen.tsx`)
- **Android**: Use `Keyboard.addListener('keyboardDidShow')` as `keyboardWillShow` may not fire reliably
- **Web**: Use `window.visualViewport.resize` event for virtual keyboard detection

### **4. Drag-to-Dismiss Keyboard (iOS/Android)**
- Configure Capacitor `Keyboard` plugin with `resize: 'none'` — this prevents the WebView from auto-resizing on keyboard show, giving JS full control.
- Use `keyboardWillHide` to detect interactive keyboard dismiss gestures.
- On iOS, leverage `IQKeyboardManager` or Capacitor's built-in `scrollToInput` behavior.
- **Web**: Not applicable (browsers handle keyboard natively).

### **5. Overscroll Behavior**
- Ensure the scroll container uses `-webkit-overflow-scrolling: touch` on iOS for native rubber-band.
- Do NOT set `overscroll-behavior: contain/none` on the message list — let the native bounce happen.
- Android: Native Material edge glow is handled by the WebView; avoid CSS overrides that suppress it.

### **6. Default Load & Unread Banner**
- On `ChatScreen` mount, call `scrollToBottom('auto')` after messages are rendered.
- If the store indicates unread messages > visible viewport, render an "Unread Messages" separator component and scroll to it instead of the bottom.
- Track `lastReadMessageId` in the store or derive from `read_receipts` table.

---

## 🧪 **Verification**

```bash
# Unit test the hook
npm test -- --grep "useScrollPosition"

# Manual: Open chat, scroll up, have another user send a message → verify NO auto-scroll
# Manual: Stay at bottom, receive a message → verify auto-scroll
# Manual: Send a message while scrolled up → verify auto-scroll to bottom
```

---

## 🛑 **Risks & Mitigation**

| Risk | Mitigation |
| :--- | :--- |
| Scroll listener causes performance drag | Throttle with `requestAnimationFrame`, not `setInterval` |
| `isAtBottom` flickers during momentum scroll | Add a small debounce (50ms) to `isAtBottom` state changes |
| Keyboard height varies across iOS devices | Use `event.keyboardHeight` from Capacitor, not hardcoded values |
