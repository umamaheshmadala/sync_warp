# 📖 STORY 8.12.4: Sticky Date Headers

**Status:** 📋 Planned  
**Epic:** [EPIC 8.12: Chat Scroll UX](../epics/EPIC_8.12_Chat_Scroll_UX.md)  
**Priority:** 🟡 Medium (Polish — enhances scroll context)  
**Depends On:** Story 8.12.1 (scroll container ref)

---

## 🙋‍♂️ **User Story**

**As a** SynC user scrolling through a long conversation,  
**I want** to always see the date of the messages currently on screen as a sticky header at the top of the chat,  
**So that** I can quickly understand *when* the messages I'm reading were sent without needing to scroll to find a date separator.

---

## ⚠️ **Pre-Implementation Audit (MANDATORY)**

> [!IMPORTANT]
> Before building, check if date grouping or separators already exist in the message rendering pipeline.

### **Files to Audit:**

| File | What to Check |
| :--- | :--- |
| `src/components/messaging/MessageList.tsx` | Check if messages are already grouped by date with date separator elements. If date headers already render between message groups, the sticky behavior can be layered on top via CSS. |
| `src/components/messaging/MessageBubble.tsx` | Check if each bubble already stores/renders a `created_at` timestamp that can be used for date extraction. |
| `src/utils/dateUtils.ts` | **Confirmed to exist.** Check for date formatting utilities (`formatDate`, `isToday`, `isYesterday`, `formatRelativeDate`). Reuse these — do NOT create new date helpers. |
| `src/store/messagingStore.ts` | Check how messages are stored — if they're chronologically sorted, date grouping at render time is straightforward. |

### **Reuse Recommendations:**
- **DO** reuse any existing date formatting functions from the codebase — do not create new date helpers if `formatDate` or similar already exist.
- **DO** reuse existing date separator components if `MessageList` already renders "Today", "Yesterday" labels.
- **DO** use `position: sticky` CSS rather than JavaScript-based scroll calculations for the sticky behavior.
- **DO NOT** duplicate date information in the store — derive it at render time from `message.created_at`.

---

## 🎯 **Acceptance Criteria**

### **1. Date Bubble Display**
- **GIVEN** the user is scrolling through messages
- **WHEN** messages from multiple days are visible
- **THEN** a small rounded "Date Bubble" MUST appear at the top-center of the chat viewport
- **AND** it MUST show the date of the first visible message group (e.g., "Today", "Yesterday", "Feb 14, 2026").

### **2. Smooth Transition**
- **GIVEN** the user scrolls past a date boundary (e.g., from "Today" messages to "Yesterday" messages)
- **WHEN** the boundary is crossed
- **THEN** the sticky date header MUST transition smoothly to show the new date
- **AND** the transition MUST NOT cause any layout shift or flicker.

### **3. Relative Date Labels**
- **GIVEN** the date being displayed
- **WHEN** it matches certain recency thresholds
- **THEN** it MUST display:
  - "Today" for the current date
  - "Yesterday" for the previous date
  - Day of week (e.g., "Monday") for dates within the last 7 days
  - Full date (e.g., "February 14, 2026") for older dates

### **4. Visibility Logic**
- **GIVEN** all visible messages are from the same date
- **WHEN** no date boundary is near the top of the viewport
- **THEN** the sticky header SHOULD still show the current date group label (semi-transparent)
- **AND** it MUST fade in/out gracefully (not abruptly show/hide).

### **5. Non-Interactive**
- **GIVEN** the date bubble is visible
- **WHEN** the user attempts to tap it
- **THEN** no action is required (v1: purely informational, non-interactive).

---

## 🛠️ **Technical Implementation Plan**

### **1. CSS-First Approach (Preferred)**

If `MessageList` already renders date separator `<div>`s between message groups, apply `position: sticky` to them:

```css
.date-separator {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  padding: 8px 0;
  pointer-events: none;
}

.date-separator .date-bubble {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
```

### **2. Date Grouping Logic**

If not already present, group messages by date in `MessageList`:

```typescript
const groupedMessages = useMemo(() => {
  const groups: { date: string; label: string; messages: Message[] }[] = [];
  let currentGroup: typeof groups[0] | null = null;

  messages.forEach(msg => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (!currentGroup || currentGroup.date !== dateKey) {
      currentGroup = {
        date: dateKey,
        label: formatRelativeDate(msg.created_at), // "Today", "Yesterday", etc.
        messages: []
      };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  });

  return groups;
}, [messages]);
```

### **3. Component: `DateSeparator`**

Create `src/components/messaging/DateSeparator.tsx` (if not already existing):

```typescript
interface DateSeparatorProps {
  label: string; // "Today", "Yesterday", "Feb 14, 2026"
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="date-separator">
      <span className="date-bubble">{label}</span>
    </div>
  );
}
```

---

## 🧪 **Verification**

```bash
# Manual: Open a conversation with messages spanning multiple days
# Manual: Scroll up past a date boundary → verify the sticky header changes smoothly
# Manual: Verify "Today", "Yesterday", and full dates display correctly
# Manual: Verify no layout shift when the header transitions between dates
# iOS: Verify the date bubble respects the safe area / notch
```

---

## 🛑 **Risks & Mitigation**

| Risk | Mitigation |
| :--- | :--- |
| `position: sticky` doesn't work in all scroll container configurations | Ensure the scroll container has `overflow-y: auto` (not `overflow: hidden` on parent) |
| Multiple sticky headers "stack" when scrolling fast | Use `z-index` and ensure only one header is visible at a time via stacking context |
| Date formatting differs by locale | Use `Intl.DateTimeFormat` for locale-aware formatting |
