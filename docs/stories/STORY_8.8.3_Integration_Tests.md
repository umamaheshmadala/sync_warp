# 🧪 STORY 8.8.3: Integration Testing (RLS & API)

**Parent Epic:** [EPIC 8.8 - Testing & QA](../epics/EPIC_8.8_Testing_QA.md)
**Priority:** P1 - High
**Estimated Effort:** 2 Days
**Dependencies:** Story 8.8.1 (Test Infrastructure)

---

## 🎯 **Goal**
Verify robust security and API behavior by running integration tests against a real (isolated) database environment, ensuring data integrity via transaction rollbacks or cleanup scripts.

---

## 📋 **Acceptance Criteria**

### 1. Environment Isolation
- [ ] Tests run against a dedicated `test` environment (not dev).
- [ ] Data is seeded before tests (`User A`, `User B`).
- [ ] Database is cleaned up after tests.

### 2. RLS Security Tests
- [ ] **Unauthorized Access**: Verify `User A` querying `User B`'s private messages returns 0 rows.
- [ ] **Blocking Enforcement**: Verify a blocked user's `INSERT` is rejected by the database policy.

### 3. API & Trigger Tests
- [ ] **Live Features**: Test that `handle_new_message` trigger fires and updates conversation metadata.
- [ ] **Edge Functions**: Invoke real Edge Functions locally (via Supabase CLI) to verify logic.

---

## 🧩 **Implementation Details**

### Seeding Strategy
Use a shared `seed.sql` or TypeOrm/Prisma seed script that runs before the suite.
`tests/integration/setup.ts`:
```typescript
beforeAll(async () => {
  await resetDatabase();
  await seedTestUsers();
});
afterAll(async () => {
  await resetDatabase(); // Cleanup
});
```

### Transaction Rollback Pattern (Advanced)
If possible, wrap each test case in a SQL transaction:
`BEGIN; -- Run Test -- ROLLBACK;`
*Note: This is hard with Supabase HTTP API, so explicit cleanup `DELETE` is often required.*

### Test User JWT Generation
For authenticated tests, generate JWTs for test users:
```typescript
// tests/integration/auth-helper.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY)

export async function getTestUserToken(email: string): Promise<string> {
  const { data } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink', email, options: { redirectTo: 'http://localhost:5173' }
  })
  // Alternatively: Use signInWithPassword with known test credentials
  return data.properties?.access_token
}
```

---

## 🤖 **MCP Integration Strategy**

### Supabase MCP
- **Verify Policies**: `warp mcp run supabase "execute_sql SELECT * FROM pg_policies"` to audit active RLS policies before testing.

---

## 🧪 **Testing Plan**
1. `npm run test:integration` (target specific folder).
