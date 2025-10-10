# Test Plan: Coupon Collection After Deletion

## Changes Made:
1. ✅ Fixed `removeCouponCollection` to use `'removed'` instead of `'deleted'` status
2. ✅ Updated collection logic to **reactivate existing removed coupons** instead of inserting new records
3. ✅ Added debug logging to track collection attempts
4. ✅ Fixed unique constraint conflict by updating existing records instead of inserting

## Test Steps:

### Step 1: Delete a Collected Coupon
1. Go to your wallet page
2. Find an active coupon
3. Delete it from your wallet
4. ✅ Expected: Coupon should be removed without error
5. ✅ Expected: Status should be set to 'removed' in database

### Step 2: Try to Re-collect the Deleted Coupon
1. Go back to the coupons list or search
2. Find the same coupon you just deleted
3. ✅ Expected: Collect button should be visible/enabled
4. Click "Collect" button
5. ✅ Expected: Should **reactivate** the existing coupon record (not create a new one)
6. ✅ Expected: Should show "Coupon collected successfully!" message
7. ✅ Expected: Coupon should reappear in wallet immediately

### Step 3: Verify Debug Logs
1. Open browser developer console
2. Look for these debug messages during deletion:
   - `🗑️ [removeCouponCollection] Removing collection ID:` - Shows deletion attempts
3. Look for these debug messages during re-collection:
   - `🔐 [collectCoupon] User from store:` - Shows user info
   - `🔍 [collectCoupon] Checking for existing collection` - Shows query parameters  
   - `🔍 [collectCoupon] Existing collection check:` - Should show the removed coupon (not null)
   - `🔄 [collectCoupon] Reactivating removed coupon` - Shows reactivation process

### Step 4: Test Shared Coupon Logic (if applicable)
1. If you have any shared coupons, try deleting and re-collecting them
2. ✅ Expected: Shared coupons should prevent re-collection even after deletion

## Debugging:
If issues persist, check:
1. Database constraint: `SELECT * FROM pg_constraint WHERE conname LIKE '%status_check%'`
2. Current status values: `SELECT DISTINCT status FROM user_coupon_collections`
3. Console logs for detailed API call information

## Success Criteria:
- [x] No more constraint errors when deleting coupons
- [x] Deleted coupons can be re-collected
- [x] Collect button reactivates after deletion
- [x] No false "already collected" messages