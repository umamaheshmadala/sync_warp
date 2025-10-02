# 🎉 Story 5.5: Final Testing Guide - Updated Architecture

## ✅ What's Been Fixed

All 4 critical issues are now resolved:

1. ✅ **One-share-per-instance** - Same coupon can only be shared once
2. ✅ **Wallet transfer** - Coupon moves from sender to receiver
3. ✅ **Lifecycle tracking** - Complete audit trail
4. ✅ **Wallet filtering** - Filter by collected vs. received

---

## 🚀 Testing the Updated System

### Step 1: Add a Coupon to Your Wallet

**Option A: Quick Add (Automatic)**
```sql
-- Run in Supabase SQL Editor
INSERT INTO user_coupon_collections (
  user_id, coupon_id, acquisition_method, is_shareable, 
  has_been_shared, collected_at, expires_at, status, collected_from
)
SELECT 
  (SELECT auth.uid()), id, 'collected', TRUE, FALSE, NOW(),
  valid_until, 'active', 'direct_search'
FROM business_coupons
WHERE status = 'active' AND valid_until > NOW()
LIMIT 1;
```

**Option B: Choose Specific Coupon**
1. Get coupon IDs: `SELECT id, title FROM business_coupons WHERE status = 'active' LIMIT 5;`
2. Run the SQL in `docs/story-5.5/ADD-COUPON-TO-WALLET.sql` with your chosen coupon ID

---

### Step 2: Open the Test Page

Go to: `http://localhost:3000/test-sharing-limits`

You should see:
- ✅ Stats card showing your limits
- ✅ **"Your Shareable Coupons"** section with the coupon you just added

---

### Step 3: Test Sharing

1. **Click on a coupon** in the wallet (it will highlight blue with a checkmark)

2. **Get a friend ID:**
   ```sql
   SELECT id, email FROM auth.users LIMIT 5;
   ```

3. **Paste the friend ID** in the "Friend ID" field

4. **Click "Check Permission"**
   - Should show: "✅ Can share! X shares remaining today"

5. **Click "Log Share"**
   - Should show: "✅ Share logged successfully! Coupon removed from your wallet and added to friend's wallet"
   - **Coupon disappears from your wallet list**
   - Stats update automatically

---

### Step 4: Verify Wallet Transfer

**Check your wallet (sender):**
```sql
SELECT 
  id, coupon_id, status, has_been_shared, shared_to_user_id, shared_at
FROM user_coupon_collections
WHERE user_id = (SELECT auth.uid())
ORDER BY collected_at DESC;
```

You should see:
- `status = 'used'`
- `has_been_shared = true`
- `shared_to_user_id = <friend-uuid>`

**Check friend's wallet (receiver):**
```sql
SELECT 
  id, coupon_id, acquisition_method, original_owner_id, status
FROM user_coupon_collections
WHERE user_id = 'FRIEND-UUID-HERE'
AND coupon_id = 'COUPON-UUID-HERE';
```

You should see:
- NEW ROW created
- `acquisition_method = 'shared_received'`
- `original_owner_id = <your-uuid>`
- `status = 'active'`

---

### Step 5: Test One-Share-Per-Instance

1. Try to add the same coupon to your wallet again (use the SQL from Step 1)
2. Refresh the test page
3. Try to share it again
4. ❌ It won't appear in your shareable coupons list anymore!

---

### Step 6: View Lifecycle History

**Check lifecycle events:**
```sql
SELECT * FROM get_coupon_lifecycle('COUPON-UUID-HERE', null);
```

You should see:
- `event_type = 'collected'` (when you collected it)
- `event_type = 'shared_sent'` (when you shared it)
- `event_type = 'shared_received'` (when friend received it)

---

## 🧪 Advanced Testing Scenarios

### Scenario 1: Multiple Shares (Different Instances)
```sql
-- Add 3 different coupons to your wallet
INSERT INTO user_coupon_collections (user_id, coupon_id, expires_at, status)
SELECT (SELECT auth.uid()), id, valid_until, 'active'
FROM business_coupons
WHERE status = 'active'
LIMIT 3;

-- Refresh test page
-- Share each coupon to different friends
-- ✅ Each should work fine (different instances)
```

### Scenario 2: Share Chain (Re-sharing)
```sql
-- User 1 shares to User 2
-- User 2 can then share to User 3!

-- As User 2, check your wallet
SELECT * FROM get_shareable_coupons((SELECT auth.uid()));

-- The received coupon should appear (is_shareable = TRUE)
-- Share it to User 3 using the test page
-- ✅ Creates complete sharing chain
```

### Scenario 3: Limit Testing
```sql
-- Share to same friend 3 times (different coupons)
-- On 4th attempt: ❌ "Daily limit to this friend reached"

-- Share to 20 different friends (20 different coupons)
-- On 21st attempt: ❌ "Daily sharing limit reached"
```

---

## 📊 Monitoring & Debugging

### View All Lifecycle Events
```sql
SELECT 
  cle.event_type,
  cle.event_timestamp,
  u1.email as user_email,
  u2.email as related_user_email,
  bc.title as coupon_title
FROM coupon_lifecycle_events cle
JOIN auth.users u1 ON u1.id = cle.user_id
LEFT JOIN auth.users u2 ON u2.id = cle.related_user_id
JOIN business_coupons bc ON bc.id = cle.coupon_id
WHERE cle.event_timestamp > NOW() - INTERVAL '1 day'
ORDER BY cle.event_timestamp DESC;
```

### View Sharing Analytics
```sql
SELECT 
  u.email as sender,
  COUNT(*) as total_shares,
  COUNT(DISTINCT recipient_id) as unique_recipients,
  MAX(shared_at) as last_share
FROM coupon_sharing_log csl
JOIN auth.users u ON u.id = csl.sender_id
WHERE sharing_day = CURRENT_DATE
GROUP BY u.email
ORDER BY total_shares DESC;
```

### Check Wallet Status
```sql
SELECT 
  u.email,
  COUNT(*) FILTER (WHERE acquisition_method = 'collected') as collected,
  COUNT(*) FILTER (WHERE acquisition_method = 'shared_received') as received,
  COUNT(*) FILTER (WHERE has_been_shared = TRUE) as shared_away,
  COUNT(*) FILTER (WHERE status = 'active') as active
FROM user_coupon_collections ucc
JOIN auth.users u ON u.id = ucc.user_id
GROUP BY u.email;
```

---

## ✅ Success Checklist

- [ ] Coupon appears in "Your Shareable Coupons" section
- [ ] Can select coupon (blue highlight)
- [ ] Check Permission works
- [ ] Log Share works and shows success message
- [ ] Coupon disappears from your wallet after sharing
- [ ] Stats update automatically
- [ ] Friend receives coupon in their wallet
- [ ] Lifecycle events are logged correctly
- [ ] Cannot share same instance twice
- [ ] Limits are enforced (3 per friend, 20 total)

---

## 🐛 Troubleshooting

### "No shareable coupons in your wallet"
**Solution:** Add a coupon using the SQL in Step 1

### "Invalid collection: already shared"
**Solution:** This is correct! You're trying to share a coupon that was already shared. Refresh the page to see updated wallet.

### Coupon doesn't disappear after sharing
**Solution:** 
- Check browser console for errors
- Verify migration ran successfully (`docs/story-5.5/VERIFY-MIGRATION.sql`)
- Check `has_been_shared` flag in database

### Friend doesn't receive coupon
**Solution:**
- Check `coupon_sharing_log` table for the share entry
- Check `user_coupon_collections` for receiver's new entry
- Check lifecycle events table

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `VERIFY-MIGRATION.sql` | Verify migration installed correctly |
| `ADD-COUPON-TO-WALLET.sql` | Add test coupons to wallet |
| `TEST-NEW-ARCHITECTURE.sql` | SQL test scripts |
| `ARCHITECTURE-FIX.md` | Complete documentation |
| `TestSharingLimits.tsx` | Updated test page |
| `sharingLimitsService.ts` | Updated service layer |

---

## 🎯 Next Steps After Testing

Once testing confirms everything works:

1. **Remove the test page** (or move to admin-only)
2. **Integrate into main sharing flow**
3. **Build wallet UI** with filtering/sorting
4. **Add notification system** when coupon is received
5. **Build lifecycle timeline component** for coupon details
6. **Add analytics dashboard** for sharing patterns

---

## 🎉 Congratulations!

You now have a fully functional coupon sharing system with:
- ✅ Proper instance-based sharing
- ✅ Wallet management
- ✅ Complete audit trails
- ✅ Limit enforcement

All 4 critical issues are resolved! 🚀
