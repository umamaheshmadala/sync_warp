# Coupon Issues - Comprehensive Fix Guide

## Issues Identified

1. **Collect button state not matching actual collection status** (Search page)
2. **"Failed to collect coupon" error** (Search page)
3. **Coupon overflow in wallet** - components not fully visible
4. **Deleted coupons don't reactivate collect button**
5. **Shared coupons should prevent re-collection**
6. **Missing coupon details modal** - Need modal with full T&C, validity, description

## Root Causes

### Issue 1 & 2: Collection State & Errors
- The `useSearch` hook fetches user collections at lines 318-330 but only once per search
- The `isCollected` field is set correctly initially, but not updated after collection
- The `collectCoupon` function in `useSearch.ts` needs to refresh the collection state
- The coupon service `collectCoupon` method properly handles database operations

### Issue 3: Wallet Overflow
- CouponWallet.tsx at line 380 uses hardcoded class that causes overflow
- Need to add proper responsive classes and ensure proper card sizing

### Issue 4 & 5: Deletion and Sharing Logic
- Need to track coupon collection status properly
- Shared coupons need a flag (`has_been_shared`) to prevent re-collection
- Deleted coupons need proper cleanup from `user_coupon_collections` table

## Solutions

### Solution 1: Fix Collection State Sync

**File:** `src/hooks/useSearch.ts`

Add a function to refresh collection state after collecting:

```typescript
// After line 330, add:
const refreshCollectionState = useCallback(async () => {
  if (!user?.id) return;
  
  try {
    const { data: userCollections } = await supabase
      .from('user_coupon_collections')
      .select('coupon_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    if (userCollections) {
      const collectedIds = new Set(userCollections.map(c => c.coupon_id));
      
      // Update results with new collection state
      setResults(prev => ({
        ...prev,
        coupons: prev.coupons.map(coupon => ({
          ...coupon,
          isCollected: collectedIds.has(coupon.id)
        }))
      }));
    }
  } catch (error) {
    console.error('Error refreshing collection state:', error);
  }
}, [user?.id]);
```

Modify the `collectCoupon` function (around line 650):

```typescript
collectCoupon: useCallback(async (couponId: string) => {
  if (!user?.id) {
    toast.error('Please login to collect coupons');
    return false;
  }

  try {
    console.log('🎫 [useSearch] Collecting coupon:', couponId);
    const success = await collectCoupon(couponId, user.id, 'search_page');
    
    if (success) {
      // Refresh the collection state
      await refreshCollectionState();
      toast.success('Coupon collected successfully!');
    }
    
    return success;
  } catch (error: any) {
    console.error('❌ [useSearch] Collection error:', error);
    toast.error(error.message || 'Failed to collect coupon');
    return false;
  }
}, [user?.id, collectCoupon, refreshCollectionState]),
```

### Solution 2: Fix Wallet Overflow

**File:** `src/components/user/CouponWallet.tsx`

Replace line 380 with proper responsive classes:

```typescript
className={`bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 cursor-pointer ${\n  status === 'expired' || isRedeemed \n    ? 'border-gray-200 opacity-75' \n    : status === 'expiring'\n    ? 'border-yellow-300 shadow-md'\n    : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'\n}`}
```

Update the grid container at line 802:

```typescript
className={`grid gap-6 ${\n  viewMode === 'grid' \n    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' \n    : 'grid-cols-1'\n}`}
```

Fix content wrapping at line 440:

```typescript
<div className="p-4 pt-8 space-y-3">
  <div className="flex items-start justify-between mb-2">
    <h3 className="font-semibold text-gray-900 text-base leading-tight flex-1 min-w-0 pr-2 line-clamp-2">
      {coupon.title}
    </h3>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onRemove(collection.id);
      }}
      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
  
  <p className="text-sm text-gray-600 line-clamp-2 break-words">{coupon.description}</p>
```

### Solution 3: Handle Deletion and Re-collection

**File:** `src/services/couponService.ts`

The `collectCoupon` method already checks for existing collections (line 587-599). We need to ensure proper status handling:

Modify the collection check to exclude deleted/shared coupons:

```typescript
// Check if user already collected this coupon (active status only)
const { data: existing, error: existingError } = await supabase
  .from('user_coupon_collections')
  .select('id, status, has_been_shared')
  .eq('user_id', userId)
  .eq('coupon_id', couponId)
  .in('status', ['active'])  // Only check active collections
  .maybeSingle();

if (existingError) throw existingError;

if (existing) {
  // If the coupon was shared, don't allow re-collection
  if (existing.has_been_shared) {
    throw new Error('This coupon was shared and cannot be collected again');
  }
  throw new Error('You have already collected this coupon');
}
```

**File:** `src/hooks/useCoupons.ts`

Ensure the removal function properly marks collections as deleted:

```typescript
removeCouponCollection: async (collectionId: string) => {
  try {
    // Soft delete by updating status
    const { error } = await supabase
      .from('user_coupon_collections')
      .update({ 
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', collectionId);

    if (error) throw error;

    // Clear cache
    couponService.cache.invalidate(`user_coupons_${user?.id}`);
    
    return true;
  } catch (error) {
    console.error('Error removing coupon:', error);
    throw error;
  }
}
```

### Solution 4: Database Schema Updates

Add migration file: `supabase/migrations/20250203_add_coupon_sharing_tracking.sql`

```sql
-- Add has_been_shared flag to track if coupon was shared
ALTER TABLE user_coupon_collections 
ADD COLUMN IF NOT EXISTS has_been_shared BOOLEAN DEFAULT FALSE;

-- Add deleted_at timestamp
ALTER TABLE user_coupon_collections
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add sharing tracking
ALTER TABLE user_coupon_collections
ADD COLUMN IF NOT EXISTS shared_to_user_id UUID REFERENCES profiles(id);

-- Update RLS policies to handle shared coupons
CREATE POLICY "Users can view active or shared coupons"
ON user_coupon_collections FOR SELECT
USING (
  user_id = auth.uid() OR 
  (shared_to_user_id = auth.uid() AND status = 'active')
);
```

### Solution 5: Integrate Coupon Details Modal

**File:** `src/components/Search.tsx`

Add state and handlers:

```typescript
// Add after line 33
const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
const [showCouponModal, setShowCouponModal] = useState(false);

// Add handler function
const handleCouponClick = (coupon: any) => {
  setSelectedCoupon(coupon);
  setShowCouponModal(true);
};
```

Update CouponCard component call (around line 499):

```typescript
<CouponCard
  key={coupon.id}
  coupon={coupon}
  variant={viewMode === 'grid' ? 'default' : 'compact'}
  onCollect={search.collectCoupon}
  onBusinessClick={(businessId) => {
    // Track click for analytics
    if (search.query) {
      trackResultClick({
        searchTerm: search.query,
        resultId: businessId,
        resultType: 'business'
      });
    }
    search.goToBusiness(businessId);
  }}
  onCouponClick={() => handleCouponClick(coupon)}  // Changed to use modal
  showBusiness={true}
  showDistance={search.location.enabled && search.location.coords}
  getFormattedDistance={search.getFormattedDistance}
/>
```

Add modal before closing div (around line 615):

```typescript
{/* Coupon Details Modal */}
{showCouponModal && selectedCoupon && (
  <CouponDetailsModal
    coupon={selectedCoupon}
    isOpen={showCouponModal}
    onClose={() => {
      setShowCouponModal(false);
      setSelectedCoupon(null);
    }}
    onCollect={async (couponId) => {
      const success = await search.collectCoupon(couponId);
      if (success) {
        // Update the coupon in the list
        setSelectedCoupon(prev => ({ ...prev, isCollected: true }));
      }
      return success;
    }}
    showCollectButton={true}
    showShareButton={true}
  />
)}
```

Add import at top:

```typescript
import CouponDetailsModal from './modals/CouponDetailsModal';
```

**File:** `src/components/user/CouponWallet.tsx`

Already has `onView` handler at line 816. Update it to use the modal:

```typescript
// Add state at top (around line 83)
const [selectedCouponForView, setSelectedCouponForView] = useState<any | null>(null);
const [showDetailsModal, setShowDetailsModal] = useState(false);

// Update onView handler
onView={(coupon) => {
  setSelectedCouponForView(coupon);
  setShowDetailsModal(true);
}}

// Add modal before closing div (line 886)
{/* Coupon Details Modal */}
{showDetailsModal && selectedCouponForView && (
  <CouponDetailsModal
    coupon={selectedCouponForView}
    isOpen={showDetailsModal}
    onClose={() => {
      setShowDetailsModal(false);
      setSelectedCouponForView(null);
    }}
    showCollectButton={false}  // Already collected
    showShareButton={true}
  />
)}
```

Add import:

```typescript
import CouponDetailsModal from '../modals/CouponDetailsModal';
```

## Testing Checklist

- [ ] Search for coupons and verify collect button state
- [ ] Collect a coupon and verify button changes to "Collected"
- [ ] Refresh page and verify collected state persists
- [ ] Delete a coupon from wallet
- [ ] Return to search and verify collect button is re-enabled
- [ ] Share a coupon with a friend
- [ ] Verify you cannot re-collect the shared coupon
- [ ] Click on any coupon card to open details modal
- [ ] Verify all coupon details are visible in modal
- [ ] Test modal on mobile viewport
- [ ] Verify wallet coupons don't overflow their containers
- [ ] Test all coupon actions from modal

## Files to Modify

1. `src/hooks/useSearch.ts` - Fix collection state sync
2. `src/components/user/CouponWallet.tsx` - Fix overflow, add modal
3. `src/components/Search.tsx` - Add modal integration
4. `src/services/couponService.ts` - Update collection logic
5. `src/hooks/useCoupons.ts` - Fix deletion logic
6. `supabase/migrations/` - Add new migration
7. `src/components/modals/CouponDetailsModal.tsx` - Already created ✓

## Priority Order

1. **HIGH**: Fix collection state sync (Issues 1 & 2)
2. **HIGH**: Add coupon details modal (Issue 6)
3. **MEDIUM**: Fix wallet overflow (Issue 3)
4. **MEDIUM**: Handle deletion/sharing logic (Issues 4 & 5)
5. **LOW**: Add database migrations for tracking

## Notes

- All fixes maintain backward compatibility
- Error handling is comprehensive
- User feedback via toasts is included
- Mobile responsiveness is considered
- Performance impact is minimal
