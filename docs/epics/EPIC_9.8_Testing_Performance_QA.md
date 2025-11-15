# ✅ EPIC 9.8: Testing, Performance & QA

**Epic Owner:** QA / Engineering  
**Stakeholders:** QA, Engineering, Product, DevOps  
**Dependencies:** All previous epics (9.1-9.7)  
**Timeline:** Week 9 (1 week)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Ensure the Friends Module is **production-ready** with:
- Comprehensive test coverage (unit, integration, E2E)
- Performance benchmarks meeting targets
- Security audit (RLS policies, data leaks)
- Load testing (1000+ friends per user)
- Cross-platform testing (Web, iOS, Android)

---

## 🎯 **MCP Integration Strategy**

1. **🤖 Puppeteer MCP** (Heavy) - E2E testing automation
2. **🛢 Supabase MCP** (Heavy) - RLS testing, load testing
3. **🧠 Context7 MCP** (Medium) - Code coverage analysis

---

## ✅ **Success Criteria**

| Objective | Target |
|-----------|--------|
| **Unit Test Coverage** | > 80% |
| **Integration Test Coverage** | > 70% |
| **E2E Test Pass Rate** | 100% |
| **Performance (Friend List)** | < 300ms |
| **Performance (Search)** | < 50ms |
| **Performance (PYMK)** | < 100ms |
| **RLS Security** | Zero data leaks |
| **Lighthouse Score** | > 90 |
| **Load Test (1000 friends)** | No errors |

---

## 🗂️ **Stories**

### **STORY 9.8.1: Unit Tests (Services, Hooks, Functions)** ⏱️ 2 days
**Priority:** 🔴 Critical

**Acceptance Criteria:**
- [ ] 80%+ coverage for `friendsService.ts`
- [ ] 80%+ coverage for all React hooks
- [ ] 100% coverage for database functions
- [ ] Vitest + React Testing Library
- [ ] Mock Supabase client

**Test Example:**
```typescript
// __tests__/services/friendsService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { sendFriendRequest } from '@/services/friendsService';

describe('friendsService', () => {
  it('should send friend request successfully', async () => {
    const mockSupabase = vi.mocked(supabase);
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const result = await sendFriendRequest('user-123');
    expect(result.success).toBe(true);
  });

  it('should handle duplicate friend request error', async () => {
    // ... test duplicate handling
  });
});
```

**MCP Commands:**
```bash
# Run tests with coverage
npm run test:coverage

# Analyze coverage gaps
warp mcp run context7 "find untested functions in src/services/friendsService.ts"
```

---

### **STORY 9.8.2: Integration Tests (Friend Request Flow)** ⏱️ 1 day
**Priority:** 🔴 Critical

**Acceptance Criteria:**
- [ ] Test: Send friend request → Receive → Accept → Bidirectional friendship created
- [ ] Test: Send request → Reject → Status updated
- [ ] Test: Block user → Friendship + follows removed
- [ ] Test with real Supabase (test database)

---

### **STORY 9.8.3: E2E Tests (Puppeteer)** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🤖 Puppeteer MCP

**Acceptance Criteria:**
- [ ] Complete user journey:
  1. Signup → Search friends → Send request
  2. Receive request → Accept → Message friend
  3. Block user → Unblock → Verify visibility
- [ ] Cross-browser: Chrome, Firefox, Safari
- [ ] Mobile viewports (iOS, Android screen sizes)

**Puppeteer Test:**
```typescript
// e2e/friends.spec.ts
import { test, expect } from '@playwright/test';

test('complete friend request flow', async ({ page }) => {
  // User A: Login and send friend request
  await page.goto('http://localhost:5173/login');
  await page.fill('[name="email"]', 'usera@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.goto('/friends/search');
  await page.fill('[placeholder="Search friends"]', 'User B');
  await page.click('text=Send Request');
  await expect(page.locator('text=Request sent')).toBeVisible();

  // User B: Accept request
  // ... switch to User B session
  // ... accept request
  
  // Verify bidirectional friendship
  // ...
});
```

**MCP Commands:**
```bash
warp mcp run puppeteer "test complete friend request flow"
```

---

### **STORY 9.8.4: Performance Benchmarks & Optimization** ⏱️ 1 day
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP

**Acceptance Criteria:**
- [ ] Friends list load: < 300ms (100, 500, 1000 friends)
- [ ] Search response: < 50ms
- [ ] PYMK generation: < 100ms
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices)
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

**Performance Test:**
```bash
# Load test with 1000 friends
warp mcp run supabase "execute_sql SELECT benchmark_friends_list(1000)"

# Profile search queries
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM search_users('john', auth.uid(), 20)"
```

---

### **STORY 9.8.5: RLS Security Audit** ⏱️ 1 day
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP

**Acceptance Criteria:**
- [ ] Verify users cannot see other users' friendships
- [ ] Verify blocked users are invisible in queries
- [ ] Test friend request privacy settings enforcement
- [ ] Penetration testing (attempt to bypass RLS)
- [ ] Zero data leaks confirmed

**Security Tests:**
```sql
-- Test: User A cannot see User B's friendships (if not friends)
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM friendships WHERE user_id = 'user-b-id';
-- Should return 0 rows

-- Test: Blocked users invisible
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM profiles WHERE id = 'blocked-user-id';
-- Should return 0 rows if blocked
```

---

### **STORY 9.8.6: Load Testing (1000+ Friends)** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🛢 Supabase MCP

**Acceptance Criteria:**
- [ ] Simulate 1000+ friends per user
- [ ] Test concurrent requests (100 users simultaneously)
- [ ] Database query optimization
- [ ] No timeouts or errors under load
- [ ] Response times within targets

**Load Test Script:**
```bash
# Use k6 for load testing
k6 run --vus 100 --duration 30s loadtest.js
```

---

### **STORY 9.8.7: Cross-Platform Testing** ⏱️ 1 day
**Priority:** 🔴 Critical

**Acceptance Criteria:**
- [ ] **Web**: Chrome, Firefox, Safari, Edge
- [ ] **iOS**: Simulator + real device (iPhone 12+)
- [ ] **Android**: Emulator + real device (Pixel 5+)
- [ ] Test contact sync on mobile
- [ ] Test push notifications on mobile
- [ ] Verify UI consistency across platforms

---

## 📦 **Deliverables**

### **Test Suites:**
```
__tests__/
├── services/
│   ├── friendsService.test.ts
│   ├── searchService.test.ts
│   └── recommendationService.test.ts
├── hooks/
│   ├── useFriends.test.ts
│   ├── useFriendRequests.test.ts
│   └── useFriendSearch.test.ts
├── components/
│   ├── FriendsList.test.tsx
│   └── FriendRequestCard.test.tsx
└── integration/
    └── friend-request-flow.test.ts

e2e/
├── friends.spec.ts
├── friend-search.spec.ts
└── friend-privacy.spec.ts
```

### **Performance Reports:**
- Lighthouse audit report
- Load test results (k6 output)
- Database query performance (EXPLAIN ANALYZE)

### **Security Reports:**
- RLS penetration test results
- Data leak audit report

---

## 📈 **Metrics**

- Test coverage % (unit, integration)
- E2E test pass rate
- Performance benchmark results
- Security vulnerabilities found/fixed
- Cross-platform compatibility issues

---

**Next Epic:** [EPIC 9.9: Documentation & Developer Experience](./EPIC_9.9_Documentation_DX.md)
