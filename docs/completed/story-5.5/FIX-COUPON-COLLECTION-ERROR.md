# Fix for "Failed to Collect Coupon" Error

## Problem Description
Users were encountering a "Failed to collect coupon" error when trying to collect coupons. The issue was caused by:
1. Generic error handling that didn't provide specific error messages
2. Potentially missing database migration for the `has_been_shared` column

## Solution Implemented

### 1. Improved Error Handling in `useCoupons.ts`
We've enhanced the `collectCoupon` function to provide more specific error messages:

- **23505 Error**: Duplicate key violation (coupon already collected)
- **42501 Error**: Permission denied (RLS policy issue)
- **has_been_shared Error**: Missing column in database
- **Generic Errors**: Now show the actual error message from Supabase

### 2. Enhanced `removeCouponCollection` Function
- Now refreshes the coupon list immediately after deletion
- Ensures the UI updates to show the "Collect" button is active again
- Properly clears the cache

### 3. Database Migration Verification
We've created SQL scripts to verify and apply the necessary database schema changes.

## Steps to Fix

### Step 1: Verify Database Schema
Run the verification script in your Supabase SQL Editor:
```
docs/story-5.5/VERIFY-HAS-BEEN-SHARED-COLUMN.sql
```

If the query returns 3 rows (has_been_shared, deleted_at, shared_to_user_id), your schema is correct. **Skip to Step 3.**

### Step 2: Apply Database Migration (if needed)

#### Option A: Using Supabase CLI (Recommended)
1. Ensure Docker Desktop is running
2. Run in terminal:
   ```powershell
   cd C:\Users\umama\Documents\GitHub\sync_warp
   npx supabase db push
   ```

#### Option B: Manual SQL Execution
If the CLI doesn't work, run this script in Supabase SQL Editor:
```
docs/story-5.5/APPLY-SHARING-MIGRATION.sql
```

### Step 3: Test the Fix
1. Restart your development server
2. Log in as a test user
3. Try to collect a coupon
4. You should now see specific error messages if something goes wrong
5. If successful, you'll see "Coupon collected successfully!"

### Step 4: Verify Deletion Works
1. Collect a coupon
2. Delete it from your wallet
3. The coupon should disappear from your wallet
4. The "Collect" button should reactivate on the coupon card
5. You should be able to collect the same coupon again

## What Was Changed

### File: `src/hooks/useCoupons.ts`

#### `collectCoupon` Function (Lines 637-722)
**Before:**
- Generic error message: "Failed to collect coupon"
- No differentiation between error types

**After:**
- Specific error messages for different scenarios
- Checks for database column existence
- Better error logging for debugging

#### `removeCouponCollection` Function (Lines 763-798)
**Before:**
- Didn't refresh the coupon list after deletion
- Generic error handling

**After:**
- Calls `fetchUserCoupons()` to refresh the list
- Better error messages
- Ensures UI updates immediately

## Expected Behavior After Fix

### Collecting Coupons
1. ✅ First-time collection: Success message
2. ✅ Duplicate collection attempt: "You have already collected this coupon"
3. ✅ Shared coupon re-collection: "This coupon was shared and cannot be collected again"
4. ✅ Inactive coupon: "This coupon is not currently active"
5. ✅ Database error: Specific error message with details

### Deleting Coupons
1. ✅ Deletion success: "Coupon removed from wallet"
2. ✅ UI updates immediately (coupon disappears)
3. ✅ "Collect" button reactivates on the coupon card
4. ✅ Can collect the same coupon again (unless it was shared)

## Troubleshooting

### Error: "Database error: has_been_shared column not found"
**Solution:** Run the migration script from Step 2

### Error: "Permission denied"
**Solution:** 
1. Log out and log back in
2. Check RLS policies in Supabase dashboard
3. Verify user authentication is working

### Error: "You have already collected this coupon" (but I deleted it)
**Solution:**
1. The coupon was marked as shared before deletion
2. Check the `has_been_shared` flag in the database
3. If needed, manually update the record:
   ```sql
   UPDATE user_coupon_collections 
   SET has_been_shared = FALSE 
   WHERE user_id = 'YOUR_USER_ID' 
   AND coupon_id = 'THE_COUPON_ID';
   ```

## Testing Checklist

- [ ] Collect a new coupon (should succeed)
- [ ] Try to collect the same coupon again (should fail with duplicate message)
- [ ] Delete the coupon from wallet (should remove from list)
- [ ] Collect the same coupon again (should succeed)
- [ ] Share a coupon with a friend
- [ ] Delete the shared coupon
- [ ] Try to collect the shared coupon again (should fail with shared message)

## Notes

- The fix is backwards compatible
- All changes are idempotent (safe to run multiple times)
- No data loss occurs during the migration
- Existing coupons will work normally after the fix

## Support

If you encounter any issues:
1. Check the browser console for detailed error messages
2. Check the Supabase logs in the dashboard
3. Run the verification script to ensure schema is correct
4. Verify RLS policies are in place
