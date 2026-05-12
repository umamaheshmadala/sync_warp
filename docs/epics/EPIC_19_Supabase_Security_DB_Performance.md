# 🔒 EPIC 19: Supabase Security & Database Performance

**Status:** ✅ Done  
**Created:** 2026-02-21  
**Owner:** Backend Engineering / DevOps  
**Audit Reference:** [Codebase Audit Report — Category 8](../../.gemini/antigravity/brain/4990934d-85a5-413b-9a20-e2901b49f1fe/codebase_audit_report.md)  
**Dependencies:** None (database-only changes, independent of frontend EPICs)  
**Priority:** 🟠 High  
**Estimated Effort:** 10–15 story points  
**Supabase Project:** `ysxmgbblljoyebvugrfo` (`sync_warp`)

---

## 🎯 Epic Goal

Close all security gaps identified by the Supabase Security & Performance Advisors: fix RLS misconfigurations, eliminate privilege escalation risks from `SECURITY DEFINER` views, pin function `search_path`, add missing foreign key indexes, and optimize RLS policy evaluation from per-row to per-query.

### Core Objectives:
1. **Enable RLS on `contact_hashes`** — policies exist but RLS is disabled (data exposed)
2. **Write policies for tables with RLS enabled but zero policies** — currently fully locked out
3. **Audit `SECURITY DEFINER` views** — change to `SECURITY INVOKER` where possible
4. **Pin `search_path`** on all security-sensitive functions
5. **Enable RLS on unprotected public tables** — fully exposed to any authenticated user
6. **Add indexes for unindexed foreign keys** — slow JOINs and cascading DELETEs
7. **Optimize RLS `auth.uid()` calls** — per-row re-evaluation → `(select auth.uid())`

---

## ✅ Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Tables with RLS disabled despite policies | 0 | 1 (`contact_hashes`) |
| Tables with RLS enabled but no policies | 0 | Multiple |
| `SECURITY DEFINER` views without justification | 0 | Multiple |
| Functions without `search_path` pinning | 0 | Multiple |
| Public tables without RLS | 0 | Multiple |
| Unindexed foreign keys | 0 | Many |
| RLS policies with per-row `auth.uid()` | 0 | Multiple |
| Supabase Security Advisor warnings | 0 | 5 categories |
| Supabase Performance Advisor warnings | 0 | 2 categories |

---

## 📋 Audit Findings Covered

| Finding | Description | Severity |
|---------|-------------|----------|
| 8.1 | RLS policies exist but RLS not enabled on `contact_hashes` | 🔴 Critical |
| 8.2 | RLS enabled but zero policies on multiple tables (`activities`, `ad_campaigns`, etc.) | 🔴 Critical |
| 8.3 | `SECURITY DEFINER` views bypass RLS (`business_followers_readable`, `businesses_readable`, etc.) | 🟠 High |
| 8.4 | Functions lack `search_path` pinning — privilege escalation risk | 🟠 High |
| 8.5 | Public tables with no RLS at all — exposed to any authenticated user | 🟠 High |
| 8.6 | Unindexed foreign keys — slow JOINs and cascading DELETEs | 🟡 Medium |
| 8.7 | RLS policies re-evaluate `auth.uid()` per row instead of per query | 🟡 Medium |

---

## 📊 Stories Breakdown

| # | Story | Priority | Estimate | Dependencies |
|---|-------|----------|----------|--------------|
| 19.1 | Enable RLS on `contact_hashes` table | 🔴 Critical | 1 pt | None |
| 19.2 | Write RLS policies for all tables that have RLS enabled but zero policies | 🔴 Critical | 3 pts | None |
| 19.3 | Audit all `SECURITY DEFINER` views; convert to `SECURITY INVOKER` where safe | 🟠 High | 3 pts | None |
| 19.4 | Add `SET search_path = ''` to all security-sensitive functions | 🟠 High | 2 pts | None |
| 19.5 | Enable RLS and add policies on all unprotected public tables | 🟠 High | 2 pts | 19.2 |
| 19.6 | Add `CREATE INDEX` for all unindexed foreign key columns | 🟡 Medium | 2 pts | None |
| 19.7 | Replace `auth.uid()` → `(select auth.uid())` in all RLS policies | 🟡 Medium | 2 pts | 19.2, 19.5 |

### 📌 Recommended Execution Order

1. **19.1** — Quick critical fix. Single `ALTER TABLE` statement.
2. **19.2 + 19.5** (sequential) — Write missing policies. 19.5 depends on 19.2 patterns.
3. **19.3 + 19.4** (parallel) — Security hardening. Independent of each other.
4. **19.6** — Index creation. Independent, can run anytime.
5. **19.7** — RLS optimization. Best done after all policies are written (19.2, 19.5).

---

## 🔑 Key SQL Operations

### 19.1 — Enable RLS on `contact_hashes`
```sql
ALTER TABLE public.contact_hashes ENABLE ROW LEVEL SECURITY;
```

### 19.3 — Convert views to `SECURITY INVOKER`
```sql
-- Example for each view
ALTER VIEW public.businesses_readable SET (security_invoker = on);
```

### 19.4 — Pin function search_path
```sql
-- Example for each function
ALTER FUNCTION public.function_name SET search_path = '';
```

### 19.7 — Optimize RLS policies
```sql
-- Before (slow: per-row evaluation)
CREATE POLICY "select_own" ON messages
  USING (user_id = auth.uid());

-- After (fast: per-query evaluation)  
CREATE POLICY "select_own" ON messages
  USING (user_id = (select auth.uid()));
```

---

## 🧪 Verification Strategy

- **Supabase Security Advisor:** Re-run after all changes → expect 0 warnings
- **Supabase Performance Advisor:** Re-run after all changes → expect 0 warnings
- **RLS test:** Attempt to read `contact_hashes` as anonymous → should be blocked
- **Policy test:** Verify each table with new policies allows expected CRUD operations
- **View test:** Verify `SECURITY INVOKER` views still return correct data for authorized users
- **Index verification:** `EXPLAIN ANALYZE` on JOIN queries → verify index usage
- **Query performance:** Before/after timing on RLS-heavy queries with 1000+ rows

---

## ⚠️ Risk Mitigation

> [!CAUTION]
> RLS and policy changes can break existing application queries if not tested carefully. Each migration should be tested on a Supabase branch first.

- **Use Supabase branches** for testing all migrations before applying to production
- **Run application smoke tests** after each policy change to verify no queries break
- **Monitor Supabase logs** for `permission denied` errors after deployment
- **Keep rollback scripts** ready for each migration

---

## ✅ Definition of Done

- [ ] `contact_hashes` has RLS enabled — verified via Supabase Dashboard
- [ ] All tables with RLS enabled have appropriate SELECT/INSERT/UPDATE/DELETE policies
- [ ] All `SECURITY DEFINER` views either justified or converted to `SECURITY INVOKER`
- [ ] All security-sensitive functions have `SET search_path = ''`
- [ ] All public tables have RLS enabled with appropriate policies
- [ ] All foreign key columns have covering indexes
- [ ] All RLS policies use `(select auth.uid())` pattern instead of `auth.uid()`
- [ ] Supabase Security Advisor returns 0 warnings
- [ ] Supabase Performance Advisor returns 0 warnings for RLS + FK categories
- [ ] Application smoke tests pass after all migrations
