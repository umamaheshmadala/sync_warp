# Stories 4.1-4.4 Quick Reference Guide

## 🗺️ **Component Map**

### **Search & Discovery (`/src/components/`)**
```
search/
├── AdvancedSearchPage.tsx     # Multi-filter search interface
├── BusinessCard.tsx           # Enhanced business display with favorites
└── CouponCard.tsx            # Coupon display with save functionality

discovery/
├── BusinessDiscoveryPage.tsx  # Location-based business browsing
└── CategoryBrowserPage.tsx    # Visual category exploration

coupons/
└── TrendingCouponsPage.tsx   # Analytics-driven trending deals
```

### **Favorites System (`/src/components/favorites/`)**
```
favorites/
├── UnifiedFavoritesPage.tsx     # MAIN: Advanced unified favorites
├── FallbackEnhancedFavoritesPage.tsx  # Backup compatibility
├── SimpleFavoritesPage.tsx      # Basic favorites management
├── FavoritesPage.tsx           # Legacy favorites page
└── SimpleSaveButton.tsx        # Heart icon save component
```

### **Business Management (`/src/components/business/`)**
```
business/
├── BusinessDashboard.tsx       # Business owner dashboard
├── ModernBusinessDashboard.tsx # Enhanced dashboard
├── ProductManagerPage.tsx     # Product catalog management
└── CouponManagerPage.tsx      # Coupon creation and analytics
```

### **Debug Tools (`/src/components/debug/`)**
```
debug/
├── FavoritesDataDebug.tsx      # Favorites data inspection/repair
├── ComprehensiveFavoritesDebug.tsx  # Complete favorites debugging
├── HeartIconTest.tsx           # Heart icon behavior testing
├── LocationTester.tsx          # GPS and location testing
├── ProductsDebug.tsx           # Product system debugging
├── RouterDebugger.tsx          # Navigation state monitoring
└── ReloadDebugger.tsx         # App state persistence testing
```

---

## 🔗 **Hook Reference (`/src/hooks/`)**

### **Core Functionality Hooks**
```typescript
// Unified Favorites (RECOMMENDED)
import useUnifiedFavorites from './hooks/useUnifiedFavorites';

// Advanced Search
import useAdvancedSearch from './hooks/useAdvancedSearch';

// Location Services
import useAdvancedLocation from './hooks/useAdvancedLocation';
import useGeolocation from './hooks/useGeolocation';

// Business Management
import useBusiness from './hooks/useBusiness';
import useCoupons from './hooks/useCoupons';
import useCouponDrafts from './hooks/useCouponDrafts';
```

### **Legacy/Compatibility Hooks**
```typescript
// Legacy Favorites (avoid in new code)
import useFavorites from './hooks/useFavorites';
import useLocalFavorites from './hooks/useLocalFavorites';
import useEnhancedFavorites from './hooks/useEnhancedFavorites';
```

---

## 🛣️ **Route Map**

### **Main Application Routes**
```typescript
// Core Features
'/search/advanced'     // AdvancedSearchPage
'/discovery'           // BusinessDiscoveryPage  
'/categories'          // CategoryBrowserPage
'/coupons/trending'    // TrendingCouponsPage
'/favorites'           // UnifiedFavoritesPage (MAIN)

// Alternative Favorites Routes
'/favorites/simple'    // SimpleFavoritesPage
'/favorites/fallback'  // FallbackEnhancedFavoritesPage

// Analytics & Insights
'/analytics/search'    // SearchAnalyticsDashboard

// Business Management
'/business/dashboard'  // BusinessDashboard
'/business/:id/products'  // ProductManagerPage
'/business/:id/coupons'   // CouponManagerPage
```

---

## ⚡ **Quick Implementation Examples**

### **Adding Favorites to Any Component**
```typescript
import { SimpleSaveButton } from '../favorites/SimpleSaveButton';

// For businesses
<SimpleSaveButton 
  itemId={business.id}
  itemType="business"
  size="md"
  itemData={{
    business_name: business.business_name,
    business_type: business.business_type,
    address: business.address,
    rating: business.rating
  }}
/>

// For coupons
<SimpleSaveButton 
  itemId={coupon.id}
  itemType="coupon"
  size="sm"
  itemData={{
    title: coupon.title,
    description: coupon.description,
    business_name: coupon.business_name
  }}
/>
```

### **Using Unified Favorites Hook**
```typescript
import useUnifiedFavorites from '../hooks/useUnifiedFavorites';

function MyComponent() {
  const favorites = useUnifiedFavorites();
  
  return (
    <div>
      <p>Total Favorites: {favorites.counts.total}</p>
      <p>Businesses: {favorites.counts.businesses}</p>
      <p>Coupons: {favorites.counts.coupons}</p>
      
      {/* Debug buttons (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <button onClick={favorites.seedTestData}>Add Test Data</button>
          <button onClick={favorites.clearAllFavorites}>Clear All</button>
        </>
      )}
    </div>
  );
}
```

### **Adding Debug Tools (Development Only)**
```typescript
import FavoritesDataDebug from '../debug/FavoritesDataDebug';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      {/* Debug panel (development only) */}
      {process.env.NODE_ENV === 'development' && <FavoritesDataDebug />}
    </div>
  );
}
```

---

## 🔧 **Common Issues & Solutions**

### **Favorites Issues**
```typescript
// Problem: UUIDs showing instead of names
// Solution: Ensure itemData is passed correctly

// ❌ Wrong - no itemData
<SimpleSaveButton itemId={id} itemType="business" />

// ✅ Correct - with itemData
<SimpleSaveButton 
  itemId={id} 
  itemType="business"
  itemData={{ business_name: name, business_type: type }}
/>
```

### **Location Issues**
```typescript
// Problem: Location permission denied
// Solution: Use fallback and handle gracefully

const { currentLocation, error, requestPermission } = useAdvancedLocation();

if (error === 'PERMISSION_DENIED') {
  // Show manual location input or use IP-based location
}
```

### **Search Performance**
```typescript
// Problem: Too many search requests
// Solution: Use debouncing in search hooks

const { searchResults, isLoading } = useAdvancedSearch({
  debounceMs: 300  // Built-in debouncing
});
```

---

## 📋 **Testing Checklist**

### **Favorites System**
- [ ] Heart icons respond immediately
- [ ] Favorites persist after page refresh
- [ ] Changes sync across components
- [ ] Search and filter work properly
- [ ] Debug tools function correctly

### **Search & Discovery**
- [ ] Multi-filter search works
- [ ] Location-based results accurate
- [ ] Suggestions appear quickly
- [ ] Analytics tracking functional
- [ ] Error states handled gracefully

### **Business Discovery**
- [ ] Distance calculations correct
- [ ] Category filtering works
- [ ] Map integration functional
- [ ] Business cards display properly
- [ ] Save buttons work on all cards

---

## 🗄️ **Data Structures**

### **Unified Favorite Item**
```typescript
interface UnifiedFavorite {
  id: string;
  type: 'business' | 'coupon';
  timestamp: number;
  synced?: boolean;
  itemData?: {
    // For businesses
    business_name?: string;
    business_type?: string;
    address?: string;
    rating?: number;
    // For coupons
    title?: string;
    description?: string;
    business_name?: string;
  };
}
```

### **Search Result Structure**
```typescript
interface SearchBusiness {
  id: string;
  business_name: string;
  business_type: string;
  address: string;
  rating?: number;
  distance?: number;
  activeCouponsCount?: number;
}

interface SearchCoupon {
  id: string;
  title: string;
  description: string;
  business: {
    id: string;
    business_name: string;
  };
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  valid_until: string;
}
```

---

## 🚀 **Performance Tips**

### **Lazy Loading**
All major components use lazy loading:
```typescript
const BusinessDiscoveryPage = lazy(() => import('../discovery/BusinessDiscoveryPage'));
const TrendingCouponsPage = lazy(() => import('../coupons/TrendingCouponsPage'));
```

### **Caching**
- Search results cached for 5 minutes
- Location data cached per session  
- Favorites stored in localStorage

### **Optimization**
- Debounced search inputs (300ms)
- Throttled scroll events (100ms)
- Memoized expensive calculations

---

## ⚠️ **Production Considerations**

### **Remove Debug Components**
```typescript
// Make sure these are only in development
{process.env.NODE_ENV === 'development' && <DebugComponent />}
```

### **Environment Variables**
```env
# Required
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
VITE_MAPS_API_KEY=your_maps_api_key
```

### **Bundle Size**
- All debug tools excluded in production build
- Lazy loading reduces initial bundle
- Tree shaking removes unused code

---

*Last updated: September 28, 2025*
*For detailed documentation, see individual component files and README files.*