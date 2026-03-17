# Story 12.23: Star Icon Global Favourite Replace

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Planning  
**Priority**: P1  
**Estimate**: 3 points  
**Depends on**: Nothing — can be built in parallel with 12.20 chain

---

## ⛔ Dependency Verification — Complete Before Starting

> [!CAUTION]
> **This story has no upstream story dependencies.** It can be built in parallel with the 12.20 chain.
> However, Story 12.19 (Action Bar Redesign) depends on THIS story being complete before wiring starts.

| Check | How to Verify | Expected Result |
|-------|-------------|----------------|
| `lucide-react` has `Star` icon | `grep -r "from 'lucide-react'" src/ \| head -5` then check any import — Star is a standard lucide icon | `Star` is importable — no new package needed |
| All yellow Heart usages found | `grep -rn "fill-yellow-400" src/` | List every file that must be updated |
| All Favourite button consumers found | `grep -rn "ProductFavoriteButton" src/` | List all files importing the button |
| Spelling variants identified | `grep -rni "favorites" src/` | All "Favorites" (no U) locations to fix |

> [!NOTE]
> Run all grep checks BEFORE making any edits so you have a complete map of changes. Do not start editing until you have found every occurrence.

---

## User Story

**As a** user  
**I want** favourited products to be shown with a star icon instead of a yellow heart  
**So that** the favourite action is visually distinct from the "Like" red heart action

---

> [!IMPORTANT]
> **Pre-Implementation Mandatory Checks**
> Before writing any code:
> 1. Run `grep -r "fill-yellow-400" src/` — find every yellow heart usage in the codebase
> 2. Run `grep -r "ProductFavoriteButton" src/` — find all consumers of the favourite button component
> 3. Run `grep -r "Heart" src/components/` — verify which Heart icon usages are for likes (keep) vs favourites (replace)
> 4. Run `grep -ri "Favorites\|Favourites" src/` — find all spelling variants to normalise
> 5. Read `src/components/products/actions/ProductFavoriteButton.tsx` — fully before touching
> 6. Read `src/components/favorites/FavoritesPage.tsx` — check header icon
> 7. Find the bottom navigation component — search for `BottomNav` or the Favourites tab icon

No Supabase changes needed for this story.

---

## Scope

### In Scope
- Replace `Heart` with `Star` (lucide-react) in `ProductFavoriteButton.tsx`
- Replace yellow Heart with Star in Favourites page header
- Replace yellow Heart with Star in bottom navigation Favourites tab
- Normalise spelling to **"Favourites"** (with U) across all affected files
- Preserve all existing toggle logic, animations, and transitions

### Out of Scope
- Like red Heart icon (❤️) — do NOT change
- New action bar (Story 12.19 handles wiring this into the new layout)

---

## Technical Specifications

### Icon Change Pattern

**Before (Favourite button — filled state)**:
```tsx
<Heart size={size} className="fill-yellow-400 text-yellow-400" strokeWidth={0} />
```

**After (Favourite button — filled state)**:
```tsx
<Star size={size} className="fill-yellow-400 text-yellow-400" strokeWidth={0} />
```

**After (Favourite button — outline/unsaved state)**:
```tsx
<Star size={size} className="text-gray-400" strokeWidth={1.5} />
```

Import change:
```tsx
// Before
import { Heart } from 'lucide-react';

// After
import { Star } from 'lucide-react';
```

`Star` is part of the existing `lucide-react` package — no new dependency needed.

### Spelling Normalisation
All user-facing strings must use **"Favourites"** (UK/Indian English):
- Page titles: "Favourites", not "Favorites"
- Toast messages: "Saved to Favourites", "Removed from Favourites"
- Navigation labels: "Favourites"
- Aria labels: "Add to Favourites", "Remove from Favourites"

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/products/actions/ProductFavoriteButton.tsx` | Heart → Star; update filled/outline styles |
| `src/components/favorites/FavoritesPage.tsx` | Header icon Heart → Star; "Favorites" → "Favourites" |
| Bottom navigation component (find via grep) | Favourites tab: Heart → Star |
| Any other file found by grep with `fill-yellow-400` for favourites | Replace as appropriate |

---

## Acceptance Criteria

- [ ] `ProductFavoriteButton` renders `Star` icon (filled gold = saved, outline gray = unsaved)
- [ ] FavoritesPage header shows Star icon
- [ ] Bottom navigation Favourites tab shows Star icon
- [ ] No yellow Heart icons remain anywhere for favourites (confirmed by grep)
- [ ] Red Heart icons for Likes are untouched
- [ ] All user-facing text uses "Favourites" spelling (with U)
- [ ] Toggle animation and transitions are preserved
- [ ] `aria-label` updated: "Add to Favourites" / "Remove from Favourites"

---

## Dependencies

- None (runs in parallel with 12.20 chain)
