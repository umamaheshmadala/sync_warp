# STORY 19.7 — Optimize RLS Policies: Replace `auth.uid()` with `(select auth.uid())`

**Epic:** [EPIC 19 — Supabase Security & Database Performance](../epics/EPIC_19_Supabase_Security_DB_Performance.md)  
**Status:** 📋 Ready  
**Priority:** 🟡 Medium  
**Estimate:** 2 story points  
**Dependencies:** 19.2, 19.5 (policies must exist first)  
**Audit Findings:** 8.7  

---

## 🎯 Goal

Replace all instances of `auth.uid()` with `(select auth.uid())` in RLS policies. When used directly, `auth.uid()` is re-evaluated **for every row** the policy checks. Wrapping it in a subselect `(select auth.uid())` makes PostgreSQL evaluate it **once per query** as an InitPlan, significantly improving RLS policy performance on large tables.

---

## 📍 Current State (What Exists)

### Supabase Performance Advisor Finding

| Lint ID | Name | Level |
|---------|------|-------|
| N/A | `auth_rls_initplan` | ⚠️ WARN |

### Affected Tables & Policies (20+ policies)

| # | Table | Policy Name | Current Pattern |
|---|-------|-------------|-----------------|
| 1 | `profiles` | Multiple policies | `auth.uid()` per-row |
| 2 | `business_reviews` | Multiple policies | `auth.uid()` per-row |
| 3 | `blocked_users` | Multiple policies | `auth.uid()` per-row |
| 4 | `coupons` | Multiple policies | `auth.uid()` per-row |
| 5 | `notifications` | Multiple policies | `auth.uid()` per-row |
| 6 | `offers` | Multiple policies | `auth.uid()` per-row |
| 7 | `contact_sync_logs` | Multiple policies | `auth.uid()` per-row |
| 8 | `following` | Multiple policies | `auth.uid()` per-row |
| 9 | `user_wishlist_items` | Multiple policies | `auth.uid()` per-row |
| 10 | `search_analytics` | Multiple policies | `auth.uid()` per-row |
| 11 | `business_checkins` | Multiple policies | `auth.uid()` per-row |
| 12 | `legacy_business_products` | Multiple policies | `auth.uid()` per-row |
| 13 | `business_coupons` | Multiple policies | `auth.uid()` per-row |
| 14 | `friendships` | Multiple policies | `auth.uid()` per-row |
| 15 | `deal_comments` | Multiple policies | `auth.uid()` per-row |
| 16 | `deal_shares` | Multiple policies | `auth.uid()` per-row |
| 17 | `share_clicks` | Multiple policies | `auth.uid()` per-row |
| 18 | `share_conversions` | Multiple policies | `auth.uid()` per-row |
| 19 | `coupon_sharing_log` | Multiple policies | `auth.uid()` per-row |

### Performance Impact

On tables with thousands of rows (e.g., `messages`, `notifications`, `business_reviews`), the per-row evaluation of `auth.uid()` adds measurable overhead. The InitPlan optimization reduces this to a single evaluation per query, regardless of table size.

---

## 🔧 Implementation Details

### Migration Approach

For each affected policy:
1. Drop the existing policy
2. Recreate it with `(select auth.uid())` instead of `auth.uid()`

> [!WARNING]
> Policies must be dropped and recreated atomically within a single transaction to avoid a window where the table has no policy. Use `BEGIN`/`COMMIT` blocks.

### Step 1: Identify All Affected Policies

```sql
-- Find all policies that use auth.uid() without the InitPlan optimization
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
  AND (qual::text NOT LIKE '%(select auth.uid())%' AND with_check::text NOT LIKE '%(select auth.uid())%');
```

### Step 2: Drop and Recreate Each Policy

Example pattern (repeat for each policy):

```sql
BEGIN;

-- Example: profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = (select auth.uid()));

-- Example: blocked_users table
DROP POLICY IF EXISTS "Users can view own blocked users" ON public.blocked_users;
CREATE POLICY "Users can view own blocked users"
  ON public.blocked_users FOR SELECT
  USING (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can block users" ON public.blocked_users;
CREATE POLICY "Users can block users"
  ON public.blocked_users FOR INSERT
  WITH CHECK (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unblock users" ON public.blocked_users;
CREATE POLICY "Users can unblock users"
  ON public.blocked_users FOR DELETE
  USING (blocker_id = (select auth.uid()));

-- ... repeat for all affected tables/policies

COMMIT;
```

> [!IMPORTANT]
> The exact policy definitions (USING clause, WITH CHECK clause, command type) must be preserved when recreating. Always query the current policy first:
> ```sql
> SELECT policyname, polcmd, qual, with_check
> FROM pg_policy p
> JOIN pg_class c ON p.polrelid = c.oid
> WHERE c.relname = 'table_name';
> ```

### Step 3: Also Optimize `current_setting()` Calls

Some policies may use `current_setting('request.jwt.claims', true)::json->>'sub'` instead of `auth.uid()`. These should also be wrapped in a subselect:

```sql
-- Before
USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')

-- After
USING (user_id = (select current_setting('request.jwt.claims', true)::json->>'sub'))
```

---

## 🧪 Verification

### Post-Migration Checks

1. **Supabase Performance Advisor:** Re-run → all `auth_rls_initplan` warnings should be resolved
2. **Policy verification:**
   ```sql
   -- Verify no policies still use bare auth.uid()
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public'
     AND (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
     AND (qual::text NOT LIKE '%(select auth.uid())%' AND with_check::text NOT LIKE '%(select auth.uid())%');
   ```
   Expected: 0 rows

### Performance Tests

3. **Before/After comparison:** Run a query on a table with 1000+ rows with `EXPLAIN ANALYZE`:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM public.notifications WHERE user_id = auth.uid();
   ```
   Look for `InitPlan` in the output — this confirms the optimization is working.

4. **Timing comparison:** Measure query execution time before and after on large tables:
   - `profiles` (all users)
   - `notifications` (heavy read table)
   - `messages` (high volume)

### Functional Tests

5. **Profiles:** User can view and edit own profile
6. **Notifications:** User sees only own notifications
7. **Blocked users:** Block/unblock still works
8. **Friendships:** Friend list shows correctly
9. **Coupons:** Coupon access scoped to authorized users

---

## ✅ Acceptance Criteria

- [ ] All RLS policies use `(select auth.uid())` instead of bare `auth.uid()`
- [ ] Supabase Performance Advisor reports 0 `auth_rls_initplan` warnings
- [ ] `EXPLAIN ANALYZE` shows InitPlan optimization for auth.uid() evaluation
- [ ] All policies maintain the same authorization semantics (no functional changes)
- [ ] Application smoke tests pass for all affected features
- [ ] All policy changes are atomic (no window of missing policies)

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| Supabase Migration | NEW — Drop and recreate 20+ RLS policies with optimized `(select auth.uid())` |

---

## ⚠️ Rollback

Re-create policies with the original `auth.uid()` pattern:

```sql
BEGIN;
DROP POLICY IF EXISTS "policy_name" ON public.table_name;
CREATE POLICY "policy_name" ON public.table_name FOR SELECT
  USING (user_id = auth.uid());
COMMIT;
```

This only affects performance — reverting does not change security behavior.
