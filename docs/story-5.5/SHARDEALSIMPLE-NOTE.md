# 📝 Note: ShareDealSimple vs Coupon Sharing

## Current Situation

`ShareDealSimple.tsx` is for sharing **"deals"** (mock data), not actual **coupons from wallet**.

**Key differences:**

| Feature | Deals (ShareDealSimple) | Coupons (Wallet) |
|---------|------------------------|------------------|
| Data source | Mock array in component | Database (`business_coupons`) |
| Collection tracking | ❌ No | ✅ Yes (`user_coupon_collections`) |
| One-share rule | ❌ Can't enforce | ✅ Enforced via `collection_id` |
| Wallet transfer | ❌ Not applicable | ✅ Required |

---

## Decision

**Skip updating ShareDealSimple for now.** Instead:

1. ✅ Focus on **CouponWallet** integration (real coupons)
2. ✅ Create **ShareCouponModal** for proper wallet-based sharing
3. ⏭️ Update ShareDealSimple later (or deprecate it)

---

## Next Steps

Create the proper coupon sharing flow:
1. Add "Share" button to `CouponWallet`
2. Create `ShareCouponModal` with friend selector
3. Use `shareWithValidation(friendId, couponId, collectionId)`
4. Update wallet filters to show shared/received coupons

This will give users the **real** sharing experience with:
- ✅ One-share-per-coupon enforcement
- ✅ Wallet transfers
- ✅ Limit tracking
- ✅ Lifecycle history
