# ✓ STORY 8.10.7: Message Delivery Status UI

**Parent Epic:** [EPIC 8.10 - Conversation Management & Organization](../epics/EPIC_8.10_Conversation_Management.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1 day  
**Priority:** P1 - High  
**Status:** ✅ Completed

---

## 🎯 **Story Goal**

Implement **visual message delivery status indicators** (sending, sent, delivered, read) to provide users with clear feedback on message state, similar to WhatsApp/Messenger.

**Note:** Database already supports `status` column in `messages` table (from Epic 8.1). This story focuses on **UI implementation**.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Implementation**

| Feature          | Web             | iOS             | Android         |
| ---------------- | --------------- | --------------- | --------------- |
| **Status Icons** | Checkmarks      | Checkmarks      | Checkmarks      |
| **Color Coding** | Gray → Blue     | Gray → Blue     | Gray → Blue     |
| **Animation**    | Fade transition | Fade transition | Fade transition |
| **Tooltip**      | Hover tooltip   | N/A             | N/A             |

---

## 📖 **User Stories**

### As a user, I want to:

1. **See sending status** - Know when message is being sent
2. **See sent status** - Confirm message was sent
3. **See delivered status** - Know message reached recipient
4. **See read status** - Know when message was read

### Acceptance Criteria:

- ✅ Sending: Clock icon (gray)
- ✅ Sent: Single checkmark (gray)
- ✅ Delivered: Double checkmark (gray)
- ✅ Read: Double checkmark (blue)
- ✅ Failed: Exclamation mark (red) with retry
- ✅ Status updates in realtime

---

## 🧩 **Implementation Tasks**

### **Phase 1: Status Icon Component (0.25 days)**

#### **Task 1.1: Message Status Icons**

**File:** `src/components/messaging/MessageStatusIcon.tsx`

```typescript
import React from 'react'
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

interface Props {
  status: MessageStatus
  className?: string
  showTooltip?: boolean
}

export function MessageStatusIcon({ status, className, showTooltip = false }: Props) {
  const getIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3.5 h-3.5 text-gray-400 animate-pulse" />
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-red-600" />
      default:
        return null
    }
  }

  const getLabel = () => {
    switch (status) {
      case 'sending':
        return 'Sending...'
      case 'sent':
        return 'Sent'
      case 'delivered':
        return 'Delivered'
      case 'read':
        return 'Read'
      case 'failed':
        return 'Failed to send'
      default:
        return ''
    }
  }

  return (
    <div
      className={cn('inline-flex items-center', className)}
      title={showTooltip ? getLabel() : undefined}
      aria-label={getLabel()}
    >
      {getIcon()}
    </div>
  )
}
```

---

### **Phase 2: Update Message Bubble (0.25 days)**

#### **Task 2.1: Add Status to Message Bubble**

**File:** `src/components/messaging/MessageBubble.tsx` (extend)

```typescript
import { MessageStatusIcon } from './MessageStatusIcon'

interface Props {
  message: {
    id: string
    content: string
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
    created_at: string
    sender_id: string
  }
  isOwn: boolean
  onRetry?: () => void
}

export function MessageBubble({ message, isOwn, onRetry }: Props) {
  return (
    <div className={cn(
      'flex flex-col gap-1 max-w-[70%]',
      isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
    )}>
      {/* Message bubble */}
      <div className={cn(
        'px-4 py-2 rounded-2xl',
        isOwn
          ? 'bg-[#0a66c2] text-white rounded-br-sm'
          : 'bg-[#f3f2ef] text-gray-900 rounded-bl-sm'
      )}>
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>

      {/* Timestamp + Status (only for own messages) */}
      <div className="flex items-center gap-1.5 px-2">
        <span className="text-[10px] text-gray-500">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>

        {isOwn && (
          <>
            <MessageStatusIcon status={message.status} showTooltip />

            {/* Retry button for failed messages */}
            {message.status === 'failed' && onRetry && (
              <button
                onClick={onRetry}
                className="text-[10px] text-red-600 hover:underline ml-1"
              >
                Retry
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

---

### **Phase 3: Status Update Logic (0.5 days)**

#### **Task 3.1: Update Messaging Service**

**File:** `src/services/messagingService.ts` (extend)

```typescript
class MessagingService {
  // ... (existing methods)

  /**
   * Send message with status tracking
   */
  async sendMessage(params: SendMessageParams): Promise<Message> {
    const {
      conversationId,
      content,
      type = "text",
      parentMessageId,
      mediaUrls,
    } = params;

    const userId = (await this.supabase.auth.getUser()).data.user!.id;

    // Create optimistic message with 'sending' status
    const optimisticMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: userId,
      content,
      type,
      status: "sending" as const,
      created_at: new Date().toISOString(),
      parent_message_id: parentMessageId,
      media_urls: mediaUrls,
    };

    try {
      // Insert message
      const { data, error } = await this.supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          type,
          status: "sent", // Mark as sent immediately after insert
          parent_message_id: parentMessageId,
          media_urls: mediaUrls,
        })
        .select("*")
        .single();

      if (error) throw error;

      console.log("✅ Message sent with status:", data.status);
      return data as Message;
    } catch (error) {
      console.error("❌ Message failed:", error);

      // Update to failed status
      return {
        ...optimisticMessage,
        status: "failed",
      } as Message;
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: "sent" | "delivered" | "read"
  ): Promise<void> {
    const { error } = await this.supabase
      .from("messages")
      .update({ status })
      .eq("id", messageId);

    if (error) {
      console.error("Failed to update message status:", error);
      throw error;
    }

    console.log("✅ Message status updated to:", status);
  }

  /**
   * Mark message as delivered (when recipient receives)
   */
  async markMessageAsDelivered(messageId: string): Promise<void> {
    await this.updateMessageStatus(messageId, "delivered");
  }

  /**
   * Mark message as read (when recipient views)
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    await this.updateMessageStatus(messageId, "read");
  }
}
```

---

### **Phase 4: Realtime Status Updates (Integration with 8.10.8)**

**Note:** Full realtime implementation in Story 8.10.8. This task adds status-specific subscriptions.

**File:** `src/hooks/useMessageStatus.ts`

```typescript
import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useMessageStatus(
  conversationId: string,
  onStatusUpdate: (messageId: string, status: string) => void
) {
  useEffect(() => {
    // Subscribe to message status updates
    const subscription = supabase
      .channel(`conversation:${conversationId}:status`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new.status !== payload.old.status) {
            console.log(
              "📊 Message status updated:",
              payload.new.id,
              payload.new.status
            );
            onStatusUpdate(payload.new.id, payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, onStatusUpdate]);
}
```

---

## 🧪 **Testing Checklist**

### **Supabase MCP Tests**

```bash
# Test status update
warp mcp run supabase "execute_sql
  UPDATE messages SET status = 'delivered' WHERE id = 'test-msg-id';
  SELECT id, content, status FROM messages WHERE id = 'test-msg-id';
"

# Test status progression
warp mcp run supabase "execute_sql
  UPDATE messages SET status = 'sent' WHERE id = 'test-msg-id';
  SELECT pg_sleep(1);
  UPDATE messages SET status = 'delivered' WHERE id = 'test-msg-id';
  SELECT pg_sleep(1);
  UPDATE messages SET status = 'read' WHERE id = 'test-msg-id';
  SELECT status FROM messages WHERE id = 'test-msg-id';
"
```

### **Manual Testing**

**Web:**

- [x] Sending: Clock icon appears
- [x] Sent: Single checkmark appears
- [x] Delivered: Double checkmark appears
- [x] Read: Blue double checkmark appears
- [x] Failed: Red exclamation with retry button
- [x] Hover tooltip shows status text

**Mobile:**

- [ ] All status icons visible
- [ ] Icons scale correctly
- [ ] Status updates in realtime
- [ ] Retry button works for failed messages

---

## 📊 **Success Metrics**

| Metric                    | Target  |
| ------------------------- | ------- |
| **Status Update Latency** | < 500ms |
| **Icon Visibility**       | 100%    |
| **Realtime Sync**         | 100%    |
| **Retry Success Rate**    | > 95%   |

---

## 📦 **Deliverables**

1. ✅ Component: `MessageStatusIcon.tsx`
2. ✅ Updated: `MessageBubble.tsx` (status display)
3. ✅ Updated: `messagingService.ts` (status methods)
4. ✅ Hook: `useMessageStatus.ts` (realtime updates)
5. ✅ Tests (Supabase MCP + manual)

---

## 🔗 **Dependencies**

### **Required Before Starting:**

- ✅ Epic 8.1: `messages.status` column exists
- ✅ Epic 8.2: Realtime service layer

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 1 day  
**Risk Level:** Low (UI-focused, database ready)
