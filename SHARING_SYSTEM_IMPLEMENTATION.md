# Coupon Sharing System - Implementation Summary

## Date: 2025-10-03

## Overview
Implemented a comprehensive coupon sharing system that allows users to share coupons with friends, with full lifecycle tracking and support for multiple copies of the same coupon.

## Requirements Implemented

### 1. ✅ Transfer Coupon from Sender to Receiver
- **Database Function**: `log_coupon_share` (in migration `20251002000002_fix_coupon_sharing_architecture.sql`)
- **Implementation**: 
  - Sender's collection is marked as `has_been_shared = TRUE`
  - Sender's collection status changed to `'used'`
  - New collection created for receiver with `acquisition_method = 'shared_received'`

### 2. ✅ Sender's Coupon Greyed Out
- **Implementation**: 
  - Sender's collection status set to `'used'` after sharing
  - UI automatically greys out coupons with `status = 'used'`
  - `has_been_shared = TRUE` flag prevents re-sharing the same instance

### 3. ✅ Receiver Gets Coupon Marked as Received
- **Implementation**:
  - New collection entry created with `acquisition_method = 'shared_received'`
  - Collection is marked as `is_shareable = TRUE` (can be re-shared)
  - `original_owner_id` tracks the original sender

### 4. ✅ Full Lifecycle Tracking and Audit Trail
- **Implementation**:
  - `coupon_sharing_log` table tracks all sharing events
  - `coupon_lifecycle_events` table logs both:
    - `'shared_sent'` event for sender
    - `'shared_received'` event for receiver
  - Each event includes metadata, timestamps, and related entity IDs

### 5. ✅ Multiple Copies of Same Coupon with Count Badge
- **Database Changes**:
  - Removed unique constraint on `(user_id, coupon_id)` in `user_coupon_collections`
  - Added non-unique index for performance: `idx_user_coupon_collections_user_coupon`
  - Added helper function `get_user_coupon_count()` to count user's copies

- **UI Changes**:
  - Added `couponCount` property to `UnifiedCouponData` interface
  - Added `showCouponCount` prop to `UnifiedCouponCard` component
  - Count badge displays "x{count}" when user has multiple copies

## Files Modified

### Backend/Database
1. **supabase/migrations/20251003000000_allow_duplicate_coupons.sql** (NEW)
   - Drops unique constraint on user_coupon_collections
   - Adds performance index
   - Adds helper function to count copies

### Frontend Services
2. **src/services/sharingLimitsService.ts**
   - Updated `shareWithLimitValidation()` function
   - Added check to count existing copies before sharing
   - Removed blocking logic that prevented duplicate coupons
   - Now allows duplicates and logs the count

### Frontend Components
3. **src/components/common/UnifiedCouponCard.tsx**
   - Added `couponCount` to interface
   - Added `showCouponCount` prop
   - Displays count badge when user has multiple copies (>1)

## Database Schema Changes

### user_coupon_collections Table
**Before:**
- Had unique constraint preventing duplicates: `user_coupon_collections_user_id_coupon_id_key`

**After:**
- Unique constraint removed
- Non-unique index added for performance
- Users can now have multiple copies of the same coupon

### New Database Function
```sql
get_user_coupon_count(p_user_id UUID, p_coupon_id UUID) RETURNS INTEGER
```
Returns count of active or used copies of a coupon for a specific user.

## Sharing Workflow

### Step-by-Step Process:

1. **Validation**
   - Check sender owns the collection
   - Verify collection is shareable (`is_shareable = TRUE`)
   - Verify not already shared (`has_been_shared = FALSE`)
   - Check sharing limits (per-friend, total daily)
   - Count recipient's existing copies (for display)

2. **Transfer**
   - Mark sender's collection: `has_been_shared = TRUE`, `status = 'used'`
   - Create receiver's collection with `acquisition_method = 'shared_received'`
   - Link collections via `sharing_log_id`

3. **Logging**
   - Insert record into `coupon_sharing_log`
   - Create two lifecycle events:
     - `'shared_sent'` for sender
     - `'shared_received'` for receiver

4. **UI Updates**
   - Sender's wallet shows greyed out coupon (status = 'used')
   - Receiver's wallet shows new active coupon
   - If receiver has multiple copies, count badge displays

## API Endpoints Used

### Supabase RPC Functions:
- `log_coupon_share()` - Main sharing function
- `can_share_to_friend()` - Validates sharing limits
- `get_sharing_stats_today()` - Gets daily stats
- `get_user_coupon_count()` - Counts user's copies (NEW)

## Migration Instructions

### Apply the Migration:
1. Go to Supabase Dashboard → SQL Editor
2. Run the following SQL:

```sql
-- Drop unique constraint
ALTER TABLE user_coupon_collections 
DROP CONSTRAINT IF EXISTS user_coupon_collections_user_id_coupon_id_key;

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_user_coupon 
ON user_coupon_collections(user_id, coupon_id, status);

-- Add helper function
CREATE OR REPLACE FUNCTION get_user_coupon_count(
  p_user_id UUID,
  p_coupon_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM user_coupon_collections
    WHERE user_id = p_user_id
      AND coupon_id = p_coupon_id
      AND status IN ('active', 'used')
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

## Testing Checklist

- [ ] Share a coupon to a friend (first time)
- [ ] Verify sender's coupon is greyed out
- [ ] Verify receiver gets the coupon marked as "received"
- [ ] Share same coupon to same friend again
- [ ] Verify receiver now has 2 copies with "x2" badge
- [ ] Check `coupon_sharing_log` for both sharing events
- [ ] Check `coupon_lifecycle_events` for all events
- [ ] Verify sender cannot re-share the same collection instance

## Future Enhancements

1. **UI Improvements**
   - Show sharing history in user profile
   - Display who shared each coupon
   - Add "shared from {friend}" label on received coupons

2. **Analytics**
   - Track most shared coupons
   - Show sharing trends
   - Friend sharing leaderboard

3. **Limits & Gamification**
   - Implement Driver status detection
   - Dynamic limits based on user activity
   - Rewards for sharing

## Troubleshooting

### Issue: "duplicate key value violates unique constraint"
**Solution**: Migration not applied. Run the migration SQL above.

### Issue: Count badge not showing
**Solution**: Ensure `showCouponCount={true}` prop is passed to UnifiedCouponCard and `couponCount` is populated in coupon data.

### Issue: Coupon not transferring
**Solution**: Check that sender's collection has `is_shareable = TRUE` and `has_been_shared = FALSE`.

## Notes

- The system allows unlimited sharing (each user can share to multiple friends)
- Each coupon collection instance can only be shared once
- Receiver can re-share their received coupon to others
- All sharing events are fully audited in the database
- Count badge only shows when count > 1
