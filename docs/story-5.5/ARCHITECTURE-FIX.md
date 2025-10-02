# 🔧 Story 5.5: Architecture Fix - Coupon Sharing

## 📋 Overview

This document describes the architectural changes made to fix critical issues with coupon sharing:

1. ✅ Enforce one-share-per-coupon-instance
2. ✅ Implement wallet transfer on share
3. ✅ Track complete coupon lifecycle
4. ✅ Enable filtering/sorting of wallet coupons

---

## 🐛 Issues Fixed

### Issue 1: Multiple Shares of Same Coupon Instance
**Problem:** User 1 could share the same coupon to multiple users (User 2, User 3, etc.)

**Solution:**
- Added `has_been_shared` flag to `user_coupon_collections`
- Updated `log_coupon_share()` function to validate coupon hasn't been shared
- Marks coupon as "used" after sharing

### Issue 2: No Wallet Transfer
**Problem:** Sharing just logged an event—coupon stayed in sender's wallet

**Solution:**
- Sharing now removes coupon from sender's wallet (status → 'used')
- Creates new collection entry in receiver's wallet
- Links both via `sender_collection_id` and `receiver_collection_id`

### Issue 3: No Lifecycle Tracking
**Problem:** No comprehensive audit trail of coupon journey

**Solution:**
- Created `coupon_lifecycle_events` table
- Tracks all events: generated, collected, shared_sent, shared_received, redeemed, expired
- Auto-triggers on collection inserts

### Issue 4: Wallet Filtering/Sorting
**Problem:** Couldn't distinguish collected vs. received coupons

**Solution:**
- Added `acquisition_method` column: 'collected', 'shared_received', 'admin_granted', 'promotion'
- Added `original_owner_id` to track sharing chain
- Indexed for efficient filtering and sorting

---

## 🗄️ Database Changes

### New Columns in `user_coupon_collections`

```sql
- acquisition_method VARCHAR(50)     -- How coupon was obtained
- is_shareable BOOLEAN               -- Can be shared
- has_been_shared BOOLEAN            -- Already shared away
- shared_to_user_id UUID             -- Who it was shared to
- shared_at TIMESTAMP                -- When it was shared
- original_owner_id UUID             -- Original collector (if shared)
- sharing_log_id UUID                -- Link to sharing log
```

### New Columns in `coupon_sharing_log`

```sql
- sender_collection_id UUID          -- Sender's collection instance
- receiver_collection_id UUID        -- Receiver's collection instance
- notification_sent BOOLEAN          -- Notification status
- notification_sent_at TIMESTAMP     -- When notified
```

### New Table: `coupon_lifecycle_events`

```sql
CREATE TABLE coupon_lifecycle_events (
  id UUID PRIMARY KEY,
  coupon_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,   -- 'collected', 'shared_sent', etc.
  collection_id UUID,
  sharing_log_id UUID,
  redemption_id UUID,
  event_metadata JSONB,
  event_timestamp TIMESTAMP,
  related_user_id UUID               -- For sharing events
);
```

---

## 🔄 Updated Functions

### 1. `log_coupon_share()` - Now Handles Wallet Transfer

**Before:**
```sql
log_coupon_share(sender_id, recipient_id, coupon_id, is_driver)
```

**After:**
```sql
log_coupon_share(sender_id, recipient_id, coupon_id, sender_collection_id, is_driver)
```

**What it does now:**
1. ✅ Validates sender owns the collection
2. ✅ Validates coupon hasn't been shared yet
3. ✅ Marks sender's collection as "used"
4. ✅ Creates new collection for receiver
5. ✅ Links both collections in sharing_log
6. ✅ Logs lifecycle events for both users
7. ✅ Updates coupon collection count

**Returns:**
```json
{
  "success": true,
  "sharing_log_id": "uuid",
  "sender_collection_id": "uuid",
  "receiver_collection_id": "uuid",
  "message": "Coupon shared successfully"
}
```

### 2. `get_shareable_coupons()` - New Function

```sql
get_shareable_coupons(user_id)
```

Returns all coupons a user can share:
- Not already shared
- Status is 'active'
- Not expired
- Is shareable

**Returns:**
```sql
TABLE (
  collection_id UUID,
  coupon_id UUID,
  coupon_title VARCHAR,
  coupon_code VARCHAR,
  expires_at TIMESTAMP,
  collected_at TIMESTAMP,
  acquisition_method VARCHAR
)
```

### 3. `get_coupon_lifecycle()` - New Function

```sql
get_coupon_lifecycle(coupon_id, user_id)
```

Returns complete audit trail for a coupon:
- All lifecycle events
- User emails involved
- Event metadata
- Chronological order

**Returns:**
```sql
TABLE (
  event_id UUID,
  event_type VARCHAR,
  user_id UUID,
  user_email VARCHAR,
  related_user_id UUID,
  related_user_email VARCHAR,
  event_timestamp TIMESTAMP,
  event_metadata JSONB
)
```

---

## 📊 Lifecycle Event Types

| Event Type | Description | Triggered When |
|------------|-------------|----------------|
| `generated` | Coupon created by business | Business creates coupon |
| `collected` | User collects from storefront | User saves to wallet |
| `shared_sent` | User shares to friend | Sender shares coupon |
| `shared_received` | User receives via share | Receiver gets coupon |
| `redeemed` | User redeems at business | Coupon used |
| `expired` | Coupon expires | Past valid_until date |
| `removed` | User removes from wallet | User deletes |
| `cancelled` | Business cancels coupon | Business admin action |

---

## 🔐 Updated Service Layer

### `sharingLimitsService.ts`

#### Updated Functions:

**`logCouponShare()` - Now requires collection_id**
```typescript
export async function logCouponShare(
  senderId: string,
  recipientId: string,
  couponId: string,
  senderCollectionId: string,  // NEW: Required
  isDriver: boolean = false
): Promise<any>
```

**`shareWithLimitValidation()` - Updated signature**
```typescript
export async function shareWithLimitValidation(
  recipientId: string,
  couponId: string,
  senderCollectionId: string  // NEW: Required
): Promise<{ success: boolean; message: string }>
```

#### New Functions:

**`getShareableCoupons()` - Get user's shareable coupons**
```typescript
export async function getShareableCoupons(
  userId: string
): Promise<any[]>
```

**`getCouponLifecycle()` - Get coupon audit trail**
```typescript
export async function getCouponLifecycle(
  couponId: string,
  userId?: string
): Promise<any[]>
```

---

## 🎯 How to Use (Updated Workflow)

### Old Workflow (Broken):
```typescript
// ❌ This would allow multiple shares of same instance
await shareWithLimitValidation(friendId, couponId);
```

### New Workflow (Fixed):
```typescript
// 1. Get user's shareable coupons
const shareableCoupons = await getShareableCoupons(userId);

// 2. User selects which coupon to share (from UI list)
const selectedCoupon = shareableCoupons[0];

// 3. Share with collection_id
await shareWithLimitValidation(
  friendId, 
  selectedCoupon.coupon_id,
  selectedCoupon.collection_id  // Ensures one-share-per-instance
);

// ✅ This coupon is now removed from sender's wallet
// ✅ This coupon now appears in receiver's wallet
// ✅ Full audit trail recorded
```

---

## 📱 UI Changes Required

### 1. Coupon Wallet View
**Add filtering:**
- All Coupons
- Collected (from businesses)
- Received (via sharing)
- Can Share (not yet shared)

**Add sorting:**
- Date collected (newest/oldest)
- Expiring soon
- By business
- By acquisition method

### 2. Share Flow
**Before sharing:**
1. Show list of shareable coupons (call `getShareableCoupons()`)
2. User selects coupon
3. User selects friend
4. Share button calls `shareWithLimitValidation()` with `collection_id`

**After sharing:**
- Coupon disappears from sender's "Can Share" list
- Moves to "Shared" section (with shared_to name/date)
- Receiver gets notification
- Receiver sees coupon in "Received" section

### 3. Coupon Details View
**Add lifecycle section:**
```typescript
const lifecycle = await getCouponLifecycle(couponId, userId);

// Show timeline:
// ├─ Collected by you on Jan 1, 2025
// ├─ Shared to John Doe on Jan 5, 2025
// └─ Redeemed by John Doe on Jan 10, 2025
```

---

## 🧪 Testing the Fix

### Test 1: One-Share-Per-Instance
```sql
-- 1. Get shareable coupons for User 1
SELECT * FROM get_shareable_coupons('user1-uuid');

-- 2. Share to User 2
SELECT log_coupon_share('user1-uuid', 'user2-uuid', 'coupon-uuid', 'collection1-uuid', false);

-- 3. Try to share same collection again (should fail)
SELECT log_coupon_share('user1-uuid', 'user3-uuid', 'coupon-uuid', 'collection1-uuid', false);
-- ❌ ERROR: Invalid collection: either not owned by sender, already shared, or not shareable
```

### Test 2: Wallet Transfer
```sql
-- Check User 1's wallet before share
SELECT * FROM user_coupon_collections WHERE user_id = 'user1-uuid' AND coupon_id = 'coupon-uuid';
-- status = 'active', has_been_shared = false

-- Share coupon
SELECT log_coupon_share('user1-uuid', 'user2-uuid', 'coupon-uuid', 'collection1-uuid', false);

-- Check User 1's wallet after share
SELECT * FROM user_coupon_collections WHERE user_id = 'user1-uuid' AND coupon_id = 'coupon-uuid';
-- status = 'used', has_been_shared = true, shared_to_user_id = 'user2-uuid'

-- Check User 2's wallet
SELECT * FROM user_coupon_collections WHERE user_id = 'user2-uuid' AND coupon_id = 'coupon-uuid';
-- NEW ROW: status = 'active', acquisition_method = 'shared_received', original_owner_id = 'user1-uuid'
```

### Test 3: Lifecycle Tracking
```sql
-- Get lifecycle for coupon
SELECT * FROM get_coupon_lifecycle('coupon-uuid', null);

-- Should show:
-- event_type = 'collected'        (User 1 collected)
-- event_type = 'shared_sent'      (User 1 sent to User 2)
-- event_type = 'shared_received'  (User 2 received)
```

---

## 🚀 Deployment Steps

1. **Run Migration:**
   ```bash
   # In Supabase SQL Editor
   -- Run: supabase/migrations/20251002000002_fix_coupon_sharing_architecture.sql
   ```

2. **Verify Migration:**
   ```sql
   -- Check new columns exist
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'user_coupon_collections' 
   AND column_name IN ('acquisition_method', 'has_been_shared', 'is_shareable');
   
   -- Check new table exists
   SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_lifecycle_events');
   
   -- Check functions updated
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name IN ('log_coupon_share', 'get_shareable_coupons', 'get_coupon_lifecycle');
   ```

3. **Update Existing Data:**
   ```sql
   -- Set default values for existing coupons
   UPDATE user_coupon_collections
   SET 
     acquisition_method = 'collected',
     is_shareable = TRUE,
     has_been_shared = FALSE
   WHERE acquisition_method IS NULL;
   ```

4. **Update Frontend Code:**
   - Update sharing flow to use `getShareableCoupons()`
   - Pass `collection_id` to share functions
   - Add wallet filtering UI
   - Add lifecycle timeline view

5. **Test End-to-End:**
   - Collect a coupon
   - Share it to a friend
   - Verify it disappears from your wallet
   - Verify it appears in friend's wallet
   - Check lifecycle events
   - Try to share same instance again (should fail)

---

## 📝 Notes

### Backward Compatibility
- ⚠️ Old `log_coupon_share()` calls will fail (requires `collection_id` now)
- ✅ Existing data is preserved
- ✅ Migration sets sensible defaults for existing rows

### Performance
- ✅ Indexed for fast queries
- ✅ Lifecycle events don't slow down sharing
- ✅ RLS policies restrict data access properly

### Future Enhancements
- [ ] Notification service integration
- [ ] Real-time updates via Supabase Realtime
- [ ] Analytics dashboard for sharing patterns
- [ ] Redemption tracking
- [ ] Coupon chaining (track full sharing chain)

---

## 🆘 Troubleshooting

### "Invalid collection" Error
**Cause:** Collection ID doesn't exist, already shared, or not owned by sender

**Solution:**
```typescript
// Always get fresh list of shareable coupons
const shareableCoupons = await getShareableCoupons(userId);
// Only allow sharing from this list
```

### Coupon Still in Sender's Wallet After Share
**Cause:** Old code not using new architecture

**Solution:**
- Check you're calling updated `log_coupon_share()` with `collection_id`
- Verify migration ran successfully
- Check `has_been_shared` flag is set to `true`

### Lifecycle Events Not Appearing
**Cause:** Trigger not firing or RLS blocking access

**Solution:**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_log_collection_lifecycle';

-- Check RLS policy
SELECT * FROM pg_policies WHERE tablename = 'coupon_lifecycle_events';
```

---

## ✅ Success Criteria

All four issues are now fixed:

1. ✅ Same coupon instance can only be shared once
2. ✅ Sharing removes coupon from sender, adds to receiver
3. ✅ Complete lifecycle is tracked and auditable
4. ✅ Wallet can be filtered by acquisition method and sorted

---

**Migration File:** `supabase/migrations/20251002000002_fix_coupon_sharing_architecture.sql`
**Updated Service:** `src/services/sharingLimitsService.ts`
**Date:** October 2, 2025
