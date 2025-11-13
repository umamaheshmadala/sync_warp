# 🗄️ STORY 8.2.3: Zustand State Management

**Parent Epic:** [EPIC 8.2 - Core 1:1 Messaging Implementation](../epics/EPIC_8.2_Core_Messaging_Implementation.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Create the **global messaging store** using Zustand to manage conversations, messages, unread counts, and typing indicators. Optimize state updates to prevent unnecessary re-renders and ensure efficient handling of large message lists.

---

## 📖 **User Stories**

### As a developer, I want:
1. Centralized state management for all messaging data
2. Efficient updates that don't cause unnecessary re-renders
3. Type-safe state access with TypeScript
4. Dev tools integration for debugging state changes
5. Optimized Map-based storage for messages by conversation ID

### Acceptance Criteria:
- ✅ Store handles 1000+ messages without performance degradation
- ✅ State updates are atomic and don't cause race conditions
- ✅ Zustand devtools show all actions clearly
- ✅ No memory leaks with Map data structures
- ✅ Type safety is 100% enforced

---

## 🧩 **Implementation Tasks**

### **Phase 1: Store Schema Definition** (0.5 days)

#### Task 1.1: Define Store Interface
```typescript
// src/store/messagingStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Message, ConversationWithDetails } from '../types/messaging'

interface MessagingState {
  // Conversations
  conversations: ConversationWithDetails[]
  activeConversationId: string | null
  
  // Messages (Map for efficient lookup)
  messages: Map<string, Message[]> // conversationId -> Message[]
  
  // Unread counts
  unreadCounts: Map<string, number> // conversationId -> count
  totalUnreadCount: number
  
  // Typing indicators
  typingUsers: Map<string, Set<string>> // conversationId -> Set<userId>
  
  // UI State
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean
  
  // Actions (defined below)
}
```

**🧠 Context7 MCP Analysis:**
```bash
# Analyze state design
warp mcp run context7 "analyze MessagingState interface and suggest improvements for scalability"
```

---

### **Phase 2: Conversation Actions** (0.5 days)

#### Task 2.1: Conversation CRUD Actions
```typescript
// Actions
setConversations: (conversations: ConversationWithDetails[]) => void
addConversation: (conversation: ConversationWithDetails) => void
updateConversation: (conversationId: string, updates: Partial<ConversationWithDetails>) => void
setActiveConversation: (conversationId: string | null) => void

// Implementation
export const useMessagingStore = create<MessagingState>()(
  devtools(
    (set) => ({
      conversations: [],
      activeConversationId: null,
      messages: new Map(),
      unreadCounts: new Map(),
      totalUnreadCount: 0,
      typingUsers: new Map(),
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,

      setConversations: (conversations) => 
        set({ conversations }, false, 'setConversations'),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations]
        }), false, 'addConversation'),

      updateConversation: (conversationId, updates) =>
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.conversation_id === conversationId
              ? { ...conv, ...updates }
              : conv
          )
        }), false, 'updateConversation'),

      setActiveConversation: (conversationId) =>
        set({ activeConversationId: conversationId }, false, 'setActiveConversation'),
    }),
    { name: 'Messaging Store' }
  )
)
```

---

### **Phase 3: Message Actions** (0.5 days)

#### Task 3.1: Message CRUD Actions
```typescript
setMessages: (conversationId: string, messages: Message[]) => void
addMessage: (conversationId: string, message: Message) => void
updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
removeMessage: (conversationId: string, messageId: string) => void
prependMessages: (conversationId: string, messages: Message[]) => void // For pagination

// Implementation
setMessages: (conversationId, messages) =>
  set((state) => {
    const newMessages = new Map(state.messages)
    newMessages.set(conversationId, messages)
    return { messages: newMessages }
  }, false, 'setMessages'),

addMessage: (conversationId, message) =>
  set((state) => {
    const newMessages = new Map(state.messages)
    const conversationMessages = newMessages.get(conversationId) || []
    newMessages.set(conversationId, [...conversationMessages, message])
    return { messages: newMessages }
  }, false, 'addMessage'),

updateMessage: (conversationId, messageId, updates) =>
  set((state) => {
    const newMessages = new Map(state.messages)
    const conversationMessages = newMessages.get(conversationId) || []
    newMessages.set(
      conversationId,
      conversationMessages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    )
    return { messages: newMessages }
  }, false, 'updateMessage'),

removeMessage: (conversationId, messageId) =>
  set((state) => {
    const newMessages = new Map(state.messages)
    const conversationMessages = newMessages.get(conversationId) || []
    newMessages.set(
      conversationId,
      conversationMessages.filter(msg => msg.id !== messageId)
    )
    return { messages: newMessages }
  }, false, 'removeMessage'),

prependMessages: (conversationId, messages) =>
  set((state) => {
    const newMessages = new Map(state.messages)
    const existing = newMessages.get(conversationId) || []
    newMessages.set(conversationId, [...messages, ...existing])
    return { messages: newMessages }
  }, false, 'prependMessages'),
```

**🧠 Context7 MCP Performance Check:**
```bash
# Check for performance issues
warp mcp run context7 "analyze message CRUD actions and identify potential performance bottlenecks with large message arrays"
```

---

### **Phase 4: Unread Counts & Typing Indicators** (0.5 days)

#### Task 4.1: Unread Count Actions
```typescript
setUnreadCount: (conversationId: string, count: number) => void
incrementUnreadCount: (conversationId: string) => void
clearUnreadCount: (conversationId: string) => void
setTotalUnreadCount: (count: number) => void

// Implementation
setUnreadCount: (conversationId, count) =>
  set((state) => {
    const newCounts = new Map(state.unreadCounts)
    newCounts.set(conversationId, count)
    return { unreadCounts: newCounts }
  }, false, 'setUnreadCount'),

incrementUnreadCount: (conversationId) =>
  set((state) => {
    const newCounts = new Map(state.unreadCounts)
    const current = newCounts.get(conversationId) || 0
    newCounts.set(conversationId, current + 1)
    return { 
      unreadCounts: newCounts,
      totalUnreadCount: state.totalUnreadCount + 1
    }
  }, false, 'incrementUnreadCount'),

clearUnreadCount: (conversationId) =>
  set((state) => {
    const newCounts = new Map(state.unreadCounts)
    const removed = newCounts.get(conversationId) || 0
    newCounts.set(conversationId, 0)
    return { 
      unreadCounts: newCounts,
      totalUnreadCount: Math.max(0, state.totalUnreadCount - removed)
    }
  }, false, 'clearUnreadCount'),

setTotalUnreadCount: (count) =>
  set({ totalUnreadCount: count }, false, 'setTotalUnreadCount'),
```

---

#### Task 4.2: Typing Indicator Actions
```typescript
addTypingUser: (conversationId: string, userId: string) => void
removeTypingUser: (conversationId: string, userId: string) => void

// Implementation
addTypingUser: (conversationId, userId) =>
  set((state) => {
    const newTyping = new Map(state.typingUsers)
    const users = newTyping.get(conversationId) || new Set()
    users.add(userId)
    newTyping.set(conversationId, users)
    return { typingUsers: newTyping }
  }, false, 'addTypingUser'),

removeTypingUser: (conversationId, userId) =>
  set((state) => {
    const newTyping = new Map(state.typingUsers)
    const users = newTyping.get(conversationId)
    if (users) {
      users.delete(userId)
      newTyping.set(conversationId, users)
    }
    return { typingUsers: newTyping }
  }, false, 'removeTypingUser'),
```

**🧠 Context7 MCP Memory Leak Check:**
```bash
# Check for memory leaks with Map/Set usage
warp mcp run context7 "analyze messagingStore Map and Set usage for potential memory leaks"
```

---

### **Phase 5: Loading States & Reset** (Remaining time)

#### Task 5.1: Loading State Actions
```typescript
setLoadingConversations: (loading: boolean) => void
setLoadingMessages: (loading: boolean) => void
setSendingMessage: (sending: boolean) => void
reset: () => void

// Implementation
setLoadingConversations: (loading) =>
  set({ isLoadingConversations: loading }, false, 'setLoadingConversations'),

setLoadingMessages: (loading) =>
  set({ isLoadingMessages: loading }, false, 'setLoadingMessages'),

setSendingMessage: (sending) =>
  set({ isSendingMessage: sending }, false, 'setSendingMessage'),

reset: () =>
  set({
    conversations: [],
    activeConversationId: null,
    messages: new Map(),
    unreadCounts: new Map(),
    totalUnreadCount: 0,
    typingUsers: new Map(),
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSendingMessage: false
  }, false, 'reset')
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test conversation CRUD operations
- [ ] Test message CRUD operations with Map structure
- [ ] Test unread count increment/decrement
- [ ] Test typing indicator add/remove
- [ ] Test reset clears all state
- [ ] Test state doesn't mutate (immutability)

### Performance Tests
```bash
# Test with large datasets
npm run test -- messagingStore.test.ts --coverage
```

### Context7 MCP Code Quality Checks
```bash
# Analyze state management patterns
warp mcp run context7 "analyze messagingStore.ts and identify anti-patterns or optimization opportunities"

# Check for race conditions
warp mcp run context7 "review messagingStore.ts for potential race conditions in state updates"

# Memory leak analysis
warp mcp run context7 "analyze messagingStore.ts Map usage and suggest memory optimization strategies"
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **State Update Performance** | < 5ms per action | Chrome DevTools Performance tab |
| **Memory Usage** | < 50MB for 1000 messages | Chrome DevTools Memory Profiler |
| **Re-render Efficiency** | Only affected components re-render | React DevTools Profiler |
| **Type Safety** | 100% type coverage | `npm run type-check` |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ `src/types/messaging.ts` must exist (from Story 8.2.1)
- ✅ Zustand must be installed: `npm install zustand`

---

## 📦 **Deliverables**

1. ✅ `src/store/messagingStore.ts` - Complete store implementation
2. ✅ `src/store/__tests__/messagingStore.test.ts` - Unit tests
3. ✅ Performance benchmarks documented
4. ✅ Context7 MCP analysis report

---

## 🔄 **Next Story**

➡️ [STORY 8.2.4: Custom React Hooks](./STORY_8.2.4_Custom_React_Hooks.md)

---

## 📝 **MCP Command Quick Reference**

### Context7 MCP
```bash
# Analyze state patterns
warp mcp run context7 "analyze messagingStore.ts state management patterns"

# Check performance
warp mcp run context7 "review messagingStore.ts for performance optimization opportunities"

# Memory analysis
warp mcp run context7 "analyze Map and Set usage in messagingStore.ts for memory efficiency"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 2 days  
**Risk Level:** Low (well-established Zustand patterns)
