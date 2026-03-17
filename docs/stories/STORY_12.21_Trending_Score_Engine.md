# Story 12.21: Trending Score Engine & Category Leaderboard

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Planning  
**Priority**: P0  
**Estimate**: 8 points  
**Depends on**: [Story 12.20c — Product Category Picker](STORY_12.20c_Product_Category_Picker.md) *(products need categories before trending works)*

---

## ⛔ Dependency Verification — Complete Before Starting

> [!CAUTION]
> **Do NOT start this story until Story 12.20c is verified complete.** Without product categories, there is nothing to rank or display in the trending leaderboard.
> This story is a blocker for Story 12.19 (Action Bar Redesign).

| Dependency | How to Verify | Expected Result |
|------------|-------------|----------------|
| **12.20a** — Taxonomy seeded | `mcp_supabase-mcp-server_execute_sql("SELECT level, COUNT(*) FROM product_category_master GROUP BY level")` | level 1=11, level 2=48, level 3=3958 |
| **12.20b** — `business_product_categories` exists | `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM business_product_categories")` | Table exists, count > 0 |
| **12.20c** — `product_categories` table exists | `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM product_categories")` | Table exists (count ≥ 0) |
| **12.20c** — At least one product has a primary category | `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM product_categories WHERE rank = 1")` | Count > 0 — trending needs real products to rank |
| **12.20c** — `ProductCategorySelector` in creation wizard | Read `src/components/products/creation/steps/ProductDetailsStep.tsx` | `ProductCategorySelector` is imported and rendered |
| Source tables exist & have data | `mcp_supabase-mcp-server_execute_sql("SELECT 'product_views' AS t, COUNT(*) FROM product_views UNION ALL SELECT 'product_likes', COUNT(*) FROM product_likes UNION ALL SELECT 'product_shares', COUNT(*) FROM product_shares")` | All 3 tables exist with counts ≥ 0 |

---

## User Story

**As a** user browsing a product  
**I want to** see how trending that product is in its category and browse the top-ranked products  
**So that** I can discover what is popular right now in this niche

---

> [!IMPORTANT]
> **Pre-Implementation Mandatory Checks**
> Before writing any code:
> 1. Run `mcp_supabase-mcp-server_execute_sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_views'")` → get exact column names (is date column `created_at` or `viewed_at`?)
> 2. Run `mcp_supabase-mcp-server_execute_sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_shares'")` → confirm product_shares table and column names
> 3. Run `mcp_supabase-mcp-server_execute_sql("\\dt product_*")` → list all product_* tables to verify what exists
> 4. Run `mcp_supabase-mcp-server_list_extensions()` → check if `pg_cron` is available (for automated materialized view refresh)
> 5. Read `src/services/productAnalyticsService.ts` — understand `trackProductView()` and the shape of `product_views`
> 6. Read `src/hooks/useProductLike.ts` — understand `likeCount` source (DB column vs counted)
> 7. Search the codebase for existing bottom sheet / modal components before creating a new one — reuse if found

---

## Scope

### In Scope
- PostgreSQL function `get_trending_products_by_category(l2_category_id, limit)` that computes trending score
- `get_product_trending_rank(product_id)` function for single-product rank lookup
- `useTrendingRank` React hook
- `TrendingCategorySheet` bottom sheet component (top-100 leaderboard with lazy loading)
- Trending formula: `views×1 + likes×3 + comments×5 + shares×7` (rolling 30-day window)
- Trending shown at **Level 2 category** to ensure a large enough pool for meaningful rankings

### Out of Scope
- Real-time trending score (updates every 15 min is sufficient)
- Trending for businesses (product trending only)

---

## Technical Specifications

### Trending Formula
```
trending_score = (views_30d × 1) + (likes_30d × 3) + (comments_30d × 5) + (shares_30d × 7)
```
*Rolling 30-day window. Weights reflect increasing user intent — sharing is the strongest signal.*

### Why Level 2 for Trending?
Products tag at Level 3 (e.g., "Silk Sarees"), but trending is ranked at Level 2 (e.g., "Fashion & Clothing"). This ensures enough products per leaderboard for a meaningful top-100 list. The Trending button shows: `🔥 #5 in Fashion & Clothing`.

### Database: Trending Function

```sql
-- Migration: create_trending_score_functions
CREATE OR REPLACE FUNCTION get_trending_products_by_category(
  p_l2_category_id UUID,
  p_limit          INT DEFAULT 100
)
RETURNS TABLE(
  product_id     UUID,
  product_name   TEXT,
  image_url      TEXT,
  business_name  TEXT,
  l3_category    TEXT,
  trending_score BIGINT,
  rank           BIGINT
) AS $$
WITH signal_counts AS (
  SELECT
    p.id              AS product_id,
    p.name            AS product_name,
    (p.image_urls)[1] AS image_url,
    b.business_name,
    pcm_l3.name       AS l3_category,
    (
      COALESCE(v.cnt, 0) * 1 +
      COALESCE(l.cnt, 0) * 3 +
      COALESCE(c.cnt, 0) * 5 +
      COALESCE(s.cnt, 0) * 7
    ) AS trending_score
  FROM products p
  JOIN businesses b ON b.id = p.business_id
  JOIN product_categories pc ON pc.product_id = p.id AND pc.rank = 1
  JOIN product_category_master pcm_l3 ON pcm_l3.id = pc.category_id
  WHERE pcm_l3.parent_id = p_l2_category_id
    AND p.status = 'published'
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt FROM product_views
    WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY product_id
  ) v ON v.product_id = p.id
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt FROM product_likes
    WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY product_id
  ) l ON l.product_id = p.id
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt FROM product_comments
    WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY product_id
  ) c ON c.product_id = p.id
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt FROM product_shares
    WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY product_id
  ) s ON s.product_id = p.id
)
SELECT
  product_id, product_name, image_url, business_name, l3_category,
  trending_score,
  RANK() OVER (ORDER BY trending_score DESC) AS rank
FROM signal_counts
ORDER BY trending_score DESC
LIMIT p_limit;
$$ LANGUAGE sql STABLE;
```

> **Note**: Before writing this function, run pre-implementation checks to verify exact column names for `product_views`, `product_shares`, and `product_comments`. Adjust field names accordingly.

### Database: Single Product Rank Function

```sql
CREATE OR REPLACE FUNCTION get_product_trending_rank(p_product_id UUID)
RETURNS TABLE(rank BIGINT, l2_category_id UUID, l2_category_name TEXT) AS $$
-- Implementation: find the product's L2 category, then count products with higher score
-- Full implementation after pre-checks confirm schema
$$ LANGUAGE sql STABLE;
```

### New Service: `src/services/trendingService.ts`

```typescript
getTrendingProducts(l2CategoryId: string, limit = 100): Promise<TrendingProduct[]>
// → calls supabase.rpc('get_trending_products_by_category', {...})

getProductTrendingRank(productId: string): Promise<{ rank: number | null; l2CategoryId: string | null; l2CategoryName: string | null }>
// → calls supabase.rpc('get_product_trending_rank', {...})
```

**React Query key**: `['trending', l2CategoryId]`  
**staleTime**: 15 minutes (trending is expensive; don't recompute on every mount)

### New Hook: `src/hooks/useProductTrending.ts`

```typescript
// Returns the product's rank in its primary L2 category
export function useProductTrending(productId: string) {
  // Internally: get product's primary category → get its L2 parent → call rank function
  return { rank, l2CategoryName, isLoading };
}
```

### New Component: `src/components/products/social/TrendingCategorySheet.tsx`

Layout:
```
┌─────────────────────────────────────────┐
│  Trending in Fashion & Clothing    [×]  │  ← Sheet header
├─────────────────────────────────────────┤
│  #1  [img]  Silk Sarees · Kashi Store  │
│  #2  [img]  Banarasi Kurta · Zari Co   │
│  #3  [img]  Cotton Lehenga · Rang Co   │  ← tap → opens product modal
│  ...                                    │
└─────────────────────────────────────────┘
```

> **Before building**: search codebase for existing bottom sheet or drawer component (e.g., search for "sheet", "drawer", "bottom-sheet" in components). Reuse it rather than building from scratch.

- Lazy-loads 20 products at a time (up to 100 total)
- Each row: rank number + small thumbnail + product name + business name
- Tap on any row → opens that product's modal

---

## Component Structure

```
src/
├── hooks/
│   └── useProductTrending.ts              [NEW]
├── services/
│   └── trendingService.ts                 [NEW]
└── components/products/social/
    ├── TrendingButton.tsx                 [NEW]
    └── TrendingCategorySheet.tsx          [NEW]
```

---

## Acceptance Criteria

- [ ] `get_trending_products_by_category` RPC returns products ranked by trending score
- [ ] Rank 1 = highest score within that Level 2 category over the last 30 days
- [ ] A product with no primary category assigned shows `🔥 —` on the button (not a crash)
- [ ] Trending button shows `🔥 #N` where N is the product's rank
- [ ] Tapping Trending button opens the leaderboard bottom sheet
- [ ] Leaderboard sheet header shows: "Trending in [Category Name]"
- [ ] Sheet loads 20 products initially, more on scroll (up to 100)
- [ ] Tapping a product row in the sheet opens that product's modal
- [ ] React Query staleTime = 15 minutes (not computed on every modal open)
- [ ] `mcp_supabase-mcp-server_get_advisors(type: "performance")` shows no warnings on the new function

---

## Dependencies

- [Story 12.20c](STORY_12.20c_Product_Category_Picker.md) — products must have categories before trending can rank them
- Existing `product_views`, `product_likes`, `product_comments`, `product_shares` tables
