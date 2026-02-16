# 📜 EPIC 8.12: Chat Scroll UX — WhatsApp-Grade Scroll Behavior

**Epic Owner:** Frontend Engineering / UX  
**Stakeholders:** Frontend Engineering, UX/UI, Mobile Engineering, QA  
**Dependencies:** Epic 8.2 ✅ (Core Messaging), Epic 8.3 ✅ (Media & Rich Content), Epic 8.11 (Performance & Scalability)  
**Timeline:** Week 13-15 (3 weeks)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Implement **premium, WhatsApp-grade chat scroll behavior** across Web, iOS, and Android that feels native, responsive, and intelligent. The scroll system must understand **user intent** — keeping passive viewers auto-scrolled while respecting active history scrollers — and handle every edge case from keyboard interactions to bulk message storms without visual jank or layout shift.

### **Core Philosophy: User Intent First**
- If the user is **at the bottom** (passively viewing latest messages) → the system keeps them updated via **auto-scroll**.
- If the user is **scrolled up** (actively exploring history) → the system **never** interrupts their position.

---

## 📱 **Platform Support**

| Platform | Scroll Engine | Special Considerations |
| :--- | :--- | :--- |
| **Web** | CSS `overflow-y: auto` + JS listeners | `IntersectionObserver` for bottom detection |
| **iOS Native** | `UIScrollView` via Capacitor WebView | Rubber-band overscroll, interactive keyboard dismiss |
| **Android Native** | WebView scroll | Material overscroll, back-gesture navigation |

---

## ✅ **Success Criteria**

| Objective | KPI / Target |
| :--- | :--- |
| **Default Load Position** | Chat opens scrolled to bottom, or to first unread message with banner |
| **Bottom Detection Accuracy** | 100% — user "at bottom" state must be reliable within 50-100px threshold |
| **Auto-scroll Latency** | < 16ms frame budget (no visible jank when new messages arrive) |
| **History Load (Anchor Maintenance)** | Zero visual jumping when older messages are prepended |
| **Layout Shift Score** | 0 — media placeholders must prevent any CLS |
| **Keyboard Transition** | Smooth viewport adjust, maintaining bottom anchor on keyboard show/hide |
| **Drag-to-Dismiss Keyboard** | Interactive keyboard dismiss when dragging scroll view down (iOS/Android) |
| **Overscroll (Bounce)** | Native rubber-band effect at top/bottom boundaries |
| **Bulk Message Handling** | No auto-scroll when scrolled up, even during 50+ msg/sec bursts |
| **Unread Badge Accuracy** | Floating badge appears within 100ms of new message when scrolled up |
| **Sticky Date Headers** | Header transitions within 1 frame of date boundary crossing |
| **Jump to Context** | Tapping a reply/search result scrolls to target message with highlight animation |

---

## 🧩 **Key Existing Code & Modules to Leverage**

> [!IMPORTANT]
> Before implementing ANY story in this epic, audit the existing codebase for already-implemented features. The messaging module is mature (8.2 complete, 8.5 7/8 complete) and many scroll-adjacent features may already exist.

### **Existing Components to Check:**

| Module | File | Relevance |
| :--- | :--- | :--- |
| **ChatScreen** | `src/components/messaging/ChatScreen.tsx` | Main chat container — may already have `scrollToBottom`, keyboard listeners |
| **MessageList** | `src/components/messaging/MessageList.tsx` | Message rendering — check for existing scroll event handlers |
| **MessageBubble** | `src/components/messaging/MessageBubble.tsx` | Individual message — check for media placeholder handling |
| **MessageComposer** | `src/components/messaging/MessageComposer.tsx` | Input field — check keyboard interaction hooks |
| **Messaging Store** | `src/store/messagingStore.ts` | State management — check for `prependMessages`, `addMessage` patterns |
| **Realtime Service** | `src/services/realtimeService.ts` | Message subscription — affects auto-scroll trigger points |
| **AppLayout** | `src/components/layout/AppLayout.tsx` | Keyboard visibility state (`isKeyboardVisible`) already managed here |
| **usePlatform Hook** | `src/hooks/usePlatform.ts` | Platform detection for conditional scroll behavior |

### **Capacitor Plugins Already Available:**
```json
{
  "@capacitor/keyboard": "^5.0.0",
  "@capacitor/haptics": "^5.0.0",
  "@capacitor/app": "^5.0.0"
}
```

---

## 📋 **Stories Breakdown**

| # | Story | Priority | Status | File |
|---|---|---|---|---|
| 1 | Smart Scroll Position Detection & Auto-Scroll | 🔴 Critical | 📋 Planned | [STORY_8.12.1](../stories/STORY_8.12.1_Smart_Scroll_Detection_AutoScroll.md) |
| 2 | Unread Badge & Scroll-to-Bottom FAB | 🔴 Critical | 📋 Planned | [STORY_8.12.2](../stories/STORY_8.12.2_Unread_Badge_ScrollToBottom_FAB.md) |
| 3 | History Pagination with Anchor Maintenance | 🟠 High | 📋 Planned | [STORY_8.12.3](../stories/STORY_8.12.3_History_Pagination_Anchor_Maintenance.md) |
| 4 | Sticky Date Headers | 🟡 Medium | 📋 Planned | [STORY_8.12.4](../stories/STORY_8.12.4_Sticky_Date_Headers.md) |
| 5 | Media Placeholders & Zero Layout Shift | 🟡 Medium | 📋 Planned | [STORY_8.12.5](../stories/STORY_8.12.5_Media_Placeholders_Zero_Layout_Shift.md) |

### **📌 Recommended Execution Order**

1. **Story 8.12.1 (Smart Scroll Detection)** — *Foundation*. All other stories depend on knowing whether the user is "at bottom". Must be implemented first.
2. **Story 8.12.2 (Unread Badge & FAB)** — *High User Impact*. Directly depends on 8.12.1's `isAtBottom` state. Makes conversations feel responsive.
3. **Story 8.12.3 (History Pagination & Anchor)** — *Critical UX*. Prevents the most jarring scroll UX bug (content jumping when loading older messages).
4. **Story 8.12.4 (Sticky Date Headers)** — *Polish*. Adds WhatsApp-like date bubbles during scroll. Can be done in parallel with 8.12.5.
5. **Story 8.12.5 (Media Placeholders)** — *Polish*. Eliminates layout shift from lazy-loaded media. Can be done in parallel with 8.12.4.

---

## 🧪 **Verification Strategy**

### **Automated Tests**
- Unit tests for `useScrollPosition` hook (bottom detection, threshold calculations)
- Unit tests for anchor maintenance (scroll offset calculation after prepend)
- Integration tests for auto-scroll trigger on new message

### **Manual / Device Verification**
- **iOS Device**: Verify rubber-band overscroll, interactive keyboard dismiss, smooth auto-scroll
- **Android Device**: Verify Material overscroll, keyboard resize behavior
- **Web Browser**: Verify `IntersectionObserver`-based bottom detection, scroll bar behavior
- **Stress Test**: Send 50+ messages rapidly to test bulk handling (no auto-scroll when scrolled up)

### **Performance Profiling**
- Chrome Performance tab: 60fps target during auto-scroll
- Lighthouse CLS score: Must be 0 for media-heavy conversations
- Xcode Energy Gauge: No battery impact from scroll listeners

---

## ✅ **Definition of Done**

- [ ] Chat opens scrolled to bottom (or first unread message with "Unread" banner)
- [ ] User is auto-scrolled to bottom when at bottom and new message arrives
- [ ] User is NOT auto-scrolled when scrolled up and new message arrives
- [ ] Floating "scroll to bottom" FAB with unread count appears when scrolled up
- [ ] Loading older messages does NOT cause visual jumping
- [ ] Sticky date headers transition smoothly during scroll
- [ ] Media loads with zero layout shift (placeholders maintain aspect ratio)
- [ ] Keyboard open/close maintains scroll anchor correctly
- [ ] Drag-to-dismiss keyboard works interactively on iOS/Android
- [ ] Native overscroll (rubber-band) effect preserved at boundaries
- [ ] Jump to reply/search scrolls to target message with highlight animation
- [ ] Bulk message arrival (50+ msg/sec) does not force scroll when user is reading history
- [ ] All behaviors verified on Web, iOS, and Android

---

**Previous Epic:** [EPIC_8.11_Messaging_Performance_Scalability.md](./EPIC_8.11_Messaging_Performance_Scalability.md)
