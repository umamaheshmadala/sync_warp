# 📤 STORY 8.10.6: Forward Messages

**Parent Epic:** [EPIC 8.10 - Conversation Management & Organization](../epics/EPIC_8.10_Conversation_Management.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1.5 days  
**Priority:** P1 - High  
**Status:** ✅ Completed

---

## 🎯 **Story Goal**

Implement **message forwarding** to allow users to share deals, coupons, and messages with multiple friends simultaneously, essential for viral coupon/deal distribution.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Implementation**

| Feature                 | Web                  | iOS             | Android         |
| ----------------------- | -------------------- | --------------- | --------------- |
| **Forward Action**      | Click forward button | Long-press menu | Long-press menu |
| **Conversation Picker** | Modal dialog         | Native sheet    | Native sheet    |
| **Multi-Select**        | Checkboxes           | Checkboxes      | Checkboxes      |
| **Native Share**        | N/A                  | Share sheet     | Share sheet     |
| **Haptic Feedback**     | N/A                  | Light impact    | Light impact    |

**Required Capacitor Plugins:**

```json
{
  "@capacitor/haptics": "^5.0.0", // Already installed
  "@capacitor/share": "^5.0.0" // For native share sheet
}
```

---

## 📖 **User Stories**

### As a user, I want to:

1. **Forward messages** - Share deals with multiple friends
2. **Select recipients** - Choose which conversations to forward to
3. **Forward to multiple** - Send to many friends at once
4. **Track forwards** - See how many times a deal was shared

### Acceptance Criteria:

- ✅ Forward sends message to selected conversations
- ✅ Original sender attribution preserved
- ✅ Forward count tracked in database
- ✅ Multi-select recipients works
- ✅ Haptic feedback on mobile
- ✅ Native share sheet option on mobile

---

## 🧩 **Implementation Tasks**

### **Phase 1: Database Schema (0.25 days)**

#### **Task 1.1: Add Forward Tracking**

```sql
-- Add forwarded flag to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS forward_count INT DEFAULT 0;

-- Table to track message forwards
CREATE TABLE IF NOT EXISTS message_forwards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  forwarded_message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  forwarded_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  forwarded_to_conversation UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_forwards_original
  ON message_forwards(original_message_id);
CREATE INDEX IF NOT EXISTS idx_message_forwards_user
  ON message_forwards(forwarded_by);

-- RLS Policies
ALTER TABLE message_forwards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forwards they created"
  ON message_forwards FOR SELECT
  USING (forwarded_by = auth.uid());

CREATE POLICY "Users can create forwards"
  ON message_forwards FOR INSERT
  WITH CHECK (forwarded_by = auth.uid());
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "apply_migration add_message_forwarding '
  ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forward_count INT DEFAULT 0;

  CREATE TABLE IF NOT EXISTS message_forwards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    forwarded_message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    forwarded_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    forwarded_to_conversation UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_message_forwards_original
    ON message_forwards(original_message_id);
  CREATE INDEX IF NOT EXISTS idx_message_forwards_user
    ON message_forwards(forwarded_by);

  ALTER TABLE message_forwards ENABLE ROW LEVEL SECURITY;

  CREATE POLICY '\''Users can view forwards they created'\''
    ON message_forwards FOR SELECT USING (forwarded_by = auth.uid());
  CREATE POLICY '\''Users can create forwards'\''
    ON message_forwards FOR INSERT WITH CHECK (forwarded_by = auth.uid());
'"
```

#### **Task 1.2: Create Forward RPC Function**

```sql
-- RPC: Forward message to multiple conversations
CREATE OR REPLACE FUNCTION forward_message_to_conversations(
  p_message_id UUID,
  p_conversation_ids UUID[]
)
RETURNS TABLE(forwarded_message_id UUID, conversation_id UUID) AS $$
DECLARE
  v_user_id UUID;
  v_original_message RECORD;
  v_conversation_id UUID;
  v_new_message_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get original message
  SELECT * INTO v_original_message
  FROM messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Forward to each conversation
  FOREACH v_conversation_id IN ARRAY p_conversation_ids
  LOOP
    -- Insert forwarded message
    INSERT INTO messages (
      conversation_id,
      sender_id,
      content,
      type,
      media_urls,
      is_forwarded,
      original_message_id
    )
    VALUES (
      v_conversation_id,
      v_user_id,
      v_original_message.content,
      v_original_message.type,
      v_original_message.media_urls,
      true,
      p_message_id
    )
    RETURNING id INTO v_new_message_id;

    -- Track forward
    INSERT INTO message_forwards (
      original_message_id,
      forwarded_message_id,
      forwarded_by,
      forwarded_to_conversation
    )
    VALUES (
      p_message_id,
      v_new_message_id,
      v_user_id,
      v_conversation_id
    );

    -- Increment forward count
    UPDATE messages
    SET forward_count = forward_count + 1
    WHERE id = p_message_id;

    -- Return result
    RETURN QUERY SELECT v_new_message_id, v_conversation_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "apply_migration create_forward_function '
  CREATE OR REPLACE FUNCTION forward_message_to_conversations(
    p_message_id UUID,
    p_conversation_ids UUID[]
  )
  RETURNS TABLE(forwarded_message_id UUID, conversation_id UUID) AS \$\$
  DECLARE
    v_user_id UUID;
    v_original_message RECORD;
    v_conversation_id UUID;
    v_new_message_id UUID;
  BEGIN
    v_user_id := auth.uid();
    SELECT * INTO v_original_message FROM messages WHERE id = p_message_id;
    FOREACH v_conversation_id IN ARRAY p_conversation_ids
    LOOP
      INSERT INTO messages (conversation_id, sender_id, content, type, media_urls, is_forwarded, original_message_id)
      VALUES (v_conversation_id, v_user_id, v_original_message.content, v_original_message.type, v_original_message.media_urls, true, p_message_id)
      RETURNING id INTO v_new_message_id;
      INSERT INTO message_forwards (original_message_id, forwarded_message_id, forwarded_by, forwarded_to_conversation)
      VALUES (p_message_id, v_new_message_id, v_user_id, v_conversation_id);
      UPDATE messages SET forward_count = forward_count + 1 WHERE id = p_message_id;
      RETURN QUERY SELECT v_new_message_id, v_conversation_id;
    END LOOP;
  END;
  \$\$ LANGUAGE plpgsql SECURITY DEFINER;
'"
```

**Test Function:**

```bash
warp mcp run supabase "execute_sql
  SELECT * FROM forward_message_to_conversations(
    'test-message-id',
    ARRAY['conv-1', 'conv-2', 'conv-3']::UUID[]
  );
"
```

---

### **Phase 2: Backend Service (0.25 days)**

**File:** `src/services/messagingService.ts` (extend)

```typescript
class MessagingService {
  // ... (existing methods)

  /**
   * Forward message to multiple conversations
   */
  async forwardMessage(
    messageId: string,
    conversationIds: string[]
  ): Promise<void> {
    console.log(
      "📤 Forwarding message to",
      conversationIds.length,
      "conversations"
    );

    const { data, error } = await this.supabase.rpc(
      "forward_message_to_conversations",
      {
        p_message_id: messageId,
        p_conversation_ids: conversationIds,
      }
    );

    if (error) {
      console.error("Failed to forward message:", error);
      throw error;
    }

    console.log("✅ Message forwarded to", data?.length, "conversations");
  }

  /**
   * Get forward count for a message
   */
  async getForwardCount(messageId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("messages")
      .select("forward_count")
      .eq("id", messageId)
      .single();

    if (error) {
      console.error("Failed to get forward count:", error);
      return 0;
    }

    return data?.forward_count || 0;
  }
}
```

---

### **Phase 3: Frontend Components (1 day)**

#### **Task 3.1: Forward Dialog**

**File:** `src/components/messaging/ForwardMessageDialog.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import { Forward, Search, Check } from 'lucide-react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { conversationManagementService } from '../../services/conversationManagementService'
import { messagingService } from '../../services/messagingService'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'

interface Props {
  message: {
    id: string
    content: string
    type: string
  }
  onClose: () => void
  onForwarded: () => void
}

export function ForwardMessageDialog({ message, onClose, onForwarded }: Props) {
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isForwarding, setIsForwarding] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const data = await conversationManagementService.getConversations('all')
      setConversations(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.other_participant.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSelection = (id: string) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light })
    }

    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleForward = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one conversation')
      return
    }

    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium })
    }

    setIsForwarding(true)

    try {
      await messagingService.forwardMessage(message.id, selectedIds)
      toast.success(`Forwarded to ${selectedIds.length} conversation${selectedIds.length > 1 ? 's' : ''}`)
      onForwarded()
      onClose()
    } catch (error) {
      console.error('Forward failed:', error)
      toast.error('Failed to forward message')
    } finally {
      setIsForwarding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Forward className="w-5 h-5" />
            Forward Message
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {message.type === 'text'
              ? message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
              : `[${message.type}]`
            }
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No conversations found
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isSelected = selectedIds.includes(conv.id)
              return (
                <button
                  key={conv.id}
                  onClick={() => toggleSelection(conv.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-blue-50'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-gray-300'
                  )}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">
                      {conv.other_participant.username}
                    </div>
                    {conv.last_message && (
                      <div className="text-sm text-gray-500 truncate">
                        {conv.last_message.content}
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            disabled={isForwarding}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={isForwarding || selectedIds.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isForwarding
              ? 'Forwarding...'
              : `Forward${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### **Task 3.2: Forward Indicator in Message Bubble**

**File:** `src/components/messaging/MessageBubble.tsx` (extend)

```typescript
import { Forward } from 'lucide-react'

export function MessageBubble({ message, isOwn }: Props) {
  return (
    <div>
      {/* Forwarded indicator */}
      {message.is_forwarded && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Forward className="w-3 h-3" />
          <span>Forwarded</span>
        </div>
      )}

      {/* Message bubble */}
      <div className={/* ... */}>
        {message.content}
      </div>

      {/* Forward count (if > 0) */}
      {message.forward_count > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Forwarded {message.forward_count} time{message.forward_count > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
```

---

## 🧪 **Testing Checklist**

### **Supabase MCP Tests**

```bash
# Test forward function
warp mcp run supabase "execute_sql
  SELECT * FROM forward_message_to_conversations(
    'test-msg-id',
    ARRAY['conv-1', 'conv-2']::UUID[]
  );
"

# Verify forwards were tracked
warp mcp run supabase "execute_sql
  SELECT * FROM message_forwards WHERE original_message_id = 'test-msg-id';
"

# Check forward count
warp mcp run supabase "execute_sql
  SELECT id, content, forward_count FROM messages WHERE id = 'test-msg-id';
"
```

### **Manual Testing**

**Web:**

- [x] Forward dialog appears
- [x] Search filters conversations
- [x] Multi-select works
- [x] Forward sends to all selected
- [x] Forward count increments

**Mobile:**

- [x] Haptic feedback on selection
- [x] Native share sheet option
- [x] Multi-select works
- [x] Forward indicator visible

---

## 📊 **Success Metrics**

| Metric                     | Target             |
| -------------------------- | ------------------ |
| **Forward Success Rate**   | > 99%              |
| **Multi-Forward Success**  | 100% delivery      |
| **Forward Count Accuracy** | 100%               |
| **Haptic Feedback**        | Triggers on mobile |

---

## 📦 **Deliverables**

1. ✅ Migration: `add_message_forwarding`
2. ✅ Table: `message_forwards`
3. ✅ RPC: `forward_message_to_conversations()`
4. ✅ Component: `ForwardMessageDialog.tsx`
5. ✅ Updated: `MessageBubble.tsx` (forward indicator)
6. ✅ Updated: `messagingService.ts` (forward methods)
7. ✅ Tests (Supabase MCP + manual)

---

**Story Status:** ✅ **Completed**  
**Estimated Completion:** 1.5 days  
**Risk Level:** Low (straightforward message duplication)
