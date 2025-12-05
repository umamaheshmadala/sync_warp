# ✏️ STORY 8.5.2: Edit Messages

**Parent Epic:** [EPIC 8.5 - Advanced Messaging Features](../epics/EPIC_8.5_Advanced_Features.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 8.5.1 (Read Receipts), Epic 8.1 (`message_edits` table)

---

## 🎯 **Story Goal**

Implement **message editing** with a **15-minute edit window** on web browsers, iOS, and Android:

- Allow users to edit their own messages within 15 minutes
- Display "Edited" badge on edited messages
- Show edit history (optional view)
- Inline editing UI with save/cancel
- Mobile: Long-press gesture to trigger edit
- Real-time edit synchronization

---

## 📱 **Platform Support**

| Platform    | Trigger                     | UI                                |
| ----------- | --------------------------- | --------------------------------- |
| **Web**     | Context menu / hover action | Inline text editing               |
| **iOS**     | Long-press gesture          | Native action sheet + inline edit |
| **Android** | Long-press gesture          | Bottom sheet + inline edit        |

---

## 📖 **User Stories**

### As a message sender, I want to:

1. Fix typos in messages I just sent
2. Correct information within 15 minutes
3. See a clear indication that I edited a message
4. View my edit history

### As a message receiver, I want to:

1. See when a message has been edited
2. Trust that old messages can't be changed
3. Optionally view edit history

### Acceptance Criteria:

- ✅ Edit allowed only within 15 minutes of sending
- ✅ Clear timer/countdown showing remaining edit time
- ✅ "Edited" badge visible on edited messages
- ✅ Edit history logged to `message_edits` table
- ✅ Real-time sync of edits to all participants
- ✅ Web: Context menu or hover action
- ✅ Mobile: Long-press gesture with haptic feedback
- ✅ Graceful handling when edit window expires

---

## 🧩 **Implementation Tasks**

### **Phase 1: Message Edit Service** (0.5 days)

#### Task 1.1: Create MessageEditService

```typescript
// src/services/messageEditService.ts
import { supabase } from "../lib/supabase";

export interface EditResult {
  success: boolean;
  message?: string;
  editedAt?: string;
}

class MessageEditService {
  private readonly EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if message can be edited
   */
  async canEdit(
    messageId: string
  ): Promise<{ canEdit: boolean; remainingMs: number }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { canEdit: false, remainingMs: 0 };

    const { data: message, error } = await supabase
      .from("messages")
      .select("sender_id, created_at, is_deleted")
      .eq("id", messageId)
      .single();

    if (error || !message) return { canEdit: false, remainingMs: 0 };

    // Must be sender
    if (message.sender_id !== user.id)
      return { canEdit: false, remainingMs: 0 };

    // Must not be deleted
    if (message.is_deleted) return { canEdit: false, remainingMs: 0 };

    // Check time window
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const remainingMs = Math.max(0, this.EDIT_WINDOW_MS - messageAge);

    return {
      canEdit: remainingMs > 0,
      remainingMs,
    };
  }

  /**
   * Get formatted remaining time for edit
   */
  formatRemainingTime(remainingMs: number): string {
    if (remainingMs <= 0) return "Expired";

    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    newContent: string
  ): Promise<EditResult> {
    const { canEdit, remainingMs } = await this.canEdit(messageId);

    if (!canEdit) {
      return {
        success: false,
        message: "Edit window expired (15 minutes)",
      };
    }

    // Get original content for history
    const { data: original } = await supabase
      .from("messages")
      .select("content")
      .eq("id", messageId)
      .single();

    // Update message
    const editedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        content: newContent.trim(),
        edited_at: editedAt,
      })
      .eq("id", messageId);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    // Log edit history
    await supabase.from("message_edits").insert({
      message_id: messageId,
      old_content: original?.content || "",
      new_content: newContent.trim(),
      edited_at: editedAt,
    });

    console.log(`✏️ Edited message ${messageId}`);
    return { success: true, editedAt };
  }

  /**
   * Get edit history for a message
   */
  async getEditHistory(messageId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("message_edits")
      .select("*")
      .eq("message_id", messageId)
      .order("edited_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export const messageEditService = new MessageEditService();
```

**🧠 MCP Integration:**

```bash
# Analyze edit window enforcement
warp mcp run context7 "explain the 15-minute edit window logic in messageEditService and identify potential race conditions"

# Verify edit history table exists
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'message_edits';"
```

---

### **Phase 2: Edit Message Hook** (0.25 days)

#### Task 2.1: Create useEditMessage Hook

```typescript
// src/hooks/useEditMessage.ts
import { useState, useEffect, useCallback } from "react";
import { messageEditService } from "../services/messageEditService";
import { toast } from "react-hot-toast";

export function useEditMessage(messageId: string) {
  const [canEdit, setCanEdit] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");
  const [remainingMs, setRemainingMs] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check edit eligibility
  useEffect(() => {
    const checkEditability = async () => {
      const result = await messageEditService.canEdit(messageId);
      setCanEdit(result.canEdit);
      setRemainingMs(result.remainingMs);
      setRemainingTime(
        messageEditService.formatRemainingTime(result.remainingMs)
      );
    };

    checkEditability();

    // Update countdown every second
    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const newMs = Math.max(0, prev - 1000);
        setRemainingTime(messageEditService.formatRemainingTime(newMs));
        setCanEdit(newMs > 0);
        return newMs;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [messageId]);

  // Save edit
  const saveEdit = useCallback(
    async (newContent: string) => {
      if (!canEdit || !newContent.trim()) return false;

      setIsSaving(true);
      try {
        const result = await messageEditService.editMessage(
          messageId,
          newContent
        );

        if (result.success) {
          toast.success("Message edited");
          setIsEditing(false);
          return true;
        } else {
          toast.error(result.message || "Failed to edit");
          return false;
        }
      } catch (error) {
        toast.error("Failed to edit message");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [messageId, canEdit]
  );

  return {
    canEdit,
    remainingTime,
    remainingMs,
    isEditing,
    setIsEditing,
    isSaving,
    saveEdit,
  };
}
```

---

### **Phase 3: Edit UI Components** (0.75 days)

#### Task 3.1: Create InlineMessageEditor Component

```typescript
// src/components/messaging/InlineMessageEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Clock } from 'lucide-react';

interface Props {
  originalContent: string;
  remainingTime: string;
  onSave: (content: string) => Promise<boolean>;
  onCancel: () => void;
  isSaving: boolean;
}

export function InlineMessageEditor({
  originalContent,
  remainingTime,
  onSave,
  onCancel,
  isSaving
}: Props) {
  const [content, setContent] = useState(originalContent);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    if (content.trim() === originalContent.trim()) {
      onCancel();
      return;
    }
    await onSave(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg">
      {/* Timer warning */}
      <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
        <Clock className="w-3 h-3" />
        <span>Edit window: {remainingTime}</span>
      </div>

      {/* Text area */}
      <textarea
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-none border border-gray-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
        disabled={isSaving}
      />

      {/* Action buttons */}
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !content.trim()}
          className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded disabled:opacity-50"
        >
          {isSaving ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Check className="w-4 h-4" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
```

#### Task 3.2: Create EditedBadge Component

```typescript
// src/components/messaging/EditedBadge.tsx
import React, { useState } from 'react';
import { Pencil, History } from 'lucide-react';
import { messageEditService } from '../../services/messageEditService';

interface Props {
  messageId: string;
  editedAt: string;
}

export function EditedBadge({ messageId, editedAt }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    if (history.length === 0) {
      const data = await messageEditService.getEditHistory(messageId);
      setHistory(data);
    }
    setShowHistory(!showHistory);
  };

  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={loadHistory}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        title="View edit history"
      >
        <Pencil className="w-3 h-3" />
        <span>Edited</span>
      </button>

      {/* Edit history popup */}
      {showHistory && history.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border rounded-lg shadow-lg p-3 z-10">
          <div className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-2">
            <History className="w-3 h-3" />
            Edit History
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((edit, index) => (
              <div key={index} className="text-xs border-l-2 border-gray-200 pl-2">
                <div className="text-gray-500">{formatTime(edit.edited_at)}</div>
                <div className="text-gray-400 line-through">{edit.old_content}</div>
                <div className="text-gray-700">{edit.new_content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### **Phase 4: Mobile Long-Press Gesture** (0.25 days)

#### Task 4.1: Create useLongPress Hook

```typescript
// src/hooks/useLongPress.ts
import { useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface LongPressOptions {
  onLongPress: () => void;
  threshold?: number; // ms
  onPress?: () => void;
}

export function useLongPress({
  onLongPress,
  threshold = 500,
  onPress,
}: LongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(async () => {
      isLongPress.current = true;

      // Haptic feedback on mobile
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }

      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!isLongPress.current && onPress) {
      onPress();
    }
  }, [onPress]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
```

---

### **Phase 5: Integration** (0.25 days)

#### Task 5.1: Update MessageBubble with Edit Action

```typescript
// src/components/messaging/MessageBubble.tsx (additions)
import { useEditMessage } from '../../hooks/useEditMessage';
import { useLongPress } from '../../hooks/useLongPress';
import { InlineMessageEditor } from './InlineMessageEditor';
import { EditedBadge } from './EditedBadge';
import { Edit2 } from 'lucide-react';

// Inside MessageBubble component
const {
  canEdit,
  remainingTime,
  isEditing,
  setIsEditing,
  isSaving,
  saveEdit
} = useEditMessage(message.id);

// Long-press for mobile edit
const longPressProps = useLongPress({
  onLongPress: () => {
    if (canEdit) {
      setIsEditing(true);
    }
  }
});

// Render
return (
  <div {...longPressProps} className="message-bubble">
    {isEditing ? (
      <InlineMessageEditor
        originalContent={message.content}
        remainingTime={remainingTime}
        onSave={saveEdit}
        onCancel={() => setIsEditing(false)}
        isSaving={isSaving}
      />
    ) : (
      <>
        <p>{message.content}</p>

        {/* Edited badge */}
        {message.edited_at && (
          <EditedBadge
            messageId={message.id}
            editedAt={message.edited_at}
          />
        )}

        {/* Edit action (hover on web) */}
        {canEdit && isOwnMessage && (
          <button
            onClick={() => setIsEditing(true)}
            className="edit-action opacity-0 group-hover:opacity-100"
            title={`Edit (${remainingTime} remaining)`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </>
    )}
  </div>
);
```

---

## 🧪 **Testing Plan**

### **Unit Tests**

```typescript
describe("MessageEditService", () => {
  it("should allow edit within 15 minutes", async () => {
    const { canEdit } = await messageEditService.canEdit(recentMessageId);
    expect(canEdit).toBe(true);
  });

  it("should block edit after 15 minutes", async () => {
    const { canEdit } = await messageEditService.canEdit(oldMessageId);
    expect(canEdit).toBe(false);
  });

  it("should log edit history", async () => {
    await messageEditService.editMessage(messageId, "New content");
    const history = await messageEditService.getEditHistory(messageId);
    expect(history.length).toBeGreaterThan(0);
  });
});
```

### **MCP Integration Tests**

```bash
# Test edit window RLS policy
warp mcp run supabase "execute_sql UPDATE messages SET content = 'test edit' WHERE id = 'old-message-id' AND created_at < NOW() - INTERVAL '16 minutes';"

# Verify edit history is logged
warp mcp run supabase "execute_sql SELECT * FROM message_edits ORDER BY edited_at DESC LIMIT 5;"

# Test real-time edit sync
warp mcp run puppeteer "e2e test: user A edits message, verify user B sees updated content in real-time"
```

---

## ✅ **Definition of Done**

- [ ] MessageEditService with 15-minute window enforcement
- [ ] useEditMessage hook with countdown timer
- [ ] InlineMessageEditor component
- [ ] EditedBadge with history popup
- [ ] Long-press gesture for mobile
- [ ] Haptic feedback on mobile edit trigger
- [ ] Real-time edit synchronization
- [ ] Edit history logging
- [ ] Unit tests passing
- [ ] E2E tests passing

---

**Next Story:** [STORY_8.5.3_Delete_Messages.md](./STORY_8.5.3_Delete_Messages.md)
