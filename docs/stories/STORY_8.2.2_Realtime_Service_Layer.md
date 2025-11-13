# 📡 STORY 8.2.2: Realtime Service Layer

**Parent Epic:** [EPIC 8.2 - Core 1:1 Messaging Implementation](../epics/EPIC_8.2_Core_Messaging_Implementation.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 3 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement the **realtime service layer** (`realtimeService.ts`) to manage all Supabase Realtime subscriptions for live message delivery, typing indicators, presence tracking, and conversation list updates. This service ensures users receive instant notifications of new messages and status changes.

---

## 📖 **User Stories**

### As a user, I want:
1. To receive new messages instantly without refreshing the page
2. To see when someone is typing in real-time
3. To know when friends are online/offline
4. To see my conversation list update automatically when new messages arrive

### Acceptance Criteria:
- ✅ New messages appear within < 300ms of being sent
- ✅ Typing indicators show/hide correctly
- ✅ Presence status updates reliably
- ✅ WebSocket connections handle network interruptions gracefully
- ✅ Channels clean up properly on unmount

---

## 🧩 **Implementation Tasks**

### **Phase 1: Core Realtime Service Setup** (1 day)

#### Task 1.1: Create Realtime Service Class
```typescript
// src/services/realtimeService.ts
import { supabase } from '../lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Message } from '../types/messaging'

type MessageCallback = (message: Message) => void
type TypingCallback = (userId: string, isTyping: boolean) => void
type PresenceCallback = (userId: string, isOnline: boolean) => void

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()

  // Channel management methods will go here
}

export const realtimeService = new RealtimeService()
```

**🛢 MCP Integration:**
```bash
# Verify realtime is enabled on messages table
warp mcp run supabase "execute_sql SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"

# Check if messages table is published
warp mcp run supabase "execute_sql SELECT * FROM pg_publication_tables WHERE tablename = 'messages';"
```

---

#### Task 1.2: Implement Message Subscription
```typescript
/**
 * Subscribe to new messages in a conversation
 */
subscribeToMessages(
  conversationId: string, 
  onNewMessage: MessageCallback
): () => void {
  const channelName = `messages:${conversationId}`
  
  // Remove existing subscription if any
  this.unsubscribe(channelName)
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        console.log('📨 New message received:', payload.new)
        onNewMessage(payload.new as Message)
      }
    )
    .subscribe((status) => {
      console.log('🔔 Message subscription status:', status)
    })
  
  this.channels.set(channelName, channel)
  
  // Return unsubscribe function
  return () => this.unsubscribe(channelName)
}
```

**🛢 MCP Testing:**
```bash
# Test realtime message insertion
warp mcp run supabase "execute_sql INSERT INTO messages (conversation_id, sender_id, content, type) VALUES ('test-conv-id', auth.uid(), 'Test realtime message', 'text');"

# Verify message was inserted
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE content = 'Test realtime message';"
```

**🌐 Chrome DevTools MCP Testing:**
```bash
# Monitor WebSocket connection
warp mcp run chrome-devtools "open DevTools Network tab, filter by WS, observe realtime connection when chat opens"
```

---

#### Task 1.3: Implement Message Update Subscription
```typescript
/**
 * Subscribe to message updates (edits, deletions, read receipts)
 */
subscribeToMessageUpdates(
  conversationId: string,
  onMessageUpdate: MessageCallback
): () => void {
  const channelName = `message-updates:${conversationId}`
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        console.log('✏️ Message updated:', payload.new)
        onMessageUpdate(payload.new as Message)
      }
    )
    .subscribe()
  
  this.channels.set(channelName, channel)
  
  return () => this.unsubscribe(channelName)
}
```

**🛢 MCP Testing:**
```bash
# Test message update
warp mcp run supabase "execute_sql UPDATE messages SET content = 'Edited content', is_edited = true WHERE id = 'msg-id';"
```

---

### **Phase 2: Typing Indicators & Presence** (1 day)

#### Task 2.1: Implement Typing Indicator Subscription
```typescript
/**
 * Subscribe to typing indicators using Realtime broadcast
 */
subscribeToTyping(
  conversationId: string,
  onTypingChange: TypingCallback
): () => void {
  const channelName = `typing:${conversationId}`
  
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'typing' }, (payload) => {
      const { userId, isTyping } = payload.payload
      console.log('⌨️ Typing indicator:', userId, isTyping)
      onTypingChange(userId, isTyping)
    })
    .subscribe()
  
  this.channels.set(channelName, channel)
  
  return () => this.unsubscribe(channelName)
}
```

---

#### Task 2.2: Implement Broadcast Typing
```typescript
/**
 * Broadcast typing indicator to other participants
 */
async broadcastTyping(conversationId: string, isTyping: boolean): Promise<void> {
  const channelName = `typing:${conversationId}`
  const channel = this.channels.get(channelName)
  
  if (channel) {
    const user = (await supabase.auth.getUser()).data.user
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user?.id, isTyping }
    })
  }
}
```

**🛢 MCP Testing:**
```bash
# Test typing broadcast (requires two browser instances)
# Instance 1: Subscribe to typing channel
# Instance 2: Broadcast typing event
# Verify Instance 1 receives the broadcast
```

**🌐 Chrome DevTools MCP:**
```bash
# Monitor broadcast messages in Network tab
warp mcp run chrome-devtools "open DevTools, Network tab, filter WebSocket frames, observe typing broadcasts"
```

---

#### Task 2.3: Implement Presence Tracking
```typescript
/**
 * Subscribe to user presence (online/offline)
 */
subscribeToPresence(
  conversationId: string,
  onPresenceChange: PresenceCallback
): () => void {
  const channelName = `presence:${conversationId}`
  
  const channel = supabase
    .channel(channelName)
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      console.log('👥 Presence sync:', state)
      
      // Notify about each user's presence
      Object.entries(state).forEach(([userId, presences]) => {
        const isOnline = presences.length > 0
        onPresenceChange(userId, isOnline)
      })
    })
    .on('presence', { event: 'join' }, ({ key }) => {
      console.log('✅ User joined:', key)
      onPresenceChange(key, true)
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      console.log('❌ User left:', key)
      onPresenceChange(key, false)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const user = (await supabase.auth.getUser()).data.user
        await channel.track({
          user_id: user?.id,
          online_at: new Date().toISOString()
        })
      }
    })
  
  this.channels.set(channelName, channel)
  
  return () => this.unsubscribe(channelName)
}
```

**🧠 Context7 MCP Analysis:**
```bash
# Analyze presence tracking logic
warp mcp run context7 "analyze subscribeToPresence and identify potential race conditions with channel cleanup"
```

---

### **Phase 3: Conversation List Updates** (0.5 days)

#### Task 3.1: Subscribe to Conversation Updates
```typescript
/**
 * Subscribe to conversation list updates
 */
subscribeToConversations(onUpdate: () => void): () => void {
  const channelName = 'user-conversations'
  
  // Subscribe to both conversations and messages tables
  // (new conversations and new messages trigger conversation list updates)
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      () => {
        console.log('🔄 Conversations updated')
        onUpdate()
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => {
        console.log('🔄 New message (updating conversation list)')
        onUpdate()
      }
    )
    .subscribe()
  
  this.channels.set(channelName, channel)
  
  return () => this.unsubscribe(channelName)
}
```

**🛢 MCP Testing:**
```bash
# Test conversation list update
warp mcp run supabase "execute_sql INSERT INTO messages (conversation_id, sender_id, content, type) VALUES ('conv-id', auth.uid(), 'New message', 'text');"

# Verify conversation_list view is updated
warp mcp run supabase "execute_sql SELECT * FROM conversation_list WHERE conversation_id = 'conv-id';"
```

---

### **Phase 4: Channel Cleanup & Error Handling** (0.5 days)

#### Task 4.1: Implement Unsubscribe Logic
```typescript
/**
 * Unsubscribe from a channel
 */
private async unsubscribe(channelName: string): Promise<void> {
  const channel = this.channels.get(channelName)
  if (channel) {
    await supabase.removeChannel(channel)
    this.channels.delete(channelName)
    console.log('🔌 Unsubscribed from:', channelName)
  }
}

/**
 * Cleanup all subscriptions
 */
async cleanup(): Promise<void> {
  console.log('🧹 Cleaning up all Realtime subscriptions')
  const channelNames = Array.from(this.channels.keys())
  await Promise.all(channelNames.map(name => this.unsubscribe(name)))
}
```

**🧠 Context7 MCP:**
```bash
# Check for memory leaks
warp mcp run context7 "analyze realtimeService cleanup methods and identify potential memory leaks with channel references"
```

---

#### Task 4.2: Add Reconnection Handling
```typescript
/**
 * Monitor connection status and handle reconnections
 */
monitorConnectionStatus(onStatusChange: (status: string) => void): () => void {
  const channel = supabase.channel('connection-monitor')
    .subscribe((status) => {
      console.log('📡 Connection status:', status)
      onStatusChange(status)
      
      // Handle reconnection
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime connection established')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime connection error')
        // Reconnection is automatic with Supabase
      } else if (status === 'TIMED_OUT') {
        console.warn('⏱️ Realtime connection timed out')
      }
    })
  
  this.channels.set('connection-monitor', channel)
  
  return () => this.unsubscribe('connection-monitor')
}
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test `subscribeToMessages` creates channel correctly
- [ ] Test `subscribeToMessageUpdates` handles updates
- [ ] Test `subscribeToTyping` receives broadcast events
- [ ] Test `broadcastTyping` sends correct payload
- [ ] Test `subscribeToPresence` tracks user joins/leaves
- [ ] Test `subscribeToConversations` triggers on message insert
- [ ] Test `unsubscribe` removes channel from map
- [ ] Test `cleanup` removes all channels

### Integration Tests with Supabase MCP
```bash
# Test end-to-end realtime flow
warp mcp run supabase "execute_sql 
  -- Enable realtime on messages table (if not already)
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  
  -- Insert test message
  INSERT INTO messages (conversation_id, sender_id, content, type) 
  VALUES ('test-conv', auth.uid(), 'Realtime test', 'text');
  
  -- Verify message appears
  SELECT * FROM messages WHERE content = 'Realtime test';
"
```

### E2E Tests with Chrome DevTools MCP
```bash
# Monitor WebSocket connection health
warp mcp run chrome-devtools "open http://localhost:5173/messages/conv-123, monitor WebSocket connection, send message, verify realtime delivery"
```

### Performance Tests with Context7 MCP
```bash
# Analyze subscription performance
warp mcp run context7 "analyze realtimeService and identify performance bottlenecks with multiple active subscriptions"
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Message Delivery Latency** | < 300ms | Chrome DevTools Network timing |
| **Typing Indicator Latency** | < 100ms | Browser to browser test |
| **Presence Update Latency** | < 500ms | Monitor presence events |
| **Reconnection Time** | < 3 seconds | Simulate network drop |
| **Memory Leaks** | Zero | Context7 analysis + Chrome DevTools Memory Profiler |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ Supabase Realtime must be enabled on project
- ✅ Messages table must be added to `supabase_realtime` publication
- ✅ `messagingService.ts` must be complete (Story 8.2.1)

### Verify Dependencies with MCP:
```bash
# Check realtime publication
warp mcp run supabase "execute_sql SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('messages', 'conversations');"

# Check Supabase project realtime status
warp mcp run supabase "get_project project_id"
```

---

## 📦 **Deliverables**

1. ✅ `src/services/realtimeService.ts` - Complete service
2. ✅ `src/services/__tests__/realtimeService.test.ts` - Unit tests
3. ✅ Documentation with MCP testing commands
4. ✅ WebSocket monitoring guide with Chrome DevTools MCP

---

## 🔄 **Next Story**

➡️ [STORY 8.2.3: Zustand State Management](./STORY_8.2.3_Zustand_State_Management.md)

---

## 📝 **MCP Command Quick Reference**

### Supabase MCP
```bash
# Test message insertion (triggers realtime)
warp mcp run supabase "execute_sql INSERT INTO messages (conversation_id, sender_id, content, type) VALUES ('conv-id', auth.uid(), 'Test', 'text');"

# Check realtime publication
warp mcp run supabase "execute_sql SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```

### Chrome DevTools MCP
```bash
# Monitor WebSocket
warp mcp run chrome-devtools "open DevTools Network tab, filter WS, observe realtime messages"

# Profile memory
warp mcp run chrome-devtools "open DevTools Memory tab, take heap snapshot, check for channel leaks"
```

### Context7 MCP
```bash
# Analyze realtime patterns
warp mcp run context7 "analyze realtimeService.ts subscription patterns and suggest improvements"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 3 days  
**Risk Level:** Medium (WebSocket stability depends on network)
