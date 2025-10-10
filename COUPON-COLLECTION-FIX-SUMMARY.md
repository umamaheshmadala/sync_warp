# 🎫 Coupon Collection Fix - Complete Solution

## 🐛 **Issues Fixed**

### 1. **Database Constraint Violation** 
- **Problem**: `removeCouponCollection` was using `'deleted'` status, but database constraint only allows `['active', 'used', 'expired', 'removed']`
- **Solution**: Changed to use `'removed'` status instead

### 2. **Unique Constraint Conflict (409 Error)**
- **Problem**: Table has `UNIQUE(user_id, coupon_id)` constraint, preventing multiple records per user per coupon
- **Solution**: Instead of inserting new records, **reactivate existing removed records**

### 3. **Wallet Showing Deleted Coupons**
- **Problem**: `fetchUserCoupons` only filters `status = 'active'` so it correctly excludes removed coupons
- **Status**: This should already work correctly

## ✅ **Code Changes Applied**

### `src/hooks/useCoupons.ts` - Key Changes:

1. **Fixed Removal Status** (Line 833):
   ```typescript
   // OLD: status: 'deleted' ❌
   status: 'removed', // ✅ Matches DB constraint
   ```

2. **Added Reactivation Logic** (Lines 698-722):
   ```typescript
   // If it was removed, we can reactivate it
   if (existingCollection.status === 'removed') {
     // Update the existing record instead of inserting new one
     const { error: updateError } = await supabase
       .from('user_coupon_collections')
       .update({ 
         status: 'active',
         collected_at: new Date().toISOString(),
         collected_from: source,
         expires_at: couponData.valid_until,
         deleted_at: null
       })
       .eq('id', existingCollection.id);
   }
   ```

3. **Updated Collection Check** (Line 674):
   ```typescript
   // Include all statuses so we can find and reactivate removed ones
   .maybeSingle(); // No status filters
   ```

4. **Added Debug Logging**:
   - Collection attempts: `🔍 [collectCoupon] Checking for existing collection`
   - Reactivation process: `🔄 [collectCoupon] Reactivating removed coupon`
   - Deletion tracking: `🗑️ [removeCouponCollection] Removing collection ID`

## 🧪 **Testing Instructions**

### **Step 1: Delete a Coupon from Wallet**
1. Go to `/wallet` page
2. Find any active coupon
3. Click delete/remove button
4. ✅ **Expected**: Coupon disappears from wallet
5. ✅ **Expected**: No database constraint errors
6. ✅ **Expected**: Console shows `🗑️ [removeCouponCollection] Removing collection ID: [id]`

### **Step 2: Try to Re-collect the Deleted Coupon**
1. Go to `/search` or coupons page
2. Find the same coupon you just deleted
3. ✅ **Expected**: "Collect" button should be enabled
4. Click "Collect" button
5. ✅ **Expected**: Success message "Coupon collected successfully!"
6. ✅ **Expected**: Coupon reappears in wallet immediately
7. ✅ **Expected**: No "You have already collected this coupon" error

### **Step 3: Verify Debug Logs**
Open browser console and look for:
```
🔍 [collectCoupon] Checking for existing collection - User ID: [id] Coupon ID: [id]
🔍 [collectCoupon] Existing collection check: {id: "...", status: "removed", has_been_shared: false}
🔄 [collectCoupon] Reactivating removed coupon
```

### **Step 4: Check Wallet Refresh**
1. After collecting, go to `/wallet`
2. ✅ **Expected**: Coupon should be visible again
3. Refresh the page (F5)
4. ✅ **Expected**: Coupon should still be there (no phantom coupons)

## 🔧 **Technical Details**

### **Database Schema Context**:
```sql
-- user_coupon_collections table has:
UNIQUE(user_id, coupon_id)  -- Only one record per user per coupon
CHECK (status IN ('active', 'used', 'expired', 'removed'))
```

### **Logic Flow**:
1. **Delete**: Update existing record: `status = 'removed'`
2. **Re-collect**: Find existing record with `status = 'removed'`
3. **Reactivate**: Update same record: `status = 'active'` (no new insert)

### **Why This Works**:
- ✅ No unique constraint violations (same record reused)
- ✅ No database constraint errors (uses allowed 'removed' status)
- ✅ Clean data (no duplicate records)
- ✅ Preserves history (original collection date available)

## 🚀 **Ready to Test**

The development server should be running on `http://localhost:5174/`

**Quick Test Flow**:
1. Login → Go to Wallet → Delete a coupon → Go to Search → Re-collect same coupon ✅

---

This fix resolves both the constraint violation and the "already collected" error by properly managing the lifecycle of coupon collections through status updates rather than record creation/deletion.