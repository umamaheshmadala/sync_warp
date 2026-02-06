# Story 12.18: Price & Category Field Deprecation

**Epic:** [EPIC 12: Instagram-Style Product Listing](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status:** ✅ Done  
**Priority:** P0  
**Estimate:** 3 pts  

---

## User Stories

### US-12.18.1: Remove Price Field
**As a** Product Owner,  
**I want** the `price` field completely removed from the system,  
**So that** the app aligns with the new "contact business for pricing" model.

### US-12.18.2: Remove Category Field
**As a** Product Owner,  
**I want** the `category` field removed from products,  
**So that** categorization is handled at the business level (via business categories), not individual products.

---

## Acceptance Criteria

### AC-1: Database Schema Changes

#### AC-1.1: Drop Price Column
- **GIVEN** the `products` table has a `price` column
- **WHEN** the migration runs
- **THEN** `ALTER TABLE products DROP COLUMN IF EXISTS price` executes successfully
- **AND** no errors occur from dependent objects

#### AC-1.2: Drop Category Column
- **GIVEN** the `products` table has a `category` column
- **WHEN** the migration runs
- **THEN** `ALTER TABLE products DROP COLUMN IF EXISTS category` executes successfully

#### AC-1.3: Verify No Breaking Dependencies
- **GIVEN** the columns are dropped
- **THEN** no functions, triggers, views, or RLS policies reference `price` or `category`
- **FACT:** Run `grep -r "price" --include="*.sql"` and `grep -r "category" --include="*.sql"` in `supabase/` folder before migration

---

### AC-2: Backend / API Cleanup

#### AC-2.1: TypeScript Types
- **GIVEN** the migration is complete
- **WHEN** I check TypeScript interfaces
- **THEN** `Product`, `ProductDraft`, and related types have NO `price` or `category` properties

#### AC-2.2: Service Hooks
- **GIVEN** I check `useProducts`, `useProductDraft`, `useOneProduct`
- **THEN** no `select()` or `insert()` calls reference `price` or `category`

#### AC-2.3: Supabase RPCs
- **GIVEN** I search for stored procedures
- **THEN** no RPC functions reference `price` or `category`

---

### AC-3: User Interface Cleanup

#### AC-3.1: Creation Wizard (Step 3)
- **GIVEN** I am on the Product Details step
- **WHEN** I view the form
- **THEN** there is NO "Price" input field
- **AND** there is NO "Category" dropdown/selector

#### AC-3.2: Product Card
- **GIVEN** I view a product card (grid or list)
- **WHEN** I inspect the card
- **THEN** no price placeholder (e.g., "$0.00", "Contact for Price") is displayed
- **AND** the card shows: Image + Name only

#### AC-3.3: Product Modal
- **GIVEN** I open a product modal
- **WHEN** I view the details panel
- **THEN** no price or category information is displayed

#### AC-3.4: Search/Filter UI
- **GIVEN** there is a product search or filter UI
- **WHEN** I check filter options
- **THEN** there is NO "Sort by Price" option
- **AND** there is NO "Price Range" filter
- **AND** there is NO "Category" filter (products inherit business category)

---

### AC-4: Legacy Data Handling

#### AC-4.1: Data Loss Acknowledgment
- **GIVEN** existing products have `price` and `category` values
- **WHEN** the migration runs
- **THEN** all existing `price` and `category` data is permanently deleted
- **FACT:** This is intentional and approved by the user

---

## Pre-Migration Checklist

Before running the migration, complete these verification steps:

| Check | Command / Action | Expected Result |
|-------|------------------|-----------------|
| 1. Grep SQL files | `grep -r "price\|category" supabase/` | List all references |
| 2. Grep TypeScript | `grep -r "price\|category" src/` | List all references |
| 3. Check RLS | Review `supabase/migrations/*.sql` for policies | No policies use these columns |
| 4. Check Views | `SELECT * FROM information_schema.views WHERE view_definition LIKE '%price%'` | No results |
| 5. Check Triggers | `SELECT * FROM pg_trigger` on products table | No triggers use these columns |

---

## Technical Notes

| Component | Change |
|-----------|--------|
| Migration file | Create `supabase/migrations/YYYYMMDDHHMMSS_drop_price_category.sql` |
| `src/types/product.ts` | Remove `price?: number` and `category?: string` |
| `productService.ts` | Remove any `.select('price')` or `.insert({ price })` calls |
| `ProductForm.tsx` | Remove Price input and Category selector components |
| `ProductCard.tsx` | Remove any price display logic |
| `ProductModal.tsx` | Remove price/category display sections |

---

## Rollback Plan

> **⚠️ WARNING:** This is a destructive migration. Data cannot be recovered after column drop.

If issues arise:
1. The migration is NOT reversible for data
2. If columns need to be re-added, create a new migration to `ADD COLUMN`
3. Historical price/category data will need to be manually re-entered or recovered from backups
