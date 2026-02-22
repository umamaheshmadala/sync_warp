# STORY 15.3 — Split `MessageBubble.tsx` (1,166 lines) and Wrap with `React.memo`

**EPIC:** [EPIC 15 — Rendering Performance & State Management](../epics/EPIC_15_Rendering_Performance_State_Management.md)  
**Status:** ✅ Complete  
**Priority:** 🔴 Critical  
**Estimate:** 5 points  
**Dependencies:** Story 15.2 (messaging selectors must be fixed first)  
**Audit Finding:** 3.2 — `MessageBubble.tsx` — 1,164 lines, no memo, re-renders all

---

## 🎯 User Story

> As a user scrolling through a long chat, I want only the message I interact with to re-render so that scrolling stays smooth and animations are jank-free.

---

## 📍 Problem

`MessageBubble.tsx` is a 1,166-line monolith component without `React.memo`. Every time any message in the list changes (new message arrives, typing indicator updates, read receipt changes), **every single MessageBubble re-renders**. With 50+ messages on screen, this creates massive rendering overhead.

---

## 🔍 Codebase Research — Current Structure

### File: `src/components/messaging/MessageBubble.tsx` (1,166 lines)

**Imports (49 lines):** 25+ imports including hooks, services, utils, types, and sub-components.

**Props Interface (lines 50-64):**
```typescript
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showTimestamp?: boolean;
  onRetry?: (message: Message) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onQuoteClick?: (messageId: string) => void;
  currentUserId?: string;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  isMessagePinned?: (messageId: string) => boolean;
  friendReadReceiptsEnabled?: boolean;
}
```

**Internal Functions (14 total, lines 66-1165):**
| Function | Lines | Purpose | Sub-component Candidate? |
|----------|-------|---------|-------------------------|
| `MessageBubble` (main) | 66-1165 | Root component | — |
| `onLongPress` | 131 | Touch handler | No (callback) |
| `handleViewReactionUsers` | 183-192 | Reaction viewer | No (callback) |
| `onReply` | 220-223 | Reply handler | No (callback) |
| `handleRetryUpload` | 252-339 | Retry failed uploads | Yes → `MessageRetryHandler` |
| `handleContextMenu` | 341-366 | Context menu logic | No (callback) |
| `handleCopy` | 380-383 | Copy text | No (callback) |
| `handleShare` | 388-411 | Share message | No (callback) |
| `handleDeleteForMe` | 413-438 | Delete for self | No (callback) |
| `handleDeleteForEveryone` | 440-486 | Delete for all | No (callback) |
| `handleClick` | 490 | Click handler | No (callback) |
| `handleImageClick` | 744-769 | Open lightbox | No (callback) |

**Render Sections (JSX — estimated line ranges):**
| Section | Approx Lines | Sub-component Candidate? |
|---------|-------------|-------------------------|
| Status indicators (sent/delivered/read) | ~100 lines | Yes → `MessageStatus` |
| Image/media rendering | ~150 lines | Yes → `MessageMedia` |
| Text content rendering | ~100 lines | Yes → `MessageContent` |
| Reactions display | ~100 lines | Yes → `MessageReactions` |
| Context menu / action sheet | ~200 lines | Yes → `MessageContextMenu` |
| Reply/quote preview | ~80 lines | Yes → `MessageQuotePreview` |
| Link preview | ~50 lines | Already split: `ReviewLinkPreview`, `OfferLinkPreview` |

### Existing Sub-Components (already split)
- `ExpandableText` — imported from `./ExpandableText`
- `ReviewLinkPreview` — imported from `../chat/ReviewLinkPreview`
- `OfferLinkPreview` — imported from `../chat/OfferLinkPreview`

---

## ✅ Implementation Plan

### Step 1: Wrap `MessageBubble` in `React.memo` (Quick Win)

This is the single highest-impact change. Without splitting, just adding `React.memo` prevents re-renders when props haven't changed:

```diff
-export default function MessageBubble({ ... }: MessageBubbleProps) {
+const MessageBubble = React.memo(function MessageBubble({ ... }: MessageBubbleProps) {
   // ... existing code
-}
+});
+
+export default MessageBubble;
```

### Step 2: Extract `MessageMedia` sub-component

Create `src/components/messaging/MessageMedia.tsx`:
- Extract image rendering, video thumbnails, and media grid logic
- Wrap in `React.memo`
- Props: `message`, `isOwn`, `onImageClick`, `onRetryUpload`

### Step 3: Extract `MessageContextMenu` sub-component

Create `src/components/messaging/MessageContextMenu.tsx`:
- Extract the context menu / action sheet JSX and handlers
- Wrap in `React.memo`
- Props: `message`, `isOwn`, `onCopy`, `onReply`, `onForward`, `onEdit`, `onDeleteForMe`, `onDeleteForEveryone`, `onShare`, `onPin`, `onUnpin`

### Step 4: Extract `MessageStatus` sub-component

Create `src/components/messaging/MessageStatus.tsx`:
- Extract the sent/delivered/read status icons
- Wrap in `React.memo`
- Props: `message`, `isOwn`

### Naming Convention
- All sub-components live in `src/components/messaging/`
- All are prefixed with `Message` for discoverability
- All are wrapped in `React.memo`

---

## ⚠️ Important Considerations

### Callback Stability
For `React.memo` to work effectively, callback props must be stable references. Verify that the parent (`MessageList`) uses `useCallback` for handlers passed to `MessageBubble`:
```typescript
// In MessageList or ChatScreen:
const handleReply = useCallback((message: Message) => { ... }, [deps]);
const handleEdit = useCallback((message: Message) => { ... }, [deps]);
```

If they use inline arrow functions, `React.memo` won't help because the props always look "new". This must be addressed in the parent.

### Message Object Reference Equality
`React.memo` uses shallow equality. If the `message` object is recreated on every render (e.g., from a `.map()` that creates new objects), the memo won't help. Ensure messages from the store maintain referential identity when unchanged.

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| React DevTools Profiler → receive a new message | Only the NEW MessageBubble renders; existing ones show "Did not render" |
| React DevTools Profiler → type in composer | Zero MessageBubble re-renders |
| Chrome Performance → scroll through 100 messages | Smooth 60fps, no long tasks |
| `npm run build` | Build succeeds |
| All message types display correctly | Text, image, video, reply, link preview all render |
| Context menu works on all message types | Long-press, right-click functional |
| Message reactions display | Still functional |

---

## ✅ Acceptance Criteria

- [ ] `MessageBubble` wrapped in `React.memo`
- [ ] At least 2-3 sub-components extracted (MessageMedia, MessageContextMenu, MessageStatus)
- [ ] All sub-components wrapped in `React.memo`
- [ ] Parent callbacks are stable (`useCallback`)
- [ ] Build passes
- [ ] All message types render correctly
- [ ] Re-render count verified via React DevTools Profiler

---

## ✅ Definition of Done

- [ ] `MessageBubble.tsx` reduced from 1,166 lines to ≤500 lines
- [ ] Sub-components created and memoized
- [ ] Profiler confirms isolated re-renders
- [ ] Build passes
