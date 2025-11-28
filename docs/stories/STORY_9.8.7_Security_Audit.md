# Story 9.8.7: RLS Security Audit & Penetration Testing

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🛢 Supabase MCP (Heavy)  
**Dependencies:** Stories 9.8.1-9.8.6, Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Conduct comprehensive security audit of all RLS policies and privacy settings. Perform penetration testing to attempt bypassing RLS and verify zero data leaks.

---

## ✅ Acceptance Criteria

### RLS Policy Validation
- [ ] Verify users cannot see other users' friendships
- [ ] Verify blocked users are invisible in all queries
- [ ] Verify friend request privacy settings enforcement
- [ ] Verify profile visibility settings work correctly
- [ ] Verify search privacy settings are enforced

### Penetration Testing
- [ ] Attempt to bypass RLS with direct SQL queries
- [ ] Attempt to access blocked users' data
- [ ] Attempt to see non-friends' friend lists
- [ ] Attempt to send friend requests to blocked users
- [ ] Test with multiple concurrent user sessions

### Privacy Settings
- [ ] Test "Who can send me friend requests" setting
- [ ] Test "Who can see my friends list" setting
- [ ] Test "Who can find me in search" setting
- [ ] Test "Show online status" setting

### Data Leak Prevention
- [ ] Zero data leaks confirmed
- [ ] All security findings documented
- [ ] All vulnerabilities fixed
- [ ] Security report generated

---

## 🎨 Implementation

### Test File Structure

```
src/__tests__/security/
├── rls-policies.test.ts
├── privacy-settings.test.ts
├── penetration-tests.test.ts
└── data-leak-audit.test.ts

docs/security/
└── security-audit-report.md
```

### Example Test: rls-policies.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS Security Audit', () => {
  let user1Client: any;
  let user2Client: any;

  beforeAll(async () => {
    // Create two test users with separate clients
    user1Client = createClient(/* ... */);
    user2Client = createClient(/* ... */);
  });

  it('should prevent User A from seeing User B friendships', async () => {
    // User A tries to query User B's friendships
    const { data, error } = await user1Client
      .from('friendships')
      .select('*')
      .eq('user_id', user2.id);

    // Should return 0 rows (not User B's friendships)
    expect(data).toHaveLength(0);
  });

  it('should prevent access to blocked user data', async () => {
    // User A blocks User B
    await user1Client.rpc('block_user', {
      blocked_user_id: user2.id
    });

    // User B tries to see User A's profile
    const { data } = await user2Client
      .from('profiles')
      .select('*')
      .eq('id', user1.id);

    // Should return 0 rows (User A is invisible to User B)
    expect(data).toHaveLength(0);

    // User B tries to search for User A
    const { data: searchResults } = await user2Client
      .rpc('search_users', {
        query: user1.full_name,
        requesting_user_id: user2.id
      });

    expect(searchResults).toHaveLength(0);
  });

  it('should enforce friend request privacy settings', async () => {
    // User A sets privacy: only friends can send requests
    await user1Client
      .from('profiles')
      .update({
        privacy_settings: {
          friend_requests: 'friends_only'
        }
      })
      .eq('id', user1.id);

    // User B (not a friend) tries to send request
    const { error } = await user2Client
      .from('friend_requests')
      .insert({
        sender_id: user2.id,
        receiver_id: user1.id
      });

    // Should fail due to RLS policy
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501'); // Insufficient privilege
  });

  it('should prevent seeing friends list when privacy is set', async () => {
    // User A sets friends list to private
    await user1Client
      .from('profiles')
      .update({
        privacy_settings: {
          friends_list_visibility: 'only_me'
        }
      })
      .eq('id', user1.id);

    // User B tries to see User A's friends
    const { data } = await user2Client
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user1.id);

    expect(data).toHaveLength(0);
  });
});
```

### Example Test: penetration-tests.test.ts

```typescript
import { describe, it, expect } from 'vitest';

describe('Penetration Testing', () => {
  it('should prevent SQL injection in search', async () => {
    const maliciousQuery = "'; DROP TABLE friendships; --";

    const { error } = await supabase.rpc('search_users', {
      query: maliciousQuery,
      requesting_user_id: user1.id
    });

    // Should handle safely, not execute SQL
    expect(error).toBeNull();

    // Verify table still exists
    const { data } = await supabase
      .from('friendships')
      .select('count');

    expect(data).toBeDefined();
  });

  it('should prevent bypassing RLS with direct queries', async () => {
    // Attempt to bypass RLS by setting JWT claim
    const { error } = await supabase.rpc('execute_sql', {
      query: `
        SET request.jwt.claim.sub = '${user2.id}';
        SELECT * FROM friendships WHERE user_id = '${user1.id}';
      `
    });

    // Should be blocked
    expect(error).not.toBeNull();
  });

  it('should prevent accessing data through joins', async () => {
    // Attempt to access blocked user data via join
    const { data } = await user2Client
      .from('profiles')
      .select(`
        *,
        friendships!inner(*)
      `)
      .eq('id', user1.id); // User 1 has blocked User 2

    expect(data).toHaveLength(0);
  });

  it('should prevent batch operations on unauthorized data', async () => {
    // Attempt to update multiple users' data
    const { error } = await user1Client
      .from('profiles')
      .update({ full_name: 'Hacked' })
      .neq('id', user1.id); // Try to update other users

    expect(error).not.toBeNull();
  });
});
```

### Example Test: privacy-settings.test.ts

```typescript
import { describe, it, expect } from 'vitest';

describe('Privacy Settings Enforcement', () => {
  it('should enforce "friends only" friend request setting', async () => {
    await user1Client
      .from('profiles')
      .update({
        privacy_settings: {
          friend_requests: 'friends_only'
        }
      })
      .eq('id', user1.id);

    // Non-friend tries to send request
    const { error } = await user2Client
      .from('friend_requests')
      .insert({
        sender_id: user2.id,
        receiver_id: user1.id
      });

    expect(error).not.toBeNull();
  });

  it('should enforce "no one" friend request setting', async () => {
    await user1Client
      .from('profiles')
      .update({
        privacy_settings: {
          friend_requests: 'no_one'
        }
      })
      .eq('id', user1.id);

    // Even friends cannot send request
    const { error } = await friendClient
      .from('friend_requests')
      .insert({
        sender_id: friend.id,
        receiver_id: user1.id
      });

    expect(error).not.toBeNull();
  });

  it('should hide user from search when privacy is set', async () => {
    await user1Client
      .from('profiles')
      .update({
        privacy_settings: {
          searchable: false
        }
      })
      .eq('id', user1.id);

    const { data } = await user2Client
      .rpc('search_users', {
        query: user1.full_name,
        requesting_user_id: user2.id
      });

    expect(data).not.toContainEqual(
      expect.objectContaining({ id: user1.id })
    );
  });

  it('should hide online status when privacy is set', async () => {
    await user1Client
      .from('profiles')
      .update({
        privacy_settings: {
          show_online_status: false
        }
      })
      .eq('id', user1.id);

    const { data } = await user2Client
      .from('profiles')
      .select('is_online')
      .eq('id', user1.id)
      .single();

    // Should not see online status
    expect(data.is_online).toBeNull();
  });
});
```

### SQL Security Tests

```sql
-- Test: User cannot see other users' friendships
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM friendships WHERE user_id = 'user-b-id';
-- Expected: 0 rows

-- Test: Blocked users are invisible
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM profiles WHERE id = 'blocked-user-id';
-- Expected: 0 rows

-- Test: Cannot bypass RLS with SECURITY DEFINER
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM get_all_friendships(); -- Hypothetical malicious function
-- Expected: Error or only user-a's friendships

-- Test: Cannot access data through views
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM friendships_view WHERE user_id = 'user-b-id';
-- Expected: 0 rows

-- Test: Cannot modify other users' data
SET request.jwt.claim.sub = 'user-a-id';
UPDATE profiles SET full_name = 'Hacked' WHERE id = 'user-b-id';
-- Expected: 0 rows updated
```

---

## 🎯 MCP Integration

### Supabase MCP Commands

```bash
# Test RLS policies
warp mcp run supabase "execute_sql SET request.jwt.claim.sub = 'user-id'; SELECT * FROM friendships"

# Check RLS policy definitions
warp mcp run supabase "execute_sql SELECT * FROM pg_policies WHERE schemaname = 'public'"

# Test with different user contexts
warp mcp run supabase "execute_sql SET ROLE authenticated; SELECT * FROM friendships"

# Audit security settings
warp mcp run supabase "execute_sql SELECT * FROM pg_roles WHERE rolname LIKE '%supabase%'"
```

---

## 📦 Deliverables

1. **Security Test Files:**
   - `src/__tests__/security/rls-policies.test.ts`
   - `src/__tests__/security/privacy-settings.test.ts`
   - `src/__tests__/security/penetration-tests.test.ts`
   - `src/__tests__/security/data-leak-audit.test.ts`

2. **Security Reports:**
   - `docs/security/security-audit-report.md`
   - `docs/security/rls-policy-documentation.md`
   - `docs/security/penetration-test-results.md`

---

## 📈 Success Metrics

- **Data Leaks:** 0
- **RLS Policies Tested:** 100%
- **Privacy Settings Tested:** 100%
- **Penetration Tests Passed:** 100%

---

**Next Story:** [STORY 9.8.8: Load Testing & Scalability](./STORY_9.8.8_Load_Testing.md)
