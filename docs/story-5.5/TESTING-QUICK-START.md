# 🚀 Story 5.5: Quick Testing Start

## ❌ Error: Foreign Key Constraint Violation

If you see this error:
```
❌ Error: Failed to log coupon share: insert or update on table "coupon_sharing_log" 
violates foreign key constraint "coupon_sharing_log_coupon_id_fkey"
```

**This means the coupon ID you entered doesn't exist in your database.**

---

## ✅ How to Get Valid Test Data

### Option 1: Use Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard** → Your Project → Table Editor

2. **Get User IDs** (Friends):
   - Open the `auth.users` table
   - Copy any `id` (UUID) from a different user than yourself
   - Paste it in the "Friend ID" field on the test page

3. **Get Coupon IDs**:
   - Open the `business_coupons` table
   - Copy any `id` (UUID) from an active coupon
   - Paste it in the "Coupon ID" field on the test page

### Option 2: Use SQL Editor (More Complete)

1. **Go to Supabase Dashboard** → SQL Editor → New Query

2. **Run this query** to get all test data:
   ```sql
   -- Get your user ID
   SELECT id, email FROM auth.users WHERE email = 'your.email@example.com';
   
   -- Get other users (friends)
   SELECT id, email FROM auth.users WHERE email != 'your.email@example.com' LIMIT 5;
   
   -- Get active coupons
   SELECT id, title, description FROM business_coupons WHERE status = 'active' AND valid_until > NOW() LIMIT 5;
   ```

3. **Copy the IDs** and paste them into the test page

### Option 3: Run Complete Test Data Script

Open the file `docs/story-5.5/get-test-data.sql` and run it in Supabase SQL Editor.

---

## 📋 Testing Workflow

Once you have valid IDs:

### Test 1: Check Permission ✅
1. Paste a **friend ID** in the "Friend ID" field
2. Click **"Check Permission"**
3. ✅ You should see: "Can share! X shares remaining today"

### Test 2: Log Share ✅
1. Keep the **friend ID** from Test 1
2. Paste a **valid coupon ID** in the "Coupon ID" field
3. Click **"Log Share"**
4. ✅ You should see: "Share logged successfully!"
5. Watch the stats update automatically

### Test 3: Test Limits 🚫
1. Share with the **same friend** 3 times (repeat Test 2)
2. On the **4th attempt**, you should see:
   - ❌ Limit exceeded modal
   - Message: "You've reached the limit of 3 shares per friend per day"

### Test 4: Test Total Limit 🚫
1. Share with **different friends** (change Friend ID each time)
2. After **20 total shares**, any share attempt should show:
   - ❌ Limit exceeded modal
   - Message: "You've reached your daily sharing limit of 20"

---

## 🔍 Debugging Tips

### Check if coupons exist:
```sql
SELECT COUNT(*) FROM business_coupons WHERE status = 'active' AND valid_until > NOW();
```
- If `0`, you need to create coupons first

### Check if you have friends:
```sql
SELECT COUNT(*) FROM auth.users WHERE email != 'your.email@example.com';
```
- If `0`, you need to create test users

### View today's shares:
```sql
SELECT 
  sender_id,
  recipient_id,
  coupon_id,
  shared_at
FROM coupon_sharing_log
WHERE DATE(shared_at) = CURRENT_DATE
ORDER BY shared_at DESC;
```

### Reset today's shares (if needed):
```sql
-- ⚠️ WARNING: This deletes all shares for today!
DELETE FROM coupon_sharing_log WHERE DATE(shared_at) = CURRENT_DATE;
```

---

## 🎯 Quick Checklist

Before testing, verify:
- [ ] ✅ Migration scripts are applied (check `migrations` table)
- [ ] ✅ Functions exist: `get_sharing_stats_today`, `can_share_to_friend`, `log_coupon_share`
- [ ] ✅ At least 1 active coupon exists
- [ ] ✅ At least 1 other user exists (to share with)
- [ ] ✅ You're logged in to the app
- [ ] ✅ Test page loads at `/test-sharing-limits`

---

## 📞 Common Issues

### Issue: "User not authenticated"
**Solution**: Make sure you're logged in to the app

### Issue: "Foreign key constraint violation"
**Solution**: Use valid UUIDs from your database (see instructions above)

### Issue: "No stats available"
**Solution**: Click "Refresh Stats" button or check browser console for errors

### Issue: Stats show "0/0" limits
**Solution**: 
1. Check if user role is set correctly in `auth.users.raw_user_meta_data`
2. Verify migration scripts created the sharing limits table
3. Check Supabase logs for function errors

---

## 🎉 Success Indicators

You know it's working when:
- ✅ Stats card shows your limits (20 total, 3 per friend for regular users)
- ✅ Drivers see 100 total, 5 per friend
- ✅ Check Permission shows remaining shares
- ✅ Log Share increments the counters
- ✅ Modal appears when limits are reached
- ✅ Stats auto-refresh after logging a share

---

Need help? Check the browser console (F12) for detailed error logs!
