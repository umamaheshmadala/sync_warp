# 🧪 EPIC 8.8: Testing & Quality Assurance

**Epic Owner:** QA Engineering / Full Team  
**Dependencies:** ALL previous epics (8.1-8.7)  
**Timeline:** Weeks 10-11 (2 weeks)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Ensure **bullet-proof quality** of the messaging system through comprehensive testing:
- **Unit tests** for all services/hooks
- **Integration tests** for RLS policies, API endpoints
- **E2E tests** with Puppeteer MCP for critical user flows
- **Load testing** (optional for MVP)
- Achieve **> 85% code coverage**

---

## ✅ **Success Criteria**

| Objective | Target |
|-----------|--------|
| **Code Coverage** | > 85% |
| **Unit Test Pass Rate** | 100% |
| **Integration Test Pass Rate** | 100% |
| **E2E Test Pass Rate** | 100% |
|| **Critical Bugs** | 0 |

---

## 🎯 **MCP Integration Strategy**

**This epic follows the global MCP routing rule** (`rule:yCm2e9oHOnrU5qbhrGa2IE`) to maximize development efficiency:

### **Primary MCP Servers Used:**

1. **🤖 Puppeteer MCP** (Heavy usage)
   - Automate all E2E test flows
   - Test critical user journeys end-to-end
   - Verify cross-browser compatibility
   - Generate screenshots for test documentation
   - Record test execution videos

2. **🛢 Supabase MCP** (Heavy usage)
   - Test all RLS policies with different user contexts
   - Verify edge function behavior under load
   - Test database triggers and constraints
   - Monitor query performance during tests
   - Execute integration test SQL scripts

3. **🧠 Context7 MCP** (Heavy usage)
   - Analyze test coverage gaps
   - Suggest additional test scenarios
   - Review test architecture and patterns
   - Find untested edge cases
   - Optimize test performance

4. **🌐 Chrome DevTools MCP** (Medium usage)
   - Debug failing E2E tests
   - Monitor network requests during tests
   - Profile test execution performance
   - Capture console errors during tests

5. **🎨 Shadcn MCP** (Low usage)
   - Scaffold test utility components
   - Generate mock data providers

**🔄 Automatic Routing:** Per global MCP rule, commands automatically route to appropriate servers based on keywords:
- e2e/automated test → Puppeteer MCP
- SQL/RLS/database test → Supabase MCP
- explain/analyze/coverage → Context7 MCP
- inspect/debug test → Chrome DevTools MCP

**📖 Each story below includes specific MCP commands for implementation.**

---

## 🧩 **Testing Pyramid**

```
       /\
      /E2E\        5-10 tests (critical flows)
     /------\
    /INTEG  \      20-30 tests (RLS, API)
   /----------\
  /   UNIT     \   50+ tests (services, hooks)
 /--------------\
```

---

## 📋 **1. Unit Tests (Vitest + React Testing Library)**

### **1.1 Service Tests**

**File:** `src/services/__tests__/messagingService.test.ts`

```typescript
// src/services/__tests__/messagingService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { messagingService } from '../messagingService'
import { supabase } from '../../lib/supabase'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } }
      }))
    }
  }
}))

describe('messagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends a text message successfully', async () => {
    // Arrange
    const mockInsert = vi.fn().mockResolvedValue({
      data: {
        id: 'msg-123',
        content: 'Hello!',
        sender_id: 'test-user-id',
        conversation_id: 'conv-123',
        type: 'text',
        created_at: new Date().toISOString()
      },
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null })
    } as any)

    // Act
    const message = await messagingService.sendMessage({
      conversationId: 'conv-123',
      content: 'Hello!',
      type: 'text'
    })

    // Assert
    expect(message.id).toBe('msg-123')
    expect(message.content).toBe('Hello!')
    expect(mockInsert).toHaveBeenCalledWith({
      conversation_id: 'conv-123',
      sender_id: 'test-user-id',
      content: 'Hello!',
      type: 'text',
      media_urls: null,
      link_preview: null
    })
  })

  it('throws error when message send fails', async () => {
    // Arrange
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })
    } as any)

    // Act & Assert
    await expect(
      messagingService.sendMessage({
        conversationId: 'conv-123',
        content: 'Hello!',
        type: 'text'
      })
    ).rejects.toThrow('Database error')
  })
})
```

**🧠 MCP Integration:**
```bash
# Analyze test coverage with Context7
warp mcp run context7 "explain test coverage gaps in messagingService"
```

---

### **1.2 Hook Tests**

**File:** `src/hooks/__tests__/useMessages.test.ts`

```typescript
// src/hooks/__tests__/useMessages.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useMessages } from '../useMessages'
import { messagingService } from '../../services/messagingService'

vi.mock('../../services/messagingService')

describe('useMessages', () => {
  it('fetches messages on mount', async () => {
    // Arrange
    const mockMessages = [
      { id: 'msg-1', content: 'Hello', sender_id: 'user-1' },
      { id: 'msg-2', content: 'Hi', sender_id: 'user-2' }
    ]
    vi.mocked(messagingService.getMessages).mockResolvedValue(mockMessages)

    // Act
    const { result } = renderHook(() => useMessages('conv-123'))

    // Assert
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].content).toBe('Hello')
    })
  })

  it('handles pagination correctly', async () => {
    // Implementation...
  })
})
```

---

## 📋 **2. Integration Tests (Supabase RLS + APIs)**

### **2.1 RLS Policy Tests**

**File:** `tests/integration/rls-policies.test.ts`

```typescript
// tests/integration/rls-policies.test.ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

describe('RLS Policies - Messages Table', () => {
  it('prevents users from reading messages in conversations they are not part of', async () => {
    // Create client as user A
    const userAClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    })

    // Sign in as user A
    await userAClient.auth.signInWithPassword({
      email: 'user-a@test.com',
      password: 'password123'
    })

    // Try to read messages from conversation user A is NOT in
    const { data, error } = await userAClient
      .from('messages')
      .select('*')
      .eq('conversation_id', 'conv-user-b-only')

    // Assert: Should return empty array or error
    expect(data).toEqual([])
  })

  it('allows users to read messages in conversations they are part of', async () => {
    // Similar test for positive case
  })

  it('prevents blocked users from sending messages', async () => {
    // Test blocked_users RLS policy
  })
})
```

**🛢 MCP Integration:**
```bash
# Test RLS policies directly via Supabase MCP
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE conversation_id = 'conv-123' AS user_id = 'test-user-id';"
```

---

### **2.2 API Endpoint Tests**

**File:** `tests/integration/api-endpoints.test.ts`

```typescript
// tests/integration/api-endpoints.test.ts
import { describe, it, expect } from 'vitest'
import { messagingService } from '../../src/services/messagingService'

describe('Messaging API Endpoints', () => {
  it('creates a new conversation successfully', async () => {
    const conversation = await messagingService.createOrGetConversation(['user-1', 'user-2'])
    
    expect(conversation).toHaveProperty('id')
    expect(conversation.participants).toContain('user-1')
    expect(conversation.participants).toContain('user-2')
  })

  it('fetches unread message count accurately', async () => {
    const count = await messagingService.getUnreadCount()
    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
```

---

## 📋 **3. E2E Tests (Puppeteer MCP)**

### **3.1 Critical User Flows**

**Test 1: Send and Receive Message**
```bash
warp mcp run puppeteer "e2e test send message: 
1. Login as user A
2. Open conversation with user B
3. Type 'Hello from E2E test' and send
4. Verify message appears in conversation
5. Login as user B
6. Verify message received"
```

**Test 2: Edit Message Within 15 Minutes**
```bash
warp mcp run puppeteer "e2e test edit message:
1. Login and send a message
2. Click edit button within 15 minutes
3. Change content to 'Edited message'
4. Verify 'Edited' badge appears"
```

**Test 3: Block User Flow**
```bash
warp mcp run puppeteer "e2e test block user:
1. Login as user A
2. Open conversation with user B
3. Block user B
4. Verify user B no longer appears in conversations
5. Try to send message (should fail)"
```

**Test 4: Offline Message Queue**
```bash
warp mcp run puppeteer "e2e test offline mode:
1. Login and open conversation
2. Simulate offline (network throttle to offline)
3. Send 3 messages
4. Verify messages queued
5. Go back online
6. Verify all 3 messages sync successfully"
```

**Test 5: Image Upload**
```bash
warp mcp run puppeteer "e2e test image upload:
1. Login and open conversation
2. Click image upload button
3. Select test image (5MB)
4. Verify compression and thumbnail generation
5. Verify image appears in message"
```

**🤖 MCP Integration:**
```bash
# Run all E2E tests sequentially
warp mcp run puppeteer "run all e2e tests for messaging module"
```

---

## 📋 **4. Load Testing (Optional for MVP)**

### **4.1 Concurrent User Simulation**

**Tool:** k6 or Artillery

**File:** `tests/load/messaging-load.js`

```javascript
// tests/load/messaging-load.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 }     // Ramp down
  ]
}

export default function () {
  // Simulate user sending a message
  const payload = JSON.stringify({
    conversation_id: 'conv-load-test',
    content: `Load test message ${Date.now()}`,
    type: 'text'
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.SUPABASE_TOKEN}`
    }
  }

  const res = http.post(
    `${__ENV.SUPABASE_URL}/rest/v1/messages`,
    payload,
    params
  )

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500
  })

  sleep(1)
}
```

**Run Load Test:**
```bash
k6 run tests/load/messaging-load.js
```

---

## 📋 **5. Manual Testing Checklist**

### **5.1 Device Testing**

- [ ] **Android Phone** (Samsung Galaxy S21)
  - [ ] Send message
  - [ ] Receive push notification
  - [ ] Upload image
  - [ ] Block user
  - [ ] Go offline/online

- [ ] **iPhone** (iPhone 13)
  - [ ] Send message
  - [ ] Receive push notification
  - [ ] Upload image
  - [ ] Block user
  - [ ] Go offline/online

- [ ] **Web Browser** (Chrome, Firefox, Safari)
  - [ ] All core messaging features
  - [ ] Responsive layout

### **5.2 Accessibility Testing**

- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Color contrast (WCAG AA)
- [ ] Touch target sizes (min 44x44px)

---

## 📋 **6. Test Execution Plan**

### **Week 10**
| Day | Task | MCP Used |
|-----|------|----------|
| Mon | Write unit tests for all services | Context7 (coverage analysis) |
| Tue | Write unit tests for all hooks | - |
| Wed | Write integration tests for RLS policies | Supabase MCP |
| Thu | Write integration tests for API endpoints | Supabase MCP |
| Fri | Write E2E test suite (5 critical flows) | Puppeteer MCP |

### **Week 11**
| Day | Task | MCP Used |
|-----|------|----------|
| Mon | Run all tests, fix failing tests | - |
| Tue | Device testing (Android + iOS) | - |
| Wed | Bug fixing and regression testing | Chrome DevTools MCP |
| Thu | Load testing (if time permits) | - |
| Fri | Final QA sign-off | - |

---

## 🧪 **MCP Testing Commands**

### **Supabase MCP Tests**
```bash
# Test database functions
warp mcp run supabase "execute_sql SELECT mark_message_as_read('msg-123', 'user-id');"

# Test RLS policies
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE conversation_id = 'conv-123' AS 'test-user-id';"

# Verify migrations applied
warp mcp run supabase "list_migrations"
```

### **Puppeteer MCP Tests**
```bash
# Run single E2E test
warp mcp run puppeteer "e2e test send message flow"

# Run all E2E tests
warp mcp run puppeteer "run all messaging e2e tests"

# Debug failing test with screenshots
warp mcp run puppeteer "e2e test block user with screenshots enabled"
```

### **Chrome DevTools MCP Tests**
```bash
# Debug network issues
warp mcp run chrome-devtools "open devtools and monitor network tab while sending message"

# Check for console errors
warp mcp run chrome-devtools "open devtools and check console for errors"
```

### **Context7 MCP Tests**
```bash
# Analyze test coverage
warp mcp run context7 "analyze test coverage for messagingService"

# Find untested code paths
warp mcp run context7 "find untested functions in messaging module"
```

---

## 📊 **Test Reporting**

**Tool:** Vitest UI + Codecov

```json
// vitest.config.ts
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**']
    }
  }
}
```

**Generate Coverage Report:**
```bash
npm run test:coverage
```

**View Coverage:**
```bash
open coverage/index.html
```

---

## 📋 **Story Breakdown**

### **Story 8.8.1: Unit Tests** (3 days)
- [ ] Write tests for all 6 services
- [ ] Write tests for all 6 hooks
- [ ] Achieve > 85% coverage
- **🧠 MCP**: Use Context7 to find untested code

### **Story 8.8.2: Integration Tests** (2 days)
- [ ] Test all RLS policies (10+ tests)
- [ ] Test all API endpoints (10+ tests)
- **🛢 MCP**: Use Supabase MCP for RLS testing

### **Story 8.8.3: E2E Tests** (3 days)
- [ ] Write 5 critical flow tests
- [ ] Run on real devices
- **🤖 MCP**: Use Puppeteer MCP for E2E

### **Story 8.8.4: Bug Fixing** (2 days)
- [ ] Fix all failing tests
- [ ] Regression testing
- **🌐 MCP**: Use Chrome DevTools for debugging

### **Story 8.8.5: QA Sign-off** (1 day)
- [ ] Final review of all tests
- [ ] Sign-off from QA team
- [ ] Update documentation

---

## ✅ **Definition of Done**

- [x] All unit tests passing (> 85% coverage)
- [x] All integration tests passing
- [x] All E2E tests passing (5 critical flows)
- [x] Manual testing completed on Android + iOS
- [x] Zero critical bugs
- [x] Test documentation complete
- [x] QA team sign-off

---

## 🎉 **Messaging Module Complete!**

After completing Epic 8.8, the entire **SynC Messaging Module** will be production-ready with:
- ✅ Robust database with RLS
- ✅ Real-time messaging
- ✅ Offline support
- ✅ Media attachments
- ✅ Advanced features (edit/delete/search/reactions)
- ✅ Push notifications
- ✅ Safety & moderation
- ✅ Comprehensive testing

**Total Timeline:** 11 weeks (as planned!)

---

**Congratulations!** 🚀 You're ready to ship the messaging feature!
