# 📦 STORY 8.10.2: Archive & Pin Management

**Parent Epic:** [EPIC 8.10 - Conversation Management & Organization](../epics/EPIC_8.10_Conversation_Management.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1 day  
**Priority:** P1 - High  
**Status:** ✅ Completed (2025-11-30)

---

## 📊 **Implementation Summary**

### **Completion Status: 100% + Additional Enhancements**

All core functionality has been implemented and verified, with additional features beyond the original scope:

#### ✅ **Core Requirements (100%)**

- ✅ **Context Menu**: `ConversationContextMenu.tsx` with Pin/Archive/Mark as Read/Delete
- ✅ **Bulk Operations**: `ConversationListBulkActions.tsx` with multi-select toolbar
- ✅ **Keyboard Shortcuts**: `useConversationKeyboardShortcuts.ts` (A=Archive, P=Pin, U=Unarchive)
- ✅ **Swipe Gestures**: Mobile swipe with haptic feedback (from Story 8.10.1)
- ✅ **Undo Actions**: Toast-based undo for archive/pin operations

#### 🎁 **Additional Enhancements (Beyond Scope)**

- ✅ **Optimistic Updates**: Instant UI feedback via `messagingStore.ts` (`togglePinOptimistic`, `toggleArchiveOptimistic`)
- ✅ **Chat Header Integration**: Pin/Archive actions in chat header dropdown menu
- ✅ **Desktop Action Buttons**: `ConversationActionButtons.tsx` for hover-based quick actions
- ✅ **Mobile Long-Press**: Selection mode trigger with haptic feedback
- ✅ **Realtime Sync**: Automatic refresh and count updates across all tabs

### **Acceptance Criteria Status:**

| Criteria                       | Status | Notes                             |
| ------------------------------ | ------ | --------------------------------- |
| Archive removes from "All" tab | ✅     | Filter logic verified             |
| Pinned at top of list          | ✅     | Sorting with `is_pinned` priority |
| Swipe gestures smooth          | ✅     | `SwipeableConversationCard`       |
| Context menu on right-click    | ✅     | Web support confirmed             |
| Haptic feedback                | ✅     | Capacitor Haptics integrated      |
| Realtime sync                  | ✅     | Optimistic + server sync          |

---

## 🎯 **Original Story Goal**

---

## 🎯 **Story Goal**

Implement **archive and pin management** functionality with context menus, swipe gestures, and realtime synchronization to help users organize their conversations effectively.

**Note:** Database schema for archive/pin was created in Story 8.10.1. This story focuses on the **management UI and user interactions**.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Implementation**

| Feature                | Web                  | iOS                  | Android              |
| ---------------------- | -------------------- | -------------------- | -------------------- |
| **Archive Action**     | Context menu         | Swipe left + haptic  | Swipe left + haptic  |
| **Pin Action**         | Context menu         | Swipe right + haptic | Swipe right + haptic |
| **Bulk Actions**       | Multi-select         | Multi-select         | Multi-select         |
| **Keyboard Shortcuts** | A (archive), P (pin) | N/A                  | N/A                  |

**Required Capacitor Plugins:**

```json
{
  "@capacitor/haptics": "^5.0.0" // Already installed
}
```

---

## 📖 **User Stories**

### As a user, I want to:

1. **Archive conversations** - Hide old deal-sharing chats from main list
2. **Pin conversations** - Keep important chats at the top
3. **Quick access** - Swipe gestures on mobile, context menu on web
4. **Bulk operations** - Archive/pin multiple conversations at once
5. **Undo actions** - Quickly undo accidental archive/pin

### Acceptance Criteria:

- ✅ Archive removes conversation from "All" tab
- ✅ Pinned conversations appear at top of list
- ✅ Swipe gestures work smoothly on mobile
- ✅ Context menu appears on right-click (web)
- ✅ Haptic feedback on mobile gestures
- ✅ Realtime sync across devices

---

## 🧩 **Implementation Tasks**

### **Phase 1: Context Menu Actions (0.25 days)**

**Note:** Database functions already exist from Story 8.10.1:

- `archiveConversation()`
- `unarchiveConversation()`
- `pinConversation()`
- `unpinConversation()`

#### **Task 1.1: Enhanced Context Menu**

**File:** `src/components/messaging/ConversationContextMenu.tsx` (already created in 8.10.1, enhance)

```typescript
import React from 'react'
import { Archive, Pin, Trash, ArchiveX, PinOff, Check } from 'lucide-react'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'

interface Props {
  conversation: any
  onUpdate?: () => void
  onDelete?: () => void
  onClose: () => void
  position: { x: number; y: number }
}

export function ConversationContextMenu({
  conversation,
  onUpdate,
  onDelete,
  onClose,
  position
}: Props) {
  const handleArchive = async () => {
    try {
      if (conversation.is_archived) {
        await conversationManagementService.unarchiveConversation(conversation.id)
        toast.success('Conversation unarchived')
      } else {
        await conversationManagementService.archiveConversation(conversation.id)
        toast.success('Conversation archived', {
          action: {
            label: 'Undo',
            onClick: async () => {
              await conversationManagementService.unarchiveConversation(conversation.id)
              toast.success('Undo successful')
              onUpdate?.()
            }
          }
        })
      }
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to archive conversation')
    }
  }

  const handlePin = async () => {
    try {
      if (conversation.is_pinned) {
        await conversationManagementService.unpinConversation(conversation.id)
        toast.success('Conversation unpinned')
      } else {
        await conversationManagementService.pinConversation(conversation.id)
        toast.success('Conversation pinned')
      }
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to pin conversation')
    }
  }

  const handleMarkAsRead = async () => {
    try {
      await conversationManagementService.markConversationAsRead(conversation.id)
      toast.success('Marked as read')
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to mark as read')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      >
        {/* Pin/Unpin */}
        <button
          onClick={handlePin}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left"
        >
          {conversation.is_pinned ? (
            <>
              <PinOff className="w-4 h-4 text-gray-600" />
              <span>Unpin conversation</span>
            </>
          ) : (
            <>
              <Pin className="w-4 h-4 text-blue-600" />
              <span>Pin to top</span>
            </>
          )}
        </button>

        {/* Archive/Unarchive */}
        <button
          onClick={handleArchive}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left"
        >
          {conversation.is_archived ? (
            <>
              <ArchiveX className="w-4 h-4 text-gray-600" />
              <span>Unarchive</span>
            </>
          ) : (
            <>
              <Archive className="w-4 h-4 text-gray-600" />
              <span>Archive</span>
            </>
          )}
        </button>

        {/* Mark as Read */}
        {conversation.unread_count > 0 && (
          <button
            onClick={handleMarkAsRead}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left"
          >
            <Check className="w-4 h-4 text-green-600" />
            <span>Mark as read</span>
          </button>
        )}

        <div className="border-t border-gray-200 my-1" />

        {/* Delete */}
        <button
          onClick={() => {
            onDelete?.()
            onClose()
          }}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-red-50 text-red-600 text-left"
        >
          <Trash className="w-4 h-4" />
          <span>Delete conversation</span>
        </button>
      </div>
    </>
  )
}
```

---

### **Phase 2: Bulk Operations (0.5 days)**

#### **Task 2.1: Multi-Select Mode**

**File:** `src/components/messaging/ConversationListBulkActions.tsx`

```typescript
import React, { useState } from 'react'
import { Archive, Pin, Trash, X } from 'lucide-react'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'

interface Props {
  selectedConversations: string[]
  onClearSelection: () => void
  onUpdate: () => void
}

export function ConversationListBulkActions({
  selectedConversations,
  onClearSelection,
  onUpdate
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBulkArchive = async () => {
    setIsProcessing(true)
    try {
      await Promise.all(
        selectedConversations.map(id =>
          conversationManagementService.archiveConversation(id)
        )
      )
      toast.success(`Archived ${selectedConversations.length} conversations`)
      onUpdate()
      onClearSelection()
    } catch (error) {
      toast.error('Failed to archive conversations')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkPin = async () => {
    setIsProcessing(true)
    try {
      await Promise.all(
        selectedConversations.map(id =>
          conversationManagementService.pinConversation(id)
        )
      )
      toast.success(`Pinned ${selectedConversations.length} conversations`)
      onUpdate()
      onClearSelection()
    } catch (error) {
      toast.error('Failed to pin conversations')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedConversations.length} conversations?`)) return

    setIsProcessing(true)
    try {
      await Promise.all(
        selectedConversations.map(id =>
          conversationManagementService.deleteConversation(id)
        )
      )
      toast.success(`Deleted ${selectedConversations.length} conversations`)
      onUpdate()
      onClearSelection()
    } catch (error) {
      toast.error('Failed to delete conversations')
    } finally {
      setIsProcessing(false)
    }
  }

  if (selectedConversations.length === 0) return null

  return (
    <div className="sticky top-0 z-20 bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={onClearSelection}
          className="p-1 hover:bg-blue-700 rounded"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-medium">
          {selectedConversations.length} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleBulkPin}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded text-sm disabled:opacity-50"
        >
          <Pin className="w-4 h-4" />
          Pin
        </button>

        <button
          onClick={handleBulkArchive}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded text-sm disabled:opacity-50"
        >
          <Archive className="w-4 h-4" />
          Archive
        </button>

        <button
          onClick={handleBulkDelete}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50"
        >
          <Trash className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  )
}
```

#### **Task 2.2: Selectable Conversation Cards**

**File:** `src/components/messaging/SelectableConversationCard.tsx`

```typescript
import React from 'react'
import { Check } from 'lucide-react'
import { ConversationCard } from './ConversationCard'
import { cn } from '../../lib/utils'

interface Props {
  conversation: any
  isSelected: boolean
  isSelectionMode: boolean
  onToggleSelect: (id: string) => void
  onLongPress?: () => void
}

export function SelectableConversationCard({
  conversation,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  onLongPress
}: Props) {
  const handleLongPress = () => {
    onLongPress?.()
  }

  return (
    <div
      className={cn(
        'relative transition-colors',
        isSelected && 'bg-blue-50'
      )}
      onContextMenu={(e) => {
        if (!isSelectionMode) {
          e.preventDefault()
          handleLongPress()
        }
      }}
    >
      {isSelectionMode && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <button
            onClick={() => onToggleSelect(conversation.id)}
            className={cn(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-gray-300'
            )}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </button>
        </div>
      )}

      <div
        className={cn(isSelectionMode && 'pl-10')}
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelect(conversation.id)
          }
        }}
      >
        <ConversationCard conversation={conversation} />
      </div>
    </div>
  )
}
```

---

### **Phase 3: Keyboard Shortcuts (Web Only) (0.25 days)**

#### **Task 3.1: Keyboard Shortcut Handler**

**File:** `src/hooks/useConversationKeyboardShortcuts.ts`

```typescript
import { useEffect } from "react";
import { conversationManagementService } from "../services/conversationManagementService";
import { toast } from "react-hot-toast";

export function useConversationKeyboardShortcuts(
  selectedConversationId: string | null,
  onUpdate: () => void
) {
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (!selectedConversationId) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      try {
        switch (e.key.toLowerCase()) {
          case "a":
            // Archive
            await conversationManagementService.archiveConversation(
              selectedConversationId
            );
            toast.success("Conversation archived");
            onUpdate();
            break;

          case "p":
            // Pin
            await conversationManagementService.pinConversation(
              selectedConversationId
            );
            toast.success("Conversation pinned");
            onUpdate();
            break;

          case "u":
            // Unarchive
            await conversationManagementService.unarchiveConversation(
              selectedConversationId
            );
            toast.success("Conversation unarchived");
            onUpdate();
            break;

          case "delete":
          case "backspace":
            if (e.ctrlKey || e.metaKey) {
              // Delete conversation
              if (confirm("Delete this conversation?")) {
                await conversationManagementService.deleteConversation(
                  selectedConversationId
                );
                toast.success("Conversation deleted");
                onUpdate();
              }
            }
            break;
        }
      } catch (error) {
        console.error("Keyboard shortcut failed:", error);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedConversationId, onUpdate]);
}
```

---

## 🧪 **Testing Checklist**

### **Supabase MCP Tests**

```bash
# Test archive/unarchive
warp mcp run supabase "execute_sql
  UPDATE conversations SET is_archived = true WHERE id = 'test-conv-id';
  SELECT id, is_archived FROM conversation_list WHERE id = 'test-conv-id';
"

# Test pin/unpin
warp mcp run supabase "execute_sql
  UPDATE conversations SET is_pinned = true, pinned_at = NOW() WHERE id = 'test-conv-id';
  SELECT id, is_pinned FROM conversation_list ORDER BY is_pinned DESC, last_message_at DESC LIMIT 5;
"

# Test bulk operations
warp mcp run supabase "execute_sql
  UPDATE conversations SET is_archived = true
  WHERE id IN ('conv-1', 'conv-2', 'conv-3');
  SELECT COUNT(*) FROM conversation_list WHERE is_archived = true;
"
```

### **Manual Testing**

**Web:**

- [ ] Right-click shows context menu
- [ ] Archive/pin actions work from context menu
- [ ] Keyboard shortcuts work (A, P, U)
- [ ] Multi-select mode works
- [ ] Bulk actions work
- [ ] Undo toast appears

**Mobile:**

- [ ] Swipe left to archive (haptic feedback)
- [ ] Swipe right to pin (haptic feedback)
- [ ] Long-press for selection mode
- [ ] Multi-select works
- [ ] Bulk actions work

---

## 📊 **Success Metrics**

| Metric                         | Target                  |
| ------------------------------ | ----------------------- |
| **Archive Success Rate**       | > 99%                   |
| **Pin Success Rate**           | > 99%                   |
| **Swipe Gesture Response**     | < 50ms                  |
| **Haptic Feedback**            | Triggers on every swipe |
| **Bulk Operation Success**     | > 99%                   |
| **Keyboard Shortcut Response** | < 100ms                 |

---

## 📦 **Deliverables**

1. ✅ Enhanced: `ConversationContextMenu.tsx`
2. ✅ Component: `ConversationListBulkActions.tsx`
3. ✅ Component: `SelectableConversationCard.tsx`
4. ✅ Hook: `useConversationKeyboardShortcuts.ts`
5. ✅ Updated: `ConversationListSidebar.tsx` (multi-select mode)
6. ✅ Tests (Supabase MCP + manual)

---

## 🔗 **Dependencies**

### **Required Before Starting:**

- ✅ Story 8.10.1: Database schema for archive/pin
- ✅ Story 8.10.1: Service methods (archive/pin)
- ✅ Story 8.10.1: `SwipeableConversationCard` component

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 1 day  
**Risk Level:** Low (builds on 8.10.1 foundation)
