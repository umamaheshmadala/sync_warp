# Story 12.19: Product Action Bar Redesign

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Completed  
**Priority**: P0  
**Estimate**: 8 points  
**Depends on**:
- [Story 12.20a — Taxonomy DB Seeding](STORY_12.20a_Taxonomy_DB_Seeding.md)
- [Story 12.20b — Business Category Onboarding](STORY_12.20b_Business_Category_Onboarding.md)
- [Story 12.20c — Product Category Picker](STORY_12.20c_Product_Category_Picker.md)
- [Story 12.21 — Trending Score Engine](STORY_12.21_Trending_Score_Engine.md)
- [Story 12.22 — Real-Time Like Counter](STORY_12.22_Realtime_Like_Counter.md)
- [Story 12.23 — Star Icon Global Favourite Replace](STORY_12.23_Star_Icon_Global_Favourite_Replace.md)

---

## ⛔ Dependency Verification — Complete Before Starting

> [!CAUTION]
> **This is the FINAL integration story. Do NOT start until ALL 6 dependencies below are verified complete.**
> Every story in EPIC 12 feeds into this one. Starting early will result in wiring components that don't exist yet.

| Dependency | How to Verify | Expected Result |
|------------|-------------|----------------|
| **12.20a** — Taxonomy seeded | `mcp_supabase-mcp-server_execute_sql("SELECT level, COUNT(*) FROM product_category_master GROUP BY level")` | level 1=11, level 2=48, level 3=3958 |
| **12.20b** — Business categories ready | `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM business_product_categories")` | Table exists, count > 0 |
| **12.20c** — Product categories ready | `mcp_supabase-mcp-server_execute_sql("SELECT COUNT(*) FROM product_categories WHERE rank = 1")` | Count > 0 (products have primary categories assigned) |
| **12.20c** — `ProductCategorySelector` in wizard | Read `src/components/products/creation/steps/ProductDetailsStep.tsx` | `ProductCategorySelector` is imported and rendered |
| **12.21** — Trending RPC exists | `mcp_supabase-mcp-server_execute_sql("SELECT proname FROM pg_proc WHERE proname = 'get_trending_products_by_category'")` | Function name returned |
| **12.21** — `TrendingButton` + `TrendingCategorySheet` built | Check `src/components/products/social/TrendingButton.tsx` exists | File present and exports `TrendingButton` |
| **12.21** — `useProductTrending` hook built | Check `src/hooks/useProductTrending.ts` exists | File present |
| **12.22** — Realtime wired into `useProductLike` | Read `src/hooks/useProductLike.ts` | Supabase Realtime channel subscription is present in a `useEffect` |
| **12.23** — Star icon on `ProductFavoriteButton` | Read `src/components/products/actions/ProductFavoriteButton.tsx` | Imports `Star` (not `Heart`) from lucide-react |
| **12.23** — No yellow Hearts remain | `grep -rn "fill-yellow-400" src/` | No results (or only non-favourite uses) |

> [!NOTE]
> Run ALL verifications above before writing a single line of code. This story is pure integration — if any dependency is incomplete, finish it first.

---

## User Story

**As a** user viewing a product  
**I want** social action buttons that show likes, friends who liked it, trending rank, sharing, and my favourite status  
**So that** I get rich social context and can discover popular products in the same category

---

> [!IMPORTANT]
> **Pre-Implementation Mandatory Checks**
> This story integrates ALL previous stories. Read every file fully before writing any code:
> 1. Read `src/components/products/mobile/MobileProductActions.tsx` — current: Like + Comment + Share (left) + Favourite (right)
> 2. Read `src/components/products/web/WebProductDetailsPanel.tsx` — find the web action bar section
> 3. Read `src/hooks/useProductLike.ts` — confirm it returns: `isLiked`, `likeCount`, `likedByFriends` (array), `toggleLike`
> 4. Read `src/components/products/social/ProductLikedBy.tsx` — this "Liked by friend A, B..." text row will be removed
> 5. Read `src/components/products/mobile/MobileProductComments.tsx` — find where the comments section begins (add "N Comments" label here)
> 6. Read `src/components/products/mobile/MobileProductModal.tsx` — understand overall modal layout
> 7. Search for existing bottom sheet / drawer component in the codebase before building new ones — (`grep -r "sheet\|Sheet\|Drawer\|drawer" src/components/`)
> 8. Check how `productLikeService.getFriendsWhoLiked()` is called — current default limit is 2; may need to be increased to get the full count
> 9. Verify all 6 dependency stories above are complete before starting this story

---

## Scope

### In Scope
- New action bar on both mobile (`MobileProductActions.tsx`) and web (`WebProductDetailsPanel.tsx`)
- **5 new buttons**: Like · Friends Like · Trending · Share · Favourite
- Remove Comment button from action bar
- Show "{N} Comments" label above comments section instead
- Remove `ProductLikedBy` text row (replaced by Friends Like button)
- `FriendsLikeButton` + `FriendsLikeSheet` (friend list bottom sheet)
- `TrendingButton` (from Story 12.21) wired into the layout
- Star icon Favourite (from Story 12.23) wired in

### Out of Scope
- Comment functionality itself (exists, unchanged)
- Share modal (exists, reused as-is)
- Product card grid changes

---

## New Action Bar

| Position | Button | Icon | Behaviour |
|----------|--------|------|-----------|
| Left 1 | Like | ❤️ red heart (toggle) | Toggle own like; count updates in real-time (12.22) |
| Left 2 | Friends Like | 💛 yellow heart (read-only) | Shows count of friends who liked; tap → `FriendsLikeSheet` |
| Left 3 | Trending | 🔥 `#N` | Rank in primary L2 category (12.21); tap → `TrendingCategorySheet` |
| Left 4 | Share | ↗️ share | Unchanged — opens existing `ShareFriendPickerModal` |
| Right | Favourite | ⭐ gold star (toggle) | Star icon (12.23); toggle with existing `useProductFavorite` |

**Layout (Mobile)**:
```
┌──────────────────────────────────────────────────┐
│  ❤️ 1.2k   💛 3   🔥 #5   ↗️ Share         ⭐  │
└──────────────────────────────────────────────────┘
```

---

## Technical Specifications

### New Components

#### 1. `src/components/products/social/FriendsLikeButton.tsx`
```typescript
interface FriendsLikeButtonProps {
  productId: string;
  count: number;         // likedByFriends.length (or separate total count)
  onPress: () => void;   // opens FriendsLikeSheet
}
```
- Yellow Heart icon: `<Heart className="fill-yellow-400 text-yellow-400" />`
- Shows `0` grayed out when count = 0 (always visible for discovery)
- Uses `likedByFriends` from `useProductLike` hook — **check the existing limit param** in `productLikeService.getFriendsWhoLiked()`; the current default limit is 2 (for preview). A separate call or increased limit is needed for the full count.

#### 2. `src/components/products/social/FriendsLikeSheet.tsx`
Before building: **search for existing sheet component** — check if `@/components/ui/sheet`, `@/components/ui/drawer`, or similar already exists. Reuse it.
```typescript
interface FriendsLikeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  viewerId: string;
}
```
Sheet content:
```
┌──────────────────────────────────────┐
│  Friends who liked this        [×]   │
├──────────────────────────────────────│
│  [avatar]  Jane Doe  · liked         │
│  [avatar]  Raj Patel · liked         │
│  [avatar]  Priya M.  · liked         │
└──────────────────────────────────────┘
```
- Fetches from `productLikeService.getFriendsWhoLiked(productId, userId, 100)` (increase limit to 100)
- Each row: avatar + full_name + "liked"

### Files to Modify

| File | Change |
|------|--------|
| `src/components/products/mobile/MobileProductActions.tsx` | Replace action bar with 5 new buttons; remove Comment button; remove `ProductLikedBy` text row |
| `src/components/products/web/WebProductDetailsPanel.tsx` | Mirror the same 5-button bar for web layout |
| `src/components/products/mobile/MobileProductComments.tsx` | Add `"{count} Comments"` label above comment list |
| `src/hooks/useProductLike.ts` | Expose full friend count (may need a second `getFriendsWhoLiked` call with higher limit, or add `friendCount` to the service) |

### New Files

| File | Purpose |
|------|---------|
| `src/components/products/social/FriendsLikeButton.tsx` | Yellow heart button with count |
| `src/components/products/social/FriendsLikeSheet.tsx` | Bottom sheet showing friends list |

Both `TrendingButton` and `TrendingCategorySheet` are built in Story 12.21 — wire them in here.

---

## Integration Map

```
MobileProductActions.tsx
├── ProductLikeButton        (existing, from Story 12.5)
│   └── useProductLike       (existing + Realtime from 12.22)
├── FriendsLikeButton        (NEW — this story)
│   └── FriendsLikeSheet     (NEW — this story)
│       └── productLikeService.getFriendsWhoLiked()
├── TrendingButton           (NEW — from Story 12.21)
│   └── TrendingCategorySheet (NEW — from Story 12.21)
│       └── trendingService.getTrendingProducts()
├── ShareButton              (existing, unchanged)
│   └── ShareFriendPickerModal (existing)
└── ProductFavoriteButton    (existing + Star icon from 12.23)
    └── useProductFavorite   (existing)
```

---

## Acceptance Criteria

### Like Button
- [ ] Existing toggle behaviour preserved (red heart fill/outline)
- [ ] Like count updates in real-time via Supabase Realtime (from 12.22)
- [ ] Optimistic update still works

### Friends Like Button
- [ ] Shows count of friends who liked (yellow heart icon)
- [ ] Shows `0` in grayed-out state when no friends liked (always visible)
- [ ] Tap opens `FriendsLikeSheet` bottom sheet
- [ ] Sheet shows friend avatars + names
- [ ] Sheet is dismissable

### Trending Button
- [ ] Shows `🔥 #N` where N is the product's rank in its L2 category
- [ ] Shows `🔥 —` if product has no primary category assigned
- [ ] Tap opens `TrendingCategorySheet` leaderboard
- [ ] Leaderboard shows the correct category name in the header

### Share Button
- [ ] Unchanged — opens existing `ShareFriendPickerModal`

### Favourite Button
- [ ] Shows Star icon (from 12.23 — should already be done)
- [ ] Toggle works correctly; persists to Supabase

### Comment Count
- [ ] "{N} Comments" text label visible above the comments section
- [ ] Comment button removed from action bar

### General
- [ ] Both mobile AND web layouts are updated simultaneously
- [ ] No regression on any existing functionality
- [ ] `ProductLikedBy` text row removed from below action bar

---

## Dependencies

- [Story 12.20a](STORY_12.20a_Taxonomy_DB_Seeding.md), [12.20b](STORY_12.20b_Business_Category_Onboarding.md), [12.20c](STORY_12.20c_Product_Category_Picker.md) — for trending to work, products need categories
- [Story 12.21](STORY_12.21_Trending_Score_Engine.md) — `TrendingButton`, `TrendingCategorySheet`, `useProductTrending`
- [Story 12.22](STORY_12.22_Realtime_Like_Counter.md) — Realtime like count in `useProductLike`
- [Story 12.23](STORY_12.23_Star_Icon_Global_Favourite_Replace.md) — Star icon on `ProductFavoriteButton`
