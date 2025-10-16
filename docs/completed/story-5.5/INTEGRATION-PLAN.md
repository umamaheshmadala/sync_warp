# 🚀 Story 5.5: Integration Plan

## ✅ What's Already Working

1. ✅ Database migration complete
2. ✅ Service layer updated
3. ✅ Hook updated (`useSharingLimits`)
4. ✅ UI components created (`SharingStatsCard`, `LimitExceededModal`)
5. ✅ Test page validates everything works

---

## 📋 Integration Steps

### **1. Update `ShareDealSimple.tsx`** ⚠️ NEEDS FIX

**Current Issue:** Uses old hook signature without `collection_id`

**What to fix:**
- Line 48-53: Hook destructuring is wrong
- Line 140: `checkPermission` should be `checkCanShare`
- Line 161: `logShare` is missing `collection_id` parameter

**Changes needed:**
```typescript
// ❌ OLD:
const {
  stats,
  limits,
  permissionCheck,
  isLoading: limitsLoading,
  checkPermission,
  logShare,
  refreshStats,
} = useSharingLimits()

// ✅ NEW:
const {
  stats,
  limits,
  loading: limitsLoading,
  isDriver,
  checkCanShare,
  shareWithValidation,
  refreshStats,
} = useSharingLimits()
```

---

### **2. Integrate into `CouponWallet.tsx`** 🆕 NEW FEATURE

Add **"Share"** button to each coupon card that:
1. Shows shareable coupons only (not already shared)
2. Opens friend selector
3. Uses `shareWithValidation(friendId, couponId, collectionId)`
4. Shows success/error messages
5. Updates wallet (coupon disappears after share)

---

### **3. Create Friend Selector Component** 🆕 NEW

Create `src/components/Sharing/FriendSelector.tsx`:
- Lists user's friends
- Allows selecting one friend
- Shows share limits info
- Integrates with sharing flow

---

### **4. Update Sharing Flow** 🔄 MODIFY

**Current flow (ShareDealSimple):**
```
Select deal → Enter message → Share
```

**New flow (with collection-based sharing):**
```
Select coupon from wallet → Select friend → Check limits → Share
```

---

### **5. Add Wallet Filtering** 🆕 NEW

Add filters to `CouponWallet`:
- "Can Share" (shareable && !has_been_shared)
- "Shared" (has_been_shared)
- "Received" (acquisition_method = 'shared_received')

---

## 📁 Files to Create/Modify

### **Create:**
1. ✅ `src/components/Sharing/SharingStatsCard.tsx` (already exists)
2. ✅ `src/components/Sharing/LimitExceededModal.tsx` (already exists)
3. 🆕 `src/components/Sharing/FriendSelector.tsx`
4. 🆕 `src/components/Sharing/ShareCouponModal.tsx`

### **Modify:**
1. ⚠️ `src/components/ShareDealSimple.tsx` (fix hook usage)
2. 🔄 `src/components/user/CouponWallet.tsx` (add share button)
3. 🔄 `src/hooks/useSharingLimits.ts` (already fixed ✅)
4. 🔄 `src/services/sharingLimitsService.ts` (already fixed ✅)

---

## 🎯 Priority Order

### **Phase 1: Fix Existing (High Priority)**
1. ✅ Fix `useSharingLimits` hook (DONE)
2. ⚠️ Fix `ShareDealSimple.tsx` to use new hook
3. 🧪 Test existing sharing flow

### **Phase 2: Coupon Wallet Integration (Medium Priority)**
1. Add "Share" button to coupon cards
2. Create `ShareCouponModal` component
3. Integrate with `shareWithValidation`
4. Add wallet filters (Shared, Received, etc.)

### **Phase 3: Enhanced UX (Low Priority)**
1. Add sharing stats to user profile
2. Add lifecycle timeline view
3. Add sharing analytics dashboard
4. Add notifications when coupon received

---

## 🚀 Quick Start: Phase 1

Let's fix `ShareDealSimple.tsx` first since it's already partially integrated:

1. Update hook usage
2. Add collection_id parameter
3. Test the flow

Would you like me to start with Phase 1 (fixing ShareDealSimple)?
