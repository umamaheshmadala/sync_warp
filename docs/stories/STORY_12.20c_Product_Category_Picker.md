# Story 12.20c: Product Category Picker

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Planning  
**Priority**: P0  
**Estimate**: 5 points  
**Depends on**: [Story 12.20b — Business Category Onboarding](STORY_12.20b_Business_Category_Onboarding.md)

---

## ⛔ Dependency Verification — Complete Before Starting

> [!CAUTION]
> **Do NOT start this story until Stories 12.20a AND 12.20b are verified complete.**
> This story is a blocker for Stories 12.21 and 12.19.

| Dependency | How to Verify | Expected Result |
|------------|-------------|----------------|
| **12.20a** — Taxonomy seeded | `mcp_supabase-mcp-server_execute_sql("SELECT level, COUNT(*) FROM product_category_master GROUP BY level")` | level 1=11, level 2=48, level 3=3958 |
| **12.20b** — Junction table exists | `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM business_product_categories")` | Table exists (count ≥ 0) |
| **12.20b** — Onboarding step ships | Read `src/components/business/onboarding/EnhancedOnboardingWizard.tsx` | `ProductCategoryStep` is present as a wizard step |
| **12.20b** — At least one business has categories | `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM business_product_categories")` | Count > 0 (test data seeded) — category picker will show empty without this |

---

## User Story

**As a** business owner creating a product  
**I want to** assign up to 3 specific categories to my product  
**So that** it can appear in the right trending leaderboard and is correctly discoverable

---

> [!IMPORTANT]
> **Pre-Implementation Mandatory Checks**
> Before writing any code:
> 1. Read `src/components/products/creation/steps/ProductDetailsStep.tsx` — fully understand form fields (Name, Description, Tags, Notifications, Save/Publish). Category picker slots between Tags and Notifications.
> 2. Read `src/stores/useProductWizardStore.ts` — check exact store shape before adding new fields
> 3. Read `src/hooks/useProducts.ts` — understand `createProduct()` and `updateProduct()` signatures
> 4. Read `src/components/products/creation/ProductCreationWizard.tsx` — overall wizard flow
> 5. Run `mcp_supabase-mcp-server_execute_sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'products'")` → verify current products schema
> 6. Run `mcp_supabase-mcp-server_list_tables()` → confirm `product_categories` does NOT exist
> 7. Confirm `business_product_categories` is seeded (12.20b must be done first)

---

## Scope

### In Scope
- Create `product_categories` junction table (product ↔ L3 category, ranked)
- `ProductCategorySelector` component in Creation Wizard Step 2
- Filter: shows only Level 3 entries under the business's chosen Level 2 categories
- Primary required; Secondary and Tertiary optional
- Pre-populate categories in Edit Wizard (load existing selections)
- `productCategoryService.ts` for DB queries

### Out of Scope
- Business category selection (Story 12.20b)
- Trending calculation (Story 12.21)

---

## Technical Specifications

### Database Schema

```sql
-- Migration: create_product_categories
CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES product_category_master(id),  -- Level 3 entry
  rank        INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),  -- 1=Primary, 2=Secondary, 3=Tertiary
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, rank)
);

CREATE INDEX idx_pc_product  ON product_categories(product_id);
CREATE INDEX idx_pc_category ON product_categories(category_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Business owner can manage their product categories
CREATE POLICY "owner_manage_product_categories" ON product_categories
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

-- Anyone authenticated can read
CREATE POLICY "read_product_categories" ON product_categories
  FOR SELECT USING (true);
```

### New Service: `src/services/productCategoryService.ts`

```typescript
// Get Level 3 options filtered to business's L2 selections
getProductCategoryOptions(businessId: string): Promise<GroupedL3Categories>
// → SELECT pcm_l3.* FROM product_category_master pcm_l3
//   JOIN product_category_master pcm_l2 ON pcm_l2.id = pcm_l3.parent_id
//   JOIN business_product_categories bpc ON bpc.category_id = pcm_l2.id
//   WHERE bpc.business_id = $1 AND pcm_l3.level = 3
//   ORDER BY pcm_l2.sort_order, pcm_l3.sort_order

// Get existing product categories (for edit mode)
getProductCategories(productId: string): Promise<{primary, secondary?, tertiary?}>
// → SELECT * FROM product_categories WHERE product_id = $1 ORDER BY rank

// Save/upsert product categories
saveProductCategories(productId: string, {primaryId, secondaryId?, tertiaryId?}): Promise<void>
// → DELETE existing, INSERT new
```

**React Query key**: `['product-category-options', businessId]`  
**staleTime**: 24 hours

### Category Picker UI (`ProductCategorySelector`)

```
Primary Category *
  [ Fashion & Clothing ▾ ]    ← Level 2 group header (dropdown section)
    ● Women's Clothing          ← Level 3 entries (radio-style, one per rank)
    ○ Men's Clothing
    ○ Footwear

Secondary Category (optional)
  [ Select a category... ▾ ]  ← only shown after Primary is selected

Tertiary Category (optional)
  [ Select a category... ▾ ]  ← only shown after Secondary is selected
```

### Store Update: `src/stores/useProductWizardStore.ts`
Add fields:
```typescript
primaryCategoryId: string | null;
secondaryCategoryId: string | null;
tertiaryCategoryId: string | null;
```

### TypeScript Type Update: `src/types/product.ts`
Add to `Product` interface:
```typescript
primary_category_id?: string;
primary_category_name?: string;
primary_category_l2_id?: string;   // parent Level 2 — used for trending
secondary_category_id?: string;
tertiary_category_id?: string;
```

---

## Component Structure

```
src/components/products/
└── creation/
    ├── steps/
    │   └── ProductDetailsStep.tsx     [MODIFY] — add ProductCategorySelector
    └── ProductCategorySelector.tsx    [NEW]

src/services/
└── productCategoryService.ts          [NEW]

src/stores/
└── useProductWizardStore.ts           [MODIFY] — add category fields

src/types/
└── product.ts                         [MODIFY] — add category fields
```

---

## Acceptance Criteria

- [ ] `product_categories` table exists with correct schema and RLS policies
- [ ] Category selector appears in ProductDetailsStep between Tags and Notifications
- [ ] Picker shows ONLY Level 3 entries under the business's chosen Level 2 categories
- [ ] Entries are grouped by their Level 2 parent (as section header)
- [ ] Primary category is required — publish is blocked if not selected
- [ ] Secondary and Tertiary are optional; each only reveals after the previous is selected
- [ ] On publish (create), categories are saved to `product_categories`
- [ ] On edit wizard open, existing categories pre-populate the selectors correctly
- [ ] On update (edit), categories are re-saved (DELETE + INSERT)
- [ ] `mcp_supabase-mcp-server_get_advisors` shows no security issues

---

## Dependencies

- [Story 12.20a](STORY_12.20a_Taxonomy_DB_Seeding.md) — `product_category_master` seeded
- [Story 12.20b](STORY_12.20b_Business_Category_Onboarding.md) — `business_product_categories` populated
