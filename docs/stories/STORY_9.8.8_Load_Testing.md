# Story 9.8.8: Load Testing & Scalability

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🟡 Medium  
**Estimated Time:** 2 days  
**MCP Usage:** 🛢 Supabase MCP (Heavy)  
**Dependencies:** Stories 9.8.1-9.8.7, Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Conduct load testing to ensure the Friends Module can handle high user loads and large datasets. Test with 1000+ friends per user and 100+ concurrent users.

---

## ✅ Acceptance Criteria

### Load Testing
- [ ] Simulate 1000+ friends per user
- [ ] Test concurrent requests (100 users simultaneously)
- [ ] Test peak load scenarios
- [ ] No timeouts or errors under load
- [ ] Response times within targets under load

### Database Optimization
- [ ] Database query optimization verified
- [ ] Connection pool properly configured
- [ ] No connection pool exhaustion
- [ ] No database deadlocks

### Scalability
- [ ] Linear scaling verified
- [ ] Caching strategy effective
- [ ] Rate limiting works correctly
- [ ] Auto-scaling triggers configured

---

## 🎨 Implementation

### Test File Structure

```
loadtests/
├── friends-list.k6.js
├── friend-requests.k6.js
├── search.k6.js
├── pymk.k6.js
└── concurrent-users.k6.js

scripts/
├── seed-test-data.ts
└── analyze-load-results.ts
```

### Example Test: friends-list.k6.js

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '3m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:5173';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
    email: `user${__VU}@test.com`,
    password: 'password123',
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const token = loginRes.json('access_token');

  // Get friends list (with 1000 friends)
  const friendsRes = http.get(`${BASE_URL}/api/friends`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const success = check(friendsRes, {
    'friends list loaded': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 300,
    'has friends': (r) => r.json('data').length > 0,
  });

  errorRate.add(!success);

  // Search friends
  const searchRes = http.get(`${BASE_URL}/api/friends/search?q=John`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  check(searchRes, {
    'search successful': (r) => r.status === 200,
    'search fast': (r) => r.timings.duration < 50,
  });

  sleep(1);
}
```

### Example Test: concurrent-users.k6.js

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
  },
};

export default function () {
  const token = login();

  // Simulate realistic user behavior
  const actions = [
    () => getFriendsList(token),
    () => searchFriends(token, 'John'),
    () => sendFriendRequest(token),
    () => acceptFriendRequest(token),
    () => getPYMKSuggestions(token),
  ];

  // Random action
  const action = actions[Math.floor(Math.random() * actions.length)];
  action();
}

function getFriendsList(token) {
  const res = http.get(`${BASE_URL}/api/friends`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, {
    'friends list OK': (r) => r.status === 200,
  });
}

function searchFriends(token, query) {
  const res = http.get(`${BASE_URL}/api/friends/search?q=${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, {
    'search OK': (r) => r.status === 200,
    'search fast': (r) => r.timings.duration < 50,
  });
}
```

### Database Load Test

```sql
-- Create test data: 1000 friends per user
DO $$
DECLARE
  test_user_id UUID := 'test-user-id';
  friend_id UUID;
BEGIN
  FOR i IN 1..1000 LOOP
    friend_id := gen_random_uuid();
    
    -- Insert friend profile
    INSERT INTO profiles (id, full_name, username)
    VALUES (friend_id, 'Friend ' || i, 'friend' || i);
    
    -- Create bidirectional friendship
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES 
      (test_user_id, friend_id, 'active'),
      (friend_id, test_user_id, 'active');
  END LOOP;
END $$;

-- Test query performance with 1000 friends
EXPLAIN ANALYZE
SELECT p.*
FROM profiles p
JOIN friendships f ON f.friend_id = p.id
WHERE f.user_id = 'test-user-id'
  AND f.status = 'active'
LIMIT 100;

-- Expected: < 50ms execution time
```

### Connection Pool Test

```typescript
// Test connection pool under load
import { createClient } from '@supabase/supabase-js';

async function testConnectionPool() {
  const clients = [];

  // Create 100 concurrent connections
  for (let i = 0; i < 100; i++) {
    const client = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
    clients.push(client);
  }

  // Execute queries concurrently
  const promises = clients.map(client =>
    client.from('friendships').select('*').limit(100)
  );

  const start = performance.now();
  const results = await Promise.all(promises);
  const end = performance.now();

  console.log(`100 concurrent queries completed in ${end - start}ms`);

  // Verify no errors
  const errors = results.filter(r => r.error);
  expect(errors).toHaveLength(0);

  // Verify reasonable performance
  expect(end - start).toBeLessThan(5000); // 5 seconds for 100 queries
}
```

---

## 🎯 MCP Integration

### Supabase MCP Commands

```bash
# Check connection pool status
warp mcp run supabase "execute_sql SELECT * FROM pg_stat_activity WHERE datname = 'postgres'"

# Check for slow queries under load
warp mcp run supabase "execute_sql SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10"

# Monitor database performance
warp mcp run supabase "execute_sql SELECT * FROM pg_stat_database WHERE datname = 'postgres'"

# Check for deadlocks
warp mcp run supabase "execute_sql SELECT * FROM pg_stat_database_conflicts"
```

---

## 📦 Deliverables

1. **Load Test Scripts:**
   - `loadtests/friends-list.k6.js`
   - `loadtests/friend-requests.k6.js`
   - `loadtests/search.k6.js`
   - `loadtests/pymk.k6.js`
   - `loadtests/concurrent-users.k6.js`

2. **Test Data Scripts:**
   - `scripts/seed-test-data.ts`
   - `scripts/cleanup-test-data.ts`

3. **Reports:**
   - Load test results (HTML report)
   - Performance graphs
   - Bottleneck analysis

---

## 📈 Success Metrics

- **Concurrent Users:** 100+ without errors
- **Friends per User:** 1000+ without performance degradation
- **Response Time:** < 500ms at p95
- **Error Rate:** < 1%

---

**Next Story:** [STORY 9.8.9: Cross-Platform Testing & Validation](./STORY_9.8.9_Cross_Platform.md)
