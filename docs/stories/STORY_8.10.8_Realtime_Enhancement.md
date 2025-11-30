# 🔄 STORY 8.10.8: Realtime Updates Enhancement

**Parent Epic:** [EPIC 8.10 - Conversation Management & Organization](../epics/EPIC_8.10_Conversation_Management.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1.5 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Enhance **realtime subscriptions** to sync message edits, deletes, reactions, read receipts, and all Epic 8.10 features (archive, pin, mute) across devices instantly.

**Current Coverage (Epic 8.2):**

- ✅ New messages (INSERT)
- ✅ Typing indicators (broadcast)
- ✅ Online/offline presence

**Missing Coverage:**

- ❌ Message edits (UPDATE)
- ❌ Message deletes (UPDATE is_deleted)
- ❌ Reactions (UPDATE reactions)
- ❌ Read receipts (INSERT message_read_receipts)
- ❌ Archive/pin status (UPDATE conversations)
- ❌ Mute status (INSERT/DELETE conversation_mutes)

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Implementation**

| Feature                 | Web         | iOS         | Android     |
| ----------------------- | ----------- | ----------- | ----------- |
| **Realtime Sync**       | WebSocket   | WebSocket   | WebSocket   |
| **Optimistic Updates**  | Instant UI  | Instant UI  | Instant UI  |
| **Conflict Resolution** | Server wins | Server wins | Server wins |
| **Offline Queue**       | IndexedDB   | SQLite      | SQLite      |

---

## 📖 **User Stories**

### As a user, I want to:

1. **See edits instantly** - When someone edits a message
2. **See deletes instantly** - When someone deletes a message
3. **See reactions instantly** - When someone reacts to a message
4. **See read receipts** - When someone reads my message
5. **Sync archive/pin** - When I archive/pin on one device, see it on all devices

### Acceptance Criteria:

- ✅ All UPDATE events sync in < 500ms
- ✅ Optimistic updates for own actions
- ✅ Server state wins on conflicts
- ✅ Works offline with queue
- ✅ No duplicate events

---

## 🧩 **Implementation Tasks**

### **Phase 1: Extend Realtime Service (0.5 days)**

#### **Task 1.1: Add UPDATE Subscriptions**

**File:** `src/services/realtimeService.ts` (extend)

```typescript
class RealtimeService {
  // ... (existing methods for INSERT, typing, presence)

  /**
   * Subscribe to message updates (edits, deletes, reactions)
   */
  subscribeToMessageUpdates(
    conversationId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    console.log("🔄 Subscribing to message updates:", conversationId);

    return this.supabase
      .channel(`conversation:${conversationId}:updates`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("📝 Message updated:", payload.new.id);
          callback(payload);
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to read receipts
   */
  subscribeToReadReceipts(
    conversationId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    console.log("👀 Subscribing to read receipts:", conversationId);

    return this.supabase
      .channel(`conversation:${conversationId}:receipts`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_read_receipts",
        },
        (payload) => {
          console.log("✓ Read receipt:", payload.new.message_id);
          callback(payload);
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to conversation updates (archive, pin, mute)
   */
  subscribeToConversationUpdates(
    conversationId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    console.log("📦 Subscribing to conversation updates:", conversationId);

    return this.supabase
      .channel(`conversation:${conversationId}:meta`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("📊 Conversation updated:", payload.new.id);
          callback(payload);
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to mute status changes
   */
  subscribeToMuteUpdates(
    userId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    console.log("🔕 Subscribing to mute updates for user:", userId);

    return this.supabase
      .channel(`user:${userId}:mutes`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "conversation_mutes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("🔔 Mute status changed:", payload);
          callback(payload);
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to all conversation list updates
   */
  subscribeToConversationList(
    userId: string,
    callback: (payload: any) => void
  ): RealtimeChannel {
    console.log("📋 Subscribing to conversation list updates");

    return this.supabase
      .channel(`user:${userId}:conversations`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          console.log("📬 Conversation list updated");
          callback(payload);
        }
      )
      .subscribe();
  }
}

export const realtimeService = new RealtimeService();
```

---

### **Phase 2: Update Hooks (0.5 days)**

#### **Task 2.1: Enhanced useMessages Hook**

**File:** `src/hooks/useMessages.ts` (extend)

```typescript
import { useEffect, useState } from "react";
import { realtimeService } from "../services/realtimeService";
import { messagingService } from "../services/messagingService";

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial messages
    const loadMessages = async () => {
      const data = await messagingService.getMessages(conversationId);
      setMessages(data);
      setLoading(false);
    };
    loadMessages();

    // Subscribe to new messages (INSERT)
    const newMessagesSub = realtimeService.subscribeToMessages(
      conversationId,
      (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      }
    );

    // Subscribe to message updates (UPDATE) - NEW!
    const updatesSub = realtimeService.subscribeToMessageUpdates(
      conversationId,
      (payload) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
          )
        );
      }
    );

    // Subscribe to read receipts - NEW!
    const receiptsSub = realtimeService.subscribeToReadReceipts(
      conversationId,
      (payload) => {
        const { message_id, user_id } = payload.new;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === message_id ? { ...msg, status: "read" } : msg
          )
        );
      }
    );

    return () => {
      newMessagesSub.unsubscribe();
      updatesSub.unsubscribe();
      receiptsSub.unsubscribe();
    };
  }, [conversationId]);

  return { messages, loading };
}
```

#### **Task 2.2: Enhanced useConversations Hook**

**File:** `src/hooks/useConversations.ts` (extend)

```typescript
import { useEffect, useState } from "react";
import { realtimeService } from "../services/realtimeService";
import { conversationManagementService } from "../services/conversationManagementService";
import { useAuthStore } from "../store/authStore";

export function useConversations(filter: ConversationFilter = "all") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Fetch initial conversations
    const loadConversations = async () => {
      const data = await conversationManagementService.getConversations(filter);
      setConversations(data);
      setLoading(false);
    };
    loadConversations();

    // Subscribe to conversation updates (archive, pin, etc.) - NEW!
    const conversationUpdatesSub = realtimeService.subscribeToConversationList(
      user.id,
      (payload) => {
        if (payload.eventType === "UPDATE") {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === payload.new.id ? { ...conv, ...payload.new } : conv
            )
          );
        } else if (payload.eventType === "INSERT") {
          setConversations((prev) => [payload.new as Conversation, ...prev]);
        } else if (payload.eventType === "DELETE") {
          setConversations((prev) =>
            prev.filter((conv) => conv.id !== payload.old.id)
          );
        }
      }
    );

    // Subscribe to mute status changes - NEW!
    const muteUpdatesSub = realtimeService.subscribeToMuteUpdates(
      user.id,
      (payload) => {
        const conversationId =
          payload.new?.conversation_id || payload.old?.conversation_id;

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, is_muted: payload.eventType !== "DELETE" }
              : conv
          )
        );
      }
    );

    return () => {
      conversationUpdatesSub.unsubscribe();
      muteUpdatesSub.unsubscribe();
    };
  }, [user, filter]);

  return { conversations, loading };
}
```

---

### **Phase 3: Optimistic Updates (0.5 days)**

#### **Task 3.1: Optimistic Update Helper**

**File:** `src/utils/optimisticUpdates.ts`

```typescript
import { toast } from "react-hot-toast";

export class OptimisticUpdateManager {
  private pendingUpdates = new Map<string, any>();

  /**
   * Apply optimistic update
   */
  applyOptimistic<T>(id: string, update: Partial<T>, rollback: T): void {
    this.pendingUpdates.set(id, rollback);
    console.log("⚡ Optimistic update applied:", id);
  }

  /**
   * Confirm update (server responded)
   */
  confirmUpdate(id: string): void {
    this.pendingUpdates.delete(id);
    console.log("✅ Optimistic update confirmed:", id);
  }

  /**
   * Rollback update (server failed)
   */
  rollbackUpdate(id: string): any {
    const rollback = this.pendingUpdates.get(id);
    this.pendingUpdates.delete(id);

    if (rollback) {
      console.log("↩️ Optimistic update rolled back:", id);
      toast.error("Action failed, rolling back");
    }

    return rollback;
  }

  /**
   * Clear all pending updates
   */
  clearAll(): void {
    this.pendingUpdates.clear();
  }
}

export const optimisticUpdates = new OptimisticUpdateManager();
```

#### **Task 3.2: Use Optimistic Updates in Services**

**File:** `src/services/conversationManagementService.ts` (extend)

```typescript
import { optimisticUpdates } from "../utils/optimisticUpdates";

class ConversationManagementService {
  async archiveConversation(conversationId: string): Promise<void> {
    // Apply optimistic update
    optimisticUpdates.applyOptimistic(
      `archive:${conversationId}`,
      { is_archived: true },
      { is_archived: false } // rollback value
    );

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", conversationId);

      if (error) throw error;

      // Confirm optimistic update
      optimisticUpdates.confirmUpdate(`archive:${conversationId}`);
    } catch (error) {
      // Rollback on error
      optimisticUpdates.rollbackUpdate(`archive:${conversationId}`);
      throw error;
    }
  }

  // Similar pattern for pin, mute, delete, etc.
}
```

---

## 🧪 **Testing Checklist**

### **Supabase MCP Tests**

```bash
# Test message update subscription
warp mcp run supabase "execute_sql
  UPDATE messages SET content = 'Edited message' WHERE id = 'test-msg-id';
  SELECT id, content, updated_at FROM messages WHERE id = 'test-msg-id';
"

# Test conversation update subscription
warp mcp run supabase "execute_sql
  UPDATE conversations SET is_pinned = true WHERE id = 'test-conv-id';
  SELECT id, is_pinned FROM conversations WHERE id = 'test-conv-id';
"

# Test mute subscription
warp mcp run supabase "execute_sql
  INSERT INTO conversation_mutes (conversation_id, user_id, muted_until)
  VALUES ('test-conv-id', auth.uid(), NOW() + INTERVAL '1 hour');
  SELECT * FROM conversation_mutes WHERE conversation_id = 'test-conv-id';
"
```

### **Manual Testing**

**Multi-Device Testing:**

- [ ] Open same conversation on 2 devices
- [ ] Edit message on device 1 → see update on device 2
- [ ] Delete message on device 1 → see delete on device 2
- [ ] Archive conversation on device 1 → see archive on device 2
- [ ] Pin conversation on device 1 → see pin on device 2
- [ ] Mute conversation on device 1 → see mute on device 2

**Optimistic Updates:**

- [ ] Archive conversation → instant UI update
- [ ] Network fails → rollback to previous state
- [ ] Network succeeds → confirm update

---

## 📊 **Success Metrics**

| Metric                        | Target         |
| ----------------------------- | -------------- |
| **Realtime Latency**          | < 500ms        |
| **Optimistic Update Success** | > 95%          |
| **Rollback Accuracy**         | 100%           |
| **Subscription Stability**    | > 99.9% uptime |
| **No Duplicate Events**       | 100%           |

---

## 📦 **Deliverables**

1. ✅ Extended: `realtimeService.ts` (UPDATE subscriptions)
2. ✅ Updated: `useMessages.ts` (message updates)
3. ✅ Updated: `useConversations.ts` (conversation updates)
4. ✅ Utility: `optimisticUpdates.ts`
5. ✅ Updated: All management services (optimistic updates)
6. ✅ Tests (Supabase MCP + multi-device)

---

## 🔗 **Dependencies**

### **Required Before Starting:**

- ✅ Epic 8.2: Realtime service foundation
- ✅ Story 8.10.1-8.10.7: All features to sync

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 1.5 days  
**Risk Level:** Medium (realtime complexity, but proven patterns)
