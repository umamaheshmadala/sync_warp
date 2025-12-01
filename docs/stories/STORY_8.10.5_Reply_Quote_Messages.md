# 💬 STORY 8.10.5: Reply/Quote Messages

**Parent Epic:** [EPIC 8.10 - Conversation Management & Organization](../epics/EPIC_8.10_Conversation_Management.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement **reply/quote messaging** to provide context when discussing specific deals or coupons, allowing users to reference previous messages in the conversation thread.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Implementation**

| Feature                | Web                  | iOS                 | Android             |
| ---------------------- | -------------------- | ------------------- | ------------------- |
| **Reply Action**       | Click reply button   | Long-press + haptic | Long-press + haptic |
| **Quote Preview**      | Inline preview       | Inline preview      | Inline preview      |
| **Navigate to Parent** | Click quoted message | Tap quoted message  | Tap quoted message  |
| **Cancel Reply**       | X button             | X button            | X button            |

**Required Capacitor Plugins:**

```json
{
  "@capacitor/haptics": "^5.0.0" // Already installed
}
```

---

## 📖 **User Stories**

### As a user, I want to:

1. **Reply to specific messages** - Provide context in conversations
2. **See quoted message** - Understand what I'm replying to
3. **Navigate to original** - Jump to the parent message
4. **Reply to deals/coupons** - Reference specific offers

### Acceptance Criteria:

- ✅ Reply shows parent message preview
- ✅ Quoted message is clickable (scrolls to original)
- ✅ Long-press triggers reply on mobile
- ✅ Haptic feedback on mobile
- ✅ Reply can be cancelled
- ✅ Works with all message types (text, images, links)

---

## 🧩 **Implementation Tasks**

### **Phase 1: Database Schema (0.5 days)**

#### **Task 1.1: Add parent_message_id Column**

```sql
-- Add reply support to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Index for fetching replies
CREATE INDEX IF NOT EXISTS idx_messages_parent
  ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- Index for conversation + parent lookup
CREATE INDEX IF NOT EXISTS idx_messages_conversation_parent
  ON messages(conversation_id, parent_message_id);
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "apply_migration add_message_replies '
  ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS idx_messages_parent
    ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_messages_conversation_parent
    ON messages(conversation_id, parent_message_id);
'"
```

**Verify Migration:**

```bash
warp mcp run supabase "execute_sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'messages' AND column_name = 'parent_message_id';
"
```

#### **Task 1.2: Update Message Queries to Include Parent**

```sql
-- Update message fetch to include parent message
CREATE OR REPLACE VIEW message_with_parent AS
SELECT
  m.*,
  -- Parent message details
  (
    SELECT json_build_object(
      'id', pm.id,
      'content', pm.content,
      'type', pm.type,
      'sender_id', pm.sender_id,
      'sender_name', u.username,
      'created_at', pm.created_at
    )
    FROM messages pm
    JOIN users u ON u.id = pm.sender_id
    WHERE pm.id = m.parent_message_id
  ) as parent_message
FROM messages m
WHERE m.is_deleted = false;
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "execute_sql '
  CREATE OR REPLACE VIEW message_with_parent AS
  SELECT
    m.*,
    (
      SELECT json_build_object(
        '\''id'\'', pm.id,
        '\''content'\'', pm.content,
        '\''type'\'', pm.type,
        '\''sender_id'\'', pm.sender_id,
        '\''sender_name'\'', u.username,
        '\''created_at'\'', pm.created_at
      )
      FROM messages pm
      JOIN users u ON u.id = pm.sender_id
      WHERE pm.id = m.parent_message_id
    ) as parent_message
  FROM messages m
  WHERE m.is_deleted = false;
'"
```

---

### **Phase 2: Backend Service (0.25 days)**

**File:** `src/services/messagingService.ts` (extend)

```typescript
interface SendMessageParams {
  conversationId: string;
  content: string;
  type?: "text" | "image" | "video" | "link";
  parentMessageId?: string; // NEW: For replies
  mediaUrls?: string[];
}

class MessagingService {
  // ... (existing methods)

  /**
   * Send message (updated to support replies)
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

    const { data, error } = await this.supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        type,
        parent_message_id: parentMessageId, // NEW
        media_urls: mediaUrls,
      })
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(id, username, avatar_url),
        parent_message:messages!parent_message_id(
          id,
          content,
          type,
          sender_id,
          sender:users!messages_sender_id_fkey(username)
        )
      `
      )
      .single();

    if (error) throw error;

    console.log("✅ Message sent", parentMessageId ? "(reply)" : "");
    return data as Message;
  }

  /**
   * Get message by ID (for quote preview)
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    const { data, error } = await this.supabase
      .from("messages")
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(id, username, avatar_url)
      `
      )
      .eq("id", messageId)
      .single();

    if (error) {
      console.error("Failed to fetch message:", error);
      return null;
    }

    return data as Message;
  }
}
```

---

### **Phase 3: Frontend Components (1.25 days)**

#### **Task 3.1: Reply Context Component**

**File:** `src/components/messaging/ReplyContext.tsx`

```typescript
import React from 'react'
import { X, CornerDownRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  parentMessage: {
    id: string
    content: string
    sender_name: string
    type: string
  }
  onCancel: () => void
  className?: string
}

export function ReplyContext({ parentMessage, onCancel, className }: Props) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-3 bg-blue-50 border-l-4 border-blue-600 rounded',
      className
    )}>
      <CornerDownRight className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-blue-600 mb-1">
          Replying to {parentMessage.sender_name}
        </div>
        <div className="text-sm text-gray-700 truncate">
          {parentMessage.type === 'text'
            ? parentMessage.content
            : `[${parentMessage.type}]`
          }
        </div>
      </div>

      <button
        onClick={onCancel}
        className="p-1 hover:bg-blue-100 rounded flex-shrink-0"
        aria-label="Cancel reply"
      >
        <X className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  )
}
```

#### **Task 3.2: Message Bubble with Quote**

**File:** `src/components/messaging/MessageBubble.tsx` (extend)

```typescript
import React from 'react'
import { CornerDownRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  message: {
    id: string
    content: string
    sender_id: string
    created_at: string
    parent_message?: {
      id: string
      content: string
      sender_name: string
      type: string
    }
  }
  isOwn: boolean
  onReply?: () => void
  onQuoteClick?: (messageId: string) => void
}

export function MessageBubble({ message, isOwn, onReply, onQuoteClick }: Props) {
  return (
    <div className={cn(
      'flex flex-col gap-1 max-w-[70%]',
      isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
    )}>
      {/* Quoted message (if reply) */}
      {message.parent_message && (
        <button
          onClick={() => onQuoteClick?.(message.parent_message!.id)}
          className={cn(
            'flex items-start gap-2 p-2 rounded text-xs max-w-full',
            'border-l-2 hover:bg-gray-100 transition-colors text-left',
            isOwn
              ? 'bg-blue-100 border-blue-400'
              : 'bg-gray-100 border-gray-400'
          )}
        >
          <CornerDownRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-700 truncate">
              {message.parent_message.sender_name}
            </div>
            <div className="text-gray-600 truncate">
              {message.parent_message.type === 'text'
                ? message.parent_message.content
                : `[${message.parent_message.type}]`
              }
            </div>
          </div>
        </button>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'px-4 py-2 rounded-2xl',
          isOwn
            ? 'bg-[#0a66c2] text-white rounded-br-sm'
            : 'bg-[#f3f2ef] text-gray-900 rounded-bl-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>

      {/* Timestamp */}
      <div className="text-[10px] text-gray-500 px-2">
        {new Date(message.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  )
}
```

#### **Task 3.3: Message Actions with Reply**

**File:** `src/components/messaging/MessageActions.tsx` (extend)

```typescript
import React, { useState } from 'react'
import { Reply, Edit2, Trash2, MoreVertical } from 'lucide-react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

interface Props {
  message: any
  canEdit: boolean
  canDelete: boolean
  onReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function MessageActions({
  message,
  canEdit,
  canDelete,
  onReply,
  onEdit,
  onDelete
}: Props) {
  const [showActions, setShowActions] = useState(false)

  const handleReply = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light })
    }
    onReply?.()
    setShowActions(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {showActions && (
        <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
          <button
            onClick={handleReply}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-left text-sm"
          >
            <Reply className="w-4 h-4" />
            Reply
          </button>

          {canEdit && (
            <button
              onClick={() => {
                onEdit?.()
                setShowActions(false)
              }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-left text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => {
                onDelete?.()
                setShowActions(false)
              }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 w-full text-left text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

#### **Task 3.4: Update MessageComposer**

**File:** `src/components/messaging/MessageComposer.tsx` (extend)

```typescript
import React, { useState } from 'react'
import { ReplyContext } from './ReplyContext'
import { messagingService } from '../../services/messagingService'

interface Props {
  conversationId: string
  replyToMessage?: {
    id: string
    content: string
    sender_name: string
    type: string
  } | null
  onCancelReply?: () => void
}

export function MessageComposer({ conversationId, replyToMessage, onCancelReply }: Props) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!content.trim() || isSending) return

    setIsSending(true)
    try {
      await messagingService.sendMessage({
        conversationId,
        content: content.trim(),
        parentMessageId: replyToMessage?.id,  // Include parent if replying
      })

      setContent('')
      onCancelReply?.()  // Clear reply context
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Reply context */}
      {replyToMessage && (
        <ReplyContext
          parentMessage={replyToMessage}
          onCancel={onCancelReply!}
        />
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 p-3 bg-gray-100 rounded-2xl">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Write a message..."
          className="flex-1 bg-transparent resize-none max-h-[120px] outline-none"
          rows={1}
        />

        {content.trim() && (
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## 🧪 **Testing Checklist**

### **Supabase MCP Tests**

```bash
# Test reply message insertion
warp mcp run supabase "execute_sql
  INSERT INTO messages (conversation_id, sender_id, content, parent_message_id)
  VALUES ('test-conv-id', auth.uid(), 'This is a reply', 'parent-msg-id');

  SELECT * FROM message_with_parent WHERE parent_message_id IS NOT NULL LIMIT 5;
"

# Test parent message fetch
warp mcp run supabase "execute_sql
  SELECT
    m.id,
    m.content,
    m.parent_message
  FROM message_with_parent m
  WHERE m.conversation_id = 'test-conv-id'
  ORDER BY m.created_at DESC
  LIMIT 10;
"
```

### **Manual Testing**

**Web:**

- [x] Click reply button shows reply context
- [x] Quoted message appears in bubble
- [x] Click quoted message scrolls to original
- [x] Cancel reply works
- [x] Reply sends with parent reference

**Mobile:**

- [x] Long-press triggers reply (haptic feedback)
- [x] Reply context appears
- [x] Quoted message clickable
- [x] Haptic on reply action

---

## 📊 **Success Metrics**

| Metric                     | Target             |
| -------------------------- | ------------------ |
| **Reply Success Rate**     | > 99%              |
| **Quote Click Navigation** | 100%               |
| **Haptic Feedback**        | Triggers on mobile |
| **Reply Context Display**  | < 100ms            |

---

## 📦 **Deliverables**

1. ✅ Migration: `add_message_replies`
2. ✅ View: `message_with_parent`
3. ✅ Component: `ReplyContext.tsx`
4. ✅ Updated: `MessageBubble.tsx` (quote display)
5. ✅ Updated: `MessageActions.tsx` (reply button)
6. ✅ Updated: `MessageComposer.tsx` (reply context)
7. ✅ Updated: `messagingService.ts` (parent_message_id)
8. ✅ Tests (Supabase MCP + manual)

---

**Story Status:** ✅ **COMPLETE**  
**Estimated Completion:** 2 days  
**Risk Level:** Low (straightforward parent-child relationship)
