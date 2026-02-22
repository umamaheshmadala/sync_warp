# STORY 15.4 — Convert `messagingStore` Message Maps from `Map<>` to `Record<>`

**EPIC:** [EPIC 15 — Rendering Performance & State Management](../epics/EPIC_15_Rendering_Performance_State_Management.md)  
**Status:** ✅ Complete  
**Priority:** 🔴 Critical  
**Estimate:** 2 points  
**Dependencies:** Story 15.2 (selectors first to reduce blast radius)  
**Audit Finding:** 3.3 — `messagingStore` uses Map (bypasses Zustand reactivity)

---

## 🎯 User Story

> As a user, I want new messages and read receipts to appear instantly without needing to navigate away and back.

---

## 📍 Problem

Zustand's reactivity system uses **shallow equality** to detect state changes. JavaScript `Map` and `Set` objects are compared by reference — mutating their contents (via `.set()`, `.delete()`) does NOT change the reference. This means Zustand cannot detect when messages, unread counts, or typing users change inside a Map, leading to stale UI.

The current store works around this by creating `new Map(state.messages)` on every mutation — but this is fragile and creates a new reference for the entire Map even when only one conversation's messages changed.

### Current State Fields Using Map/Set
```typescript
messages: Map<string, Message[]>;           // ← Map
unreadCounts: Map<string, number>;          // ← Map
typingUsers: Map<string, Set<string>>;      // ← Map of Sets
```

---

## 🔍 Codebase Research — All Map Usage in `messagingStore.ts`

### `messages` Map — 11 mutations
Every mutation creates `new Map(state.messages)` then `.set()` on it:
- `setMessages` (line 374): `new Map(state.messages)` → `.set(conversationId, ...)`
- `addMessage` (line 398): Same pattern
- `upsertMessages` (line 468): Same pattern
- `updateMessage` (line 508): Same pattern
- `removeMessage` (line 521): Same pattern
- `prependMessages` (line 532): Same pattern
- `addOptimisticMessage` (line 551): Same pattern
- `replaceOptimisticMessage` (line 575): Same pattern
- `markMessageFailed` (line 614): Same pattern
- `updateMessageProgress` (line 634): Same pattern

### `unreadCounts` Map — 5 mutations
- `setConversations` (line 183): Creates fresh `new Map<string, number>()`
- `addConversation` (line 214): `new Map(state.unreadCounts)` → `.set()`
- `upsertConversation` (line 238): Same
- `setUnreadCount` (line 654): Same
- `incrementUnreadCount` (line 670): Same
- `clearUnreadCount` (line 692): Same

### `typingUsers` Map of Sets — 2 mutations
- `addTypingUser` (line 749): `new Map(state.typingUsers)` → `.set(convId, new Set(...))`
- `removeTypingUser` (line 758): Same

---

## ✅ Implementation Plan

### Step 1: Change Type Definitions

In `messagingStore.ts`, change the `MessagingState` interface:

```diff
 interface MessagingState {
   conversations: ConversationWithDetails[];
   activeConversationId: string | null;
-  messages: Map<string, Message[]>;
-  unreadCounts: Map<string, number>;
-  typingUsers: Map<string, Set<string>>;
+  messages: Record<string, Message[]>;
+  unreadCounts: Record<string, number>;
+  typingUsers: Record<string, string[]>;  // Set<string> → string[] for JSON compat
   totalUnreadCount: number;
```

### Step 2: Update Initial State

```diff
-      messages: new Map(),
-      unreadCounts: new Map(),
-      typingUsers: new Map(),
+      messages: {},
+      unreadCounts: {},
+      typingUsers: {},
```

### Step 3: Convert All Map Operations to Record Operations

Each mutation pattern changes from:
```typescript
// OLD — Map pattern
const newMessages = new Map(state.messages);
newMessages.set(conversationId, updatedMessages);
return { messages: newMessages };
```
To:
```typescript
// NEW — Record pattern (spread for immutability)
return {
  messages: {
    ...state.messages,
    [conversationId]: updatedMessages,
  },
};
```

### Step 4: Convert Map Method Calls

| Map Method | Record Equivalent |
|---|---|
| `map.get(key)` | `record[key]` |
| `map.set(key, value)` | `{ ...record, [key]: value }` |
| `map.delete(key)` | `const { [key]: _, ...rest } = record` |
| `map.has(key)` | `key in record` or `record[key] !== undefined` |
| `new Map(map)` | `{ ...record }` |
| `map.entries()` | `Object.entries(record)` |
| `map.values()` | `Object.values(record)` |
| `Array.from(map.values())` | `Object.values(record)` |

### Step 5: Convert `typingUsers` Set to Array

```typescript
// OLD
typingUsers: Map<string, Set<string>>
addTypingUser: new Set(map.get(convId) || []) → users.add(userId)

// NEW
typingUsers: Record<string, string[]>
addTypingUser: {
  ...state.typingUsers,
  [conversationId]: [
    ...(state.typingUsers[conversationId] || []).filter(id => id !== userId),
    userId
  ]
}
```

### Step 6: Update All Consumers

Search all files that access `messages`, `unreadCounts`, or `typingUsers` from the store and update:
- `.get(key)` → `[key]`
- `Array.from(map.values())` → `Object.values(record)`
- Selectors that depend on Map methods

### Step 7: Update `saveUnreadCounts` / `loadUnreadCounts`

The persistence methods (lines 787-843) convert Map to/from JSON. With Record, this simplifies:
```typescript
// OLD
const counts = Array.from(get().unreadCounts.entries());
// NEW
const counts = get().unreadCounts; // Already JSON-serializable
```

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Send a message → appears instantly | No stale UI |
| Receive a message → appears instantly | No need to navigate away/back |
| Read receipt updates | Status icons update in real-time |
| Typing indicator appears/disappears | Smooth, no delay |
| Unread count badge updates | Correct count, updates live |
| `npm run build` | Build succeeds with 0 TypeScript errors |
| Mobile unread persistence | Save/load still works |

---

## ✅ Acceptance Criteria

- [x] `messages` type changed from `Map<string, Message[]>` to `Record<string, Message[]>`
- [x] `unreadCounts` changed from `Map<string, number>` to `Record<string, number>`
- [x] `typingUsers` changed from `Map<string, Set<string>>` to `Record<string, string[]>`
- [x] All Map operations converted to Record spread patterns
- [x] All consumers updated (no `.get()` calls on Records)
- [x] Persistence (save/load unread) still works
- [x] Build passes with zero TypeScript errors

---

## ✅ Definition of Done

- [x] Zero `Map` or `Set` usage in `messagingStore.ts`
- [x] All consumers updated
- [x] Real-time messaging verified
- [x] Build passes
