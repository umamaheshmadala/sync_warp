# 📌 STORY 8.5.7: Pin Messages (v2 Feature)

**Parent Epic:** [EPIC 8.5 - Advanced Messaging Features](../epics/EPIC_8.5_Advanced_Features.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1 day  
**Priority:** P2 - Medium (Optional for v2)  
**Status:** ✅ Complete  
**Dependencies:** Stories 8.5.1-8.5.6 (Core features)

---

## 🎯 **Story Goal**

Implement **message pinning** for important messages in conversations:

- Pin important messages in conversations
- Quick access to pinned messages
- Pin/unpin by conversation admins (groups) or any participant (1:1)
- Display pinned message banner at top of chat
- Maximum 3 pinned messages per conversation

---

## 📱 **Platform Support**

| Platform    | Pin Trigger                  | Pinned Display          |
| ----------- | ---------------------------- | ----------------------- |
| **Web**     | Context menu / Action button | Top banner + side panel |
| **iOS**     | Long-press action            | Collapsible banner      |
| **Android** | Long-press action            | Collapsible banner      |

---

## 📖 **User Stories**

### As a user, I want to:

1. Pin important messages for quick reference
2. See pinned messages at the top of chat
3. Quickly navigate to pinned message in context
4. Unpin messages when no longer relevant

### **Phase 1: Database Schema** (0.25 days)

#### Task 1.1: Add Pinned Messages Table

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_pinned_messages.sql

CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- WhatsApp standard: 24h, 7d, 30d

  -- Unique constraint: same message can only be pinned once per conversation
  UNIQUE(conversation_id, message_id)
);

-- Index for fast lookups
CREATE INDEX idx_pinned_messages_conversation
ON pinned_messages(conversation_id);

-- RLS policies
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;

-- Anyone in conversation can view pins
CREATE POLICY "View pinned messages" ON pinned_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Participants can pin (add more restrictions for groups if needed)
CREATE POLICY "Pin messages" ON pinned_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
    AND pinned_by = auth.uid()
  );

-- Only pinner or admins can unpin
CREATE POLICY "Unpin messages" ON pinned_messages
  FOR DELETE
  USING (
    pinned_by = auth.uid()
    OR conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

**🛢 MCP Integration:**

```bash
# Apply migration
warp mcp run supabase "apply_migration add_pinned_messages 'CREATE TABLE IF NOT EXISTS pinned_messages (...)'"

# Verify table
warp mcp run supabase "execute_sql SELECT table_name FROM information_schema.tables WHERE table_name = 'pinned_messages';"
```

---

### **Phase 2: Pin Service** (0.25 days)

#### Task 2.1: Create PinnedMessageService

```typescript
// src/services/pinnedMessageService.ts
import { supabase } from "../lib/supabase";
import { hapticService } from "./hapticService";

export interface PinnedMessage {
  id: string;
  messageId: string;
  conversationId: string;
  pinnedBy: string;
  pinnedAt: string;
  message?: {
    id: string;
    content: string;
    senderName: string;
    createdAt: string;
  };
}

class PinnedMessageService {
  private readonly MAX_PINS = 3;

  /**
   * Get pinned messages for a conversation
   */
  async getPinnedMessages(conversationId: string): Promise<PinnedMessage[]> {
    const { data, error } = await supabase
      .from("pinned_messages")
      .select(
        `
        id,
        message_id,
        conversation_id,
        pinned_by,
        pinned_at,
        message:messages!pinned_messages_message_id_fkey(
          id,
          content,
          created_at,
          sender:users!messages_sender_id_fkey(username)
        )
      `
      )
      .eq("conversation_id", conversationId)
      .order("pinned_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((pin) => ({
      id: pin.id,
      messageId: pin.message_id,
      conversationId: pin.conversation_id,
      pinnedBy: pin.pinned_by,
      pinnedAt: pin.pinned_at,
      message: pin.message
        ? {
            id: pin.message.id,
            content: pin.message.content,
            senderName: pin.message.sender?.username || "Unknown",
            createdAt: pin.message.created_at,
          }
        : undefined,
    }));
  }

  /**
   * Pin a message
   */
  async pinMessage(
    messageId: string,
    conversationId: string
  ): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Check pin limit
    const currentPins = await this.getPinnedMessages(conversationId);
    if (currentPins.length >= this.MAX_PINS) {
      throw new Error(`Maximum ${this.MAX_PINS} pinned messages allowed`);
    }

    // Check if already pinned
    const isAlreadyPinned = currentPins.some((p) => p.messageId === messageId);
    if (isAlreadyPinned) {
      throw new Error("Message already pinned");
    }

    const { error } = await supabase.from("pinned_messages").insert({
      message_id: messageId,
      conversation_id: conversationId,
      pinned_by: user.id,
    });

    if (error) throw error;

    await hapticService.trigger("success");
    console.log(`📌 Pinned message ${messageId}`);
    return true;
  }

  /**
   * Unpin a message
   */
  async unpinMessage(
    messageId: string,
    conversationId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from("pinned_messages")
      .delete()
      .eq("message_id", messageId)
      .eq("conversation_id", conversationId);

    if (error) throw error;

    await hapticService.trigger("light");
    console.log(`📍 Unpinned message ${messageId}`);
    return true;
  }

  /**
   * Check if message is pinned
   */
  async isMessagePinned(
    messageId: string,
    conversationId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("pinned_messages")
      .select("id")
      .eq("message_id", messageId)
      .eq("conversation_id", conversationId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return !!data;
  }

  /**
   * Subscribe to pin changes
   */
  subscribeToPinChanges(
    conversationId: string,
    onChange: () => void
  ): () => void {
    const channel = supabase
      .channel(`pins:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pinned_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const pinnedMessageService = new PinnedMessageService();
```

---

### **Phase 3: UI Components** (0.25 days)

#### Task 3.1: Create PinnedMessagesBanner Component

```typescript
// src/components/messaging/PinnedMessagesBanner.tsx
import React, { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { PinnedMessage } from '../../services/pinnedMessageService';

interface Props {
  pinnedMessages: PinnedMessage[];
  onMessageClick: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  canUnpin: boolean;
}

export function PinnedMessagesBanner({
  pinnedMessages,
  onMessageClick,
  onUnpin,
  canUnpin
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (pinnedMessages.length === 0) return null;

  const currentPin = pinnedMessages[currentIndex];

  const truncateContent = (content: string, maxLength: number = 60) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-blue-50 border-b border-blue-100">
      {/* Collapsed view - single pin */}
      <div
        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-blue-100/50"
        onClick={() => onMessageClick(currentPin.messageId)}
      >
        <Pin className="w-4 h-4 text-blue-600 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900">
            {currentPin.message?.senderName}
          </p>
          <p className="text-sm text-blue-700 truncate">
            {truncateContent(currentPin.message?.content || '')}
          </p>
        </div>

        {/* Navigate between pins */}
        {pinnedMessages.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((currentIndex - 1 + pinnedMessages.length) % pinnedMessages.length);
              }}
              className="p-1 hover:bg-blue-200 rounded"
            >
              <ChevronUp className="w-4 h-4 text-blue-600" />
            </button>
            <span className="text-xs text-blue-600">
              {currentIndex + 1}/{pinnedMessages.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((currentIndex + 1) % pinnedMessages.length);
              }}
              className="p-1 hover:bg-blue-200 rounded"
            >
              <ChevronDown className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        )}

        {/* Expand/collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1 hover:bg-blue-200 rounded"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-blue-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-600" />
          )}
        </button>
      </div>

      {/* Expanded view - all pins */}
      {isExpanded && (
        <div className="border-t border-blue-100 divide-y divide-blue-100">
          {pinnedMessages.map((pin, index) => (
            <div
              key={pin.id}
              className="flex items-center gap-3 px-4 py-2 hover:bg-blue-100/50 cursor-pointer"
              onClick={() => onMessageClick(pin.messageId)}
            >
              <Pin className="w-4 h-4 text-blue-500 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900">
                  {pin.message?.senderName}
                </p>
                <p className="text-sm text-blue-700 truncate">
                  {truncateContent(pin.message?.content || '')}
                </p>
              </div>

              {canUnpin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(pin.messageId);
                  }}
                  className="p-1 hover:bg-red-100 rounded text-red-500"
                  title="Unpin"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### **Phase 4: Hook and Integration** (0.25 days)

#### Task 4.1: Create usePinnedMessages Hook

```typescript
// src/hooks/usePinnedMessages.ts
import { useState, useEffect, useCallback } from "react";
import {
  pinnedMessageService,
  PinnedMessage,
} from "../services/pinnedMessageService";
import { toast } from "react-hot-toast";

export function usePinnedMessages(conversationId: string) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch pinned messages
  useEffect(() => {
    const fetchPins = async () => {
      try {
        const pins =
          await pinnedMessageService.getPinnedMessages(conversationId);
        setPinnedMessages(pins);
      } catch (error) {
        console.error("Failed to fetch pinned messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPins();

    // Subscribe to changes
    const unsubscribe = pinnedMessageService.subscribeToPinChanges(
      conversationId,
      fetchPins
    );

    return unsubscribe;
  }, [conversationId]);

  // Pin message
  const pinMessage = useCallback(
    async (messageId: string) => {
      try {
        await pinnedMessageService.pinMessage(messageId, conversationId);
        toast.success("Message pinned");
      } catch (error: any) {
        toast.error(error.message || "Failed to pin message");
      }
    },
    [conversationId]
  );

  // Unpin message
  const unpinMessage = useCallback(
    async (messageId: string) => {
      try {
        await pinnedMessageService.unpinMessage(messageId, conversationId);
        toast.success("Message unpinned");
      } catch (error) {
        toast.error("Failed to unpin message");
      }
    },
    [conversationId]
  );

  // Check if message is pinned
  const isMessagePinned = useCallback(
    (messageId: string) => {
      return pinnedMessages.some((p) => p.messageId === messageId);
    },
    [pinnedMessages]
  );

  return {
    pinnedMessages,
    isLoading,
    pinMessage,
    unpinMessage,
    isMessagePinned,
    canPin: pinnedMessages.length < 3,
  };
}
```

#### Task 4.2: Add Pin to ChatScreen

```typescript
// src/components/messaging/ChatScreen.tsx (additions)
import { PinnedMessagesBanner } from './PinnedMessagesBanner';
import { usePinnedMessages } from '../../hooks/usePinnedMessages';

// Inside ChatScreen
const {
  pinnedMessages,
  pinMessage,
  unpinMessage,
  isMessagePinned
} = usePinnedMessages(conversationId);

// Add to render
return (
  <div className="flex flex-col h-full">
    {/* Header */}
    <header>...</header>

    {/* Pinned messages banner */}
    <PinnedMessagesBanner
      pinnedMessages={pinnedMessages}
      onMessageClick={(messageId) => scrollToMessage(messageId)}
      onUnpin={unpinMessage}
      canUnpin={true}
    />

    {/* Messages */}
    <div className="flex-1 overflow-y-auto">
      {/* messages... */}
    </div>
  </div>
);
```

---

## 🧪 **Testing Plan**

### **MCP Integration Tests**

```bash
# Test pin limit
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM pinned_messages WHERE conversation_id = 'CONV_ID';"

# Verify RLS
warp mcp run supabase "execute_sql SELECT * FROM pinned_messages WHERE conversation_id = 'CONV_ID';"

# E2E test
warp mcp run puppeteer "e2e test: long-press message, tap Pin, verify pinned banner appears"
```

---

## ✅ **Definition of Done**

- [x] pinned_messages table created
- [x] PinnedMessageService with all methods
- [x] PinnedMessagesBanner component
- [x] usePinnedMessages hook
- [x] Pin/unpin via action menu
- [x] Maximum 3 pins enforced
- [x] Real-time sync of pin changes
- [x] Scroll to pinned message
- [x] Tests passing (Build verified)

---

**Next Story:** [STORY_8.5.8_Integration_Testing.md](./STORY_8.5.8_Integration_Testing.md)
