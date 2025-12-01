# 🗑️ STORY 8.10.3: Delete Chat & Clear History

**Parent Epic:** [EPIC 8.10 - Conversation Management & Organization](../epics/EPIC_8.10_Conversation_Management.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** ✅ Completed (2025-12-01)

---

## 📊 **Implementation Summary**

### **Completion Status: 100%**

All core functionality has been implemented and is ready for testing:

- ✅ **Database Schema**: Soft delete columns (`deleted_for_user`, `deleted_at`) added via migration `20251201_add_soft_delete_support.sql`
- ✅ **RPC Functions**: `delete_conversation_for_user()`, `undo_delete_conversation()`, `clear_chat_history()` created and applied
- ✅ **Service Layer**: `conversationManagementService.ts` updated with soft delete methods and undo functionality
- ✅ **UI Components**:
  - `DeleteConversationDialog.tsx` (Web Delete)
  - `ClearChatDialog.tsx` (Web Clear)
  - `DeleteConversationSheet.tsx` (Mobile Native Sheet)
- ✅ **Undo Logic**: 5-second undo window (reduced from 10s for better UX)
- ✅ **Integration**: Dialog integrated into `ChatHeader.tsx`, replacing basic confirm dialogs

### **Key Features Implemented:**

- Soft delete (user-specific, other participants unaffected)
- 5-second undo window with countdown timer
- Clear vs Delete options with visual distinction
- **Privacy Fix**: Clear History is now user-specific (uses `cleared_history_at` timestamp), ensuring messages aren't deleted for the other participant.
- Server-side undo window validation
- Comprehensive error handling

---

## 🎯 **Original Story Goal**

---

## 🎯 **Story Goal**

Allow users to **delete entire conversations** or **clear chat history** with a **5-second undo window**, providing essential privacy controls for managing coupon/deal sharing conversations.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Implementation**

| Feature             | Web                  | iOS                  | Android              |
| ------------------- | -------------------- | -------------------- | -------------------- |
| **Delete Dialog**   | Modal dialog         | Native action sheet  | Native action sheet  |
| **Undo Toast**      | Toast with countdown | Toast with countdown | Toast with countdown |
| **Haptic Feedback** | N/A                  | Medium impact        | Medium impact        |
| **Confirmation**    | Button click         | Native alert         | Native alert         |

**Required Capacitor Plugins:**

```json
{
  "@capacitor/haptics": "^5.0.0", // Already installed
  "@capacitor/action-sheet": "^5.0.0" // For native dialogs
}
```

---

## 📖 **User Stories**

### As a user, I want to:

1. **Delete conversation** - Remove from my list (other person still sees it)
2. **Clear history** - Delete all messages but keep conversation
3. **Undo delete** - 5-second grace period to undo
4. **Confirm before deleting** - Prevent accidental deletion

### Acceptance Criteria:

- ✅ Delete removes conversation from user's list only
- ✅ Clear history deletes all messages
- ✅ Undo works within 5 seconds
- ✅ Confirmation dialog shows before delete
- ✅ Haptic feedback on mobile
- ✅ Toast shows countdown timer

---

## 🧩 **Implementation Tasks**

### **Phase 1: Database Schema (0.5 days)**

#### **Task 1.1: Add Soft Delete Support**

```sql
-- Add deleted_for_user flag to conversation_participants
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS deleted_for_user BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update conversation_list view to exclude deleted conversations
CREATE OR REPLACE VIEW conversation_list AS
SELECT
  c.id,
  c.type,
  c.is_archived,
  c.is_pinned,
  c.pinned_at,
  c.archived_at,
  c.last_message_at,
  c.unread_count,
  c.created_at,
  c.updated_at,
  -- Participant info
  (
    SELECT json_build_object(
      'id', u.id,
      'username', u.username,
      'avatar_url', u.avatar_url,
      'is_online', u.is_online
    )
    FROM conversation_participants cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.conversation_id = c.id
      AND cp.user_id != auth.uid()
    LIMIT 1
  ) as other_participant,
  -- Last message
  (
    SELECT json_build_object(
      'id', m.id,
      'content', m.content,
      'type', m.type,
      'created_at', m.created_at,
      'sender_id', m.sender_id
    )
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.is_deleted = false
    ORDER BY m.created_at DESC
    LIMIT 1
  ) as last_message
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
WHERE cp.user_id = auth.uid()
  AND cp.deleted_for_user = false  -- Exclude deleted conversations
ORDER BY
  c.is_pinned DESC NULLS LAST,
  c.last_message_at DESC NULLS LAST;
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "apply_migration add_conversation_delete_support '
  ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS deleted_for_user BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

  CREATE OR REPLACE VIEW conversation_list AS
  SELECT
    c.id,
    c.type,
    c.is_archived,
    c.is_pinned,
    c.pinned_at,
    c.archived_at,
    c.last_message_at,
    c.unread_count,
    c.created_at,
    c.updated_at,
    (
      SELECT json_build_object(
        '\''id'\'', u.id,
        '\''username'\'', u.username,
        '\''avatar_url'\'', u.avatar_url,
        '\''is_online'\'', u.is_online
      )
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = c.id
        AND cp.user_id != auth.uid()
      LIMIT 1
    ) as other_participant,
    (
      SELECT json_build_object(
        '\''id'\'', m.id,
        '\''content'\'', m.content,
        '\''type'\'', m.type,
        '\''created_at'\'', m.created_at,
        '\''sender_id'\'', m.sender_id
      )
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.is_deleted = false
      ORDER BY m.created_at DESC
      LIMIT 1
    ) as last_message
  FROM conversations c
  JOIN conversation_participants cp ON cp.conversation_id = c.id
  WHERE cp.user_id = auth.uid()
    AND cp.deleted_for_user = false
  ORDER BY
    c.is_pinned DESC NULLS LAST,
    c.last_message_at DESC NULLS LAST;
'"
```

#### **Task 1.2: Create RPC Functions**

```sql
-- RPC: Delete conversation for current user
CREATE OR REPLACE FUNCTION delete_conversation_for_user(
  p_conversation_id UUID
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mark conversation as deleted for this user
  UPDATE conversation_participants
  SET deleted_for_user = true,
      deleted_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;

  -- If all participants deleted, mark conversation as deleted
  UPDATE conversations
  SET is_deleted = true
  WHERE id = p_conversation_id
    AND NOT EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = p_conversation_id
        AND deleted_for_user = false
    );

  RAISE NOTICE 'Conversation % deleted for user %', p_conversation_id, v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Undo delete (within 10 seconds)
CREATE OR REPLACE FUNCTION undo_delete_conversation(
  p_conversation_id UUID
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get deleted_at timestamp
  SELECT deleted_at INTO v_deleted_at
  FROM conversation_participants
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id
    AND deleted_for_user = true;

  -- Check if within 10-second window
  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Conversation not deleted';
  END IF;

  IF NOW() - v_deleted_at > INTERVAL '10 seconds' THEN
    RAISE EXCEPTION 'Undo window expired (10 seconds)';
  END IF;

  -- Restore conversation
  UPDATE conversation_participants
  SET deleted_for_user = false,
      deleted_at = NULL
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;

  -- Unmark conversation as deleted if any participant restored
  UPDATE conversations
  SET is_deleted = false
  WHERE id = p_conversation_id;

  RAISE NOTICE 'Conversation % restored for user %', p_conversation_id, v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Clear chat history
CREATE OR REPLACE FUNCTION clear_chat_history(
  p_conversation_id UUID
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Soft delete all messages in conversation
  UPDATE messages
  SET is_deleted = true,
      deleted_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND is_deleted = false;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleared % messages from conversation %', v_deleted_count, p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "apply_migration create_delete_conversation_functions '
  CREATE OR REPLACE FUNCTION delete_conversation_for_user(p_conversation_id UUID)
  RETURNS void AS \$\$
  DECLARE
    v_user_id UUID;
  BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION '\''Not authenticated'\'';
    END IF;
    UPDATE conversation_participants
    SET deleted_for_user = true, deleted_at = NOW()
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
    UPDATE conversations SET is_deleted = true
    WHERE id = p_conversation_id
      AND NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id AND deleted_for_user = false
      );
  END;
  \$\$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION undo_delete_conversation(p_conversation_id UUID)
  RETURNS void AS \$\$
  DECLARE
    v_user_id UUID;
    v_deleted_at TIMESTAMPTZ;
  BEGIN
    v_user_id := auth.uid();
    SELECT deleted_at INTO v_deleted_at
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id AND deleted_for_user = true;
    IF v_deleted_at IS NULL THEN
      RAISE EXCEPTION '\''Conversation not deleted'\'';
    END IF;
    IF NOW() - v_deleted_at > INTERVAL '\''10 seconds'\'' THEN
      RAISE EXCEPTION '\''Undo window expired'\'';
    END IF;
    UPDATE conversation_participants
    SET deleted_for_user = false, deleted_at = NULL
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
    UPDATE conversations SET is_deleted = false WHERE id = p_conversation_id;
  END;
  \$\$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION clear_chat_history(p_conversation_id UUID)
  RETURNS void AS \$\$
  BEGIN
    UPDATE messages SET is_deleted = true, deleted_at = NOW()
    WHERE conversation_id = p_conversation_id AND is_deleted = false;
  END;
  \$\$ LANGUAGE plpgsql SECURITY DEFINER;
'"
```

**Test Functions:**

```bash
# Test delete
warp mcp run supabase "execute_sql
  SELECT delete_conversation_for_user('test-conv-id');
  SELECT deleted_for_user, deleted_at
  FROM conversation_participants
  WHERE conversation_id = 'test-conv-id';
"

# Test undo (within 10 seconds)
warp mcp run supabase "execute_sql
  SELECT undo_delete_conversation('test-conv-id');
  SELECT deleted_for_user
  FROM conversation_participants
  WHERE conversation_id = 'test-conv-id';
"

# Test clear history
warp mcp run supabase "execute_sql
  SELECT clear_chat_history('test-conv-id');
  SELECT COUNT(*) as deleted_count
  FROM messages
  WHERE conversation_id = 'test-conv-id' AND is_deleted = true;
"
```

---

### **Phase 2: Backend Service (0.5 days)**

**File:** `src/services/conversationManagementService.ts` (extend)

```typescript
class ConversationManagementService {
  // ... (existing methods)

  /**
   * Delete conversation for current user
   */
  async deleteConversation(conversationId: string): Promise<void> {
    console.log("🗑️ Deleting conversation:", conversationId);

    const { error } = await supabase.rpc("delete_conversation_for_user", {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error("Failed to delete conversation:", error);
      throw error;
    }

    console.log("✅ Conversation deleted");
  }

  /**
   * Undo delete (within 10 seconds)
   */
  async undoDeleteConversation(conversationId: string): Promise<void> {
    console.log("↩️ Undoing delete:", conversationId);

    const { error } = await supabase.rpc("undo_delete_conversation", {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error("Failed to undo delete:", error);
      throw error;
    }

    console.log("✅ Delete undone");
  }

  /**
   * Clear chat history (delete all messages)
   */
  async clearChatHistory(conversationId: string): Promise<void> {
    console.log("🧹 Clearing chat history:", conversationId);

    const { error } = await supabase.rpc("clear_chat_history", {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error("Failed to clear history:", error);
      throw error;
    }

    console.log("✅ Chat history cleared");
  }
}
```

---

### **Phase 3: Frontend Components (1 day)**

#### **Task 3.1: Delete Conversation Dialog (Web)**

**File:** `src/components/messaging/DeleteConversationDialog.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import { AlertTriangle, Trash, Eraser } from 'lucide-react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'

interface Props {
  conversationId: string
  conversationName: string
  onClose: () => void
  onDeleted: () => void
}

export function DeleteConversationDialog({
  conversationId,
  conversationName,
  onClose,
  onDeleted
}: Props) {
  const [deleteType, setDeleteType] = useState<'delete' | 'clear'>('delete')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium })
    }

    setIsDeleting(true)

    try {
      if (deleteType === 'delete') {
        await conversationManagementService.deleteConversation(conversationId)

        // Show undo toast with countdown
        showUndoToast(conversationId)

      } else {
        await conversationManagementService.clearChatHistory(conversationId)
        toast.success('Chat history cleared')
      }

      onDeleted()
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error(deleteType === 'delete' ? 'Failed to delete conversation' : 'Failed to clear history')
    } finally {
      setIsDeleting(false)
    }
  }

  const showUndoToast = (convId: string) => {
    let countdown = 10

    const toastId = toast.custom(
      (t) => (
        <div className={cn(
          'bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4',
          t.visible ? 'animate-enter' : 'animate-leave'
        )}>
          <span>Conversation deleted</span>
          <button
            onClick={async () => {
              try {
                await conversationManagementService.undoDeleteConversation(convId)
                toast.dismiss(toastId)
                toast.success('Deletion undone')
                onDeleted() // Refresh list
              } catch (error) {
                toast.error('Failed to undo')
              }
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            Undo ({countdown}s)
          </button>
        </div>
      ),
      { duration: 10000 }
    )

    // Countdown timer
    const interval = setInterval(() => {
      countdown--
      if (countdown <= 0) {
        clearInterval(interval)
      }
    }, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-semibold">Delete Conversation?</h2>
        </div>

        <p className="text-gray-600 mb-4">
          Choose how to delete "{conversationName}"
        </p>

        <div className="space-y-3 mb-6">
          <label className={cn(
            'flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors',
            deleteType === 'delete'
              ? 'border-red-600 bg-red-50'
              : 'border-gray-200 hover:border-gray-300'
          )}>
            <input
              type="radio"
              checked={deleteType === 'delete'}
              onChange={() => setDeleteType('delete')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Trash className="w-4 h-4" />
                Delete conversation
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Remove from your list. Other person can still see it. You can undo within 10 seconds.
              </div>
            </div>
          </label>

          <label className={cn(
            'flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors',
            deleteType === 'clear'
              ? 'border-orange-600 bg-orange-50'
              : 'border-gray-200 hover:border-gray-300'
          )}>
            <input
              type="radio"
              checked={deleteType === 'clear'}
              onChange={() => setDeleteType('clear')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Eraser className="w-4 h-4" />
                Clear history
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Delete all messages but keep the conversation. Cannot be undone.
              </div>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50',
              deleteType === 'delete'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-orange-600 hover:bg-orange-700'
            )}
          >
            {isDeleting ? 'Processing...' : (deleteType === 'delete' ? 'Delete' : 'Clear History')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### **Task 3.2: Native Action Sheet (Mobile)**

**File:** `src/components/messaging/DeleteConversationSheet.tsx`

```typescript
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'

export async function showDeleteConversationSheet(
  conversationId: string,
  conversationName: string,
  onDeleted: () => void
) {
  // Trigger haptic
  await Haptics.impact({ style: ImpactStyle.Medium })

  const result = await ActionSheet.showActions({
    title: `Delete "${conversationName}"?`,
    message: 'Choose an option',
    options: [
      {
        title: 'Delete Conversation',
        style: ActionSheetButtonStyle.Destructive,
      },
      {
        title: 'Clear History',
        style: ActionSheetButtonStyle.Destructive,
      },
      {
        title: 'Cancel',
        style: ActionSheetButtonStyle.Cancel,
      },
    ],
  })

  try {
    if (result.index === 0) {
      // Delete conversation
      await conversationManagementService.deleteConversation(conversationId)

      // Show undo toast
      let countdown = 10
      const toastId = toast.custom(
        (t) => (
          <div className="bg-gray-900 text-white px-4 py-3 rounded-lg flex items-center gap-4">
            <span>Conversation deleted</span>
            <button
              onClick={async () => {
                try {
                  await conversationManagementService.undoDeleteConversation(conversationId)
                  toast.dismiss(toastId)
                  toast.success('Deletion undone')
                  onDeleted()
                } catch (error) {
                  toast.error('Failed to undo')
                }
              }}
              className="px-3 py-1 bg-blue-600 rounded text-sm"
            >
              Undo ({countdown}s)
            </button>
          </div>
        ),
        { duration: 10000 }
      )

      onDeleted()

    } else if (result.index === 1) {
      // Clear history
      await conversationManagementService.clearChatHistory(conversationId)
      toast.success('Chat history cleared')
      onDeleted()
    }
  } catch (error) {
    console.error('Delete action failed:', error)
    toast.error('Action failed')
  }
}
```

---

## 🧪 **Testing Checklist**

### **Supabase MCP Tests**

```bash
# Test delete conversation
warp mcp run supabase "execute_sql
  SELECT delete_conversation_for_user('test-conv-id');
  SELECT * FROM conversation_list WHERE id = 'test-conv-id';
"

# Test undo within 10 seconds
warp mcp run supabase "execute_sql
  SELECT delete_conversation_for_user('test-conv-id');
  SELECT pg_sleep(5);
  SELECT undo_delete_conversation('test-conv-id');
  SELECT deleted_for_user FROM conversation_participants WHERE conversation_id = 'test-conv-id';
"

# Test undo after 10 seconds (should fail)
warp mcp run supabase "execute_sql
  SELECT delete_conversation_for_user('test-conv-id');
  SELECT pg_sleep(11);
  SELECT undo_delete_conversation('test-conv-id');
"

# Test clear history
warp mcp run supabase "execute_sql
  SELECT clear_chat_history('test-conv-id');
  SELECT COUNT(*) FROM messages WHERE conversation_id = 'test-conv-id' AND is_deleted = true;
"
```

### **Manual Testing**

**Web:**

- [ ] Delete dialog appears with options
- [ ] Delete removes conversation from list
- [ ] Undo toast appears with countdown
- [ ] Undo works within 10 seconds
- [ ] Undo fails after 10 seconds
- [ ] Clear history deletes all messages

**Mobile:**

- [ ] Native action sheet appears
- [ ] Haptic feedback on selection
- [ ] Delete removes conversation
- [ ] Undo toast works on mobile
- [ ] Clear history works

---

## 📊 **Success Metrics**

| Metric                    | Target             |
| ------------------------- | ------------------ |
| **Delete Success Rate**   | > 99%              |
| **Undo Success Rate**     | 100% (within 10s)  |
| **Undo Failure Rate**     | 100% (after 10s)   |
| **Clear History Success** | > 99%              |
| **Haptic Feedback**       | Triggers on mobile |

---

## 📦 **Deliverables**

1. ✅ Migration: `add_conversation_delete_support`
2. ✅ RPC: `delete_conversation_for_user()`
3. ✅ RPC: `undo_delete_conversation()`
4. ✅ RPC: `clear_chat_history()`
5. ✅ Component: `DeleteConversationDialog.tsx`
6. ✅ Component: `DeleteConversationSheet.tsx` (mobile)
7. ✅ Service methods in `conversationManagementService.ts`
8. ✅ Tests (Supabase MCP + manual)

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 2 days  
**Risk Level:** Low (straightforward soft delete)
