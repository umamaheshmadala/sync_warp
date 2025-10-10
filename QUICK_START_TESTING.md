# Quick Start Testing Guide 🚀

## Step 1: Apply Database Migration

**Option A - Using Supabase CLI (Recommended):**
```bash
npx supabase db push
```

**Option B - Using Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open the file: `supabase/migrations/20250203_add_coupon_sharing_tracking.sql`
4. Copy and paste the entire content
5. Click "Run" to execute

## Step 2: Start Development Server

```bash
npm run dev
```

## Step 3: Quick Test Checklist

### ✅ Test 1: Collection State (2 minutes)
1. Open http://localhost:5173/search
2. Click "Collect" on any coupon
3. **Expected:** Button changes to "Collected" with green checkmark
4. Refresh page
5. **Expected:** Button still shows "Collected"

### ✅ Test 2: Coupon Modal (1 minute)
1. Click on any coupon card
2. **Expected:** Beautiful modal opens with full details
3. Press Escape key
4. **Expected:** Modal closes

### ✅ Test 3: Wallet Display (1 minute)
1. Navigate to http://localhost:5173/wallet
2. **Expected:** All coupon text is fully visible
3. **Expected:** No overflow or cut-off content
4. Resize browser to mobile (375px)
5. **Expected:** Coupons stack in single column

### ✅ Test 4: Delete & Re-collect (2 minutes)
1. In wallet, click trash icon on a coupon
2. **Expected:** Toast "Coupon removed from wallet"
3. Go to /search and find the same coupon
4. **Expected:** "Collect" button is active
5. Collect it again
6. **Expected:** Success!

## Common Issues & Solutions

### Issue: Migration fails
**Solution:** Check if columns already exist:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_coupon_collections';
```

### Issue: Modal doesn't appear
**Solution:** Check browser console for errors. Clear cache and reload.

### Issue: Collection fails
**Solution:** 
1. Check if you're logged in
2. Check browser console for error messages
3. Verify Supabase connection in `.env` file

## Need More Details?

See **COUPON_FIXES_IMPLEMENTED.md** for:
- Complete testing instructions
- All file changes
- Performance notes
- Security notes

## Report Issues

If something doesn't work:
1. Check browser console for errors
2. Copy the error message
3. Note which test step failed
4. Check if database migration was applied

---

**Total Testing Time: ~10 minutes** ⏱️

**All issues should now be resolved!** ✨
