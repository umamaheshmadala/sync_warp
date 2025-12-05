# 🗑️ STORY 8.5.3: Delete Messages

**Parent Epic:** [EPIC 8.5 - Advanced Messaging Features](../epics/EPIC_8.5_Advanced_Features.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1.5 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 8.5.2 (Edit Messages - shared 15-minute window logic)

---

## 🎯 **Story Goal**

Implement **message deletion** with a **15-minute delete window** on web browsers, iOS, and Android:

- Soft delete (mark as deleted, don't remove from DB)
- Display "This message was deleted" placeholder
- 15-minute window consistent with edit feature
- "Delete for everyone" option (like WhatsApp)
- Confirmation dialog before deletion
- Mobile: Long-press gesture + action sheet

---

## 📱 **Platform Support**

| Platform    | Trigger                     | UI                      |
| ----------- | --------------------------- | ----------------------- |
| **Web**     | Context menu / hover action | Confirmation modal      |
| **iOS**     | Long-press → Action sheet   | Native iOS action sheet |
| **Android** | Long-press → Bottom sheet   | Material bottom sheet   |

---

## 📖 **User Stories**

### As a message sender, I want to:

1. Delete messages I regret sending
2. Remove sensitive information within 15 minutes
3. See confirmation before permanent deletion
4. Know when delete window expires

### As a message receiver, I want to:

1. See that a message was deleted (not just disappear)
2. Trust that old messages can't be deleted

### Acceptance Criteria:

- ✅ Soft delete (is_deleted = true, deleted_at timestamp)
- ✅ Delete allowed only within 15 minutes
- ✅ "This message was deleted" placeholder shown
- ✅ Confirmation dialog with "Delete for everyone" text
- ✅ Real-time deletion sync to all participants
- ✅ Deleted messages hidden from search results
- ✅ Mobile: Long-press with haptic feedback\r\n\r\n---\r\n\r\n## 🔒 **Confirmed Design Decisions**\r\n\r\n| Decision | Choice | Industry Reference |\r\n|----------|--------|--------------------|\r\n| Delete options | Both "Delete for Me" and "Delete for Everyone" | WhatsApp, Signal |\r\n| Delete placeholder text | Contextual: "You deleted" vs "This message was deleted" | WhatsApp |\r\n| Delete window | 15 minutes (same as edit) | Consistent with edit |\r\n| Undo feature | 5-second grace period with toast | Modern UX pattern |\r\n| Scope | 1:1 conversations only | - |

---

## 🧩 **Implementation Tasks**

### **Phase 1: Delete Service** (0.5 days)

#### Task 1.1: Create MessageDeleteService

```typescript
// src/services/messageDeleteService.ts
import { supabase } from "../lib/supabase";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export interface DeleteResult {
  success: boolean;
  message?: string;
}

class MessageDeleteService {
  private readonly DELETE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if message can be deleted
   */
  async canDelete(
    messageId: string
  ): Promise<{ canDelete: boolean; remainingMs: number }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { canDelete: false, remainingMs: 0 };

    const { data: message, error } = await supabase
      .from("messages")
      .select("sender_id, created_at, is_deleted")
      .eq("id", messageId)
      .single();

    if (error || !message) return { canDelete: false, remainingMs: 0 };

    // Must be sender
    if (message.sender_id !== user.id)
      return { canDelete: false, remainingMs: 0 };

    // Must not already be deleted
    if (message.is_deleted) return { canDelete: false, remainingMs: 0 };

    // Check time window
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const remainingMs = Math.max(0, this.DELETE_WINDOW_MS - messageAge);

    return {
      canDelete: remainingMs > 0,
      remainingMs,
    };
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<DeleteResult> {
    const { canDelete } = await this.canDelete(messageId);

    if (!canDelete) {
      return {
        success: false,
        message: "Delete window expired (15 minutes)",
      };
    }

    const deletedAt = new Date().toISOString();

    const { error } = await supabase
      .from("messages")
      .update({
        is_deleted: true,
        deleted_at: deletedAt,
        // Optionally clear content for privacy
        // content: '[Message deleted]'
      })
      .eq("id", messageId);

    if (error) {
      return { success: false, message: error.message };
    }

    // Haptic feedback on mobile
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Warning });
    }

    console.log(`🗑️ Deleted message ${messageId}`);
    return { success: true };
  }

  /**
   * Undo delete (within a short grace period)
   * Optional: Implement if you want "Undo" functionality
   */
  async undoDelete(
    messageId: string,
    gracePeriodMs: number = 5000
  ): Promise<DeleteResult> {
    const { data: message } = await supabase
      .from("messages")
      .select("deleted_at")
      .eq("id", messageId)
      .single();

    if (!message?.deleted_at) {
      return { success: false, message: "Message not deleted" };
    }

    const deletedAge = Date.now() - new Date(message.deleted_at).getTime();
    if (deletedAge > gracePeriodMs) {
      return { success: false, message: "Undo grace period expired" };
    }

    const { error } = await supabase
      .from("messages")
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq("id", messageId);

    if (error) {
      return { success: false, message: error.message };
    }

    console.log(`↩️ Restored message ${messageId}`);
    return { success: true };
  }
}

export const messageDeleteService = new MessageDeleteService();
```

**🛢 MCP Integration:**

```bash
# Verify is_deleted column exists
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' AND column_name IN ('is_deleted', 'deleted_at');"

# Test soft delete
warp mcp run supabase "execute_sql SELECT id, content, is_deleted, deleted_at FROM messages WHERE is_deleted = true LIMIT 5;"
```

---

### **Phase 2: Delete Confirmation Dialog** (0.5 days)

#### Task 2.1: Create DeleteConfirmationDialog Component

```typescript
// src/components/messaging/DeleteConfirmationDialog.tsx
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  remainingTime: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  remainingTime,
  onConfirm,
  onCancel,
  isDeleting
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold">Delete Message</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            This will delete the message for everyone in this conversation.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-amber-800 text-sm">
              ⏱️ Delete window closes in <span className="font-bold">{remainingTime}</span>
            </p>
          </div>

          <p className="text-gray-500 text-sm">
            Deleted messages will show as "This message was deleted" to all participants.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 bg-gray-50">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete for Everyone
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### **Phase 3: Deleted Message Placeholder** (0.25 days)

#### Task 3.1: Create DeletedMessagePlaceholder Component

```typescript
// src/components/messaging/DeletedMessagePlaceholder.tsx
import React from 'react';
import { Ban } from 'lucide-react';

interface Props {
  isOwnMessage: boolean;
  deletedAt: string;
}

export function DeletedMessagePlaceholder({ isOwnMessage, deletedAt }: Props) {
  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`
      flex items-center gap-2 py-2 px-3 rounded-lg
      ${isOwnMessage
        ? 'bg-gray-100 ml-auto'
        : 'bg-gray-50'
      }
      max-w-xs opacity-70 italic
    `}>
      <Ban className="w-4 h-4 text-gray-400" />
      <span className="text-gray-500 text-sm">
        This message was deleted
      </span>
      <span className="text-gray-400 text-xs ml-auto">
        {formatTime(deletedAt)}
      </span>
    </div>
  );
}
```

---

### **Phase 4: Hook and Integration** (0.25 days)

#### Task 4.1: Create useDeleteMessage Hook

```typescript
// src/hooks/useDeleteMessage.ts
import { useState, useEffect, useCallback } from 'react';
import { messageDeleteService } from '../services/messageDeleteService';
import { toast } from 'react-hot-toast';

export function useDeleteMessage(messageId: string) {
  const [canDelete, setCanDelete] = useState(false);
  const [remainingTime, setRemainingTime] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkDeletability = async () => {
      const result = await messageDeleteService.canDelete(messageId);
      setCanDelete(result.canDelete);
      setRemainingTime(formatTime(result.remainingMs));
    };

    checkDeletability();

    const interval = setInterval(async () => {
      const result = await messageDeleteService.canDelete(messageId);
      setCanDelete(result.canDelete);
      setRemainingTime(formatTime(result.remainingMs));
    }, 1000);

    return () => clearInterval(interval);
  }, [messageId]);

  const formatTime = (ms: number): string => {
    if (ms <= 0) return 'Expired';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const confirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await messageDeleteService.deleteMessage(messageId);

      if (result.success) {
        // Show undo toast
        toast((t) => (
          <div className="flex items-center gap-3">
            <span>Message deleted</span>
            <button
              onClick={async () => {
                await messageDeleteService.undoDelete(messageId);
                toast.dismiss(t.id);
                toast.success('Message restored');
              }}
              className="text-blue-500 underline text-sm"
            >
              Undo
            </button>
          </div>
        ), { duration: 5000 });

        setShowConfirmDialog(false);
        return true;
      } else {
        toast.error(result.message || 'Failed to delete');
        return false;
      }
    } catch (error) {
      toast.error('Failed to delete message');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [messageId]);

  return {
    canDelete,
    remainingTime,
    showConfirmDialog,
    setShowConfirmDialog,
    isDeleting,
    confirmDelete
  };
}
```

#### Task 4.2: Update MessageBubble for Delete

```typescript
// src/components/messaging/MessageBubble.tsx (additions)
import { useDeleteMessage } from '../../hooks/useDeleteMessage';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { DeletedMessagePlaceholder } from './DeletedMessagePlaceholder';
import { Trash2 } from 'lucide-react';

// Inside MessageBubble component
const {
  canDelete,
  remainingTime: deleteRemainingTime,
  showConfirmDialog,
  setShowConfirmDialog,
  isDeleting,
  confirmDelete
} = useDeleteMessage(message.id);

// Render
return (
  <>
    {/* Show placeholder if deleted */}
    {message.is_deleted ? (
      <DeletedMessagePlaceholder
        isOwnMessage={isOwnMessage}
        deletedAt={message.deleted_at}
      />
    ) : (
      <div className="message-bubble group">
        <p>{message.content}</p>

        {/* Delete action (hover on web) */}
        {canDelete && isOwnMessage && (
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="delete-action opacity-0 group-hover:opacity-100 text-red-500"
            title={`Delete (${deleteRemainingTime} remaining)`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )}

    {/* Delete confirmation dialog */}
    <DeleteConfirmationDialog
      isOpen={showConfirmDialog}
      remainingTime={deleteRemainingTime}
      onConfirm={confirmDelete}
      onCancel={() => setShowConfirmDialog(false)}
      isDeleting={isDeleting}
    />
  </>
);
```

---

## 🧪 **Testing Plan**

### **Unit Tests**

```typescript
describe("MessageDeleteService", () => {
  it("should allow delete within 15 minutes", async () => {
    const { canDelete } = await messageDeleteService.canDelete(recentMessageId);
    expect(canDelete).toBe(true);
  });

  it("should block delete after 15 minutes", async () => {
    const { canDelete } = await messageDeleteService.canDelete(oldMessageId);
    expect(canDelete).toBe(false);
  });

  it("should soft delete message", async () => {
    const result = await messageDeleteService.deleteMessage(messageId);
    expect(result.success).toBe(true);

    const { data } = await supabase
      .from("messages")
      .select("is_deleted")
      .eq("id", messageId)
      .single();
    expect(data.is_deleted).toBe(true);
  });

  it("should allow undo within grace period", async () => {
    await messageDeleteService.deleteMessage(messageId);
    const result = await messageDeleteService.undoDelete(messageId);
    expect(result.success).toBe(true);
  });
});
```

### **MCP Integration Tests**

```bash
# Verify deleted messages hidden from search
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM messages WHERE is_deleted = false AND to_tsvector('english', content) @@ to_tsquery('english', 'test');"

# Test real-time delete sync
warp mcp run puppeteer "e2e test: user A deletes message, verify user B sees 'This message was deleted' placeholder"
```

---

## ✅ **Definition of Done**

- [ ] MessageDeleteService with 15-minute window
- [ ] Soft delete implementation (is_deleted flag)
- [ ] DeleteConfirmationDialog component
- [ ] DeletedMessagePlaceholder component
- [ ] useDeleteMessage hook with undo functionality
- [ ] Real-time deletion sync
- [ ] Haptic feedback on mobile
- [ ] Deleted messages excluded from search
- [ ] Unit and E2E tests passing

---

**Next Story:** [STORY_8.5.4_Message_Search.md](./STORY_8.5.4_Message_Search.md)
