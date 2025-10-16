# Quick Reference Guide - Coupon Collection Fix

## 🚨 Got an Error?

### "Failed to collect coupon"
**Before:** You'd see this generic message  
**Now:** You'll see specific messages like:
- "You have already collected this coupon"
- "This coupon was shared and cannot be collected again"
- "This coupon is not currently active"
- "Failed to check coupon status. Please try again."

### "Database error: has_been_shared column not found"
**Solution:** Your database needs the migration. Run `APPLY-SHARING-MIGRATION.sql` in Supabase SQL Editor.

### "violates check constraint 'user_coupon_collections_collected_from_check'"
**Solution:** This was a code bug using wrong collection source value. Now fixed - use `'direct_search'` instead of `'search_page'`.

### Coupon deleted but button still says "Collected"
**Solution:** This is now fixed! The UI refreshes immediately after deletion.

## 🔧 Quick Fixes

### 1. Apply Database Migration
```sql
-- Copy and run: docs/story-5.5/APPLY-SHARING-MIGRATION.sql
-- In Supabase SQL Editor
```

### 2. Verify Schema
```sql
-- Copy and run: docs/story-5.5/VERIFY-HAS-BEEN-SHARED-COLUMN.sql
-- Should return 3 rows
```

### 3. Test Everything
```sql
-- Copy and run: docs/story-5.5/TEST-COUPON-FLOW.sql
-- Follow the step-by-step instructions
```

## 📋 What Changed?

### Code Changes
- ✅ Better error messages in `collectCoupon()`
- ✅ UI refresh in `removeCouponCollection()`
- ✅ Specific error codes handled

### Database Changes
- ✅ Added `has_been_shared` column
- ✅ Added `deleted_at` column
- ✅ Added `shared_to_user_id` column
- ✅ Created indexes for performance
- ✅ Updated RLS policies

## 🧪 Testing Checklist

Quick tests to verify everything works:

1. ✅ Collect a coupon → Should succeed
2. ✅ Try to collect same coupon → Should fail with clear message
3. ✅ Delete a coupon → Should disappear immediately
4. ✅ Collect same coupon again → Should succeed
5. ✅ Share a coupon → Mark as shared
6. ✅ Delete shared coupon → Still marked as shared
7. ✅ Try to collect shared coupon → Should fail with shared message

## 📁 File Locations

All documentation is in `docs/story-5.5/`:

- **Main Guide**: `FIX-COUPON-COLLECTION-ERROR.md`
- **Changes**: `CHANGES-SUMMARY.md`
- **Verify**: `VERIFY-HAS-BEEN-SHARED-COLUMN.sql`
- **Apply**: `APPLY-SHARING-MIGRATION.sql`
- **Test**: `TEST-COUPON-FLOW.sql`
- **Quick Ref**: `QUICK-REFERENCE.md` (this file)

## 🎯 Expected Behavior

### Normal Collection
```
User clicks "Collect" → Success → Shows in wallet
```

### Duplicate Collection
```
User clicks "Collect" → Error → "You have already collected this coupon"
```

### Delete & Re-collect
```
User deletes coupon → Removed from wallet → "Collect" button active → Can collect again
```

### Shared Coupon
```
User collects → Shares with friend → Deletes → "Collect" button shows → 
But clicking fails with "This coupon was shared and cannot be collected again"
```

## 💡 Pro Tips

1. **Always check the browser console** for detailed error messages
2. **Check Supabase logs** if errors persist
3. **Run the verification script** before and after applying fixes
4. **Use the test script** to verify all scenarios work
5. **Clear cache** if you see stale data

## 🆘 Need Help?

1. Read `FIX-COUPON-COLLECTION-ERROR.md` for detailed instructions
2. Check `CHANGES-SUMMARY.md` for what changed and why
3. Run `VERIFY-HAS-BEEN-SHARED-COLUMN.sql` to check database
4. Apply `APPLY-SHARING-MIGRATION.sql` if verification fails
5. Test with `TEST-COUPON-FLOW.sql` to verify fixes

## ⚡ One-Line Commands

### Verify Database
Open Supabase SQL Editor and run the verification script

### Apply Migration
Open Supabase SQL Editor and run the application script

### Test Flow
Open Supabase SQL Editor and run the test script step by step

## 🎉 Success Indicators

You'll know the fix worked when:
- ✅ Error messages are specific and helpful
- ✅ Deleted coupons disappear immediately
- ✅ "Collect" button reactivates after deletion
- ✅ Can collect the same coupon again (if not shared)
- ✅ Shared coupons properly block re-collection

## 🔄 Common Workflows

### First Time Setup
1. Run `VERIFY-HAS-BEEN-SHARED-COLUMN.sql`
2. If verification fails, run `APPLY-SHARING-MIGRATION.sql`
3. Verify again
4. Run `TEST-COUPON-FLOW.sql` to test
5. Start using the app

### Debugging an Error
1. Check error message in UI
2. Check browser console for details
3. Check Supabase logs
4. Run verification script
5. Apply migration if needed

### Testing a Fix
1. Collect a test coupon
2. Delete it
3. Verify it's gone from wallet
4. Collect again
5. Verify it's back in wallet

---

**Last Updated**: 2025-02-03  
**Version**: 1.0  
**Status**: Ready for deployment
