# 📦 STORY 8.2.1: Messaging Service Layer

**Parent Epic:** [EPIC 8.2 - Core 1:1 Messaging Implementation](../epics/EPIC_8.2_Core_Messaging_Implementation.md)  
**Story Owner:** Backend Engineering / Frontend Engineering  
**Estimated Effort:** 3 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Build the **core messaging service layer** (`messagingService.ts`) that abstracts all database operations for messaging functionality, including creating conversations, sending messages, fetching message history with pagination, and managing read receipts.

---

## 📖 **User Stories**

### As a developer, I want:
1. A clean service interface to create or retrieve 1:1 conversations
2. A reliable method to send messages through Supabase RPC functions
3. Efficient pagination for loading message history
4. Methods to mark messages as read and track read receipts
5. Proper error handling for all database operations

### Acceptance Criteria:
- ✅ All service methods return consistent promise-based responses
- ✅ Error handling covers network failures, RLS violations, and edge cases
- ✅ Pagination uses cursor-based approach for performance
- ✅ Service can be tested independently using Supabase MCP
- ✅ TypeScript types are complete and accurate

---

## 🧩 **Implementation Tasks**

### **Phase 1: Setup and Type Definitions** (0.5 days)

#### Task 1.1: Create Type Definitions
```typescript
// src/types/messaging.ts
export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'link' | 'coupon' | 'deal'
  media_urls?: string[] | null
  thumbnail_url?: string | null
  link_preview?: LinkPreview | null
  shared_coupon_id?: string | null
  shared_deal_id?: string | null
  reply_to_id?: string | null
  is_edited: boolean
  edited_at?: string | null
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface ConversationWithDetails {
  conversation_id: string
  other_participant_id: string
  other_participant_name: string
  other_participant_avatar?: string | null
  last_message_content?: string | null
  last_message_at?: string | null
  last_message_sender_id?: string | null
  unread_count: number
  created_at: string
}

export interface SendMessageParams {
  conversationId: string
  content: string
  type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'link' | 'coupon' | 'deal'
  mediaUrls?: string[] | null
  thumbnailUrl?: string | null
  linkPreview?: LinkPreview | null
  sharedCouponId?: string | null
  sharedDealId?: string | null
  replyToId?: string | null
}

export interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
}
```

**🛢 MCP Integration:**
```bash
# Verify message table structure
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages';"
```

---

### **Phase 2: Core Service Methods** (1.5 days)

#### Task 2.1: Create/Get Conversation Method
```typescript
// src/services/messagingService.ts
async createOrGetConversation(friendId: string): Promise<string> {
  try {
    console.log('🔄 Creating/getting conversation with:', friendId)
    
    const { data, error } = await supabase
      .rpc('create_or_get_conversation', { p_participant_id: friendId })
    
    if (error) throw error
    
    console.log('✅ Conversation ID:', data)
    return data as string
  } catch (error) {
    console.error('❌ Error creating conversation:', error)
    throw error
  }
}
```

**🛢 MCP Testing:**
```bash
# Test the database function directly
warp mcp run supabase "execute_sql SELECT create_or_get_conversation('friend-uuid-here');"

# Verify conversation was created
warp mcp run supabase "execute_sql SELECT * FROM conversations WHERE id = 'conv-id';"
```

**🧠 MCP Code Analysis:**
```bash
# Check for error handling gaps
warp mcp run context7 "analyze createOrGetConversation method and identify edge cases"
```

---

#### Task 2.2: Send Message Method
```typescript
async sendMessage(params: SendMessageParams): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('send_message', {
        p_conversation_id: params.conversationId,
        p_content: params.content,
        p_type: params.type || 'text',
        p_media_urls: params.mediaUrls || null,
        p_thumbnail_url: params.thumbnailUrl || null,
        p_link_preview: params.linkPreview || null,
        p_shared_coupon_id: params.sharedCouponId || null,
        p_shared_deal_id: params.sharedDealId || null,
        p_reply_to_id: params.replyToId || null
      })
    
    if (error) throw error
    
    console.log('✅ Message sent:', data)
    return data as string
  } catch (error) {
    console.error('❌ Error sending message:', error)
    throw error
  }
}
```

**🛢 MCP Testing:**
```bash
# Test sending a message
warp mcp run supabase "execute_sql SELECT send_message('conv-id', 'Hello World', 'text', NULL, NULL, NULL, NULL, NULL, NULL);"

# Verify message was inserted
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE conversation_id = 'conv-id' ORDER BY created_at DESC LIMIT 1;"
```

---

#### Task 2.3: Fetch Messages with Pagination
```typescript
async fetchMessages(
  conversationId: string, 
  limit: number = 50,
  beforeMessageId?: string
): Promise<{ messages: Message[], hasMore: boolean }> {
  try {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to check hasMore
    
    // Cursor-based pagination
    if (beforeMessageId) {
      const { data: cursorMsg } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', beforeMessageId)
        .single()
      
      if (cursorMsg) {
        query = query.lt('created_at', cursorMsg.created_at)
      }
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    const hasMore = data.length > limit
    const messages = data.slice(0, limit).reverse() // Reverse for chronological order
    
    return { messages, hasMore }
  } catch (error) {
    console.error('❌ Error fetching messages:', error)
    throw error
  }
}
```

**🛢 MCP Testing:**
```bash
# Test pagination
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE conversation_id = 'conv-id' ORDER BY created_at DESC LIMIT 51;"

# Test cursor pagination
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE conversation_id = 'conv-id' AND created_at < (SELECT created_at FROM messages WHERE id = 'cursor-msg-id') ORDER BY created_at DESC LIMIT 51;"
```

**🧠 MCP Performance Analysis:**
```bash
# Analyze pagination performance
warp mcp run context7 "analyze fetchMessages pagination logic and suggest optimizations"
```

---

#### Task 2.4: Fetch Conversations List
```typescript
async fetchConversations(): Promise<ConversationWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('conversation_list')
      .select('*')
      .order('last_message_at', { ascending: false })
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('❌ Error fetching conversations:', error)
    throw error
  }
}
```

**🛢 MCP Testing:**
```bash
# Test conversation_list view
warp mcp run supabase "execute_sql SELECT * FROM conversation_list ORDER BY last_message_at DESC LIMIT 10;"
```

---

### **Phase 3: Read Receipts & Additional Methods** (1 day)

#### Task 3.1: Mark Message as Read
```typescript
async markMessageAsRead(messageId: string): Promise<void> {
  try {
    const { error } = await supabase
      .rpc('mark_message_as_read', { p_message_id: messageId })
    
    if (error) throw error
  } catch (error) {
    console.error('❌ Error marking message as read:', error)
    // Don't throw - read receipts are non-critical
  }
}
```

**🛢 MCP Testing:**
```bash
# Test marking message as read
warp mcp run supabase "execute_sql SELECT mark_message_as_read('msg-id');"

# Verify read receipt was created
warp mcp run supabase "execute_sql SELECT * FROM message_read_receipts WHERE message_id = 'msg-id';"
```

---

#### Task 3.2: Mark Conversation as Read
```typescript
async markConversationAsRead(conversationId: string): Promise<void> {
  try {
    // Get unread messages in this conversation
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .neq('sender_id', (await supabase.auth.getUser()).data.user?.id)
      .not('id', 'in', `(
        SELECT message_id 
        FROM message_read_receipts 
        WHERE user_id = auth.uid() 
        AND read_at IS NOT NULL
      )`)
    
    // Mark each as read
    if (unreadMessages && unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map(msg => this.markMessageAsRead(msg.id))
      )
    }
  } catch (error) {
    console.error('❌ Error marking conversation as read:', error)
  }
}
```

---

#### Task 3.3: Get Unread Count
```typescript
async getUnreadCount(): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_unread_message_count')
    
    if (error) throw error
    
    return data as number
  } catch (error) {
    console.error('❌ Error getting unread count:', error)
    return 0
  }
}
```

**🛢 MCP Testing:**
```bash
# Test unread count function
warp mcp run supabase "execute_sql SELECT get_unread_message_count();"
```

---

#### Task 3.4: Delete & Edit Messages
```typescript
async deleteMessage(messageId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString() 
      })
      .eq('id', messageId)
    
    if (error) throw error
  } catch (error) {
    console.error('❌ Error deleting message:', error)
    throw error
  }
}

async editMessage(messageId: string, newContent: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
    
    if (error) throw error
  } catch (error) {
    console.error('❌ Error editing message:', error)
    throw error
  }
}
```

**🛢 MCP Testing:**
```bash
# Test soft delete
warp mcp run supabase "execute_sql UPDATE messages SET is_deleted = true WHERE id = 'msg-id'; SELECT * FROM messages WHERE id = 'msg-id';"

# Test edit
warp mcp run supabase "execute_sql UPDATE messages SET content = 'Edited', is_edited = true WHERE id = 'msg-id'; SELECT * FROM messages WHERE id = 'msg-id';"
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test `createOrGetConversation` with valid friend ID
- [ ] Test `createOrGetConversation` with invalid friend ID (should throw)
- [ ] Test `sendMessage` with all parameter variations
- [ ] Test `fetchMessages` without pagination
- [ ] Test `fetchMessages` with cursor pagination
- [ ] Test `markMessageAsRead` success and failure cases
- [ ] Test `getUnreadCount` returns correct number
- [ ] Test `deleteMessage` soft delete behavior
- [ ] Test `editMessage` updates content correctly

### Integration Tests with Supabase MCP
```bash
# End-to-end conversation flow
warp mcp run supabase "execute_sql 
  -- Create conversation
  SELECT create_or_get_conversation('friend-uuid');
  
  -- Send message
  SELECT send_message('conv-id', 'Test message', 'text');
  
  -- Verify message exists
  SELECT * FROM messages WHERE conversation_id = 'conv-id';
  
  -- Mark as read
  SELECT mark_message_as_read((SELECT id FROM messages WHERE conversation_id = 'conv-id' LIMIT 1));
  
  -- Verify read receipt
  SELECT * FROM message_read_receipts;
"
```

### Code Quality with Context7 MCP
```bash
# Analyze service for potential bugs
warp mcp run context7 "analyze messagingService.ts and identify potential race conditions or error handling gaps"

# Check TypeScript types
warp mcp run context7 "review messagingService.ts type definitions and suggest improvements"
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Method Response Time** | < 100ms for all methods | MCP performance testing |
| **Error Handling Coverage** | 100% of methods | Context7 code analysis |
| **Type Safety** | Zero TypeScript errors | `npm run type-check` |
| **Test Coverage** | > 90% | Vitest coverage report |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ Epic 8.1 database tables must be deployed
- ✅ RLS policies must be active
- ✅ Database functions must exist:
  - `create_or_get_conversation()`
  - `send_message()`
  - `mark_message_as_read()`
  - `get_unread_message_count()`

### Verify Dependencies with MCP:
```bash
# Check database functions exist
warp mcp run supabase "execute_sql SELECT proname FROM pg_proc WHERE proname LIKE '%message%' OR proname LIKE '%conversation%';"

# Check RLS policies
warp mcp run supabase "execute_sql SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('messages', 'conversations');"
```

---

## 📦 **Deliverables**

1. ✅ `src/types/messaging.ts` - Complete type definitions
2. ✅ `src/services/messagingService.ts` - Service implementation
3. ✅ `src/services/__tests__/messagingService.test.ts` - Unit tests
4. ✅ Documentation in code comments
5. ✅ MCP testing commands documented

---

## 🔄 **Next Story**

➡️ [STORY 8.2.2: Realtime Service Layer](./STORY_8.2.2_Realtime_Service_Layer.md)

---

## 📝 **MCP Command Quick Reference**

### Supabase MCP
```bash
# Test conversation creation
warp mcp run supabase "execute_sql SELECT create_or_get_conversation('friend-uuid');"

# Test message sending
warp mcp run supabase "execute_sql SELECT send_message('conv-id', 'Test', 'text');"

# Query messages
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE conversation_id = 'conv-id';"

# Test read receipts
warp mcp run supabase "execute_sql SELECT mark_message_as_read('msg-id');"
```

### Context7 MCP
```bash
# Analyze service patterns
warp mcp run context7 "analyze messagingService.ts and suggest optimizations"

# Review error handling
warp mcp run context7 "review messagingService.ts error handling patterns"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 3 days  
**Risk Level:** Low (well-defined database functions exist)
