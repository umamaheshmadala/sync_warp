# 👀 STORY 8.5.1: Read Receipts Implementation

**Parent Epic:** [EPIC 8.5 - Advanced Messaging Features](../epics/EPIC_8.5_Advanced_Features.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** 🚧 In Progress  
**Dependencies:** Epic 8.1 (Database - `message_read_receipts` table)

---

## 🎯 **Story Goal**

Implement **read receipts** that show when messages have been seen by recipients **on web browsers, iOS, and Android**:

- Track when user reads a message in 1:1 conversations
- Display WhatsApp-style double-check marks (✓✓ → cyan when read)
- Real-time updates when message is read
- **Privacy toggle**: Reciprocal opt-out (if disabled, user can't see others' read receipts either)
- Respects visibility state (tab focus, app foreground)

> **Scope**: 1:1 conversations only. Group chat read receipts deferred to v2.

---

## 📱 **Platform Support**

| Platform    | Implementation        | Visual Indicator            |
| ----------- | --------------------- | --------------------------- |
| **Web**     | CSS transitions       | ✓✓ checkmarks (gray → cyan) |
| **iOS**     | Native haptic on read | ✓✓ + light haptic feedback  |
| **Android** | Native vibration      | ✓✓ + subtle vibration       |

---

## 📖 **User Stories**

### As a message sender, I want to:

1. See when my message has been delivered (✓✓ gray)
2. See when my message has been read (✓✓ cyan)
3. Get visual confirmation that my message was seen
4. **Optionally disable read receipts** (reciprocal: I also won't see others' read status)

### As a message receiver, I want to:

1. Have messages automatically marked as read when I view them
2. Not manually mark messages as read
3. **Control my privacy** by disabling read receipts

### Acceptance Criteria:

- ✅ Messages marked as read when chat screen is visible and focused
- ✅ Read status updates in real-time for sender
- ✅ Status icon changes from gray ✓✓ to cyan ✓✓ on read
- ✅ Works across all platforms (web + mobile)
- ✅ Respects visibility state (tab focus, app foreground)
- ❌ Privacy toggle in settings (reciprocal opt-out) - **PENDING: Database-side privacy check works (message.status stays 'sent'), but UI shows blue ticks via real-time subscription on `message_read_receipts` table. Fix needed: Client must check `message.status` field instead of read receipt insertions.**

---

## 🔒 **Confirmed Design Decisions**

| Decision         | Choice                             | Industry Reference |
| ---------------- | ---------------------------------- | ------------------ |
| Privacy opt-out  | Reciprocal (like WhatsApp)         | WhatsApp, Signal   |
| Visual indicator | ✓ sent, ✓✓ delivered, cyan ✓✓ read | WhatsApp           |
| Scope            | 1:1 conversations only             | -                  |

---

## 🧩 **Implementation Tasks**

### **Phase 1: Read Receipt Service** (0.5 days)

#### Task 1.1: Create ReadReceiptService

```typescript
// src/services/readReceiptService.ts
import { supabase } from "../lib/supabase";
import { realtimeService } from "./realtimeService";

export interface ReadReceipt {
  messageId: string;
  userId: string;
  readAt: string;
}

class ReadReceiptService {
  /**
   * Mark a single message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Use existing RPC function from Epic 8.1
    const { error } = await supabase.rpc("mark_message_as_read", {
      p_message_id: messageId,
      p_user_id: user.id,
    });

    if (error) throw error;
    console.log(`📖 Marked message ${messageId} as read`);
  }

  /**
   * Mark all unread messages in conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get unread messages not sent by current user
    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (!unreadMessages?.length) return 0;

    // Mark each as read (batch operation)
    await Promise.all(unreadMessages.map((msg) => this.markAsRead(msg.id)));

    console.log(`📚 Marked ${unreadMessages.length} messages as read`);
    return unreadMessages.length;
  }

  /**
   * Get read receipts for a message
   */
  async getReadReceipts(messageId: string): Promise<ReadReceipt[]> {
    const { data, error } = await supabase
      .from("message_read_receipts")
      .select(
        `
        message_id,
        user_id,
        read_at,
        user:users!message_read_receipts_user_id_fkey(
          id, username, avatar_url
        )
      `
      )
      .eq("message_id", messageId)
      .order("read_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Subscribe to read receipts for a conversation
   */
  subscribeToReadReceipts(
    conversationId: string,
    onReadReceipt: (receipt: ReadReceipt) => void
  ): () => void {
    const channel = supabase
      .channel(`read_receipts:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_read_receipts",
        },
        (payload) => {
          onReadReceipt({
            messageId: payload.new.message_id,
            userId: payload.new.user_id,
            readAt: payload.new.read_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const readReceiptService = new ReadReceiptService();
```

**🛢 MCP Integration:**

```bash
# Verify RPC function exists
warp mcp run supabase "execute_sql SELECT proname, prosrc FROM pg_proc WHERE proname = 'mark_message_as_read';"

# Test read receipt tracking
warp mcp run supabase "execute_sql SELECT m.id, m.content, rr.user_id, rr.read_at FROM messages m LEFT JOIN message_read_receipts rr ON m.id = rr.message_id WHERE m.conversation_id = 'CONV_ID' LIMIT 10;"
```

---

### **Phase 2: Visibility-Based Read Marking** (0.5 days)

#### Task 2.1: Update useMessages Hook

```typescript
// src/hooks/useMessages.ts (additions)
import { useEffect, useRef } from "react";
import { readReceiptService } from "../services/readReceiptService";

export function useMessages(conversationId: string) {
  const isVisibleRef = useRef(true);
  const lastMarkedRef = useRef<Set<string>>(new Set());

  // Track visibility
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current && conversationId) {
        // Mark unread when becoming visible
        markUnreadAsRead();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [conversationId]);

  // Mark messages as read when visible
  const markUnreadAsRead = async () => {
    if (!isVisibleRef.current) return;

    const unreadMessages = messages.filter(
      (msg) => !msg.read_at && msg.sender_id !== currentUserId
    );

    for (const msg of unreadMessages) {
      if (!lastMarkedRef.current.has(msg.id)) {
        await readReceiptService.markAsRead(msg.id);
        lastMarkedRef.current.add(msg.id);
      }
    }
  };

  // ... rest of hook
}
```

---

### **Phase 3: Read Receipt UI Component** (0.5 days)

#### Task 3.1: Create MessageReadStatus Component

```typescript
// src/components/messaging/MessageReadStatus.tsx
import React from 'react';
import { Check, CheckCheck, Eye } from 'lucide-react';

interface Props {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  readBy?: { username: string; avatarUrl?: string }[];
  isGroupChat?: boolean;
}

export function MessageReadStatus({ status, readBy = [], isGroupChat }: Props) {
  // Sending: single gray check (spinning)
  if (status === 'sending') {
    return (
      <div className="flex items-center text-gray-400">
        <Check className="w-4 h-4 animate-pulse" />
      </div>
    );
  }

  // Sent: single gray check
  if (status === 'sent') {
    return (
      <div className="flex items-center text-gray-400">
        <Check className="w-4 h-4" />
      </div>
    );
  }

  // Delivered: double gray checks
  if (status === 'delivered') {
    return (
      <div className="flex items-center text-gray-400">
        <CheckCheck className="w-4 h-4" />
      </div>
    );
  }

  // Read: double cyan checks with glow
  if (status === 'read') {
    return (
      <div className="group relative flex items-center">
        <CheckCheck
          className="w-4 h-4 text-cyan-500"
          style={{
            filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.5))'
          }}
        />

        {/* Tooltip for group chats */}
        {isGroupChat && readBy.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              <Eye className="w-3 h-3 inline mr-1" />
              Seen by {readBy.length} {readBy.length === 1 ? 'person' : 'people'}
              <div className="text-gray-400 text-xs">
                {readBy.slice(0, 3).map(u => u.username).join(', ')}
                {readBy.length > 3 && ` +${readBy.length - 3} more`}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
```

---

### **Phase 4: Integration with ChatScreen** (0.5 days)

#### Task 4.1: Update MessageBubble to Show Read Status

```typescript
// src/components/messaging/MessageBubble.tsx (additions)
import { MessageReadStatus } from './MessageReadStatus';

// Inside MessageBubble component
{isOwnMessage && (
  <MessageReadStatus
    status={message.status || 'sent'}
    readBy={message.readReceipts}
    isGroupChat={conversation?.type === 'group'}
  />
)}
```

#### Task 4.2: Subscribe to Read Receipts in ChatScreen

```typescript
// src/components/messaging/ChatScreen.tsx (additions)
useEffect(() => {
  const unsubscribe = readReceiptService.subscribeToReadReceipts(
    conversationId,
    (receipt) => {
      // Update message status in store
      updateMessageStatus(receipt.messageId, "read");
    }
  );

  return unsubscribe;
}, [conversationId]);
```

---

## 🧪 **Testing Plan**

### **Unit Tests**

```typescript
// src/services/__tests__/readReceiptService.test.ts
describe("ReadReceiptService", () => {
  it("should mark message as read", async () => {
    const messageId = "test-msg-123";
    await readReceiptService.markAsRead(messageId);

    const receipts = await readReceiptService.getReadReceipts(messageId);
    expect(receipts.length).toBe(1);
  });

  it("should mark all conversation messages as read", async () => {
    const count = await readReceiptService.markConversationAsRead("conv-123");
    expect(count).toBeGreaterThan(0);
  });
});
```

### **MCP Integration Tests**

```bash
# Test read receipt tracking with Supabase MCP
warp mcp run supabase "execute_sql SELECT COUNT(*) as read_count FROM message_read_receipts WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = 'conv-123');"

# Verify realtime subscription works
warp mcp run chrome-devtools "open Console, send a message, have another user read it, verify read receipt update appears in logs"
```

### **Browser Testing**

```bash
# Test visibility-based read marking
warp mcp run puppeteer "e2e test: open chat, switch tabs, return to chat, verify messages marked as read"

# Test read status visual transition
warp mcp run puppeteer "e2e test: send message, verify gray checkmarks, have recipient view, verify cyan checkmarks"
```

---

## 📊 **Performance Metrics**

| Metric                | Target  | Implementation        |
| --------------------- | ------- | --------------------- |
| Read marking latency  | < 200ms | Async batch marking   |
| Status update latency | < 500ms | Realtime subscription |
| UI render time        | < 16ms  | Lightweight component |

---

## ✅ **Definition of Done**

- [ ] ReadReceiptService implemented with all methods
- [ ] Visibility-based read marking working
- [ ] MessageReadStatus component with all status variants
- [ ] Realtime read receipt subscription working
- [ ] Group chat "Seen by X" tooltip working
- [ ] Unit tests passing (100% coverage)
- [ ] Browser tests passing
- [ ] Read receipts work across web, iOS, Android
- [ ] Documentation complete

---

**Next Story:** [STORY_8.5.2_Edit_Messages.md](./STORY_8.5.2_Edit_Messages.md)
