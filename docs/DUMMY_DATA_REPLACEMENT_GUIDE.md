# Dummy Data Replacement Guide

This guide tracks all dummy/mock data in the project and provides instructions for replacing it with real Supabase data.

## 🎯 **Status Overview**

### ✅ **Completed**
- Created `useDashboardStats` hook for real user statistics
- Created `useDashboardContent` hook for real business/offer/product data
- Marked remaining dummy data with `[DUMMY]` tags for easy identification

### 🟡 **In Progress**
- Dashboard component updates (see below)
- Bottom navigation badge updates

### ⏳ **Pending**
- Review analytics and trending algorithms
- Rating system implementation

---

## 📋 **Files with Dummy Data**

### **1. Dashboard.tsx** 🔴 HIGH PRIORITY

**Location:** `src/components/Dashboard.tsx`

**Current Dummy Data:**
```typescript
// Lines 51-70: spotlightBusinesses - Hardcoded
const [spotlightBusinesses] = useState<BusinessCard[]>([{
  id: '1',
  name: 'Urban Coffee Roasters',
  category: 'Cafe',
  // ... more hardcoded data
}]);

// Lines 73-90: hotOffers - Hardcoded
const [hotOffers] = useState<OfferCard[]>([{
  id: '1',
  title: '50% off on Weekend Brunch',
  // ... more hardcoded data
}]);

// Lines 92-96: trendingProducts - Hardcoded
const [trendingProducts] = useState([{
  id: '1',
  name: 'Artisan Coffee Beans',
  // ... more hardcoded data
}]);

// Lines 150, 167: Stats - Hardcoded
<p className="text-2xl font-bold">12</p> // Favorites
<p className="text-2xl font-bold">5</p>  // Reviews
```

**Replacement Strategy:**
```typescript
// Replace with:
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDashboardContent } from '../hooks/useDashboardContent';

const Dashboard: React.FC = () => {
  const stats = useDashboardStats();
  const { spotlightBusinesses, hotOffers, trendingProducts, loading } = useDashboardContent();
  
  // Use stats.favoritesCount, stats.reviewsCount
  // Use real data from hooks
};
```

**Implementation Steps:**
1. Import the new hooks
2. Replace useState with hook calls
3. Update JSX to use real data
4. Handle loading and error states
5. Test with real Supabase data

---

### **2. BottomNavigation.tsx** 🟡 MEDIUM PRIORITY

**Location:** `src/components/BottomNavigation.tsx`

**Current Dummy Data:**
```typescript
// Line 63-71: Wallet badge - Hardcoded
{
  id: 'wallet',
  label: 'Wallet',
  icon: Wallet,
  route: '/wallet',
  badge: 3, // [DUMMY] Should fetch from user's wallet
  color: 'text-gray-500',
  activeColor: 'text-purple-600'
},
```

**Replacement Strategy:**
```typescript
// Create useCouponBadgeCount hook
import { useDashboardStats } from '../hooks/useDashboardStats';

const BottomNavigation: React.FC = () => {
  const { collectedCouponsCount } = useDashboardStats();
  
  const navItems: NavItem[] = [
    // ...other items
    {
      id: 'wallet',
      label: 'Wallet',
      icon: Wallet,
      route: '/wallet',
      badge: collectedCouponsCount, // Real data
      color: 'text-gray-500',
      activeColor: 'text-purple-600'
    },
  ];
};
```

---

### **3. useDashboardContent.ts** 🟢 DOCUMENTED AS DUMMY

**Location:** `src/hooks/useDashboardContent.ts`

**Current Dummy Data (Marked):**
```typescript
// Lines 66-67: Ratings - Calculated randomly
rating: 4.5 + (Math.random() * 0.5), // [DUMMY] Replace with real ratings
review_count: Math.floor(Math.random() * 100) + 20, // [DUMMY] Replace with real review counts
```

**Replacement Strategy:**
```sql
-- Create business_ratings table
CREATE TABLE business_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES profiles(id),
  rating DECIMAL(2,1) CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- Create view for average ratings
CREATE VIEW business_average_ratings AS
SELECT 
  business_id,
  AVG(rating) as avg_rating,
  COUNT(*) as review_count
FROM business_ratings
GROUP BY business_id;
```

Then update query:
```typescript
const { data: businessesData } = await supabase
  .from('businesses')
  .select(`
    id, name, category, city, logo_url, cover_image_url,
    business_average_ratings (
      avg_rating,
      review_count
    )
  `)
  .eq('status', 'active')
  // ... rest of query
```

---

## 🛠️ **Implementation Priority**

### **Phase 1: Critical User Data** ✅ DONE
- [x] Created useDashboardStats hook
- [x] Created useDashboardContent hook

### **Phase 2: Dashboard Updates** ⏳ PENDING
- [ ] Update Dashboard.tsx to use new hooks
- [ ] Remove hardcoded spotlightBusinesses
- [ ] Remove hardcoded hotOffers
- [ ] Remove hardcoded trendingProducts
- [ ] Remove hardcoded stats
- [ ] Add loading states
- [ ] Add error handling

### **Phase 3: Navigation Updates** ⏳ PENDING
- [ ] Update BottomNavigation to use real badge counts
- [ ] Test badge updates in real-time

### **Phase 4: Rating System** ⏳ PENDING
- [ ] Create business_ratings table
- [ ] Create rating migration
- [ ] Update useDashboardContent to use real ratings
- [ ] Add rating UI components

---

## 📊 **Database Schema Updates Needed**

### **1. Business Ratings**
```sql
-- Migration: 20250121_create_business_ratings.sql
CREATE TABLE IF NOT EXISTS business_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

CREATE INDEX idx_business_ratings_business_id ON business_ratings(business_id);
CREATE INDEX idx_business_ratings_user_id ON business_ratings(user_id);

-- View for average ratings
CREATE OR REPLACE VIEW business_average_ratings AS
SELECT 
  business_id,
  ROUND(AVG(rating)::numeric, 1) as avg_rating,
  COUNT(*) as review_count
FROM business_ratings
GROUP BY business_id;
```

### **2. Product Analytics**
```sql
-- For trending products, add view_count or popularity_score
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS popularity_score DECIMAL(5,2) DEFAULT 0;

CREATE INDEX idx_products_popularity ON products(popularity_score DESC);
```

---

## 🎨 **UI Patterns for Real Data**

### **Loading States**
```typescript
if (loading) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-gray-200 rounded-2xl"></div>
      <div className="h-32 bg-gray-200 rounded-2xl"></div>
    </div>
  );
}
```

### **Empty States**
```typescript
if (!spotlightBusinesses.length) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">No businesses found in your area yet.</p>
      <button onClick={() => navigate('/search')}>
        Explore All Cities
      </button>
    </div>
  );
}
```

### **Error States**
```typescript
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-red-600">{error}</p>
      <button onClick={retry}>Try Again</button>
    </div>
  );
}
```

---

## 🔍 **Testing Checklist**

### **Before Deployment:**
- [ ] Verify all Supabase queries return data
- [ ] Test with empty database (no data scenario)
- [ ] Test with user who has no favorites/reviews
- [ ] Test loading states
- [ ] Test error handling
- [ ] Verify RLS policies allow data access
- [ ] Test real-time updates (if applicable)
- [ ] Check performance with large datasets

### **Manual Testing:**
1. Create new user account
2. Check dashboard shows 0 for all stats
3. Add favorites and verify count updates
4. Write reviews and verify count updates
5. Follow businesses and verify count updates
6. Collect coupons and verify badge updates

---

## 📝 **Quick Reference Commands**

### **Check for Dummy Data:**
```bash
# Find all [DUMMY] markers
grep -r "\[DUMMY\]" src/

# Find hardcoded arrays
grep -r "const.*=.*\[{" src/components/

# Find hardcoded badge counts
grep -r "badge.*:.*[0-9]" src/components/
```

### **Test Supabase Queries:**
```sql
-- Check user stats
SELECT 
  (SELECT COUNT(*) FROM favorites WHERE user_id = 'your-user-id') as favorites,
  (SELECT COUNT(*) FROM business_reviews WHERE user_id = 'your-user-id') as reviews,
  (SELECT COUNT(*) FROM business_followers WHERE user_id = 'your-user-id') as following;
  
-- Check active businesses
SELECT COUNT(*) FROM businesses WHERE status = 'active';

-- Check active coupons
SELECT COUNT(*) FROM coupons WHERE status = 'active' AND expires_at > NOW();
```

---

## 🚀 **Next Steps**

1. **Immediate (Today):**
   - Update Dashboard.tsx to use new hooks
   - Update BottomNavigation.tsx badge count
   - Test with real data

2. **Short-term (This Week):**
   - Create business_ratings table
   - Implement rating system
   - Add product popularity tracking

3. **Long-term (Next Sprint):**
   - Add trending algorithm (views + time decay)
   - Implement personalized recommendations
   - Add A/B testing for dashboard layouts

---

## ⚠️ **Important Notes**

1. **Always mark dummy data**: Use `// [DUMMY]` comment for any remaining mock data
2. **Handle empty states**: Real data might be empty for new users
3. **RLS policies**: Ensure policies allow reading necessary data
4. **Performance**: Use indexes for frequently queried fields
5. **Caching**: Consider adding client-side cache for dashboard data

---

**Last Updated:** January 21, 2025  
**Status:** Hooks created, Dashboard updates pending  
**Next Review:** After Dashboard implementation