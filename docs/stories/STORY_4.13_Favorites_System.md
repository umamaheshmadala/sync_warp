# Story 4.13: Favorites System ✨ NEW - 📝 FULLY SPECIFIED

**Epic Alignment**: Part of EPIC 4 (Business Features)  
**Replaces**: Story 4.4 (Search & Discovery + Favorites/Wishlist Management) - Partial replacement (Favorites portion only)  
**Related**: Story 4.11 (Follow Business) handles business following separately

---

## Overview

**Goal**: Implement a streamlined Favorites system allowing users to save Offers and Products for quick access.

**Priority**: 🔴 **HIGH** - Core user engagement feature that improves retention and re-engagement

**User Impact**: Users can easily save interesting offers and products while browsing, creating a personalized collection for later reference.

---

## User Experience

### Core Functionality
- ✅ As a user, I want to favorite **Offers** from anywhere in the app
- ✅ As a user, I want to favorite **Products** from anywhere in the app  
- ✅ As a user, I want to see all favorited items in `/favorites` page with **2 tabs**: Offers | Products
- ✅ As a user, I want to **toggle** favorite status instantly (tap heart to favorite/unfavorite)
- ✅ As a user, I want to unfavorite items from both the card AND the Favorites page
- ✅ As a user, I want visual feedback (filled ❤️ = favorited, unfilled 🤍 = not favorited)

### User Stories

**Story 1: Favorite Offers**
- As a user, when I view an Offer (card or modal), I want to see a Favorite button
- As a user, I want the button placement to be consistent (bottom-right corner)
- As a user, on web, I want to see heart icon + "Favorite" text
- As a user, on mobile, I want to see just the heart icon (space-saving)
- As a user, when I click the heart, I expect instant visual feedback
- As a user, I want favorited offers to appear in Favorites page > Offers tab

**Story 2: Favorite Products**
- As a user, when I view a Product (card or modal), I want to see a Favorite button
- As a user, I want the button placement to match the Offers pattern (bottom-right corner)
- As a user, on web, I want to see heart icon + "Favorite" text
- As a user, on mobile, I want to see just the heart icon
- As a user, when I click the heart, I expect instant visual feedback
- As a user, I want favorited products to appear in Favorites page > Products tab

**Story 3: Favorites Page Management**
- As a user, I want to see my favorited Offers and Products in one organized place
- As a user, I want exactly 2 tabs: Offers | Products (no businesses, coupons, or wishlist)
- As a user, I want to see item counts in tabs (e.g., "Offers (12)")
- As a user, I want items sorted by most recently favorited first
- As a user, I want to unfavorite items directly from the Favorites page
- As a user, I want helpful empty states when I have no favorites

---

## What Will Be Built

### Phase 1: Database Schema (1 day)

**New Table: `user_favorites`**
```sql
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('offer', 'product')),
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_favorite UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_user_type ON user_favorites(user_id, item_type);
CREATE INDEX idx_user_favorites_item ON user_favorites(item_type, item_id);
```

**Database Functions**:
- `toggle_favorite(user_id, item_type, item_id)` → Returns BOOLEAN (true if favorited, false if unfavorited)
- `get_user_favorite_offers(user_id)` → Returns full offer details with business info
- `get_user_favorite_products(user_id)` → Returns full product details with business info

**Migration Strategy**:
- Deprecate `user_wishlist_items` table (keep for Phase 2, but remove from UI)
- Remove "Wishlist" tab from existing Favorites page
- Remove "Businesses" tab (handled by Story 4.11 - Follow Business)
- Remove "Coupons" tab (Coupons go to Wallet page)

### Phase 2: Backend Services (1 day)

**New Service: `src/services/favoritesService.ts`**
```typescript
export const favoritesService = {
  toggleFavorite(itemType: 'offer' | 'product', itemId: string): Promise<boolean>
  isFavorited(itemType: 'offer' | 'product', itemId: string): Promise<boolean>
  getFavoriteOffers(): Promise<FavoriteOffer[]>
  getFavoriteProducts(): Promise<FavoriteProduct[]>
  removeFavorite(itemType: 'offer' | 'product', itemId: string): Promise<void>
}
```

**Refactor Hook: `src/hooks/useFavorites.ts`**
- Remove: businesses, coupons, wishlist logic
- Add: offers, products only
- Implement: Real-time cache for instant UI updates
- Implement: Optimistic UI updates (update UI before server confirms)

### Phase 3: UI Components (2-3 days)

**1. FavoritesPage.tsx - MAJOR REFACTOR**

**File**: `src/components/favorites/FavoritesPage.tsx`

**Changes**:
- Remove tabs: Businesses, Coupons, Wishlist
- Add 2 new tabs: Offers (`offers`), Products (`products`)
- Use refactored `useFavorites` hook
- Render `FavoriteOfferCard` and `FavoriteProductCard`

**Component Structure**:
```tsx
type ActiveTab = 'offers' | 'products';

const tabs = [
  { id: 'offers', label: 'Offers', count: counts.offers },
  { id: 'products', label: 'Products', count: counts.products }
];
```

**2. FeaturedOffers.tsx - MODIFY "Save Deal" Button**

**File**: `src/components/business/FeaturedOffers.tsx`  
**Location**: Offer detail modal (line ~422-436)

**Changes**:
```tsx
// REPLACE "Save Deal" button with Favorite button
import { useFavorites } from '@/hooks/useFavorites';

const { toggleFavorite, isFavorited } = useFavorites();
const [favorited, setFavorited] = useState(() => isFavorited('offer', selectedOffer.id));

<button 
  onClick={async () => {
    const newState = await toggleFavorite('offer', selectedOffer.id);
    setFavorited(newState);
  }}
  className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
>
  <Heart className={`w-4 h-4 mr-2 ${favorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
  <span className="hidden md:inline">Favorite</span>
</button>
```

**3. OfferCard.tsx - ADD Favorite Button**

**File**: `src/components/offers/OfferCard.tsx`  
**Location**: Footer section (after ShareButton, line ~342-358)

**Placement**: Bottom-right corner (next to Share button)

**UI**:
- Web: Heart icon + "Favorite" text
- Mobile: Heart icon only

**4. ProductCard.tsx - ADD Favorite Button**

**File**: `src/components/business/ProductCard.tsx`

**Changes**:
- **Grid View**: Absolute positioned heart button at bottom-right corner
- **List View**: Inline favorite button with other product info

**Grid View Example**:
```tsx
<div className="absolute bottom-2 right-2">
  <button 
    onClick={handleToggleFavorite} 
    className="p-2 bg-white/90 rounded-full shadow-md hover:bg-white"
  >
    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
    <span className="hidden md:inline ml-1 text-sm">Favorite</span>
  </button>
</div>
```

**5. ProductView.tsx - ADD Favorite Button**

**File**: `src/components/business/ProductView.tsx`  
**Location**: Header actions (next to Edit button for owners, or standalone for users)

**6. NEW: FavoriteOfferCard.tsx**

**File**: `src/components/favorites/FavoriteOfferCard.tsx`

**Purpose**: Display favorited offers in Favorites page
**Features**:
- Show offer title, code, business name, validity
- Display offer icon/image
- Unfavorite button (trash icon or heart toggle)
- Click to view full offer details

**7. NEW: FavoriteProductCard.tsx**

**File**: `src/components/favorites/FavoriteProductCard.tsx`

**Purpose**: Display favorited products in Favorites page
**Features**:
- Show product image, name, price, business name
- Display availability status
- Unfavorite button
- Click to view full product details

---

## Technical Implementation

### Component Hierarchy

```
FavoritesPage (REFACTORED)
├── Tab: Offers
│   └── FavoriteOfferCard[] (NEW)
│       ├── Offer details
│       ├── Business info
│       └── Unfavorite button
└── Tab: Products
    └── FavoriteProductCard[] (NEW)
        ├── Product details
        ├── Business info
        └── Unfavorite button

OfferCard (Manage Offers page)
└── FavoriteButton (NEW - bottom-right)

FeaturedOffers > Offer Modal
└── FavoriteButton (MODIFIED from "Save Deal")

ProductCard (Business Profile)
└── FavoriteButton (NEW - bottom-right overlay)

ProductView Modal
└── FavoriteButton (NEW - header action)
```

### State Management

**Local State (Component-level)**:
```typescript
const [isFavorited, setIsFavorited] = useState(false);
```

**Global State (useFavorites hook)**:
```typescript
interface UseFavoritesReturn {
  // Data
  offers: FavoriteOffer[];
  products: FavoriteProduct[];
  
  // Loading
  isLoading: boolean;
  error: string | null;
  
  // Counts
  counts: { offers: number; products: number; };
  
  // Actions
  toggleFavorite: (type: 'offer' | 'product', id: string) => Promise<boolean>;
  isFavorited: (type: 'offer' | 'product', id: string) => boolean;
  removeFavorite: (type: 'offer' | 'product', id: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

### Optimistic Updates

```typescript
// 1. Update UI immediately
setIsFavorited(!isFavorited);

// 2. Call backend
try {
  const result = await toggleFavorite('offer', offerId);
  // If backend disagrees, revert
  if (result !== isFavorited) {
    setIsFavorited(result);
  }
} catch (error) {
  // Revert on error
  setIsFavorited(!isFavorited);
  toast.error('Failed to update favorite');
}
```

---

## Acceptance Criteria

### Phase 1: Database (1 day)
- [ ] ✅ `user_favorites` table created with proper schema
- [ ] ✅ Database functions created and tested
- [ ] ✅ RLS policies implemented
- [ ] ✅ Indexes added for performance
- [ ] ✅ Migration script created

### Phase 2: Backend Services (1 day)
- [ ] ✅ `favoritesService.ts` created and unit tested
- [ ] ✅ `useFavorites.ts` hook refactored (remove businesses/coupons/wishlist)
- [ ] ✅ Optimistic updates implemented
- [ ] ✅ Real-time cache working

### Phase 3: UI Components (2-3 days)

**FavoritesPage**:
- [ ] ✅ Only 2 tabs visible (Offers, Products)
- [ ] ✅ Tab counts display correctly
- [ ] ✅ Items sorted by `created_at DESC`
- [ ] ✅ Unfavorite button works
- [ ] ✅ Empty states show appropriate messages

**OfferCard + FeaturedOffers**:
- [ ] ✅ Favorite button appears on OfferCard (bottom-right)
- [ ] ✅ "Save Deal" replaced with "Favorite" in offer modal
- [ ] ✅ Heart icon changes state (filled/unfilled)
- [ ] ✅ Web shows icon + text, mobile shows icon only
- [ ] ✅ Toggle works instantly with optimistic updates
- [ ] ✅ Favorited offers appear in Favorites page

**ProductCard + ProductView**:
- [ ] ✅ Favorite button appears on ProductCard (bottom-right overlay)
- [ ] ✅ Favorite button appears in ProductView modal
- [ ] ✅ Heart icon changes state (filled/unfilled)
- [ ] ✅ Web shows icon + text, mobile shows icon only
- [ ] ✅ Toggle works instantly with optimistic updates
- [ ] ✅ Favorited products appear in Favorites page

**General**:
- [ ] ✅ Unfavorite works from both card and Favorites page
- [ ] ✅ State persists across page refreshes
- [ ] ✅ Toast notifications on favorite/unfavorite
- [ ] ✅ Responsive design (mobile + desktop)

---

## Testing Strategy

### Unit Tests
- `favoritesService.toggleFavorite()` - returns correct boolean
- `favoritesService.getFavoriteOffers()` - fetches with business details
- `useFavorites` hook - state updates correctly

### Integration Tests
- User favorites an offer → appears in Favorites page Offers tab
- User favorites a product → appears in Favorites page Products tab
- User unfavorites from card → removed from Favorites page
- User unfavorites from Favorites page → heart on card becomes unfilled

### E2E Tests (Browser Flow)
1. Navigate to business storefront
2. Click favorite heart on an offer card
3. Verify heart fills with red
4. Navigate to `/favorites`
5. Verify offer appears in Offers tab
6. Click unfavorite (trash icon)
7. Return to storefront
8. Verify heart is unfilled

### Manual Testing Checklist
- [ ] Favorite button appears on all offer/product cards
- [ ] Favorite button appears in all offer/product modals
- [ ] Heart icon toggles instantly (optimistic update)
- [ ] Toast notification shows on favorite/unfavorite
- [ ] Favorites page shows correct counts
- [ ] Items are sorted by most recent first
- [ ] Empty state displays when no favorites
- [ ] Unfavorite from Favorites page syncs to card
- [ ] Mobile shows icon only, web shows icon + text
- [ ] Responsive layout works on all screen sizes

---

## Dependencies

**Required Before Implementation**:
- ✅ Story 4.1 (Business Registration) - Businesses exist
- ✅ Story 4.2 (Product Catalog) - Products exist
- ✅ Story 4.4 (Search & Discovery) - Existing favorites infrastructure (to be refactored)
- ✅ Story 4.5 (Storefront Pages) - Offer/Product cards exist

**Related Stories**:
- Story 4.11 (Follow Business) - Handles business following separately (not part of Favorites)
- Story 4.4 (Existing Favorites) - Being refactored/replaced by this story

---

## Migration Strategy

### From Old Favorites System
1. **Database**:
   - Create `user_favorites` table
   - Deprecate `user_wishlist_items` (keep table, remove from UI)
   - Data migration: None needed (fresh start for Offers/Products favorites)

2. **UI**:
   - Remove tabs from `FavoritesPage.tsx`: Businesses, Coupons, Wishlist
   - Add new tabs: Offers, Products
   - Update route: `/favorites` remains the same

3. **Code**:
   - Refactor `useFavorites.ts` to only handle offers/products
   - Create new `favoritesService.ts` (unified approach)
   - Update all `SimpleSaveButton` references to new `FavoriteButton`

### Backward Compatibility
- Business following moved to Story 4.11 (`/following` page)
- Coupons moved to Wallet page (`/wallet`)
- Wishlist removed from UI (table kept for Phase 2)
- No data loss - all existing favorites preserved in their respective new homes

---

## Timeline Estimates

**Phase 1: Database Schema** - 1 day
- Create tables, functions, RLS policies
- Write and test migration script

**Phase 2: Backend Services** - 1 day
- Create `favoritesService.ts`
- Refactor `useFavorites.ts` hook
- Implement optimistic updates

**Phase 3: UI Components** - 2-3 days
- Day 1: Refactor `FavoritesPage.tsx`, modify `FeaturedOffers.tsx`
- Day 2: Add favorite buttons to `OfferCard.tsx`, `ProductCard.tsx`
- Day 3: Add favorite button to `ProductView.tsx`, polish UX

**Total Estimate**: **4-5 days**

---

## Success Metrics

### Adoption Metrics
- 50%+ of active users favorite at least 1 item within first week
- Average of 5+ favorites per active user
- Favorites page has 20%+ weekly engagement

### Quality Metrics
- Unfavorite rate < 30% (indicates users save quality items)
- <2% error rate on toggle operations
- <500ms average response time for favorite toggle

### Business Metrics
- 15%+ increase in user session duration (users return to favorited items)
- 25%+ increase in offer/product re-engagement
- Track most favorited offers/products for business insights

---

## Open Questions (Decisions Needed)

1. **Pagination**: Should Favorites page paginate (20 items/page) or infinite scroll?
   - **Recommendation**: Infinite scroll (better mobile UX)

2. **Sorting**: Allow users to sort favorites (Most Recent, A-Z, Expiring Soon)?
   - **Recommendation**: Default to "Most Recent", add sorting dropdown in Phase 2

3. **Bulk Actions**: Allow "Unfavorite All" in Favorites page?
   - **Recommendation**: No, too risky. Users can unfavorite individually.

4. **Notifications**: Notify users when favorited offers are expiring soon?
   - **Recommendation**: Yes, add in Phase 2 (30 days before expiry)

5. **Export**: Allow users to export/share their favorite list?
   - **Recommendation**: Phase 2 feature (CSV export or share link)

---

## Status

- **Status**: 📝 **FULLY SPECIFIED** - Ready for implementation
- **Priority**: 🔴 **HIGH** - Core user engagement feature
- **Effort**: 4-5 days
- **Assigned To**: TBD
- **Epic**: EPIC 4 (Business Features)
- **Story Number**: 4.13
- **Document Created**: January 9, 2026
- **Last Updated**: January 9, 2026

---

## Related Documents

- Implementation Plan: `favorites_implementation_plan.md`
- Epic 4 Overview: `docs/epics/EPIC_4_Business_Features.md`
- Story 4.11 (Follow Business): `docs/stories/STORY_4.11_Follow_Business.md`
- Story 4.4 (Old Favorites): `docs/epics/EPIC_4_Business_Features.md#story-44`
