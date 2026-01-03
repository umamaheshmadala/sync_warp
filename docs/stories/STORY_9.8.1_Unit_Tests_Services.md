# Story 9.8.1: Unit Tests - Services & Database Functions

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 3 days  
**MCP Usage:** 🧠 Context7 MCP (Heavy), 🛢 Supabase MCP (Medium)  
**Dependencies:** Epics 9.1-9.7 (all features to be tested)  
**Status:** 📋 Planning

---

## 📋 Story Description

Create comprehensive unit tests for all service layer functions and database functions in the Friends Module. This includes testing friendsService, searchService, recommendationService, dealSharingService, privacyService, and all database functions like accept_friend_request, block_user, unfriend, etc.

---

## ✅ Acceptance Criteria

### Service Layer Tests
- [ ] 80%+ coverage for `src/services/friendsService.ts`
- [ ] 80%+ coverage for `src/services/searchService.ts`
- [ ] 80%+ coverage for `src/services/recommendationService.ts`
- [ ] 80%+ coverage for `src/services/dealSharingService.ts`
- [ ] 80%+ coverage for `src/services/privacyService.ts`
- [ ] All edge cases tested (errors, duplicates, race conditions)

### Database Function Tests
- [ ] 100% coverage for `accept_friend_request()`
- [ ] 100% coverage for `reject_friend_request()`
- [ ] 100% coverage for `block_user()`
- [ ] 100% coverage for `unfriend()`
- [ ] 100% coverage for `get_mutual_friends()`
- [ ] 100% coverage for `search_users()`
- [ ] 100% coverage for `get_friend_recommendations()`

### Test Infrastructure
- [ ] Vitest configured and running
- [ ] React Testing Library integrated
- [ ] Supabase client properly mocked
- [ ] Test utilities created for common patterns
- [ ] Coverage reporting configured

---

## 🎨 Implementation

### Test File Structure

```
src/services/__tests__/
├── friendsService.test.ts
├── searchService.test.ts
├── recommendationService.test.ts
├── dealSharingService.test.ts
└── privacyService.test.ts

src/__tests__/database/
├── friend-requests.test.ts
├── friendships.test.ts
├── blocking.test.ts
├── search.test.ts
└── recommendations.test.ts

src/__tests__/utils/
├── mockSupabase.ts
└── testHelpers.ts
```

### Example Test: friendsService.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendFriendRequest, acceptFriendRequest, getFriends } from '@/services/friendsService';
import { createMockSupabase } from '../utils/mockSupabase';

describe('friendsService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    vi.clearAllMocks();
  });

  describe('sendFriendRequest', () => {
    it('should send friend request successfully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ 
          data: { id: 'request-123' }, 
          error: null 
        }),
      });

      const result = await sendFriendRequest('user-456');
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('request-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('friend_requests');
    });

    it('should handle duplicate friend request error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ 
          data: null,
          error: { code: '23505', message: 'duplicate key value' }
        }),
      });

      const result = await sendFriendRequest('user-456');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already sent');
    });

    it('should validate receiver_id is provided', async () => {
      const result = await sendFriendRequest('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should prevent sending request to self', async () => {
      // Mock auth.uid() to return same ID
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const result = await sendFriendRequest('user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('yourself');
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept friend request and create bidirectional friendship', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const result = await acceptFriendRequest('request-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('accept_friend_request', {
        request_id: 'request-123'
      });
    });

    it('should handle already accepted request', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: false, error: 'Request not found' },
        error: null
      });

      const result = await acceptFriendRequest('request-123');
      
      expect(result.success).toBe(false);
    });
  });

  describe('getFriends', () => {
    it('should return list of friends', async () => {
      const mockFriends = [
        { id: '1', full_name: 'John Doe', avatar_url: 'url1' },
        { id: '2', full_name: 'Jane Smith', avatar_url: 'url2' },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockFriends,
            error: null
          })
        })
      });

      const result = await getFriends();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].full_name).toBe('John Doe');
    });

    it('should handle empty friends list', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const result = await getFriends();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      });

      const result = await getFriends();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });
});
```

### Example Test: Database Functions

```typescript
// src/__tests__/database/friend-requests.test.ts
import { describe, it, expect } from 'vitest';
import { supabase } from '@/lib/supabase';

describe('Database Function: accept_friend_request', () => {
  it('should create bidirectional friendship', async () => {
    // Create test users
    const { data: user1 } = await supabase.auth.signUp({
      email: 'user1@test.com',
      password: 'password123'
    });
    const { data: user2 } = await supabase.auth.signUp({
      email: 'user2@test.com',
      password: 'password123'
    });

    // Send friend request
    const { data: request } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user1.user.id,
        receiver_id: user2.user.id
      })
      .select()
      .single();

    // Accept request
    const { data: result } = await supabase.rpc('accept_friend_request', {
      request_id: request.id
    });

    expect(result.success).toBe(true);

    // Verify bidirectional friendship
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user1.user.id},user_id.eq.${user2.user.id}`);

    expect(friendships).toHaveLength(2);
    expect(friendships.some(f => 
      f.user_id === user1.user.id && f.friend_id === user2.user.id
    )).toBe(true);
    expect(friendships.some(f => 
      f.user_id === user2.user.id && f.friend_id === user1.user.id
    )).toBe(true);
  });

  it('should send notification to sender', async () => {
    // Test notification creation
    // ...
  });

  it('should handle expired requests', async () => {
    // Test expired request handling
    // ...
  });
});
```

### Mock Supabase Utility

```typescript
// src/__tests__/utils/mockSupabase.ts
import { vi } from 'vitest';

export function createMockSupabase() {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  };
}
```

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Find all service functions
warp mcp run context7 "list all exported functions in src/services/"

# Analyze test coverage gaps
warp mcp run context7 "find untested functions in src/services/friendsService.ts"

# Review test quality
warp mcp run context7 "analyze test coverage for src/services/"
```

### Supabase MCP Commands

```bash
# Test database functions directly
warp mcp run supabase "execute_sql SELECT accept_friend_request('test-request-id')"

# Verify RLS policies in tests
warp mcp run supabase "execute_sql SET request.jwt.claim.sub = 'user-id'; SELECT * FROM friendships"
```

---

## 📦 Deliverables

1. **Test Files:**
   - `src/services/__tests__/friendsService.test.ts`
   - `src/services/__tests__/searchService.test.ts`
   - `src/services/__tests__/recommendationService.test.ts`
   - `src/services/__tests__/dealSharingService.test.ts`
   - `src/services/__tests__/privacyService.test.ts`

2. **Database Test Files:**
   - `src/__tests__/database/friend-requests.test.ts`
   - `src/__tests__/database/friendships.test.ts`
   - `src/__tests__/database/blocking.test.ts`
   - `src/__tests__/database/search.test.ts`
   - `src/__tests__/database/recommendations.test.ts`

3. **Test Utilities:**
   - `src/__tests__/utils/mockSupabase.ts`
   - `src/__tests__/utils/testHelpers.ts`

4. **Coverage Report:**
   - HTML coverage report in `coverage/`
   - Coverage summary in CI/CD output

---

## 📈 Success Metrics

- **Code Coverage:** > 80% for all services
- **Test Count:** > 100 unit tests
- **Test Execution Time:** < 30 seconds
- **All Tests Passing:** 100% pass rate

---

## 🔗 Related Stories

- **Story 9.8.2:** Unit Tests - React Hooks & State Management
- **Story 9.8.3:** Component Tests - Friends UI
- **Story 9.8.4:** Integration Tests - Friend Request Flow
- **Story 9.8.10:** Test Infrastructure & CI/CD Integration

---

**Next Story:** [STORY 9.8.2: Unit Tests - React Hooks & State Management](./STORY_9.8.2_Unit_Tests_Hooks.md)
