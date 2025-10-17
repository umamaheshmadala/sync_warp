# Story 4.7: Product Display & Detail Pages - COMPLETE SPECIFICATION

**Epic:** 4 - Business Features  
**Priority:** 🔴 **CRITICAL** (MVP Blocker)  
**Effort:** 3-4 days  
**Dependencies:** Story 4.2 (Product Catalog - Backend Complete)

---

## 📋 Overview

This story completes the customer-facing product experience by adding product display on storefronts, individual product detail pages, and a full product catalog view. While the backend product management system exists (Story 4.2), customers currently cannot view products on storefronts.

---

## 🎯 Mermaid Nodes Covered (8/8)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `n8` | 4 Top/New Products | Display 4 featured products on storefront | ✅ Specified |
| `n8_Empty` | No products yet | Empty state when no products | ✅ Specified |
| `n95` | All Products Page | Complete product catalog view | ✅ Specified |
| `n9` | Product Details Page | Individual product view with full info | ✅ Specified |
| `n11` | Favourite Product | Add product to favorites | ✅ Specified |
| `T_Product_Fav` | Product favourited | Success notification | ✅ Specified |
| `n24` | Favourite Products Tab | Tab in favorites page | ✅ Specified |
| `n12` | Share Product Link | Share product via Web Share API | ✅ Specified |
| `T_Product_Shared` | Product link shared | Success notification | ✅ Specified |
| `n13` | Add Product to Wishlist | Add to wishlist from storefront | ✅ Specified |
| `T_Product_Wishlisted` | Added to wishlist | Success notification | ✅ Specified |

**Coverage:** 11/11 nodes (100%)

---

## 💡 User Stories

### Primary User Story
**As a** customer visiting a business storefront  
**I want to** see featured products and browse the full catalog  
**So that** I can discover products before visiting the store

### Secondary User Stories
1. **As a** customer, **I want to** click on a product to see full details **so that** I can learn more about it
2. **As a** customer, **I want to** favorite products I like **so that** I can find them later
3. **As a** customer, **I want to** share interesting products with friends **so that** they can discover them too
4. **As a** customer, **I want to** add products to my wishlist **so that** I can remember to buy them

---

## 🎨 UI Components

### 1. ProductGrid Component (`ProductGrid.tsx`)

**Location:** `src/components/products/ProductGrid.tsx`

**Purpose:** Display 4 featured products on business storefront

**Props:**
```typescript
interface ProductGridProps {
  businessId: string;
  limit?: number; // Default: 4
  showViewAll?: boolean; // Default: true
  onProductClick?: (productId: string) => void;
}
```

**Features:**
- Grid layout (2x2 on mobile, 4x1 on desktop)
- Product cards with image, name, price
- "View All Products" button if more than 4 exist
- Empty state when no products
- Loading skeleton
- Quick actions (favorite, share, wishlist)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Featured Products                      │
├─────────────────────────────────────────┤
│  ┌───────┐  ┌───────┐  ┌───────┐  ┌───┐│
│  │[Img]  │  │[Img]  │  │[Img]  │  │[I]││
│  │Name   │  │Name   │  │Name   │  │Na ││
│  │₹999   │  │₹1,499 │  │₹799   │  │₹1││
│  │❤️ 🔗 📋│  │❤️ 🔗 📋│  │❤️ 🔗 📋│  │❤️││
│  └───────┘  └───────┘  └───────┘  └───┘│
├─────────────────────────────────────────┤
│         [View All 24 Products →]        │
└─────────────────────────────────────────┘
```

**Selection Logic (4 products):**
```typescript
// Priority order for selecting 4 products:
1. is_featured = true (business owner selection)
2. created_at DESC (newest products)
3. view_count DESC (most viewed)
4. LIMIT 4
```

---

### 2. ProductCard Component (`ProductCard.tsx`)

**Location:** `src/components/products/ProductCard.tsx`

**Purpose:** Reusable product card for grids and lists

**Props:**
```typescript
interface ProductCardProps {
  product: Product;
  size?: 'small' | 'medium' | 'large'; // Default: medium
  showActions?: boolean; // Default: true
  onClick?: () => void;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  in_stock: boolean;
  is_featured: boolean;
  business_id: string;
}
```

**Features:**
- Responsive image with fallback
- Price display with currency
- Stock status indicator
- Featured badge (if applicable)
- Quick action buttons:
  - ❤️ Favorite
  - 🔗 Share
  - 📋 Add to Wishlist
- Hover effects and animations
- Click to open product details

---

### 3. ProductDetails Component (`ProductDetails.tsx`)

**Location:** `src/components/products/ProductDetails.tsx`

**Purpose:** Full product details page

**Route:** `/business/:businessId/product/:productId`

**Features:**
- Image gallery with zoom (up to 5 images)
- Full product information
- Price and stock status
- Category and tags
- Business info (name, link to storefront)
- Action buttons (favorite, share, wishlist)
- Back to storefront button
- Related products suggestion

**Layout:**
```
┌─────────────────────────────────────────┐
│  [← Back to Store]                      │
├─────────────────────────────────────────┤
│  ┌──────────────┐  Product Name         │
│  │              │  ₹1,499 • In Stock    │
│  │  Main Image  │  Category: Electronics│
│  │   Gallery    │                       │
│  │  [●][○][○]   │  Description goes here│
│  └──────────────┘  spanning multiple    │
│                     lines with details   │
│  [❤️ Favorite] [🔗 Share] [📋 Wishlist] │
├─────────────────────────────────────────┤
│  About this business                    │
│  [Business Name] → [Visit Store]        │
├─────────────────────────────────────────┤
│  You might also like                    │
│  [Product 1] [Product 2] [Product 3]    │
└─────────────────────────────────────────┘
```

---

### 4. AllProducts Component (`AllProducts.tsx`)

**Location:** `src/components/products/AllProducts.tsx`

**Purpose:** Complete product catalog for a business

**Route:** `/business/:businessId/products`

**Features:**
- Grid view (responsive 2-4 columns)
- Search within products
- Filter by category
- Sort by (newest, price low-high, price high-low, popular)
- Pagination (12 products per page)
- Empty state
- Back to storefront button

**Layout:**
```
┌─────────────────────────────────────────┐
│  [← Back]  All Products (24)           │
├─────────────────────────────────────────┤
│  [Search...] [Category ▼] [Sort ▼]     │
├─────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │ P1 │ │ P2 │ │ P3 │ │ P4 │          │
│  └────┘ └────┘ └────┘ └────┘          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │ P5 │ │ P6 │ │ P7 │ │ P8 │          │
│  └────┘ └────┘ └────┘ └────┘          │
├─────────────────────────────────────────┤
│  [← Previous] Page 1 of 2 [Next →]     │
└─────────────────────────────────────────┘
```

---

### 5. FavoriteProductsTab Component (Enhancement to `Favourites.tsx`)

**Location:** `src/pages/Favourites.tsx` (add new tab)

**Purpose:** Display favorited products

**Features:**
- Product grid of favorited items
- Remove from favorites button
- Click to view product details
- Empty state: "No favorite products yet"
- Integration with existing tabs (Businesses, Coupons)

---

## 🔧 Technical Implementation

### Routing Configuration

**Add to `Router.tsx`:**
```typescript
// Product routes
{
  path: '/business/:businessId/product/:productId',
  element: <ProtectedRoute><ProductDetails /></ProtectedRoute>
},
{
  path: '/business/:businessId/products',
  element: <ProtectedRoute><AllProducts /></ProtectedRoute>
}
```

---

### Database Schema

**Products Table (Already Exists):**
```sql
-- From Story 4.2 - no changes needed
products (
  id, business_id, name, description, price, currency,
  category, images[], in_stock, is_featured, view_count,
  created_at, updated_at
)
```

**New Table: Favorite Products**
```sql
CREATE TABLE favorite_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_favorite_products_user ON favorite_products(user_id);
CREATE INDEX idx_favorite_products_product ON favorite_products(product_id);

-- RLS Policies
ALTER TABLE favorite_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorite products"
  ON favorite_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorite products"
  ON favorite_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorite products"
  ON favorite_products FOR DELETE
  USING (auth.uid() = user_id);
```

**Integration with Wishlist (Already Exists):**
```sql
-- Add product_id to wishlist_items if not present
ALTER TABLE wishlist_items
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;
```

---

### Custom Hooks

#### 1. `useProductDisplay.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseProductDisplayProps {
  businessId: string;
  limit?: number;
}

export function useProductDisplay({ businessId, limit = 4 }: UseProductDisplayProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .eq('in_stock', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProducts(data || []);
        setHasMore((count || 0) > limit);
      }

      setLoading(false);
    }

    if (businessId) {
      fetchProducts();
    }
  }, [businessId, limit]);

  return { products, loading, error, hasMore };
}
```

#### 2. `useFavoriteProduct.ts`

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useFavoriteProduct() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function toggleFavorite(productId: string): Promise<boolean> {
    if (!user) return false;

    setLoading(true);

    try {
      // Check if already favorited
      const { data: existing } = await supabase
        .from('favorite_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existing) {
        // Remove from favorites
        await supabase
          .from('favorite_products')
          .delete()
          .eq('id', existing.id);
        return false;
      } else {
        // Add to favorites
        await supabase
          .from('favorite_products')
          .insert({
            user_id: user.id,
            product_id: productId
          });
        return true;
      }
    } finally {
      setLoading(false);
    }
  }

  async function isFavorited(productId: string): Promise<boolean> {
    if (!user) return false;

    const { data } = await supabase
      .from('favorite_products')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single();

    return !!data;
  }

  return { toggleFavorite, isFavorited, loading };
}
```

#### 3. `useProductShare.ts`

```typescript
export function useProductShare() {
  async function shareProduct(product: Product, businessName: string) {
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} at ${businessName} - ${product.price} ${product.currency}`,
      url: `${window.location.origin}/business/${product.business_id}/product/${product.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return false; // User cancelled
        }
        // Fall through to clipboard
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareData.url);
      return true;
    } catch {
      return false;
    }
  }

  return { shareProduct };
}
```

#### 4. `useWishlistProduct.ts`

```typescript
export function useWishlistProduct() {
  const { user } = useAuth();

  async function addToWishlist(product: Product): Promise<boolean> {
    if (!user) return false;

    try {
      await supabase
        .from('wishlist_items')
        .insert({
          user_id: user.id,
          product_id: product.id,
          name: product.name,
          notes: `${product.price} ${product.currency}`,
          category: product.category
        });
      return true;
    } catch {
      return false;
    }
  }

  return { addToWishlist };
}
```

---

## 🔄 Integration with Existing Components

### Update `BusinessProfile.tsx`

**Add ProductGrid after business info:**
```typescript
import ProductGrid from '@/components/products/ProductGrid';

function BusinessProfile({ businessId }: Props) {
  return (
    <div>
      {/* Existing business info */}
      
      {/* NEW: Products Section */}
      <section className="products-section">
        <ProductGrid 
          businessId={businessId}
          limit={4}
          showViewAll={true}
        />
      </section>
      
      {/* Existing offers, reviews, etc */}
    </div>
  );
}
```

### Update `Favourites.tsx`

**Add Products Tab:**
```typescript
function Favourites() {
  const [activeTab, setActiveTab] = useState<'businesses' | 'coupons' | 'products'>('businesses');
  
  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger> {/* NEW */}
        </TabsList>
        
        {/* Existing tabs */}
        
        <TabsContent value="products">
          <FavoriteProductsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 🧪 Testing Requirements

### Unit Tests

```typescript
describe('ProductGrid', () => {
  test('displays 4 products correctly', async () => {
    const { findAllByRole } = render(<ProductGrid businessId="test" limit={4} />);
    const products = await findAllByRole('article');
    expect(products).toHaveLength(4);
  });

  test('shows "View All" button when more than 4 products', async () => {
    const { findByText } = render(<ProductGrid businessId="test" limit={4} />);
    expect(await findByText(/View All/i)).toBeInTheDocument();
  });

  test('shows empty state when no products', async () => {
    const { findByText } = render(<ProductGrid businessId="empty" limit={4} />);
    expect(await findByText(/No products yet/i)).toBeInTheDocument();
  });
});

describe('useFavoriteProduct', () => {
  test('toggles favorite status', async () => {
    const { result } = renderHook(() => useFavoriteProduct());
    
    // Add to favorites
    const added = await result.current.toggleFavorite('product-123');
    expect(added).toBe(true);
    
    // Remove from favorites
    const removed = await result.current.toggleFavorite('product-123');
    expect(removed).toBe(false);
  });
});
```

### E2E Tests (Playwright)

```typescript
test('customer can view and interact with products on storefront', async ({ page }) => {
  await page.goto('/business/test-business-id');
  
  // Verify products are displayed
  await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
  const productCards = page.locator('[data-testid="product-card"]');
  await expect(productCards).toHaveCount(4);
  
  // Click on first product
  await productCards.first().click();
  
  // Verify product details page
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.locator('h1')).toContainText(/.+/); // Product name
  
  // Test favorite button
  await page.click('[data-testid="favorite-button"]');
  await expect(page.locator('[data-testid="toast"]')).toContainText('favorited');
  
  // Test share button
  await page.click('[data-testid="share-button"]');
  await expect(page.locator('[data-testid="toast"]')).toContainText('shared');
  
  // Go back to storefront
  await page.click('[data-testid="back-button"]');
  await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
});

test('customer can view all products page', async ({ page }) => {
  await page.goto('/business/test-business-id');
  
  // Click "View All Products"
  await page.click('text=View All');
  
  // Verify all products page
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator('h1')).toContainText('All Products');
  
  // Verify search and filters
  await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="category-filter"]')).toBeVisible();
});
```

---

## ✅ Acceptance Criteria

### Functional Requirements
- [x] Storefront displays 4 featured/new products in grid
- [x] Clicking product opens product details page
- [x] "View All" button shows complete product catalog
- [x] Product details page shows all info + images
- [x] Products can be favorited (heart icon)
- [x] Products can be shared (Web Share API + fallback)
- [x] Products can be added to wishlist
- [x] Favorites page has Products tab
- [x] Empty state shown when no products
- [x] Back navigation works correctly

### Non-Functional Requirements
- [x] Product images load with fallback
- [x] Responsive on mobile and desktop
- [x] Loading states during data fetch
- [x] Error handling with user-friendly messages
- [x] Smooth animations and transitions
- [x] Accessible (WCAG 2.1 AA)

### Performance Requirements
- [x] Product grid loads < 1s
- [x] Images optimized and lazy-loaded
- [x] Pagination prevents large data loads

---

## 📝 Implementation Phases

### Phase 1: Core Components ✅ COMPLETE
- [x] Create `ProductCard.tsx` component
- [x] Create `ProductGrid.tsx` component  
- [x] Create `useProducts.ts` hook (replaces useProductDisplay)
- [x] Integrate ProductGrid into `BusinessProfile.tsx`
- [x] Add empty state handling
- [x] Test basic display

### Phase 2: Product Details ✅ COMPLETE
- [x] Create `ProductDetails.tsx` page
- [x] Add product detail routing
- [x] Image gallery component
- [x] Related products section
- [x] Back navigation
- [x] Test product details flow

### Phase 3: All Products Page ✅ COMPLETE
- [x] Create `AllProducts.tsx` page
- [x] Add routing for all products
- [x] Implement search/filter/sort
- [x] Add pagination
- [x] Test catalog browsing

### Phase 4: Social Features ✅ COMPLETE (Modified Implementation)
- [x] Use unified `favorites` table instead of `favorite_products` (better design)
- [x] Implement favorites via `useUnifiedFavorites.ts` hook
- [x] Implement share via `ProductShareModal` component
- [x] Implement wishlist via `useSimpleProductSocial.ts` with Supabase sync
- [x] Add action buttons to product cards
- [x] Add Products tab to UnifiedFavoritesPage
- [x] Test all social actions
- [x] Add toast notifications (react-hot-toast)

---

## 🔗 Related Documentation

- [Story 4.2: Product Catalog Management](./STORY_4.2_Product_Catalog.md) (Backend)
- [Story 4.4: Favorites System](./STORY_4.4_Favorites.md)
- [Story 4.5: Storefront Pages](../epics/EPIC_4_Business_Features.md)
- [Database Schema: Products](../database/schema_products.md)

---

**Status:** ✅ **IMPLEMENTED & COMPLETE**  
**Mermaid Coverage:** 11/11 nodes (100%)  
**Implementation Status:** ✅ ALL PHASES COMPLETE

---

## 📝 Implementation Notes

### Architectural Improvements Over Spec

**1. Unified Favorites System**
- Instead of separate `favorite_products` table, we use a unified `favorites` table
- Stores businesses, coupons, AND products with `entity_type` field
- Benefits:
  - Single source of truth for all favorites
  - Easier maintenance and querying
  - Better UX with one favorites page
  - Proper Supabase RLS policies

**2. Enhanced Wishlist System**
- Wishlist now syncs to Supabase `user_wishlist_items` table
- No longer localStorage-only
- Persists across devices
- Real-time updates via custom events

**3. Hook Consolidation**
- `useUnifiedFavorites.ts` - Handles all favorite types (businesses, coupons, products)
- `useSimpleProductSocial.ts` - Handles favorites and wishlist for products
- `useProducts.ts` - Handles product fetching and display
- Better code reuse and maintainability

**4. Component Structure**
- `ProductCard.tsx` - Reusable across storefront and catalog
- `ProductDetails.tsx` - Full product page with image gallery
- `AllProducts.tsx` - Complete catalog with search/filter/sort
- `ProductShareModal.tsx` - Web Share API with clipboard fallback
- `UnifiedFavoritesPage.tsx` - Shows all favorites including products tab

### Files Implemented
```
src/
├── components/
│   ├── products/
│   │   ├── ProductCard.tsx ✅
│   │   ├── ProductGrid.tsx ✅
│   │   ├── ProductDetails.tsx ✅
│   │   ├── AllProducts.tsx ✅
│   │   └── ProductShareModal.tsx ✅
│   ├── favorites/
│   │   └── UnifiedFavoritesPage.tsx ✅ (with Products tab)
│   └── business/
│       └── FeaturedProducts.tsx ✅
├── hooks/
│   ├── useUnifiedFavorites.ts ✅
│   ├── useSimpleProductSocial.ts ✅
│   └── useProducts.ts ✅
└── pages/
    └── WishlistPage.tsx ✅
```

### Database Schema Implemented
```sql
-- Unified favorites (replaces separate favorite_products table)
favorites (
  id, user_id, entity_type, entity_id, created_at
  where entity_type IN ('business', 'coupon', 'product')
)

-- Wishlist with Supabase sync
user_wishlist_items (
  id, user_id, product_id, created_at
)
```

---

*Last Updated: January 17, 2025*  
*Status: Production Ready*  
*Next Review: N/A - Story Complete*
