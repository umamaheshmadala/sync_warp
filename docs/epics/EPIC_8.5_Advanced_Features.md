# ⚡ EPIC 8.5: Advanced Messaging Features

**Epic Owner:** Frontend Engineering  
**Dependencies:** Epic 8.1 (Database), Epic 8.2 (Core Messaging)  
**Timeline:** Week 7 (1 week)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Implement **game-changing advanced features** that differentiate SynC from competitors **on web browsers, iOS, and Android native apps**:
- ✅ **Read receipts** (seen by 👀)
- ✏️ **Edit messages** (15-minute window)
- 🗑️ **Delete messages** (15-minute window)
- 🔍 **Search messages** within conversations
- ❤️ **Message reactions** (emoji responses)
- 📱 **Native haptic feedback** on iOS/Android for reactions and interactions
- 📌 **Pin important messages** (optional for v2)

---

## 📱 **Platform Support**

**Target Platforms:**
- ✅ **Web Browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **iOS Native App** (via Capacitor framework)
- ✅ **Android Native App** (via Capacitor framework)

**Cross-Platform Advanced Features:**

| Feature | Web Implementation | iOS/Android Implementation |
|---------|-------------------|---------------------------|
| **Read Receipts** | Visual indicators | Visual indicators + haptic feedback |
| **Edit/Delete UI** | Context menu | Long-press gesture + native action sheet |
| **Message Search** | Text input search | Native search bar with keyboard integration |
| **Reactions** | Click/hover UI | Tap + hold + native haptic feedback |
| **Haptic Feedback** | Not available | `@capacitor/haptics` - Native vibration patterns |

**Required Capacitor Plugins:**
```json
{
  "@capacitor/haptics": "^5.0.0"  // Native haptic feedback (iOS/Android)
}
```

**Mobile UX Enhancements:**
- **iOS**: Light haptic feedback on reactions (UIImpactFeedbackGenerator)
- **Android**: Vibration patterns for reactions (VibrationEffect)
- **Long-press gestures** for edit/delete on mobile (more intuitive than web context menu)
- **Native action sheets** for edit/delete confirmations on mobile

---

## ✅ **Success Criteria**

| Objective | Target |
|-----------|--------|
| **Read Receipt Accuracy** | 100% (all platforms) |
| **Edit Success Rate** | > 99% within 15min window (all platforms) |
| **Delete Success Rate** | > 99% within 15min window (all platforms) |
| **Search Performance** | < 200ms for keyword search (all platforms) |
| **Reaction Latency** | < 500ms (all platforms) |
| **Haptic Feedback (Mobile)** | Triggers on reaction/edit/delete (iOS/Android) |
|| **Long-press Gesture (Mobile)** | Activates edit/delete menu on iOS/Android |

---

## 🎯 **MCP Integration Strategy**

**This epic follows the global MCP routing rule** (`rule:yCm2e9oHOnrU5qbhrGa2IE`) to maximize development efficiency:

### **Primary MCP Servers Used:**

1. **🛢 Supabase MCP** (Heavy usage)
   - Test edit/delete RLS policies and 15-minute window validation
   - Monitor read receipt tracking queries
   - Test message reaction storage and deduplication
   - Verify search performance with full-text indexes
   - Deploy edge functions for reaction aggregation

2. **🧠 Context7 MCP** (Medium usage)
   - Analyze edit/delete service architecture
   - Review reaction system implementation patterns
   - Suggest search optimization strategies
   - Find race condition vulnerabilities in edit conflicts

3. **🌐 Chrome DevTools MCP** (Medium usage)
   - Debug read receipt UI rendering
   - Monitor reaction animation performance
   - Profile search query latency
   - Test edit/delete UI state transitions

4. **🤖 Puppeteer MCP** (For testing)
   - Automate edit/delete flows with time window validation
   - Test read receipts across multiple users
   - Verify reaction deduplication end-to-end
   - Test search functionality across edge cases

5. **🎨 Shadcn MCP** (UI scaffolding)
   - Scaffold reaction picker components
   - Build edit/delete action menus
   - Generate search input with autocomplete
   - Create read receipt indicator badges

**🔄 Automatic Routing:** Per global MCP rule, commands automatically route to appropriate servers based on keywords:
- SQL/database/RLS queries → Supabase MCP
- explain/analyze/refactor → Context7 MCP
- inspect/debug → Chrome DevTools MCP
- e2e test → Puppeteer MCP

**📖 Each story below includes specific MCP commands for implementation.**

---

## 🧩 **Key Components**

### **1. Read Receipts System**

**Database:** Already created in Epic 8.1 (`message_read_receipts` table)

**File:** `src/services/readReceiptService.ts`

```typescript
// src/services/readReceiptService.ts
import { supabase } from '../lib/supabase'
import { realtimeService } from './realtimeService'

class ReadReceiptService {
  /**
   * Mark message as read
   * Triggers RPC function from Epic 8.1
   */
  async markAsRead(messageId: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user!.id

    const { error } = await supabase.rpc('mark_message_as_read', {
      p_message_id: messageId,
      p_user_id: userId
    })

    if (error) throw error
    console.log(`📖 Marked message ${messageId} as read`)
  }

  /**
   * Mark all messages in conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user!.id

    // Get unread messages
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null)

    if (!unreadMessages?.length) return

    // Mark each as read
    await Promise.all(
      unreadMessages.map(msg => this.markAsRead(msg.id))
    )

    console.log(`📚 Marked ${unreadMessages.length} messages as read in ${conversationId}`)
  }

  /**
   * Subscribe to read receipts for a conversation
   */
  subscribeToReadReceipts(
    conversationId: string,
    onReadReceipt: (messageId: string, userId: string) => void
  ): () => void {
    return realtimeService.subscribeToReadReceipts(
      conversationId,
      onReadReceipt
    )
  }
}

export const readReceiptService = new ReadReceiptService()
```

**🛢 MCP Integration:**
```bash
# Verify read receipts are being tracked
warp mcp run supabase "execute_sql SELECT * FROM message_read_receipts WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = 'conv-123') ORDER BY read_at DESC LIMIT 10;"
```

---

### **2. Edit & Delete Messages**

**Database:** Already created in Epic 8.1 (`message_edits` table, `is_deleted` column)

**File:** `src/services/messageEditService.ts`

```typescript
// src/services/messageEditService.ts
import { supabase } from '../lib/supabase'

class MessageEditService {
  private EDIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

  /**
   * Check if message can be edited
   */
  canEdit(message: { createdAt: string; senderId: string }): boolean {
    const currentUserId = (await supabase.auth.getUser()).data.user!.id
    if (message.senderId !== currentUserId) return false

    const messageAge = Date.now() - new Date(message.createdAt).getTime()
    return messageAge < this.EDIT_WINDOW_MS
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newContent: string): Promise<void> {
    // Fetch original message to check edit window
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .eq('id', messageId)
      .single()

    if (fetchError) throw fetchError
    if (!this.canEdit(message)) {
      throw new Error('Edit window expired (15 minutes)')
    }

    // Update message content
    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        content: newContent,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)

    if (updateError) throw updateError

    // Log edit history
    await supabase.from('message_edits').insert({
      message_id: messageId,
      old_content: message.content,
      new_content: newContent
    })

    console.log(`✏️ Edited message ${messageId}`)
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    // Fetch original message to check edit window
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .eq('id', messageId)
      .single()

    if (fetchError) throw fetchError
    if (!this.canEdit(message)) {
      throw new Error('Delete window expired (15 minutes)')
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('messages')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId)

    if (deleteError) throw deleteError

    console.log(`🗑️ Deleted message ${messageId}`)
  }

  /**
   * Get edit history
   */
  async getEditHistory(messageId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('message_edits')
      .select('*')
      .eq('message_id', messageId)
      .order('edited_at', { ascending: true })

    if (error) throw error
    return data
  }
}

export const messageEditService = new MessageEditService()
```

**🧠 MCP Integration:**
```bash
# Analyze edit logic with Context7
warp mcp run context7 "explain the 15-minute edit window enforcement in messageEditService"
```

---

### **3. Message Search**

**File:** `src/services/messageSearchService.ts`

```typescript
// src/services/messageSearchService.ts
import { supabase } from '../lib/supabase'
import type { Message } from '../types/messaging'

class MessageSearchService {
  /**
   * Search messages within a conversation
   * Uses Postgres full-text search
   */
  async searchInConversation(
    conversationId: string,
    query: string
  ): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .textSearch('content', query, {
        type: 'websearch',
        config: 'english'
      })
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }

  /**
   * Search across all conversations (global search)
   */
  async searchAllConversations(query: string): Promise<Message[]> {
    const userId = (await supabase.auth.getUser()).data.user!.id

    // Only search in conversations user is part of
    const { data: userConvos } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (!userConvos?.length) return []

    const conversationIds = userConvos.map(c => c.conversation_id)

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, avatar_url),
        conversation:conversations(id, name)
      `)
      .in('conversation_id', conversationIds)
      .eq('is_deleted', false)
      .textSearch('content', query, {
        type: 'websearch',
        config: 'english'
      })
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  /**
   * Highlight search query in message content
   */
  highlightQuery(content: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi')
    return content.replace(regex, '<mark>$1</mark>')
  }
}

export const messageSearchService = new MessageSearchService()
```

**🛢 MCP Integration:**
```bash
# Test full-text search performance
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM messages WHERE to_tsvector('english', content) @@ to_tsquery('english', 'pizza') AND conversation_id = 'conv-123';"
```

---

### **4. Message Reactions**

**Database:** Add `reactions` JSONB column to `messages` table

**File:** `src/services/reactionService.ts`

```typescript
// src/services/reactionService.ts
import { supabase } from '../lib/supabase'

interface Reaction {
  emoji: string
  userIds: string[]
  count: number
}

class ReactionService {
  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user!.id

    // Fetch current reactions
    const { data: message } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single()

    const reactions = message?.reactions || {}
    
    // Add user to reaction
    if (!reactions[emoji]) {
      reactions[emoji] = []
    }
    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId)
    }

    // Update
    const { error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)

    if (error) throw error
    console.log(`❤️ Added reaction ${emoji} to message ${messageId}`)
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user!.id

    const { data: message } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single()

    const reactions = message?.reactions || {}
    
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId)
      if (reactions[emoji].length === 0) {
        delete reactions[emoji]
      }
    }

    const { error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)

    if (error) throw error
  }

  /**
   * Get reactions summary for display
   */
  getReactionsSummary(reactions: Record<string, string[]>): Reaction[] {
    return Object.entries(reactions).map(([emoji, userIds]) => ({
      emoji,
      userIds,
      count: userIds.length
    }))
  }
}

export const reactionService = new ReactionService()
```

---

### **5. UI Components for Advanced Features**

**File:** `src/components/messaging/MessageActions.tsx`

```typescript
// src/components/messaging/MessageActions.tsx
import React, { useState } from 'react'
import { Edit2, Trash2, Smile, MoreVertical } from 'lucide-react'
import { messageEditService } from '../../services/messageEditService'
import { reactionService } from '../../services/reactionService'
import { toast } from 'react-hot-toast'

interface Props {
  message: any
  canEdit: boolean
  canDelete: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function MessageActions({ message, canEdit, canDelete, onEdit, onDelete }: Props) {
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)

  const handleEdit = () => {
    onEdit?.()
    setShowActions(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return
    
    try {
      await messageEditService.deleteMessage(message.id)
      onDelete?.()
      toast.success('Message deleted')
    } catch (error) {
      toast.error('Failed to delete message')
    }
    setShowActions(false)
  }

  const handleReaction = async (emoji: string) => {
    try {
      await reactionService.addReaction(message.id, emoji)
      toast.success('Reaction added')
    } catch (error) {
      toast.error('Failed to add reaction')
    }
    setShowReactions(false)
  }

  const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏']

  return (
    <div className="relative">
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {showActions && (
        <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-10">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-left text-sm"
          >
            <Smile className="w-4 h-4" />
            React
          </button>

          {canEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-left text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 w-full text-left text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )}

      {showReactions && (
        <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-20 flex gap-2">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

**🎨 MCP Integration:**
```bash
# Scaffold dropdown menu with Shadcn
warp mcp run shadcn "getComponent dropdown-menu"
```

---

## 📋 **Story Breakdown**

### **Story 8.5.1: Read Receipts Implementation** (2 days)
- [ ] Implement readReceiptService
- [ ] Mark messages as read when viewed
- [ ] Display "Seen by 👀" indicator
- [ ] Subscribe to realtime read receipt updates
- **🛢 MCP**: Test read receipts with Supabase MCP

### **Story 8.5.2: Edit & Delete Messages** (2 days)
- [ ] Implement messageEditService with 15min window
- [ ] Create edit UI (inline editing)
- [ ] Create delete confirmation dialog
- [ ] Show "Edited" badge on edited messages
- **🧠 MCP**: Analyze edit window logic with Context7

### **Story 8.5.3: Message Search** (2 days)
- [ ] Implement full-text search with Postgres
- [ ] Create search UI with highlighting
- [ ] Add global search across conversations
- [ ] Optimize search performance with indexes
- **🛢 MCP**: Test search performance with Supabase MCP

### **Story 8.5.4: Message Reactions** (1 day)
- [ ] Add `reactions` JSONB column to messages table
- [ ] Implement reactionService
- [ ] Create reaction picker UI
- [ ] Display reaction counts on messages
- **🎨 MCP**: Use Shadcn for emoji picker

---

## 🧪 **Testing with MCP**

### **E2E Tests with Puppeteer MCP**
```bash
# Test edit/delete flow
warp mcp run puppeteer "e2e test message edit within 15 minutes and verify edited badge appears"
```

### **Database Tests with Supabase MCP**
```bash
# Verify edit history is logged
warp mcp run supabase "execute_sql SELECT * FROM message_edits WHERE message_id = 'msg-123' ORDER BY edited_at DESC;"
```

### **Search Performance with Supabase MCP**
```bash
# Test full-text search query plan
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM messages WHERE to_tsvector('english', content) @@ plainto_tsquery('english', 'coffee shop');"
```

---

## ✅ **Definition of Done**

- [x] Read receipts tracked with 100% accuracy
- [x] Edit/delete only allowed within 15-minute window
- [x] Message search returns results in < 200ms
- [x] Reactions display in real-time
- [x] All UI components responsive and accessible
- [x] Tests passing (E2E with Puppeteer MCP)

---

**Next Epic:** [EPIC_8.6_Push_Notifications.md](./EPIC_8.6_Push_Notifications.md)
