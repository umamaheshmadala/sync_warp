# Story 12.20a: Taxonomy Database Seeding

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Planning  
**Priority**: P0  
**Estimate**: 5 points  
**Depends on**: Nothing (foundation for all category stories)

---

## ⛔ Dependency Verification — Complete Before Starting

> [!CAUTION]
> **This story has no upstream dependencies.** It is the foundation for Stories 12.20b, 12.20c, 12.21, and 12.19. Do NOT begin Story 12.20b until this story's acceptance criteria are fully verified.

**Verify this story is DONE before implementing 12.20b:**
```
mcp_supabase-mcp-server_execute_sql:
  SELECT level, COUNT(*) FROM product_category_master GROUP BY level;
  → Must return: level 1 = 11, level 2 = 48, level 3 = 3958
```

---

## User Story

**As a** developer  
**I want** the India Google Business Profile taxonomy seeded into Supabase  
**So that** both business onboarding and product creation can use a consistent, queryable category hierarchy

---

> [!IMPORTANT]
> **Pre-Implementation Mandatory Checks**
> Before writing any code:
> 1. Run `mcp_supabase-mcp-server_list_tables(schemas: ["public"])` → confirm `product_category_master` does NOT already exist
> 2. Run `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM product_category_master")` → if table exists with data, skip seeding
> 3. Read `src/types/product.ts` → `ProductCategory` interface already exists; align the new table schema with it
> 4. Check `supabase/migrations/` for the latest migration timestamp to name this one correctly

---

## Scope

### In Scope
- Create `product_category_master` table with 3-level hierarchy (Level 1 / Level 2 / Level 3)
- Seed all **4,017 rows** from `assets/india_google_business_profile_taxonomy_github_Manchumahara.xlsx`
  - 11 Level 1 major categories (group headers — not selectable)
  - 48 Level 2 subcategories (selectable for business onboarding)
  - 3,958 Level 3 specific types (selectable for product creation)
- RLS policies: read-only for all authenticated users
- Seed script stored at `scripts/seed_product_category_master.py`

### Out of Scope
- Business onboarding UI (Story 12.20b)
- Product category picker UI (Story 12.20c)
- Level 3 categories used for business tagging/search (future EPIC)

---

## Technical Specifications

### Database Schema

```sql
-- Migration: YYYYMMDD_create_product_category_master.sql
CREATE TABLE product_category_master (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  level       INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  parent_id   UUID REFERENCES product_category_master(id),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcm_level    ON product_category_master(level);
CREATE INDEX idx_pcm_parent   ON product_category_master(parent_id);
CREATE INDEX idx_pcm_active   ON product_category_master(is_active);

ALTER TABLE product_category_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_categories" ON product_category_master
  FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies for regular users (admin only via service role)
```

### Seed Script Logic (`scripts/seed_product_category_master.py`)

```python
# Uses openpyxl (already installed), reads the taxonomy Excel file
# Inserts in order: Level 1 → Level 2 (ref L1) → Level 3 (ref L2)
# Idempotent: INSERT ... ON CONFLICT DO NOTHING
# Connects via Supabase service role key (from env)
```

### Seeding Strategy
| Level | Count | parent_id | Selectable |
|-------|-------|-----------|------------|
| 1 | 11 | NULL | ❌ Group header only |
| 2 | 48 | Level 1 UUID | ✅ Business onboarding |
| 3 | 3,958 | Level 2 UUID | ✅ Product creation |

---

## Acceptance Criteria

- [x] `product_category_master` table exists in Supabase
- [x] Row counts: Level 1 = 11, Level 2 = 48, Level 3 = 3,958 (total 4,017)
- [x] All Level 2 rows have valid `parent_id` pointing to a Level 1 row
- [x] All Level 3 rows have valid `parent_id` pointing to a Level 2 row
- [x] RLS: `SELECT` allowed for all authenticated users; no write access for regular users
- [x] `mcp_supabase-mcp-server_get_advisors(type: "security")` shows no issues on this table
- [x] Seed script is idempotent (safe to run multiple times)
- [x] Existing `ProductCategory` TypeScript type in `src/types/product.ts` updated to match new schema

---

## Dependencies

- Source file: `assets/india_google_business_profile_taxonomy_github_Manchumahara.xlsx`
- `openpyxl` Python library (for seed script)
- Supabase service role key (for seeding)
