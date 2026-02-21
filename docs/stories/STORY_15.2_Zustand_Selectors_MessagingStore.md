# STORY 15.2 — Add Zustand Selectors to All 15+ `useMessagingStore()` Call Sites

**EPIC:** [EPIC 15 — Rendering Performance & State Management](../epics/EPIC_15_Rendering_Performance_State_Management.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 3 points  
**Dependencies:** None (can run in parallel with 15.1)  
**Audit Finding:** 1.2 — `useMessagingStore()` over-subscription — 15+ files

---

## 🎯 User Story

> As a user viewing a chat, I want typing indicators and new messages to update instantly without causing the entire messaging UI to flicker or re-render.

---

## 📍 Problem

`useMessagingStore()` without selectors subscribes to the entire messaging state. When any field changes — typing indicators, message additions, conversation updates, loading states — all 15 consuming components re-render. Typing indicators change every few seconds, causing especially noticeable jank.

---

## 🔍 Codebase Research — All 15 Call Sites

| # | File | Current Destructuring | Needed Fields Only |
|---|------|----------------------|-------------------|
| 1 | `hooks/useConversations.ts:49` | `conversations, addConversation, upsertConversation, updateConversation, removeConversation, setConversations, setLoadingConversations, isLoadingConversations, clearUnreadCount, setActiveConversation` | All listed (heavy user) |
| 2 | `hooks/useTypingIndicator.ts:48` | `typingUsers, addTypingUser, removeTypingUser` | 3 fields |
| 3 | `hooks/useSendMessage.ts:18` | Destructuring (check exact fields) | Message actions only |
| 4 | `components/messaging/ChatHeader.tsx:41` | `conversations, togglePinOptimistic, toggleArchiveOptimistic` | 3 fields |
| 5 | `components/messaging/ChatScreen.tsx:61` | `updateConversation, setActiveConversation` | 2 actions |
| 6 | `components/messaging/ChatScreen.tsx:165` | `conversations` | 1 field |
| 7 | `components/messaging/ConversationActionButtons.tsx:16` | `togglePinOptimistic, toggleArchiveOptimistic` | 2 actions |
| 8 | `components/messaging/ConversationListBulkActions.tsx:22` | `conversations, togglePinOptimistic, toggleArchiveOptimistic` | 3 fields |
| 9 | `components/messaging/FriendPickerModal.tsx:24` | `conversations` | 1 field |
| 10 | `components/messaging/ImageUploadButton.tsx:31` | `addOptimisticMessage, removeMessage, updateMessageProgress` | 3 actions |
| 11 | `components/messaging/VideoUploadButton.tsx:32` | `addOptimisticMessage, replaceOptimisticMessage, removeMessage, updateMessageProgress, updateMessage` | 5 actions |
| 12 | `components/messaging/SwipeableConversationCard.tsx:27` | `togglePinOptimistic, toggleArchiveOptimistic` | 2 actions |
| 13 | `components/ContactsSidebarWithTabs.tsx:38` | `conversations` | 1 field |
| 14 | `components/AppDataPrefetcher.tsx:25` | `setConversations` | 1 action |
| 15 | `components/layout/Header.tsx:103` | Already uses selector: `useMessagingStore((state) => state.totalUnreadCount)` ✅ | Already fixed |

### `messagingStore.ts` State Fields (key ones for re-render impact)
```typescript
conversations: ConversationWithDetails[];    // Changes frequently
messages: Map<string, Message[]>;            // Changes on every send/receive
unreadCounts: Map<string, number>;           // Changes on new messages
totalUnreadCount: number;                    // Changes on new messages
typingUsers: Map<string, Set<string>>;       // Changes every few seconds
isLoadingConversations: boolean;             // Changes during fetches
isLoadingMessages: boolean;                  // Changes during fetches
isSendingMessage: boolean;                   // Changes during sends
playingVideoId: string | null;              // Changes on video play
activeConversationId: string | null;        // Changes on navigation
```

---

## ✅ Implementation Plan

### Transformation Rule (same as Story 15.1)

```typescript
// ❌ BAD — subscribes to ALL state
const { conversations, togglePinOptimistic } = useMessagingStore();

// ✅ GOOD — selective subscriptions
const conversations = useMessagingStore(s => s.conversations);
const togglePinOptimistic = useMessagingStore(s => s.togglePinOptimistic);
```

### Important: Actions Are Stable — But Still Better as Selectors
Even though Zustand actions are stable references, using selectors is still recommended for consistency and to prevent accidental subscription to data changes if the destructuring pattern includes even one data field.

### Specific File Transformations

**Action-only consumers (lowest risk — actions are stable):**
- `ConversationActionButtons.tsx` — 2 actions
- `ImageUploadButton.tsx` — 3 actions
- `VideoUploadButton.tsx` — 5 actions
- `SwipeableConversationCard.tsx` — 2 actions
- `AppDataPrefetcher.tsx` — 1 action

**Data + Action consumers (highest impact):**
- `useConversations.ts` — 10 fields! Heavy refactor needed (each data field gets its own selector, actions can be grouped)
- `ChatHeader.tsx` — 1 data field + 2 actions
- `ChatScreen.tsx` — 2 call sites: actions only (line 61) + data only (line 165)
- `ConversationListBulkActions.tsx` — 1 data + 2 actions
- `useTypingIndicator.ts` — 3 fields (data + actions)

**Already fixed:**
- `Header.tsx:103` — Already uses `useMessagingStore((state) => state.totalUnreadCount)` ✅

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| `grep -rn "useMessagingStore()" src/ --include="*.ts" --include="*.tsx" \| grep -v "messagingStore.ts"` | 0 bare `useMessagingStore()` calls |
| React DevTools Profiler → send a typing indicator | Only `TypingIndicator` component re-renders |
| React DevTools Profiler → receive a new message | Only `MessageList` + `ConversationCard` re-render |
| `npm run build` | Build succeeds |
| Send/receive messages | Still works correctly |
| Pin/archive/mute conversations | Still works correctly |

---

## ✅ Acceptance Criteria

- [ ] All `useMessagingStore()` calls use granular selectors
- [ ] Each data field has its own selector
- [ ] Typing indicators no longer cause conversation list re-renders
- [ ] Build passes
- [ ] All messaging features functional

---

## ✅ Definition of Done

- [ ] Zero bare `useMessagingStore()` calls
- [ ] Build passes
- [ ] Messaging regression test passed
