# Story 12.20b: Business Product Category Onboarding

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Completed  
**Priority**: P0  
**Estimate**: 5 points  
**Depends on**: [Story 12.20a — Taxonomy DB Seeding](STORY_12.20a_Taxonomy_DB_Seeding.md)

---

## ⛔ Dependency Verification — Complete Before Starting

> [!CAUTION]
> **Do NOT start this story until Story 12.20a is verified complete.**
> This story is a blocker for Stories 12.20c, 12.21, and 12.19.

| Dependency | How to Verify | Expected Result |
|------------|-------------|----------------|
| **12.20a** — Taxonomy DB Seeded | `mcp_supabase-mcp-server_execute_sql("SELECT level, COUNT(*) FROM product_category_master GROUP BY level")` | level 1=11, level 2=48, level 3=3958 |
| **12.20a** — RLS policy exists | `mcp_supabase-mcp-server_execute_sql("SELECT policyname FROM pg_policies WHERE tablename='product_category_master'")` | `read_all_categories` policy present |

---

## User Story

**As a** business owner  
**I want to** declare which product categories my business deals in during onboarding  
**So that** my products can be correctly categorised and appear in the right trending leaderboards

---

> [!IMPORTANT]
> **Pre-Implementation Mandatory Checks**
> Before writing any code:
> 1. Read `src/components/business/onboarding/EnhancedOnboardingWizard.tsx` — fully understand existing 5-step wizard structure
> 2. Read `src/hooks/useOnboarding.ts` — understand ONBOARDING_STEPS const before modifying
> 3. Read `src/types/business-onboarding.ts` — check step type definitions
> 4. Read `src/components/business/BusinessOnboardingPage.tsx` — understand the wrapper page
> 5. Run `mcp_supabase-mcp-server_execute_sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses'")` → confirm legacy `category` VARCHAR column
> 6. Run `mcp_supabase-mcp-server_list_tables()` → confirm `business_product_categories` does NOT exist
> 7. Confirm `product_category_master` table exists with data (12.20a must be done first)

---

## Scope

### In Scope
- Create `business_product_categories` junction table
- Add "Product Categories" step to `EnhancedOnboardingWizard` (new step)
- Multi-select category picker UI: grouped by Level 1 (header), selectable at Level 2
- Category editor in Business Settings / Edit Business page
- `businessCategoryService.ts` with `getBusinessCategories` and `updateBusinessCategories`
- React Query caching (24h staleTime — taxonomy data is static)

### Out of Scope
- Product creation category picker (Story 12.20c)
- Migrating legacy `businesses.category` VARCHAR (keep for backward compat)
- Level 3 in this picker (Level 3 is for products, not businesses)

---

## Technical Specifications

### Database Schema

```sql
-- Migration: create_business_product_categories
CREATE TABLE business_product_categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES product_category_master(id),  -- Level 2 only
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, category_id)
);

CREATE INDEX idx_bpc_business  ON business_product_categories(business_id);

ALTER TABLE business_product_categories ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own categories
CREATE POLICY "owner_manage_biz_categories" ON business_product_categories
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- Anyone authenticated can read (needed for product creation filtering in 12.20c)
CREATE POLICY "read_biz_categories" ON business_product_categories
  FOR SELECT USING (true);
```

### New Service: `src/services/businessCategoryService.ts`

```typescript
// Key functions:
getBusinessCategories(businessId: string): Promise<L2Category[]>
// → SELECT pcm.* FROM product_category_master pcm
//   JOIN business_product_categories bpc ON bpc.category_id = pcm.id
//   WHERE bpc.business_id = $1 AND pcm.level = 2

updateBusinessCategories(businessId: string, categoryIds: string[]): Promise<void>
// → DELETE existing, INSERT new (upsert pattern)
```

**React Query key**: `['business-categories', businessId]`  
**staleTime**: 24 hours (taxonomy never changes)

### Onboarding Step: Category Picker UI

Query for picker:
```sql
-- Get all Level 2 categories grouped under their Level 1 parent
SELECT
  l1.name  AS group_name,
  l1.sort_order AS group_sort,
  l2.id,
  l2.name,
  l2.sort_order
FROM product_category_master l2
JOIN product_category_master l1 ON l1.id = l2.parent_id
WHERE l2.level = 2
ORDER BY l1.sort_order, l2.sort_order;
```

Picker layout:
```
[ Automotive ▼ ]       ← Level 1 group header (tappable accordion)
  ☑ Auto Repair & Service
  ☐ Automotive - General
  ☐ Gas Station

[ Food & Beverage ▼ ]
  ☑ Restaurant
  ☑ Cafe
  ☐ Bakery & Dessert
```

---

## Component Structure

```
src/components/business/
├── onboarding/
│   ├── EnhancedOnboardingWizard.tsx   [MODIFY] — add ProductCategoryStep
│   └── steps/
│       └── ProductCategoryStep.tsx    [NEW]
└── settings/
    └── BusinessCategoryEditor.tsx     [NEW] — reuse same grouped multi-select
```

### Files to Modify
| File | Change |
|------|--------|
| `src/components/business/onboarding/EnhancedOnboardingWizard.tsx` | Add `ProductCategoryStep` after welcome step |
| `src/hooks/useOnboarding.ts` | Add `product_categories` step to `ONBOARDING_STEPS` |
| `src/types/business-onboarding.ts` | Add step type definition |
| Business Settings/Edit page | Embed `BusinessCategoryEditor` |

### New Files
| File | Purpose |
|------|---------|
| `src/services/businessCategoryService.ts` | DB queries for business categories |
| `src/components/business/onboarding/steps/ProductCategoryStep.tsx` | Onboarding wizard step |
| `src/components/business/settings/BusinessCategoryEditor.tsx` | Settings page editor |

---

## Acceptance Criteria

- [x] New "Product Categories" step appears in the business onboarding wizard
- [x] Step shows all 48 Level 2 categories grouped under 11 Level 1 headers
- [x] Minimum 1 selection required (validation blocks proceeding without a selection)
- [x] Selections are saved to `business_product_categories` on step completion
- [x] Existing businesses with no categories see a banner: "Set product categories to enable trending"
- [x] Business Settings page shows `BusinessCategoryEditor` (same grouped multi-select)
- [x] Business can edit/update their categories at any time from Settings
- [x] React Query caches the category list for 24 hours
- [x] `mcp_supabase-mcp-server_get_advisors(type: "security")` shows no RLS issues

> [!TIP]
> **Implementation Note**: Fixed a mismatch between onboarding step numbers and table persistence logic in `useOnboarding.ts`. All steps (Basics, Categories, Profile, Metrics, Goals) now correctly map to their database counterparts.

---

## Dependencies

- [Story 12.20a](STORY_12.20a_Taxonomy_DB_Seeding.md) — `product_category_master` table with seeded data
