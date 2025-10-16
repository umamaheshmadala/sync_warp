# Remaining Fixes - Implementation Plan

## ✅ Completed (Just Now)
1. **Share modal flickering fixed** - Using React Portal
2. **Auto-redirect logged-in users** - Landing page now redirects to dashboard

---

## 🔨 Remaining Tasks

### 3. Add Persistent Header and Bottom Navigation

**Goal:** Header and bottom nav should appear on every page across the entire app

**Implementation Steps:**

1. **Create AppLayout Component** (`src/components/layout/AppLayout.tsx`):
```tsx
import { useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Don't show header/nav on auth pages
  const isAuthPage = location.pathname.startsWith('/auth');
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
```

2. **Update App.tsx** to wrap routes with AppLayout:
```tsx
import AppLayout from './components/layout/AppLayout';

function App() {
  return (
    <AppLayout>
      <Routes>
        {/* all routes */}
      </Routes>
    </AppLayout>
  );
}
```

3. **Create/Update Header Component** (`src/components/layout/Header.tsx`):
```tsx
- Logo + Brand
- Search bar (if applicable)
- Navigation links (Dashboard, Browse, Wallet)
- Wishlist icon with badge
- Notifications
- User profile dropdown with avatar
```

4. **Create/Update BottomNav Component** (`src/components/layout/BottomNav.tsx`):
```tsx
// Mobile-friendly bottom navigation
- Home
- Search/Browse
- Wishlist
- Wallet
- Profile
```

---

### 4. Show User Profile Image in Header

**Files to modify:**
- `src/components/layout/Header.tsx`

**Implementation:**
```tsx
import { useAuthStore } from '../../store/authStore';

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  
  return (
    <header>
      {/* ... */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            View Profile
          </DropdownMenuItem>
          {/* ... */}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

**Components needed:**
- `Avatar` from `@/components/ui/avatar`
- `DropdownMenu` from `@/components/ui/dropdown-menu`

---

### 5. Add Products Tab to Favorites Page

**File:** `src/components/favorites/UnifiedFavoritesPage.tsx`

**Current tabs:** Businesses, Coupons  
**Add:** Products tab

**Implementation:**
```tsx
import { simpleFavoritesService } from '../../services/simpleFavoritesService';
import { ProductCard } from '../products/ProductCard';

// Inside component:
const [productFavorites, setProductFavorites] = useState<Product[]>([]);

useEffect(() => {
  loadProductFavorites();
}, []);

const loadProductFavorites = async () => {
  const favorites = await simpleFavoritesService.getFavorites('product');
  
  // Fetch actual product data
  const productIds = favorites.map(f => f.entity_id);
  const { data } = await supabase
    .from('business_products')
    .select('*')
    .in('id', productIds);
    
  setProductFavorites(data || []);
};

// Add Products tab to tabs array:
const tabs = [
  { id: 'businesses', label: 'Businesses', count: businesses.length },
  { id: 'coupons', label: 'Coupons', count: coupons.length },
  { id: 'products', label: 'Products', count: productFavorites.length }, // NEW
];

// Add Products content section:
{activeTab === 'products' && (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {productFavorites.map(product => (
      <ProductCard 
        key={product.id} 
        product={product} 
        showActions={true}
      />
    ))}
  </div>
)}
```

---

### 6. Integrate Wishlist Icon in Header

**File:** `src/components/layout/Header.tsx`

**Implementation:**
```tsx
import { List } from 'lucide-react';
import { useSimpleProductSocial } from '../../hooks/useSimpleProductSocial';
import { Badge } from '../ui/badge';

export default function Header() {
  const { wishlistCount } = useSimpleProductSocial();
  
  return (
    <header>
      {/* ... other items ... */}
      
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => navigate('/wishlist')}
      >
        <List className="h-5 w-5" />
        {wishlistCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            variant="destructive"
          >
            {wishlistCount}
          </Badge>
        )}
      </Button>
      
      {/* ... */}
    </header>
  );
}
```

---

### 7. Fix Wishlist Real-Time Removal

**Problem:** Product not removed from wishlist view until page refresh

**File:** `src/pages/WishlistPage.tsx`

**Solution:** Use a refresh key or effect dependency

```tsx
export default function WishlistPage() {
  const { wishlistCount } = useSimpleProductSocial();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    loadWishlistProducts();
  }, [user, wishlistCount, refreshKey]); // Add refreshKey dependency
  
  // When product is removed from wishlist, it will trigger:
  // 1. wishlistCount change (from useSimpleProductSocial)
  // 2. This will re-trigger loadWishlistProducts()
  // 3. Products list will update automatically
  
  return (
    // ... JSX
  );
}
```

**Alternative approach - Use custom event:**
```tsx
// In useSimpleProductSocial.ts, after toggling wishlist:
window.dispatchEvent(new CustomEvent('wishlistChanged'));

// In WishlistPage.tsx:
useEffect(() => {
  const handleWishlistChange = () => {
    loadWishlistProducts();
  };
  
  window.addEventListener('wishlistChanged', handleWishlistChange);
  return () => window.removeEventListener('wishlistChanged', handleWishlistChange);
}, []);
```

---

### 8. Add X Button to Remove from Wishlist

**Goal:** Add a remove button with confirmation dialog to product cards in wishlist

**Option A: Modify ProductCard to accept onRemove prop**

**File:** `src/components/products/ProductCard.tsx`

```tsx
interface ProductCardProps {
  product: Product;
  size?: 'small' | 'medium' | 'large';
  showActions?: boolean;
  showRemoveButton?: boolean; // NEW
  onRemove?: () => void; // NEW
  onClick?: () => void;
}

export function ProductCard({
  product,
  showRemoveButton = false,
  onRemove,
  // ... other props
}: ProductCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDialog(true);
  };
  
  const confirmRemove = () => {
    onRemove?.();
    setShowConfirmDialog(false);
  };
  
  return (
    <>
      <Card>
        {/* ... existing content ... */}
        
        {/* Remove Button (only show in wishlist) */}
        {showRemoveButton && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 bg-white/80 hover:bg-red-50 hover:text-red-600"
            onClick={handleRemoveClick}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </Card>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Wishlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{product.name}" from your wishlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

**Usage in WishlistPage:**
```tsx
<ProductCard
  key={product.id}
  product={product}
  showActions={true}
  showRemoveButton={true}
  onRemove={() => handleRemoveFromWishlist(product.id)}
/>
```

---

## Implementation Order

**Phase 1: Layout Infrastructure (Do First)**
1. Create AppLayout component
2. Create Header component with wishlist icon
3. Create BottomNav component
4. Integrate into App.tsx

**Phase 2: Favorites Enhancements**
5. Add Products tab to Favorites page
6. Show user avatar in header

**Phase 3: Wishlist Improvements**
7. Fix wishlist real-time removal
8. Add X button with confirmation dialog

---

## Component Dependencies

**UI Components Needed:**
- `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`
- `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction` from `@/components/ui/alert-dialog`
- `Badge` from `@/components/ui/badge`

Check if these exist in `src/components/ui/`. If not, they need to be created using shadcn/ui.

---

## Files to Create/Modify

**Create:**
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/BottomNav.tsx`

**Modify:**
- `src/App.tsx` - Wrap with AppLayout
- `src/components/favorites/UnifiedFavoritesPage.tsx` - Add Products tab
- `src/components/products/ProductCard.tsx` - Add remove button support
- `src/pages/WishlistPage.tsx` - Add real-time updates and use remove button
- `src/hooks/useSimpleProductSocial.ts` - Optionally dispatch custom event

---

## Testing Checklist

After implementation:

- [ ] Header appears on all pages except auth pages
- [ ] Bottom nav appears on all pages on mobile
- [ ] Wishlist icon in header shows correct count
- [ ] Clicking wishlist icon navigates to /wishlist
- [ ] User avatar displays in header
- [ ] Clicking avatar shows dropdown with "View Profile"
- [ ] Favorites page has Products tab
- [ ] Products tab shows favorited products
- [ ] Removing product from wishlist updates UI immediately
- [ ] X button appears on product cards in wishlist
- [ ] Clicking X shows confirmation dialog
- [ ] Confirming removal removes product from wishlist

---

## Notes

- The layout changes are significant - test thoroughly on mobile and desktop
- Consider responsive breakpoints for header/bottom nav
- Wishlist count badge should update across all pages
- Avatar fallback should use user's first letter or a default icon
- Confirmation dialog prevents accidental removals

---

## Next Steps

1. Review this plan
2. Implement Phase 1 (Layout Infrastructure)
3. Test layout on different screen sizes
4. Implement Phase 2 (Favorites)
5. Implement Phase 3 (Wishlist)
6. Full testing pass
7. Commit and deploy

Would you like me to start implementing any of these phases?
