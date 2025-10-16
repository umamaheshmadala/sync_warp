# 🚀 Quick Start Testing Guide

## ✅ What Just Happened

I've replaced the dummy wallet page with the **real CouponWallet component** that has all the sharing features!

---

## 📝 Steps to Test Right Now:

### **Step 1: Add a Test Coupon to Your Wallet**

1. **Go to Supabase Dashboard** → SQL Editor
2. **Copy and paste** the entire SQL script from:
   ```
   docs/story-5.5/ADD-TEST-COUPON-FOR-USER2.sql
   ```
3. **Run the script** (it will auto-detect Test User 2 and add a shareable coupon)
4. **You should see**: "✅ Added shareable coupon to Test User 2 wallet!"

---

### **Step 2: Refresh Your Wallet Page**

1. **Go back to the browser** with localhost:5173/wallet
2. **Refresh the page** (F5 or Ctrl+R)
3. **You should now see:**
   - ✅ Real wallet statistics (Total, Active, Expiring, etc.)
   - ✅ "Can Share" stat showing count of shareable coupons
   - ✅ Your test coupon: "Test: 50% OFF Pizza - SHAREABLE"
   - ✅ A blue **"Share"** button with Gift icon on the coupon card

---

### **Step 3: Test the Sharing Flow**

1. **Click the 🎁 "Share" button** on the coupon
2. **Modal opens** with:
   - Coupon preview at top
   - Sharing stats card
   - List of users you can share with
3. **Search for a friend** by typing their email/name
4. **Click on a friend** to select them
5. **Click "Confirm"** button
6. **Confirmation screen** shows → Click "Confirm & Share"
7. **Loading spinner** appears
8. **Success!** → Green checkmark animation
9. **Modal auto-closes** after 2 seconds
10. **Wallet refreshes** → Coupon should disappear (it's been shared!)

---

### **Step 4: Filter by Shareable Coupons**

1. **Click the "🎁 Can Share" filter button** (horizontal scroll filters)
2. **Should show** only coupons that can be shared
3. **Try other filters:**
   - 📥 Collected
   - 🤝 Received
   - All, Active, Expiring, etc.

---

## 🐛 If Something Goes Wrong:

### **Issue: Still seeing dummy data**
**Solution:**
1. Hard refresh the page (Ctrl+Shift+R)
2. Clear browser cache
3. Restart dev server (`npm run dev`)

### **Issue: No Share button appears**
**Possible causes:**
1. Coupon not marked as `is_shareable = true`
2. Coupon already shared (`has_been_shared = true`)
3. Coupon status is not 'active'

**Fix:** Run the SQL script again to add a fresh shareable coupon.

### **Issue: "Please log in to view your wallet"**
**Solution:**
- Log in as Test User 2
- Check that auth is working correctly

### **Issue: Friend list is empty**
**Solution:**
- You need at least 2 users in the database
- Create a second test user or use an existing one

### **Issue: Modal doesn't open**
**Solution:**
1. Check browser console for errors (F12)
2. Ensure all migrations are run
3. Check that `useSharingLimits` hook is working

---

## 🎯 Expected Behavior:

### **Before Sharing:**
```
✅ Coupon appears in wallet with Share button
✅ "Can Share" filter shows this coupon
✅ Stats show "X Can Share" count
```

### **During Sharing:**
```
✅ Modal opens smoothly
✅ Friend list loads quickly
✅ Search works in real-time
✅ Confirmation screen shows checklist
✅ Loading spinner during API call
```

### **After Sharing:**
```
✅ Success animation plays
✅ Modal auto-closes
✅ Wallet refreshes automatically
✅ Coupon removed from sender's wallet
✅ Stats update (X-1 Can Share)
✅ Receiver gets coupon in their wallet
```

---

## 📊 What to Check:

### **In Browser (Frontend):**
- [ ] Wallet page loads without errors
- [ ] Share button appears on active coupons
- [ ] Filters work correctly
- [ ] Modal opens and closes smoothly
- [ ] Friend selection works
- [ ] Confirmation flow completes
- [ ] Success message displays
- [ ] Wallet refreshes after share

### **In Database (Backend):**
```sql
-- Check sender's coupon (should be marked as shared)
SELECT 
  has_been_shared,
  status,
  shared_to_user_id,
  shared_at
FROM user_coupon_collections
WHERE user_id = '<sender-id>'
  AND coupon_id = '<coupon-id>';

-- Check receiver's coupon (should exist)
SELECT 
  acquisition_method,
  original_owner_id,
  collected_at
FROM user_coupon_collections
WHERE user_id = '<receiver-id>'
  AND coupon_id = '<coupon-id>';

-- Check sharing log
SELECT * FROM coupon_sharing_log
WHERE sender_id = '<sender-id>'
ORDER BY shared_at DESC
LIMIT 1;

-- Check lifecycle events
SELECT * FROM coupon_lifecycle_events
WHERE coupon_id = '<coupon-id>'
ORDER BY event_timestamp DESC;
```

---

## 🎉 Success Criteria:

You'll know it's working when:
1. ✅ You see the real wallet (not dummy data)
2. ✅ Share button appears on your test coupon
3. ✅ Modal opens when you click Share
4. ✅ You can select a friend
5. ✅ Sharing completes successfully
6. ✅ Coupon disappears from your wallet
7. ✅ Receiver gets the coupon (check by logging in as them)

---

## 🔍 Debugging Commands:

### **Check if migrations ran:**
```sql
SELECT version, name 
FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%sharing%' OR name LIKE '%coupon%'
ORDER BY version DESC;
```

### **Check if functions exist:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%share%';
```

### **Check user's coupons:**
```sql
SELECT 
  bc.title,
  ucc.is_shareable,
  ucc.has_been_shared,
  ucc.status,
  ucc.acquisition_method
FROM user_coupon_collections ucc
JOIN business_coupons bc ON bc.id = ucc.coupon_id
WHERE ucc.user_id = (
  SELECT id FROM auth.users WHERE email LIKE '%test%2%' LIMIT 1
);
```

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console (F12) for errors
2. Check Supabase logs for database errors
3. Verify all migrations are applied
4. Make sure you have at least 2 users in the database
5. Ensure Test User 2 has at least one active, shareable coupon

---

## 🎯 Next Steps After Testing:

Once basic sharing works:
1. Test all 10 scenarios from `WALLET-INTEGRATION-COMPLETE.md`
2. Test limit enforcement (share 3 to same friend)
3. Test total daily limit (share 20 coupons)
4. Test filter combinations
5. Test error handling (disconnect internet)

---

**Ready to test? Go ahead and follow the steps above!** 🚀

**Expected time:** 5-10 minutes for basic test  
**Full test suite:** 30-45 minutes
