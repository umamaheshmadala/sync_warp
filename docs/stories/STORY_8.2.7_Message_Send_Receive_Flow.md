# 🔄 STORY 8.2.7: Message Send/Receive Flow

**Parent Epic:** [EPIC 8.2 - Core 1:1 Messaging Implementation](../epics/EPIC_8.2_Core_Messaging_Implementation.md)  
**Story Owner:** Frontend Engineering / QA  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement **end-to-end message sending and receiving flow** with optimistic UI updates, failure handling, retry mechanisms, read receipts, and comprehensive E2E testing using Puppeteer MCP.

---

## 📖 **User Stories**

### As a user, I want to:
1. See my message appear immediately when I send it (optimistic UI)
2. See a sending indicator if message is still being sent
3. See a retry option if message fails to send
4. Have messages automatically marked as read when I view them
5. See read receipts (checkmarks) for my sent messages
6. Receive new messages instantly via realtime subscriptions

### Acceptance Criteria:
- ✅ Messages send reliably (< 300ms)
- ✅ Optimistic UI prevents perceived lag
- ✅ Failed messages show retry option
- ✅ Read receipts update in realtime
- ✅ E2E tests verify complete flow

---

## 🧩 **Implementation Tasks**

### **Phase 1: Optimistic UI Updates** (0.5 days)

#### Task 1.1: Add Optimistic Message to Store
```typescript
// Enhance messagingStore with optimistic updates
interface Message {
  // ... existing fields
  _optimistic?: boolean
  _failed?: boolean
  _tempId?: string
}

// Add optimistic message action
addOptimisticMessage: (conversationId: string, tempMessage: Message) => 
  set((state) => {
    const newMessages = new Map(state.messages)
    const conversationMessages = newMessages.get(conversationId) || []
    newMessages.set(conversationId, [...conversationMessages, tempMessage])
    return { messages: newMessages }
  }, false, 'addOptimisticMessage'),

// Replace optimistic with real message
replaceOptimisticMessage: (conversationId: string, tempId: string, realMessage: Message) =>
  set((state) => {
    const newMessages = new Map(state.messages)
    const conversationMessages = newMessages.get(conversationId) || []
    newMessages.set(
      conversationId,
      conversationMessages.map(msg => 
        msg._tempId === tempId ? realMessage : msg
      )
    )
    return { messages: newMessages }
  }, false, 'replaceOptimisticMessage'),

// Mark message as failed
markMessageFailed: (conversationId: string, tempId: string) =>
  set((state) => {
    const newMessages = new Map(state.messages)
    const conversationMessages = newMessages.get(conversationId) || []
    newMessages.set(
      conversationId,
      conversationMessages.map(msg =>
        msg._tempId === tempId ? { ...msg, _failed: true } : msg
      )
    )
    return { messages: newMessages }
  }, false, 'markMessageFailed'),
```

---

#### Task 1.2: Update MessageComposer with Optimistic Sending
```typescript
// src/components/messaging/MessageComposer.tsx (enhanced)
const handleSend = async () => {
  if (!content.trim() || isSending) return

  const tempId = `temp-${Date.now()}-${Math.random()}`
  const optimisticMessage: Message = {
    id: tempId,
    _tempId: tempId,
    _optimistic: true,
    conversation_id: conversationId,
    sender_id: currentUserId!,
    content: content.trim(),
    type: 'text',
    is_edited: false,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Add optimistic message immediately
  addOptimisticMessage(conversationId, optimisticMessage)
  setContent('')

  try {
    // Send actual message
    const realMessageId = await sendMessage({
      conversationId,
      content: optimisticMessage.content,
      type: 'text'
    })

    // Replace optimistic with real message
    // Real message will come via realtime subscription
  } catch (error) {
    // Mark as failed
    markMessageFailed(conversationId, tempId)
    toast.error('Message failed to send. Tap to retry.')
  }
}
```

---

### **Phase 2: Retry Failed Messages** (0.5 days)

#### Task 2.1: Add Retry Functionality
```typescript
// src/components/messaging/MessageBubble.tsx (enhanced)
export function MessageBubble({ message, isOwn, onRetry }: MessageBubbleProps) {
  // ...existing code

  if (message._failed) {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-[70%] px-4 py-2 rounded-lg bg-red-100 border border-red-300">
          <p className="text-sm text-red-900">{message.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-red-600">Failed to send</span>
            <button
              onClick={() => onRetry?.(message)}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show sending indicator for optimistic messages
  if (message._optimistic) {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-[70%] px-4 py-2 rounded-lg bg-blue-500 text-white opacity-70">
          <p className="text-sm">{message.content}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <Clock className="h-3 w-3 animate-spin" />
            <span className="text-xs">Sending...</span>
          </div>
        </div>
      </div>
    )
  }

  // ...rest of component
}
```

---

### **Phase 3: Read Receipts** (0.5 days)

#### Task 3.1: Show Read Receipt Icons
```typescript
// Enhanced MessageBubble with read receipts
const getStatusIcon = () => {
  if (message._optimistic) {
    return <Clock className="h-3 w-3" />
  }
  
  // Check if message has been read
  // This data would come from message_read_receipts table
  if (message.read_by_recipient) {
    return <CheckCheck className="h-3 w-3 text-blue-300" />
  }
  
  // Message delivered but not read
  return <Check className="h-3 w-3 text-blue-300" />
}

// Inside render
{isOwn && (
  <div className="flex items-center gap-1">
    {getStatusIcon()}
  </div>
)}
```

---

### **Phase 4: E2E Testing with Puppeteer MCP** (0.5 days)

#### Task 4.1: Create E2E Test Scenarios
```bash
# Test complete send/receive flow
warp mcp run puppeteer "e2e test: User A sends message to User B, verify User B receives it instantly"
```

**Test Script Example:**
```typescript
// e2e-messaging.test.ts
describe('Messaging E2E Flow', () => {
  test('should send and receive messages between two users', async () => {
    // Open two browser instances
    const browser1 = await puppeteer.launch()
    const browser2 = await puppeteer.launch()
    
    const page1 = await browser1.newPage()
    const page2 = await browser2.newPage()
    
    // User A logs in
    await page1.goto('http://localhost:5173/login')
    await page1.type('#email', 'usera@test.com')
    await page1.type('#password', 'password123')
    await page1.click('#login-button')
    await page1.waitForNavigation()
    
    // User B logs in
    await page2.goto('http://localhost:5173/login')
    await page2.type('#email', 'userb@test.com')
    await page2.type('#password', 'password123')
    await page2.click('#login-button')
    await page2.waitForNavigation()
    
    // User A opens chat with User B
    await page1.goto('http://localhost:5173/messages/conv-id')
    
    // User B opens same chat
    await page2.goto('http://localhost:5173/messages/conv-id')
    
    // User A sends message
    await page1.type('[data-testid="message-input"]', 'Hello from User A!')
    await page1.click('[data-testid="send-button"]')
    
    // Verify message appears for User A immediately (optimistic)
    await page1.waitForSelector('[data-testid="message"]:last-child')
    
    // Verify message appears for User B (realtime)
    await page2.waitForSelector('[data-testid="message"]:last-child', { timeout: 2000 })
    const messageText = await page2.$eval('[data-testid="message"]:last-child', el => el.textContent)
    expect(messageText).toContain('Hello from User A!')
    
    await browser1.close()
    await browser2.close()
  })
})
```

**🤖 Puppeteer MCP Testing Commands:**
```bash
# Test message send flow
warp mcp run puppeteer "test sending message and verify optimistic UI update"

# Test realtime delivery
warp mcp run puppeteer "test two browsers, send message from A, verify B receives within 500ms"

# Test retry mechanism
warp mcp run puppeteer "simulate network failure, verify retry button appears and works"

# Test read receipts
warp mcp run puppeteer "send message, verify read receipt updates when recipient views it"
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test optimistic message addition
- [ ] Test optimistic message replacement
- [ ] Test failed message marking
- [ ] Test retry mechanism
- [ ] Test read receipt logic

### Integration Tests
```bash
# Test with Supabase MCP
warp mcp run supabase "execute_sql INSERT INTO messages (...); SELECT * FROM messages WHERE id = 'msg-id';"
```

### E2E Tests with Puppeteer MCP
- [ ] Send message flow (optimistic + realtime)
- [ ] Receive message flow (realtime subscription)
- [ ] Failed message + retry flow
- [ ] Read receipt update flow
- [ ] Two-user realtime messaging test

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Message Send Latency** | < 300ms | Chrome DevTools Network |
| **Optimistic UI Speed** | Instant (< 16ms) | Manual observation |
| **Realtime Delivery** | < 500ms | Puppeteer E2E test |
| **Retry Success Rate** | > 95% | E2E tests |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ Stories 8.2.1-8.2.6 complete
- ✅ Puppeteer MCP configured

---

## 📦 **Deliverables**

1. ✅ Optimistic UI implementation
2. ✅ Retry mechanism for failed messages
3. ✅ Read receipt indicators
4. ✅ E2E test suite with Puppeteer MCP
5. ✅ Test coverage report

---

## 🔄 **Next Story**

➡️ [STORY 8.2.8: Polish & Accessibility](./STORY_8.2.8_Polish_Accessibility.md)

---

## 📝 **MCP Command Quick Reference**

### Puppeteer MCP
```bash
# E2E message flow
warp mcp run puppeteer "test complete send/receive flow between two users"

# Test retry
warp mcp run puppeteer "simulate network failure and test retry mechanism"

# Test read receipts
warp mcp run puppeteer "test read receipt updates in realtime"
```

### Supabase MCP
```bash
# Verify message in database
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE id = 'msg-id';"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 2 days  
**Risk Level:** Medium (realtime synchronization complexity)
