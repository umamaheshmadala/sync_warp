# Story 9.8.4: Integration Tests - Friend Request Flow

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🛢 Supabase MCP (Heavy)  
**Dependencies:** Stories 9.8.1-9.8.3, Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Create integration tests that test complete workflows with a real Supabase test database. Focus on friend request flow, blocking, privacy enforcement, and realtime updates.

---

## ✅ Acceptance Criteria

### Friend Request Flow
- [ ] Test: Send friend request → Receive → Accept → Bidirectional friendship created
- [ ] Test: Send request → Reject → Status updated correctly
- [ ] Test: Send request → Cancel → Status updated
- [ ] Test: Expired requests are automatically cleaned up
- [ ] Test: Duplicate requests are prevented

### Blocking Flow
- [ ] Test: Block user → Friendship + follows removed
- [ ] Test: Blocked users cannot send friend requests
- [ ] Test: Blocked users are invisible in search
- [ ] Test: Unblock → Visibility restored (but not friendship)

### Privacy Enforcement
- [ ] Test: Privacy settings are enforced
- [ ] Test: Users cannot see non-friends' friendships
- [ ] Test: Friend request privacy settings work
- [ ] Test: Profile visibility settings work

### Realtime Updates
- [ ] Test: Friend request notifications delivered in real-time
- [ ] Test: Friend acceptance updates both users
- [ ] Test: Online status updates propagate
- [ ] Test: Subscription cleanup on unmount

---

## 🎨 Implementation

### Test File Structure

```
src/__tests__/integration/
├── friend-request-flow.test.ts
├── blocking-flow.test.ts
├── privacy-settings.test.ts
├── deal-sharing.test.ts
└── realtime-updates.test.ts
```

### Example Test: friend-request-flow.test.ts

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Friend Request Flow (Integration)', () => {
  let supabase: any;
  let user1: any;
  let user2: any;

  beforeAll(async () => {
    // Create test database branch
    supabase = createClient(
      process.env.VITE_SUPABASE_TEST_URL!,
      process.env.VITE_SUPABASE_TEST_ANON_KEY!
    );

    // Create test users
    const { data: u1 } = await supabase.auth.signUp({
      email: 'user1@test.com',
      password: 'password123'
    });
    user1 = u1.user;

    const { data: u2 } = await supabase.auth.signUp({
      email: 'user2@test.com',
      password: 'password123'
    });
    user2 = u2.user;
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.auth.admin.deleteUser(user1.id);
    await supabase.auth.admin.deleteUser(user2.id);
  });

  it('should complete full friend request flow', async () => {
    // Step 1: User 1 sends friend request to User 2
    await supabase.auth.setSession(user1.session);

    const { data: request, error: requestError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user1.id,
        receiver_id: user2.id,
        message: 'Hey, let\'s be friends!'
      })
      .select()
      .single();

    expect(requestError).toBeNull();
    expect(request.status).toBe('pending');

    // Step 2: Verify User 2 receives notification
    await supabase.auth.setSession(user2.session);

    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user2.id)
      .eq('type', 'friend_request');

    expect(notifications).toHaveLength(1);
    expect(notifications[0].data.sender_id).toBe(user1.id);

    // Step 3: User 2 accepts request
    const { data: result } = await supabase.rpc('accept_friend_request', {
      request_id: request.id
    });

    expect(result.success).toBe(true);

    // Step 4: Verify bidirectional friendship created
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user1.id},user_id.eq.${user2.id}`)
      .eq('status', 'active');

    expect(friendships).toHaveLength(2);
    
    const user1Friendship = friendships.find(f => 
      f.user_id === user1.id && f.friend_id === user2.id
    );
    const user2Friendship = friendships.find(f => 
      f.user_id === user2.id && f.friend_id === user1.id
    );

    expect(user1Friendship).toBeDefined();
    expect(user2Friendship).toBeDefined();

    // Step 5: Verify User 1 receives acceptance notification
    await supabase.auth.setSession(user1.session);

    const { data: acceptNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user1.id)
      .eq('type', 'friend_accepted');

    expect(acceptNotifications).toHaveLength(1);

    // Step 6: Verify friend counts updated
    const { data: profile1 } = await supabase
      .from('profiles')
      .select('friend_count')
      .eq('id', user1.id)
      .single();

    const { data: profile2 } = await supabase
      .from('profiles')
      .select('friend_count')
      .eq('id', user2.id)
      .single();

    expect(profile1.friend_count).toBe(1);
    expect(profile2.friend_count).toBe(1);
  });

  it('should reject friend request correctly', async () => {
    // Send request
    await supabase.auth.setSession(user1.session);

    const { data: request } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user1.id,
        receiver_id: user2.id
      })
      .select()
      .single();

    // Reject request
    await supabase.auth.setSession(user2.session);

    const { data: result } = await supabase.rpc('reject_friend_request', {
      request_id: request.id
    });

    expect(result.success).toBe(true);

    // Verify request status updated
    const { data: updatedRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', request.id)
      .single();

    expect(updatedRequest.status).toBe('rejected');

    // Verify no friendship created
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user1.id},user_id.eq.${user2.id}`);

    expect(friendships).toHaveLength(0);
  });

  it('should prevent duplicate friend requests', async () => {
    await supabase.auth.setSession(user1.session);

    // Send first request
    await supabase
      .from('friend_requests')
      .insert({
        sender_id: user1.id,
        receiver_id: user2.id
      });

    // Try to send duplicate
    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user1.id,
        receiver_id: user2.id
      });

    expect(error).not.toBeNull();
    expect(error.code).toBe('23505'); // Unique constraint violation
  });
});
```

### Example Test: blocking-flow.test.ts

```typescript
import { describe, it, expect } from 'vitest';

describe('Blocking Flow (Integration)', () => {
  it('should remove friendship when blocking', async () => {
    // Create friendship first
    // ...

    // Block user
    const { data: result } = await supabase.rpc('block_user', {
      blocked_user_id: user2.id,
      block_reason: 'Test block'
    });

    expect(result.success).toBe(true);

    // Verify friendships removed
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user1.id},user_id.eq.${user2.id}`)
      .eq('status', 'active');

    expect(friendships).toHaveLength(0);

    // Verify follows removed
    const { data: follows } = await supabase
      .from('following')
      .select('*')
      .or(`follower_id.eq.${user1.id},follower_id.eq.${user2.id}`);

    expect(follows).toHaveLength(0);

    // Verify block record created
    const { data: blocks } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', user1.id)
      .eq('blocked_id', user2.id);

    expect(blocks).toHaveLength(1);
  });

  it('should prevent blocked user from sending friend request', async () => {
    // Block user2
    await supabase.rpc('block_user', {
      blocked_user_id: user2.id
    });

    // Try to send friend request as blocked user
    await supabase.auth.setSession(user2.session);

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user2.id,
        receiver_id: user1.id
      });

    expect(error).not.toBeNull();
  });
});
```

---

## 🎯 MCP Integration

### Supabase MCP Commands

```bash
# Create test database branch
warp mcp run supabase "create_branch epic-9-8-testing"

# Run integration tests
npm run test:integration

# Check test database state
warp mcp run supabase "execute_sql SELECT * FROM friendships WHERE status = 'active'"

# Cleanup test data
warp mcp run supabase "execute_sql DELETE FROM friend_requests WHERE sender_id LIKE 'test-%'"
```

---

## 📦 Deliverables

1. **Integration Test Files:**
   - `src/__tests__/integration/friend-request-flow.test.ts`
   - `src/__tests__/integration/blocking-flow.test.ts`
   - `src/__tests__/integration/privacy-settings.test.ts`
   - `src/__tests__/integration/deal-sharing.test.ts`
   - `src/__tests__/integration/realtime-updates.test.ts`

2. **Test Database Setup:**
   - `.env.test` configuration
   - Test database migration scripts
   - Test data seed scripts

---

## 📈 Success Metrics

- **Test Coverage:** All critical flows tested
- **Test Count:** > 20 integration tests
- **Test Execution Time:** < 60 seconds
- **All Tests Passing:** 100% pass rate

---

**Next Story:** [STORY 9.8.5: E2E Tests - User Journeys](./STORY_9.8.5_E2E_Tests.md)
