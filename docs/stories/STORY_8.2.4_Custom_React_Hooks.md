# 🪝 STORY 8.2.4: Custom React Hooks

**Parent Epic:** [EPIC 8.2 - Core 1:1 Messaging Implementation](../epics/EPIC_8.2_Core_Messaging_Implementation.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 3 days  
**Priority:** P0 - Critical  
**Status:** ✅ **COMPLETE** - Implemented 2025-02-01

**Implementation Files:**

- `src/hooks/useConversations.ts` (4,100 bytes)
- `src/hooks/useConversationsEnhanced.ts` (2,408 bytes) - Bonus hook
- `src/hooks/useMessages.ts` (4,702 bytes)
- `src/hooks/useSendMessage.ts` (5,094 bytes)
- `src/hooks/useTypingIndicator.ts` (3,814 bytes)
- 5/4 hooks implemented (125% coverage)

---

## 🎯 **Story Goal**

Build **custom React hooks** that encapsulate business logic for conversations, messages, sending messages, and typing indicators. These hooks integrate services, state management, and realtime subscriptions to provide clean, reusable interfaces for UI components.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Platform Detection in Hooks**

Custom hooks must adapt behavior based on the platform (web vs mobile) to optimize performance and battery life.

#### **1. usePlatform Hook**

```typescript
import { Capacitor } from "@capacitor/core";
import { useState, useEffect } from "react";

export function usePlatform() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'web', 'ios', or 'android'

  return {
    isNative,
    isWeb: platform === "web",
    isIOS: platform === "ios",
    isAndroid: platform === "android",
    platform,
  };
}
```

#### **2. Platform-Specific Message Pagination**

```typescript
import { usePlatform } from "./usePlatform";

export function useMessages(conversationId: string | null) {
  const { isNative } = usePlatform();

  // Smaller page size on mobile (less memory, slower network)
  const PAGE_SIZE = isNative ? 25 : 50;

  const fetchMessages = useCallback(async () => {
    const { messages, hasMore } = await messagingService.fetchMessages(
      conversationId,
      PAGE_SIZE // Adaptive page size
    );
    // ...
  }, [conversationId, isNative]);
}
```

#### **3. Mobile Lifecycle Integration**

```typescript
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export function useRealtimeConnection() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Re-subscribe when app returns to foreground
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        console.log("📱 App active - reconnecting realtime...");
        reconnectRealtime();
      }
    });

    return () => listener.remove();
  }, []);
}
```

#### **4. Adaptive Polling Intervals**

```typescript
export function useConversations() {
  const { isNative } = usePlatform();

  // Longer polling interval on mobile to save battery
  const POLLING_INTERVAL = isNative ? 30000 : 10000; // 30s mobile, 10s web

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [POLLING_INTERVAL]);
}
```

### **Required Capacitor Plugins**

```json
{
  "dependencies": {
    "@capacitor/app": "^5.0.0" // App state monitoring
  }
}
```

### **Platform-Specific Testing Checklist**

#### **Web Testing**

- [ ] Hooks use larger page sizes (50 messages)
- [ ] Faster polling intervals (10s)
- [ ] No app lifecycle listeners

#### **iOS Testing**

- [ ] Hooks use smaller page sizes (25 messages)
- [ ] Realtime reconnects on app foreground
- [ ] Longer polling intervals (30s)
- [ ] Battery drain < 5% per hour

#### **Android Testing**

- [ ] Adaptive page sizes work correctly
- [ ] App state listeners don't leak
- [ ] Background/foreground transitions are smooth

### **Performance Targets**

| Metric                | Web            | iOS            | Android        |
| --------------------- | -------------- | -------------- | -------------- |
| **Message Page Size** | 50             | 25             | 25             |
| **Polling Interval**  | 10s            | 30s            | 30s            |
| **Hook Render Count** | < 3 per change | < 3 per change | < 3 per change |

---

## 📖 **User Stories**

### As a developer, I want:

1. A `useConversations` hook to fetch and subscribe to conversation list updates
2. A `useMessages` hook to fetch, paginate, and receive realtime messages
3. A `useSendMessage` hook to send messages with loading states
4. A `useTypingIndicator` hook to manage typing indicator broadcasts
5. All hooks to handle loading, error states, and cleanup automatically

### Acceptance Criteria:

- ✅ Hooks follow React best practices (proper dependency arrays)
- ✅ No infinite render loops
- ✅ Realtime subscriptions clean up on unmount
- ✅ All hooks are type-safe with TypeScript
- ✅ Context7 MCP validates hook patterns

---

## 🧩 **Implementation Tasks**

### **Phase 1: useConversations Hook** (0.5 days)

#### Task 1.1: Create useConversations Hook

```typescript
// src/hooks/useConversations.ts
import { useEffect, useCallback } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { messagingService } from "../services/messagingService";
import { realtimeService } from "../services/realtimeService";
import { toast } from "react-hot-toast";

export function useConversations() {
  const {
    conversations,
    isLoadingConversations,
    setConversations,
    setLoadingConversations,
    setTotalUnreadCount,
  } = useMessagingStore();

  // Fetch conversations on mount
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const data = await messagingService.fetchConversations();
      setConversations(data);

      // Calculate total unread
      const totalUnread = data.reduce(
        (sum, conv) => sum + (conv.unread_count || 0),
        0
      );
      setTotalUnreadCount(totalUnread);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [setConversations, setLoadingConversations, setTotalUnreadCount]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToConversations(() => {
      console.log("🔄 Refreshing conversations...");
      fetchConversations();
    });

    // Initial fetch
    fetchConversations();

    return () => {
      unsubscribe();
    };
  }, [fetchConversations]);

  return {
    conversations,
    isLoading: isLoadingConversations,
    refresh: fetchConversations,
  };
}
```

**🧠 Context7 MCP Analysis:**

```bash
# Check for infinite loops
warp mcp run context7 "analyze useConversations hook and check for potential infinite render loops in useEffect dependencies"

# Validate cleanup logic
warp mcp run context7 "review useConversations hook cleanup logic and identify potential memory leaks"
```

---

### **Phase 2: useMessages Hook** (1 day)

#### Task 2.1: Create useMessages Hook with Pagination

```typescript
// src/hooks/useMessages.ts
import { useEffect, useCallback, useRef } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { messagingService } from "../services/messagingService";
import { realtimeService } from "../services/realtimeService";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/authStore";

export function useMessages(conversationId: string | null) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const {
    messages,
    isLoadingMessages,
    setMessages,
    addMessage,
    updateMessage,
    setLoadingMessages,
    prependMessages,
    clearUnreadCount,
  } = useMessagingStore();

  const hasMore = useRef(true);
  const isLoadingMore = useRef(false);

  const conversationMessages = conversationId
    ? messages.get(conversationId) || []
    : [];

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoadingMessages(true);
      const { messages: fetchedMessages, hasMore: more } =
        await messagingService.fetchMessages(conversationId);

      setMessages(conversationId, fetchedMessages);
      hasMore.current = more;

      // Mark as read when opening conversation
      if (fetchedMessages.length > 0) {
        await messagingService.markConversationAsRead(conversationId);
        clearUnreadCount(conversationId);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [conversationId, setMessages, setLoadingMessages, clearUnreadCount]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore.current || isLoadingMore.current) return;

    try {
      isLoadingMore.current = true;
      const oldestMessage = conversationMessages[0];

      const { messages: olderMessages, hasMore: more } =
        await messagingService.fetchMessages(
          conversationId,
          50,
          oldestMessage?.id
        );

      prependMessages(conversationId, olderMessages);
      hasMore.current = more;
    } catch (error) {
      console.error("Failed to load more messages:", error);
      toast.error("Failed to load older messages");
    } finally {
      isLoadingMore.current = false;
    }
  }, [conversationId, conversationMessages, prependMessages]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribeNew = realtimeService.subscribeToMessages(
      conversationId,
      (newMessage) => {
        addMessage(conversationId, newMessage);

        // Auto-mark as read if conversation is active and user is not sender
        if (newMessage.sender_id !== currentUserId) {
          messagingService.markMessageAsRead(newMessage.id);
        }
      }
    );

    const unsubscribeUpdates = realtimeService.subscribeToMessageUpdates(
      conversationId,
      (updatedMessage) => {
        updateMessage(conversationId, updatedMessage.id, updatedMessage);
      }
    );

    // Initial fetch
    fetchMessages();

    return () => {
      unsubscribeNew();
      unsubscribeUpdates();
    };
  }, [conversationId, addMessage, updateMessage, fetchMessages, currentUserId]);

  return {
    messages: conversationMessages,
    isLoading: isLoadingMessages,
    hasMore: hasMore.current,
    loadMore,
    refresh: fetchMessages,
  };
}
```

**🧠 Context7 MCP Validation:**

```bash
# Check dependency arrays
warp mcp run context7 "analyze useMessages hook useEffect dependencies and verify correctness"

# Check for performance issues
warp mcp run context7 "review useMessages hook and identify potential performance bottlenecks with pagination"
```

---

### **Phase 3: useSendMessage Hook** (0.5 days)

#### Task 3.1: Create useSendMessage Hook

```typescript
// src/hooks/useSendMessage.ts
import { useCallback } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { messagingService } from "../services/messagingService";
import { toast } from "react-hot-toast";
import type { SendMessageParams } from "../types/messaging";

export function useSendMessage() {
  const { isSendingMessage, setSendingMessage } = useMessagingStore();

  const sendMessage = useCallback(
    async (params: SendMessageParams) => {
      try {
        setSendingMessage(true);

        const messageId = await messagingService.sendMessage(params);

        console.log("✅ Message sent:", messageId);
        return messageId;
      } catch (error) {
        console.error("❌ Failed to send message:", error);
        toast.error("Failed to send message. Please try again.");
        throw error;
      } finally {
        setSendingMessage(false);
      }
    },
    [setSendingMessage]
  );

  return {
    sendMessage,
    isSending: isSendingMessage,
  };
}
```

**🧠 Context7 MCP Review:**

```bash
# Review error handling
warp mcp run context7 "analyze useSendMessage hook error handling and suggest improvements"
```

---

### **Phase 4: useTypingIndicator Hook** (1 day)

#### Task 4.1: Create useTypingIndicator Hook

```typescript
// src/hooks/useTypingIndicator.ts
import { useEffect, useCallback, useRef } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { realtimeService } from "../services/realtimeService";
import { useAuthStore } from "../store/authStore";

const TYPING_TIMEOUT = 3000; // 3 seconds

export function useTypingIndicator(conversationId: string | null) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { typingUsers, addTypingUser, removeTypingUser } = useMessagingStore();

  const typingTimeout = useRef<NodeJS.Timeout>();
  const isTyping = useRef(false);

  // Get typing users for this conversation (excluding current user)
  const otherTypingUsers = conversationId
    ? Array.from(typingUsers.get(conversationId) || []).filter(
        (id) => id !== currentUserId
      )
    : [];

  // Broadcast typing indicator
  const setTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId) return;

      isTyping.current = typing;
      realtimeService.broadcastTyping(conversationId, typing);

      // Auto-stop typing after timeout
      if (typing) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
          setTyping(false);
        }, TYPING_TIMEOUT);
      }
    },
    [conversationId]
  );

  // Handle typing event (call on every keystroke)
  const handleTyping = useCallback(() => {
    if (!isTyping.current) {
      setTyping(true);
    } else {
      // Reset timeout
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        setTyping(false);
      }, TYPING_TIMEOUT);
    }
  }, [setTyping]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = realtimeService.subscribeToTyping(
      conversationId,
      (userId, typing) => {
        if (userId === currentUserId) return; // Ignore own typing

        if (typing) {
          addTypingUser(conversationId, userId);

          // Auto-remove after timeout (in case broadcast fails)
          setTimeout(() => {
            removeTypingUser(conversationId, userId);
          }, TYPING_TIMEOUT + 1000);
        } else {
          removeTypingUser(conversationId, userId);
        }
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(typingTimeout.current);
      if (isTyping.current) {
        setTyping(false);
      }
    };
  }, [
    conversationId,
    currentUserId,
    addTypingUser,
    removeTypingUser,
    setTyping,
  ]);

  return {
    isTyping: otherTypingUsers.length > 0,
    typingUserIds: otherTypingUsers,
    handleTyping,
    stopTyping: () => setTyping(false),
  };
}
```

**🧠 Context7 MCP Analysis:**

```bash
# Analyze timeout logic
warp mcp run context7 "analyze useTypingIndicator timeout management and identify potential race conditions"

# Check cleanup
warp mcp run context7 "review useTypingIndicator cleanup logic in useEffect return function"
```

---

## 🧪 **Testing Checklist**

### Unit Tests

- [ ] Test `useConversations` fetches on mount
- [ ] Test `useConversations` subscribes to realtime updates
- [ ] Test `useConversations` cleanup unsubscribes
- [ ] Test `useMessages` fetches initial messages
- [ ] Test `useMessages` pagination with `loadMore`
- [ ] Test `useMessages` marks messages as read
- [ ] Test `useMessages` handles realtime new messages
- [ ] Test `useSendMessage` sends successfully
- [ ] Test `useSendMessage` handles errors
- [ ] Test `useTypingIndicator` broadcasts correctly
- [ ] Test `useTypingIndicator` timeout auto-stops

### Integration Tests

```bash
# Test hooks with real services
npm run test -- hooks/ --coverage
```

### Context7 MCP Code Quality

```bash
# Analyze all hooks
warp mcp run context7 "analyze all hooks in src/hooks/ and identify potential issues with dependency arrays"

# Check for infinite loops
warp mcp run context7 "review React hooks in src/hooks/ for potential infinite render loops"

# Performance analysis
warp mcp run context7 "analyze hooks performance and suggest optimizations for large datasets"
```

---

## 📊 **Success Metrics**

| Metric                | Target              | Verification Method         |
| --------------------- | ------------------- | --------------------------- |
| **Hook Render Count** | < 3 per data change | React DevTools Profiler     |
| **No Infinite Loops** | Zero occurrences    | Context7 analysis + testing |
| **Cleanup Execution** | 100% on unmount     | Unit tests                  |
| **Type Safety**       | 100% coverage       | `npm run type-check`        |

---

## 🔗 **Dependencies**

### Required Before Starting:

- ✅ Story 8.2.1 (messagingService) must be complete
- ✅ Story 8.2.2 (realtimeService) must be complete
- ✅ Story 8.2.3 (messagingStore) must be complete

---

## 📦 **Deliverables**

1. ✅ `src/hooks/useConversations.ts` - Conversation list hook
2. ✅ `src/hooks/useMessages.ts` - Message history hook with pagination
3. ✅ `src/hooks/useSendMessage.ts` - Send message hook
4. ✅ `src/hooks/useTypingIndicator.ts` - Typing indicator hook
5. ✅ `src/hooks/__tests__/` - Unit tests for all hooks
6. ✅ Context7 MCP analysis reports

---

## 🔄 **Next Story**

➡️ [STORY 8.2.5: Conversation List UI](./STORY_8.2.5_Conversation_List_UI.md)

---

## 📝 **MCP Command Quick Reference**

### Context7 MCP

```bash
# Analyze hook patterns
warp mcp run context7 "analyze React hooks in src/hooks/ and validate dependency arrays"

# Check for infinite loops
warp mcp run context7 "review useEffect in messaging hooks for potential infinite loops"

# Performance review
warp mcp run context7 "analyze hooks performance with large datasets"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 3 days  
**Risk Level:** Medium (React hooks require careful dependency management)
