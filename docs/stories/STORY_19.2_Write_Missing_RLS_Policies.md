# STORY 19.2 — Write RLS Policies for Tables with RLS Enabled but No Policies

**Epic:** [EPIC 19 — Supabase Security & Database Performance](../epics/EPIC_19_Supabase_Security_DB_Performance.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 3 story points  
**Dependencies:** None  
**Audit Findings:** 8.2  

---

## 🎯 Goal

Create appropriate RLS policies for all 11 tables that have RLS enabled but **zero policies defined**. These tables are currently **fully locked out** — RLS blocks all access because no policies grant any permissions. This means legitimate application queries to these tables will silently return empty results or fail.

---

## 📍 Current State (What Exists)

### Supabase Security Advisor Finding

| Lint ID | Name | Level |
|---------|------|-------|
| `0008` | `rls_enabled_no_policy` | ℹ️ INFO |

### Affected Tables (11 total)

| # | Table | Expected Access Pattern |
|---|-------|------------------------|
| 1 | `activities` | Users see their own activity feed; system inserts via triggers |
| 2 | `ad_campaigns` | Business owners manage their own campaigns; public reads for active ads |
| 3 | `billing_accounts` | Business owners manage their own billing; admin reads all |
| 4 | `billing_transactions` | Business owners read their own transactions; system inserts |
| 5 | `checkins` | Users create their own checkins; business owners read checkins at their business |
| 6 | `coupon_batches` | Business owners manage batches for their own coupons |
| 7 | `coupon_shares` | Users read/create their own shares; recipients can read shares sent to them |
| 8 | `retention_archives` | Service-role only — admin/system access for data retention |
| 9 | `retention_audit_log` | Service-role only — admin/system access for audit trail |
| 10 | `wishlist_items` | Users manage their own wishlist items |

### Impact of Current State

- RLS blocks **all** access for these tables (no policies = deny all)
- Application features relying on these tables may silently fail or return empty data
- Any access currently working is likely via service-role key (which bypasses RLS)

---

## 🔧 Implementation Details

### General Pattern

For each table, determine the access pattern and create appropriate SELECT, INSERT, UPDATE, DELETE policies. Use `(select auth.uid())` (optimized pattern from Story 19.7) from the start.

### Table 1: `activities`

```sql
-- Activities: Users see their own activity feed
CREATE POLICY "Users can read own activities"
  ON public.activities FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "System can insert activities"
  ON public.activities FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));
```

### Table 2: `ad_campaigns`

```sql
-- Ad Campaigns: Business owners manage their campaigns
CREATE POLICY "Business owners can manage own campaigns"
  ON public.ad_campaigns FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Active campaigns are publicly readable"
  ON public.ad_campaigns FOR SELECT
  USING (status = 'active');
```

### Table 3: `billing_accounts`

```sql
-- Billing Accounts: Business owners access own billing
CREATE POLICY "Business owners can read own billing"
  ON public.billing_accounts FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Business owners can update own billing"
  ON public.billing_accounts FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );
```

### Table 4: `billing_transactions`

```sql
-- Billing Transactions: Business owners read own transactions
CREATE POLICY "Business owners can read own transactions"
  ON public.billing_transactions FOR SELECT
  USING (
    billing_account_id IN (
      SELECT id FROM public.billing_accounts WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
      )
    )
  );
```

### Table 5: `checkins`

```sql
-- Checkins: Users create/read own checkins; business owners read checkins at their business
CREATE POLICY "Users can read own checkins"
  ON public.checkins FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Business owners can read checkins at their business"
  ON public.checkins FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create own checkins"
  ON public.checkins FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));
```

### Table 6: `coupon_batches`

```sql
-- Coupon Batches: Business owners manage their coupon batches
CREATE POLICY "Business owners can manage own coupon batches"
  ON public.coupon_batches FOR ALL
  USING (
    coupon_id IN (
      SELECT id FROM public.coupons WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
      )
    )
  );
```

### Table 7: `coupon_shares`

```sql
-- Coupon Shares: Users manage their own shares
CREATE POLICY "Users can read own coupon shares"
  ON public.coupon_shares FOR SELECT
  USING (
    shared_by = (select auth.uid())
    OR shared_with = (select auth.uid())
  );

CREATE POLICY "Users can create coupon shares"
  ON public.coupon_shares FOR INSERT
  WITH CHECK (shared_by = (select auth.uid()));
```

### Tables 8 & 9: `retention_archives` & `retention_audit_log`

These are system/admin-only tables. No user-facing policies needed — access is via service role only.

```sql
-- Retention Archives: Service-role only (deny all to authenticated users)
-- RLS is already enabled with no policies, which blocks all authenticated access.
-- Add an explicit admin-only policy for clarity:
CREATE POLICY "Service role only"
  ON public.retention_archives FOR ALL
  USING (false);

-- Retention Audit Log: Service-role only
CREATE POLICY "Service role only"
  ON public.retention_audit_log FOR ALL
  USING (false);
```

> [!NOTE]
> Policies with `USING (false)` explicitly deny all access for non-service-role users. Service role always bypasses RLS. This makes the intent clear to future developers.

### Table 10: `wishlist_items`

```sql
-- Wishlist Items: Users manage their own wishlist
CREATE POLICY "Users can read own wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own wishlist items"
  ON public.wishlist_items FOR DELETE
  USING (user_id = (select auth.uid()));
```

---

## 🧪 Verification

### Post-Migration Checks

1. **Supabase Security Advisor:** Re-run → all 11 `rls_enabled_no_policy` warnings should be resolved
2. **Policy count check:**
   ```sql
   SELECT tablename, COUNT(*) as policy_count
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('activities', 'ad_campaigns', 'billing_accounts',
       'billing_transactions', 'checkins', 'coupon_batches', 'coupon_shares',
       'retention_archives', 'retention_audit_log', 'wishlist_items')
   GROUP BY tablename
   ORDER BY tablename;
   ```
   Expected: Each table should have ≥ 1 policy

### Functional Tests

3. **Activities:** Trigger a user action → verify activity appears in that user's feed only
4. **Checkins:** Create a checkin → verify it appears for the user and the business owner
5. **Wishlist:** Add/remove wishlist items → verify per-user isolation
6. **Billing:** Business owner can view billing → non-owner cannot
7. **Coupon shares:** Share a coupon → both sender and recipient can see the share

---

## ✅ Acceptance Criteria

- [ ] All 11 tables have at least one RLS policy
- [ ] Supabase Security Advisor reports 0 `rls_enabled_no_policy` warnings
- [ ] Authenticated users can only access data they are authorized to see
- [ ] Service-role access to `retention_archives` and `retention_audit_log` still works
- [ ] Application smoke tests pass for activities, checkins, wishlist, billing, and coupon features
- [ ] All policies use the optimized `(select auth.uid())` pattern

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| Supabase Migration | NEW — Create RLS policies for all 11 tables |

---

## ⚠️ Rollback

Drop all newly created policies:

```sql
-- Drop all policies created by this migration
-- (list each policy by name for each table)
DROP POLICY IF EXISTS "Users can read own activities" ON public.activities;
DROP POLICY IF EXISTS "System can insert activities" ON public.activities;
-- ... repeat for all policies
```

> [!IMPORTANT]
> Before writing policies, verify the column names for each table (e.g., `user_id`, `business_id`, `shared_by`, `shared_with`) by inspecting the actual schema. The SQL above assumes column names based on convention — adjust if the actual schema differs.
