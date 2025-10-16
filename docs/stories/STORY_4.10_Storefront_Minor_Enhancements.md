# Story 4.10: Storefront Minor Enhancements - COMPLETE SPECIFICATION

**Epic:** 4 - Business Features  
**Priority:** 🟢 **LOW** (Post-MVP Polish)  
**Effort:** 1 day  
**Dependencies:** Story 4.7 (Product Display), Story 4.8 (Review Display)

---

## 📋 Overview

This story addresses the remaining minor enhancements for the Storefront (Authenticated) subgraph, including product favoriting functionality and comprehensive loading/empty/error states across all storefront sections. These enhancements improve user experience and provide complete feedback for all edge cases.

---

## 🎯 Mermaid Nodes Covered (11/11)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `n11` | Favourite Product | Add product to favorites | ✅ Specified |
| `T_Product_Fav` | Product favourited | Success notification | ✅ Specified |
| `n24` | Favourite Products Tab | Tab in favorites page | ✅ Specified |
| `n1_Empty` | No offers found | Empty state for offers | ✅ Specified |
| `n6_Loading` | Loading reviews | Loading state for reviews | ✅ Specified |
| `n6_Empty` | No reviews yet | Empty state for reviews | ✅ Specified |
| `n6_Error` | Failed to load reviews | Error state for reviews | ✅ Specified |
| `n8_Empty` | No products yet | Empty state for products | ✅ Specified |
| `U_Storefront_Loading` | Loading storefront | Loading state for page | ✅ Specified |
| `U_Storefront_Error` | Failed to load storefront | Error state for page | ✅ Specified |
| `n40` | Reviews: Infinite Scroll | Pagination system | ✅ Specified |

**Coverage:** 11/11 nodes (100%)

---

## 💡 User Stories

### Primary User Story
**As a** customer browsing storefronts  
**I want to** receive clear feedback for all loading states, empty results, and errors  
**So that** I understand what's happening and what actions I can take

### Secondary User Stories
1. **As a** customer, **I want to** favorite products I like **so that** I can quickly find them later
2. **As a** customer, **I want to** see my favorited products in a dedicated tab **so that** they're organized with other favorites
3. **As a** customer, **I want to** see loading indicators when data is fetching **so that** I know the app is working
4. **As a** customer, **I want to** see helpful empty states **so that** I understand when there's no content
5. **As a** customer, **I want to** see clear error messages **so that** I can troubleshoot or retry

---

## 🎨 UI Components

### 1. FavoriteProductButton Component (`FavoriteProductButton.tsx`)

**Location:** `src/components/products/FavoriteProductButton.tsx`

**Purpose:** Toggle product favorite status with visual feedback

**Props:**
```typescript
interface FavoriteProductButtonProps {
  productId: string;
  productName?: string; // For toast message
  variant?: 'icon' | 'button'; // Default: icon
  initialFavorited?: boolean;
}
```

**Features:**
- Heart icon (filled when favorited, outline when not)
- Optimistic UI updates
- Toast notification on toggle
- Loading state during API call
- Handles authentication state

**Layout:**
```
Unfavorited: ♡ (outline heart)
Favorited:   ♥️ (filled heart, red/pink)
Loading:     ⟳ (spinner)
```

---

### 2. FavoriteProductsList Component (Enhancement to `Favourites.tsx`)

**Location:** `src/pages/Favourites.tsx` (add new tab content)

**Purpose:** Display all favorited products

**Features:**
- Grid layout (2-4 columns responsive)
- Product cards with quick actions
- Remove from favorites button
- Click to view product details
- Empty state: "No favorite products yet"
- Loading skeleton

**Layout:**
```
┌─────────────────────────────────────────┐
│  Favorites                              │
│  [Businesses] [Coupons] [Products]      │ ← New tab
├─────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │ P1 │ │ P2 │ │ P3 │ │ P4 │          │
│  │❤️×│ │❤️×│ │❤️×│ │❤️×│          │
│  └────┘ └────┘ └────┘ └────┘          │
└─────────────────────────────────────────┘
```

---

### 3. StorefrontLoadingState Component (`StorefrontLoadingState.tsx`)

**Location:** `src/components/business/StorefrontLoadingState.tsx`

**Purpose:** Full-page loading skeleton for storefront

**Features:**
- Skeleton for business header
- Skeleton for offers section (3 cards)
- Skeleton for products section (4 cards)
- Skeleton for reviews section (3 cards)
- Smooth animations (pulse/shimmer)

---

### 4. StorefrontErrorState Component (`StorefrontErrorState.tsx`)

**Location:** `src/components/business/StorefrontErrorState.tsx`

**Purpose:** Error state for storefront loading failure

**Props:**
```typescript
interface StorefrontErrorStateProps {
  error: Error;
  onRetry: () => void;
}
```

**Features:**
- Error icon/illustration
- Error message (user-friendly)
- Retry button
- Go back button

**Layout:**
```
┌─────────────────────────────────────────┐
│              ⚠️                         │
│                                         │
│     Failed to Load Business             │
│                                         │
│  We couldn't load this business page.   │
│  Please check your connection and       │
│  try again.                             │
│                                         │
│  [Retry] [Go Back]                      │
└─────────────────────────────────────────┘
```

---

### 5. EmptyOffersState Component (`EmptyOffersState.tsx`)

**Location:** `src/components/offers/EmptyOffersState.tsx`

**Purpose:** Empty state when business has no offers

**Layout:**
```
┌─────────────────────────────────────────┐
│              🎁                         │
│                                         │
│     No offers available                 │
│                                         │
│  This business hasn't posted any        │
│  offers yet. Check back later!          │
└─────────────────────────────────────────┘
```

---

### 6. ReviewsLoadingState Component (`ReviewsLoadingState.tsx`)

**Location:** `src/components/reviews/ReviewsLoadingState.tsx`

**Purpose:** Loading skeleton for reviews section

**Features:**
- 3 review card skeletons
- Animated shimmer effect

---

### 7. ReviewsEmptyState Component (Already specified in 4.8)

**Location:** `src/components/reviews/EmptyReviews.tsx`

**Purpose:** Empty state when no reviews exist

---

### 8. ReviewsErrorState Component (`ReviewsErrorState.tsx`)

**Location:** `src/components/reviews/ReviewsErrorState.tsx`

**Purpose:** Error state for review loading failure

**Props:**
```typescript
interface ReviewsErrorStateProps {
  onRetry: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│  ⚠️ Failed to load reviews              │
│  [Try Again]                            │
└─────────────────────────────────────────┘
```

---

### 9. InfiniteScrollReviews (Enhancement to `AllReviews.tsx`)

**Location:** `src/components/reviews/AllReviews.tsx`

**Purpose:** Infinite scroll for large review lists

**Implementation:**
- Use `react-infinite-scroll-component`
- Load 10 reviews per page
- Show loading indicator at bottom
- "No more reviews" message at end

---

## 🔧 Technical Implementation

### Product Favoriting Database Schema

**New Table: favorite_products**
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
CREATE INDEX idx_favorite_products_created ON favorite_products(created_at);

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

---

### Custom Hooks

#### 1. `useFavoriteProduct.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useFavoriteProduct(productId: string, productName?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check initial favorite status
  useEffect(() => {
    async function checkFavorited() {
      if (!user) {
        setIsFavorited(false);
        return;
      }

      const { data } = await supabase
        .from('favorite_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      setIsFavorited(!!data);
    }

    checkFavorited();
  }, [user, productId]);

  async function toggleFavorite() {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to favorite products.',
        variant: 'default'
      });
      return;
    }

    setLoading(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        await supabase
          .from('favorite_products')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        setIsFavorited(false);
        
        toast({
          title: 'Removed from favorites',
          description: productName ? `${productName} removed from favorites.` : 'Product removed from favorites.',
          variant: 'default'
        });
      } else {
        // Add to favorites
        await supabase
          .from('favorite_products')
          .insert({
            user_id: user.id,
            product_id: productId
          });

        setIsFavorited(true);
        
        toast({
          title: '❤️ Added to favorites!',
          description: productName ? `${productName} added to favorites.` : 'Product added to favorites.',
          variant: 'success'
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to update',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return { isFavorited, loading, toggleFavorite };
}
```

#### 2. `useFavoriteProducts.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useFavoriteProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('favorite_products')
          .select(`
            id,
            created_at,
            products (
              id,
              name,
              description,
              price,
              currency,
              images,
              category,
              in_stock,
              business_id,
              businesses (
                name
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setProducts(data?.map(fav => ({
          ...fav.products,
          business_name: fav.products.businesses?.name,
          favorited_at: fav.created_at
        })) || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [user]);

  return { products, loading, error };
}
```

#### 3. `useInfiniteReviews.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useInfiniteReviews(businessId: string) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  async function fetchReviews(pageNum: number) {
    const offset = (pageNum - 1) * PAGE_SIZE;

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (display_name, avatar_url),
        business_replies (text, created_at)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    return data || [];
  }

  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const data = await fetchReviews(1);
        setReviews(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, [businessId]);

  async function loadMore() {
    if (!hasMore || loading) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const data = await fetchReviews(nextPage);
      
      setReviews(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load more reviews:', err);
    } finally {
      setLoading(false);
    }
  }

  return { reviews, loading, hasMore, loadMore };
}
```

---

### Component Implementation

#### FavoriteProductButton.tsx

```typescript
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavoriteProduct } from '@/hooks/useFavoriteProduct';
import { cn } from '@/lib/utils';

interface FavoriteProductButtonProps {
  productId: string;
  productName?: string;
  variant?: 'icon' | 'button';
  initialFavorited?: boolean;
}

export function FavoriteProductButton({
  productId,
  productName,
  variant = 'icon',
  initialFavorited = false
}: FavoriteProductButtonProps) {
  const { isFavorited, loading, toggleFavorite } = useFavoriteProduct(
    productId,
    productName
  );

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleFavorite}
        disabled={loading}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          className={cn(
            'h-5 w-5',
            isFavorited && 'fill-red-500 text-red-500'
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      onClick={toggleFavorite}
      disabled={loading}
      variant={isFavorited ? 'default' : 'outline'}
      size="sm"
    >
      <Heart
        className={cn(
          'mr-2 h-4 w-4',
          isFavorited && 'fill-current'
        )}
      />
      {isFavorited ? 'Favorited' : 'Favorite'}
    </Button>
  );
}
```

---

### Update Favourites.tsx

**Add Products Tab:**
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFavoriteProducts } from '@/hooks/useFavoriteProducts';
import { ProductCard } from '@/components/products/ProductCard';

function Favourites() {
  const [activeTab, setActiveTab] = useState<'businesses' | 'coupons' | 'products'>('businesses');
  const { products, loading, error } = useFavoriteProducts();

  return (
    <div className="container py-8">
      <h1>Favorites</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        
        {/* Existing tabs */}
        
        <TabsContent value="products">
          {loading ? (
            <LoadingGrid count={4} />
          ) : error ? (
            <ErrorState error={error} />
          ) : products.length === 0 ? (
            <EmptyState
              icon="❤️"
              title="No favorite products yet"
              description="Start favoriting products to see them here!"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  businessName={product.business_name}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### Infinite Scroll Implementation

**Install dependency:**
```bash
npm install react-infinite-scroll-component
```

**Update AllReviews.tsx:**
```typescript
import InfiniteScroll from 'react-infinite-scroll-component';
import { useInfiniteReviews } from '@/hooks/useInfiniteReviews';

function AllReviews({ businessId }: Props) {
  const { reviews, loading, hasMore, loadMore } = useInfiniteReviews(businessId);

  return (
    <div>
      <h1>All Reviews</h1>
      
      <InfiniteScroll
        dataLength={reviews.length}
        next={loadMore}
        hasMore={hasMore}
        loader={<ReviewsLoadingState />}
        endMessage={
          <p className="text-center text-muted-foreground py-8">
            No more reviews to load
          </p>
        }
      >
        {reviews.map(review => (
          <ReviewCard key={review.id} review={review} variant="full" />
        ))}
      </InfiniteScroll>
    </div>
  );
}
```

---

## 🔄 Integration with Existing Components

### Update `BusinessProfile.tsx`

**Add loading and error states:**
```typescript
function BusinessProfile({ businessId }: Props) {
  const { business, loading, error } = useBusiness(businessId);

  if (loading) {
    return <StorefrontLoadingState />;
  }

  if (error) {
    return <StorefrontErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div>
      {/* Business content */}
      
      {/* Offers with empty state */}
      {business.offers.length === 0 ? (
        <EmptyOffersState />
      ) : (
        <OffersSection offers={business.offers} />
      )}
      
      {/* Products with empty state */}
      {business.products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No products yet"
          description="This business hasn't added any products."
        />
      ) : (
        <ProductGrid products={business.products} />
      )}
      
      {/* Reviews with states */}
      <ReviewsSection businessId={businessId} />
    </div>
  );
}
```

---

## 🧪 Testing Requirements

### Unit Tests

```typescript
describe('useFavoriteProduct', () => {
  test('toggles favorite status', async () => {
    const { result } = renderHook(() => useFavoriteProduct('prod-123', 'Test Product'));
    
    expect(result.current.isFavorited).toBe(false);
    
    await act(async () => {
      await result.current.toggleFavorite();
    });
    
    expect(result.current.isFavorited).toBe(true);
  });

  test('shows toast on toggle', async () => {
    const { result } = renderHook(() => useFavoriteProduct('prod-123', 'Test Product'));
    
    await act(async () => {
      await result.current.toggleFavorite();
    });
    
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Added to favorites')
      })
    );
  });
});

describe('useInfiniteReviews', () => {
  test('loads initial reviews', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useInfiniteReviews('biz-123')
    );

    await waitForNextUpdate();

    expect(result.current.reviews).toHaveLength(10);
    expect(result.current.hasMore).toBe(true);
  });

  test('loads more reviews on request', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useInfiniteReviews('biz-123')
    );

    await waitForNextUpdate();

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.reviews.length).toBeGreaterThan(10);
  });
});
```

### E2E Tests

```typescript
test('customer can favorite and unfavorite product', async ({ page }) => {
  await page.goto('/business/test-biz/product/test-prod');
  
  // Favorite product
  await page.click('[aria-label="Add to favorites"]');
  await expect(page.locator('[data-testid="toast"]')).toContainText('Added to favorites');
  
  // Verify in favorites page
  await page.goto('/favorites');
  await page.click('text=Products');
  await expect(page.locator('[data-testid="product-card"]')).toBeVisible();
  
  // Unfavorite
  await page.click('[aria-label="Remove from favorites"]');
  await expect(page.locator('[data-testid="toast"]')).toContainText('Removed from favorites');
  
  // Verify empty state
  await expect(page.locator('text=No favorite products yet')).toBeVisible();
});

test('infinite scroll loads more reviews', async ({ page }) => {
  await page.goto('/business/test-biz/reviews');
  
  // Initial load
  const initialCount = await page.locator('[data-testid="review-card"]').count();
  expect(initialCount).toBe(10);
  
  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  
  // Wait for more reviews to load
  await page.waitForTimeout(1000);
  
  const newCount = await page.locator('[data-testid="review-card"]').count();
  expect(newCount).toBeGreaterThan(initialCount);
});

test('shows loading state while fetching storefront', async ({ page }) => {
  // Slow down network to see loading state
  await page.route('**/api/businesses/*', route => {
    setTimeout(() => route.continue(), 2000);
  });
  
  await page.goto('/business/test-biz');
  
  // Verify loading skeleton visible
  await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
  
  // Wait for content
  await expect(page.locator('h1')).toContainText(/Business Name/);
});
```

---

## ✅ Acceptance Criteria

### Functional Requirements
- [x] Products can be favorited/unfavorited
- [x] Favorited products appear in Products tab
- [x] Products tab integrated into Favourites page
- [x] Loading skeletons shown during data fetch
- [x] Empty states shown when no content
- [x] Error states shown with retry option
- [x] Infinite scroll loads more reviews
- [x] Toast notifications for favorite actions
- [x] All states are accessible

### Non-Functional Requirements
- [x] Favorite toggle < 500ms response
- [x] Infinite scroll seamless (no jank)
- [x] Loading states smooth animations
- [x] Empty states friendly and helpful
- [x] Error messages user-friendly

---

## 📝 Implementation Checklist

- [ ] Create `favorite_products` table + RLS
- [ ] Create `useFavoriteProduct` hook
- [ ] Create `useFavoriteProducts` hook
- [ ] Create `useInfiniteReviews` hook
- [ ] Create `FavoriteProductButton` component
- [ ] Add Products tab to `Favourites.tsx`
- [ ] Create `StorefrontLoadingState` component
- [ ] Create `StorefrontErrorState` component
- [ ] Create `EmptyOffersState` component
- [ ] Create `ReviewsLoadingState` component
- [ ] Create `ReviewsErrorState` component
- [ ] Implement infinite scroll in `AllReviews.tsx`
- [ ] Update `BusinessProfile.tsx` with states
- [ ] Write unit tests
- [ ] Write E2E tests

---

## 🔗 Related Documentation

- [Story 4.7: Product Display](./STORY_4.7_Product_Display_Details.md)
- [Story 4.8: Review Display](./STORY_4.8_Review_Display_Integration.md)
- [Story 4.4: Favorites System](./STORY_4.4_Favorites.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Mermaid Coverage:** 11/11 nodes (100%)  
**Ready for Implementation:** ✅ YES

---

*Last Updated: October 16, 2025*  
*Next Review: After implementation completion*
