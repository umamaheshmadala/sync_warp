# STORY 19.1 — Enable RLS on `contact_hashes` Table

**Epic:** [EPIC 19 — Supabase Security & Database Performance](../epics/EPIC_19_Supabase_Security_DB_Performance.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 8.1  

---

## 🎯 Goal

Enable Row Level Security (RLS) on the `contact_hashes` table. This table already has three RLS policies defined (`Users can delete their own hashes`, `Users can insert their own hashes`, `Users can select their own hashes`) but RLS is **not enabled** on the table, meaning the policies are completely ignored and all data is accessible to any authenticated user.

This is a **critical security gap** — the policies were authored with the intent to restrict access per user, but they have zero effect because `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` was never executed.

---

## 📍 Current State (What Exists)

### Supabase Security Advisor Finding

| Lint ID | Name | Level | Detail |
|---------|------|-------|--------|
| `0007` | `policy_exists_rls_disabled` | 🔴 ERROR | Table `public.contact_hashes` has RLS policies but RLS is not enabled on the table. Policies include `{"Users can delete their own hashes","Users can insert their own hashes","Users can select their own hashes"}`. |

### Existing RLS Policies (Dormant)

The following policies exist but are **not enforced** because RLS is disabled:

| Policy Name | Operation | Expected Behavior |
|-------------|-----------|-------------------|
| `Users can select their own hashes` | SELECT | Users can only read their own contact hashes |
| `Users can insert their own hashes` | INSERT | Users can only insert hashes for themselves |
| `Users can delete their own hashes` | DELETE | Users can only delete their own hashes |

### Impact of Current State

- **Any authenticated user** can read, modify, or delete **all** contact hashes in the table
- Contact hash data (phone number hashes used for contact matching) is fully exposed
- The intended per-user isolation provided by the policies is not enforced

---

## 🔧 Implementation Details

### Step 1: Enable RLS on `contact_hashes`

**Migration:** Single `ALTER TABLE` statement

```sql
-- STORY 19.1: Enable RLS on contact_hashes
-- This table already has 3 policies (select/insert/delete for own hashes)
-- but RLS was never enabled, leaving all data exposed.
ALTER TABLE public.contact_hashes ENABLE ROW LEVEL SECURITY;
```

> [!CAUTION]
> Once RLS is enabled, the existing policies will immediately take effect. Verify that the policies use `auth.uid()` correctly to match the `user_id` column. If any cron jobs or service-role operations access this table, they will be unaffected (service role bypasses RLS).

### Step 2: Verify Existing Policies

Before applying the migration, confirm the existing policies are correct by querying the database:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'contact_hashes' AND schemaname = 'public';
```

Expected output should show three policies with `USING (user_id = auth.uid())` conditions.

---

## 🧪 Verification

### Post-Migration Checks

1. **Supabase Security Advisor:** Re-run the security advisor → the `policy_exists_rls_disabled` warning for `contact_hashes` should be gone
2. **RLS Status Check:**
   ```sql
   SELECT relname, relrowsecurity
   FROM pg_class
   WHERE relname = 'contact_hashes';
   ```
   Expected: `relrowsecurity = true`

### Functional Tests

3. **Authenticated user can read own hashes:**
   - Log in as a user → query `contact_hashes` → should only return rows where `user_id` = current user
4. **Authenticated user cannot read other users' hashes:**
   - Log in as user A → query `contact_hashes` → should NOT see user B's rows
5. **Insert works for own user:**
   - Insert a contact hash with `user_id = auth.uid()` → should succeed
6. **Insert blocked for other user:**
   - Attempt to insert a contact hash with a different `user_id` → should be denied

### Application Smoke Test

7. **Contact sync flow:** Trigger a contact sync in the app → verify it completes successfully (hashes are inserted and queried correctly)
8. **Contact matching:** Verify that "People You May Know" / contact matching features still work

---

## ✅ Acceptance Criteria

- [ ] RLS is enabled on `public.contact_hashes` (`relrowsecurity = true`)
- [ ] Existing policies are enforced — users can only access their own hashes
- [ ] Supabase Security Advisor no longer reports `policy_exists_rls_disabled` for `contact_hashes`
- [ ] Contact sync flow works correctly in the application
- [ ] Contact matching features work correctly

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| Supabase Migration | NEW — `ALTER TABLE public.contact_hashes ENABLE ROW LEVEL SECURITY;` |

---

## ⚠️ Rollback

If this change causes issues, roll back immediately:

```sql
ALTER TABLE public.contact_hashes DISABLE ROW LEVEL SECURITY;
```
