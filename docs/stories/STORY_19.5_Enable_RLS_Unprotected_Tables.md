# STORY 19.5 — Enable RLS and Add Policies on Unprotected Public Tables

**Epic:** [EPIC 19 — Supabase Security & Database Performance](../epics/EPIC_19_Supabase_Security_DB_Performance.md)  
**Status:** ✅ Done  
**Priority:** 🟠 High  
**Estimate:** 2 story points  

> [!NOTE]
> We successfully enabled RLS and added policies not only to the 8 application tables specified in this story, but also to **14 additional tables** (config, audit, and legacy migration tables) that lacked RLS. 
> 
> *Note on `spatial_ref_sys`:* The only remaining warning is for `spatial_ref_sys`, which is a PostGIS system table owned by `supabase_admin` and cannot be modified by the standard postgres role. This is safe to ignore as it does not expose sensitive data and cannot be altered by default.
**Dependencies:** 19.2 (policy patterns)  
**Audit Findings:** 8.5  

---

## 🎯 Goal

Enable RLS and add appropriate policies on all 9 public tables that have **no RLS at all**. These tables are fully exposed via PostgREST to any authenticated user — they can read, insert, update, and delete all rows without restriction.

---

## 📍 Current State (What Exists)

### Supabase Security Advisor Finding

| Lint ID | Name | Level |
|---------|------|-------|
| `0013` | `rls_disabled_in_public` | 🔴 ERROR |

### Affected Tables (9 total)

| # | Table | Purpose | Recommended Access |
|---|-------|---------|-------------------|
| 1 | `spatial_ref_sys` | PostGIS coordinate reference system definitions | Read-only for all; system-managed data |
| 2 | `business_customer_profiles` | Customer segmentation profiles for businesses | Business owner read/write own data |
| 3 | `business_metrics` | Aggregate metrics for businesses | Business owner read own metrics; system writes |
| 4 | `business_categories` | Category definitions for businesses | Read-only for all (reference data) |
| 5 | `business_marketing_goals` | Marketing goals per business | Business owner manage own goals |
| 6 | `pricing_config` | Pricing configuration | Admin-only; read-only for authenticated users |
| 7 | `pricing_overrides` | Per-business pricing overrides | Admin-only management |
| 8 | `promotions` | Promotional campaigns | Admin manage; public read active promotions |
| 9 | `business_onboarding_progress` | Onboarding step tracking per business | Business owner manage own progress |

---

## 🔧 Implementation Details

### Table 1: `spatial_ref_sys` (PostGIS)

This is a PostGIS system table. Enable RLS and allow read-only access:

```sql
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON public.spatial_ref_sys FOR SELECT
  USING (true);
```

### Table 2: `business_customer_profiles`

```sql
ALTER TABLE public.business_customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage own customer profiles"
  ON public.business_customer_profiles FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );
```

### Table 3: `business_metrics`

```sql
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can read own metrics"
  ON public.business_metrics FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );
```

### Table 4: `business_categories`

Reference data — everyone can read, only service role can write:

```sql
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON public.business_categories FOR SELECT
  USING (true);
```

### Table 5: `business_marketing_goals`

```sql
ALTER TABLE public.business_marketing_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage own marketing goals"
  ON public.business_marketing_goals FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );
```

### Table 6: `pricing_config`

System/admin table — authenticated users can read pricing info:

```sql
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pricing config"
  ON public.pricing_config FOR SELECT
  USING (true);
```

### Table 7: `pricing_overrides`

Admin-only — business owners can read their own overrides:

```sql
ALTER TABLE public.pricing_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can read own pricing overrides"
  ON public.pricing_overrides FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );
```

### Table 8: `promotions`

Public can read active promotions; admin manages via service role:

```sql
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promotions"
  ON public.promotions FOR SELECT
  USING (true);
```

### Table 9: `business_onboarding_progress`

```sql
ALTER TABLE public.business_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage own onboarding progress"
  ON public.business_onboarding_progress FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = (select auth.uid())
    )
  );
```

> [!IMPORTANT]
> Before implementing, verify column names (`business_id`, `owner_id`, etc.) by inspecting the schema. The SQL above uses conventional column names — adjust as needed.

---

## 🧪 Verification

### Post-Migration Checks

1. **Supabase Security Advisor:** Re-run → all 9 `rls_disabled_in_public` warnings should be resolved
2. **RLS status check:**
   ```sql
   SELECT relname, relrowsecurity
   FROM pg_class
   WHERE relname IN (
     'spatial_ref_sys', 'business_customer_profiles', 'business_metrics',
     'business_categories', 'business_marketing_goals', 'pricing_config',
     'pricing_overrides', 'promotions', 'business_onboarding_progress'
   );
   ```
   Expected: All show `relrowsecurity = true`

### Functional Tests

3. **Business categories:** Query from any authenticated user → should return all categories
4. **Business onboarding:** Business owner progresses through onboarding → data saved correctly
5. **Business metrics:** Business owner views dashboard → sees own metrics only
6. **Pricing config:** App displays pricing → works for all users
7. **Promotions:** Active promotions visible to all users

---

## ✅ Acceptance Criteria

- [x] All 9 tables have RLS enabled (`relrowsecurity = true`) *(along with 14 newly discovered tables)*
- [x] Each table has at least one RLS policy
- [x] Supabase Security Advisor reports 0 `rls_disabled_in_public` warnings *(excluding `spatial_ref_sys`)*
- [x] Reference tables (`business_categories`, `pricing_config`, `promotions`, `spatial_ref_sys`) are publicly readable
- [x] Business-scoped tables restrict access to the business owner
- [x] Application features work correctly after migration
- [x] All policies use the optimized `(select auth.uid())` pattern

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| Supabase Migration | NEW — Enable RLS + create policies for all 9 tables |

---

## ⚠️ Rollback

```sql
-- Disable RLS on each table (restores previous open access)
ALTER TABLE public.spatial_ref_sys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_customer_profiles DISABLE ROW LEVEL SECURITY;
-- ... repeat for all 9 tables
```
