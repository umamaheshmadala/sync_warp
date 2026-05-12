# Story 12.20c: Product Category Picker in Creation Wizard

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Completed  
**Priority**: High  
**Estimate**: 5 points  
**Depends on**: [Story 12.20b — Business Category Onboarding](STORY_12.20b_Business_Category_Onboarding.md)

---

## ⛔ Dependency Verification — Complete Before Starting

> [!CAUTION]
> **Do NOT start this story until Story 12.20b is verified complete.**
> This story requires business product categories to exist in order to filter product categories correctly.

| Dependency | How to Verify | Expected Result |
|------------|-------------|----------------|
| **12.20b** — Business Categories Table | `mcp_supabase-mcp-server_list_tables()` | `business_product_categories` exists |
| **12.20b** — Service Layer | File check | `src/services/businessCategoryService.ts` exists |

---

## User Story

**As a** business owner  
**I want to** categorize my individual products using a 3-level selection  
**So that** my products can appear in the correct trending feeds and users can find them easily

---

> [!IMPORTANT]
> **Pre-Implementation Mandatory Checks**
> Before writing any code:
> 1. Read `src/components/products/creation/steps/ProductDetailsStep.tsx` (FULLY)
> 2. Read `src/stores/useProductWizardStore.ts`
> 3. Read `src/hooks/useProducts.ts` -> `createProduct()` and `updateProduct()` signatures
> 4. Run `mcp_supabase-mcp-server_execute_sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'products'")` → Verify current schema
> 5. Run `mcp_supabase-mcp-server_list_tables()` → Confirm `product_categories` does NOT exist

---

## Scope

### In Scope
- Create `product_categories` junction table mapping products to `product_category_master` entries
- Add 3-level category selector (Primary, Secondary, Tertiary) to `ProductDetailsStep.tsx`
- Build `productCategoryService.ts` for bridging products to categories
- Modify `useProductWizardStore.ts` to manage selected category state
- Update `createProduct` and `updateProduct` workflows in `useProducts.ts` to persist category data

### Out of Scope
- Displaying these categories on the user-facing product feed (future stories)
- Trending Engine integration (Story 12.21)

---

## Technical Specifications

### Database Schema

```sql
-- Migration: create_product_categories
CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES product_category_master(id), -- Level 3 entry
  rank        INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),  -- 1=Primary, 2=Secondary, 3=Tertiary
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, rank)
);

CREATE INDEX idx_pc_product ON product_categories(product_id);
CREATE INDEX idx_pc_category ON product_categories(category_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Business owner can manage product categories
CREATE POLICY "owner_manage_product_categories" ON product_categories
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "read_product_categories" ON product_categories
  FOR SELECT USING (true);
```

### New Service: `src/services/productCategoryService.ts`

```typescript
getProductCategoryOptions(businessId: string): Promise<L3Category[]>
// → Returns Level 3 categories whose Level 2 parent was selected by the business

getProductCategories(productId: string): Promise<ProductCategorySelection>
// → Returns Primary, Secondary, Tertiary for a product

saveProductCategories(productId: string, selections: {primary: string, secondary?: string, tertiary?: string}): Promise<void>
// → Delete existing for product ID, insert new rows adhering to rank constraints
```

### UI Component: `ProductCategorySelector.tsx`

Located inside `src/components/products/creation/`.
Requirements:
- 3 dropdown rows
- Primary Category (Required)
- Secondary Category (Optional - appears after Primary selected)
- Tertiary Category (Optional - appears after Secondary selected)
- Options in dropdowns are populated via `getProductCategoryOptions(businessId)`
- Integrated tightly with `useProductWizardStore.ts`

---

## Acceptance Criteria

- [ ] DB Migration applied successfully for `product_categories`
- [ ] Category selector visible in the Create/Edit wizard, between Tags and Notifications
- [ ] Dropdown options successfully filtered down to the business's Level 2 category tree
- [ ] Primary category is marked mandatory; validation blocks publishing without it
- [ ] Secondary and Tertiary selectors appear conditionally
- [ ] Successfully saving a product correctly inserts up to 3 rows in `product_categories`
- [ ] Editing an existing product correctly re-hydrates the category dropdown state
