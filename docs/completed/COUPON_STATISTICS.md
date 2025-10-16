# Coupon Statistics System

## Overview
The coupon statistics system automatically tracks usage and collection counts for all coupons in the application. This document explains how it works and how to verify/fix any discrepancies.

## Statistics Tracked

### 1. **Usage Count** (`usage_count`)
- Tracks how many times a coupon has been **redeemed/used**
- Updated automatically via database trigger when a new record is inserted into `coupon_redemptions` table
- Only counts redemptions with `status = 'completed'`

### 2. **Collection Count** (`collection_count`)
- Tracks how many times a coupon has been **collected/saved** by users
- Updated automatically via database trigger when a new record is inserted into `user_coupon_collections` table
- **Important**: Since duplicate collections are now allowed (multiple users can have the same coupon), this counts ALL collections, including duplicates

## How It Works

### Database Triggers

#### 1. Redemption Trigger
```sql
CREATE TRIGGER update_analytics_on_redemption
    AFTER INSERT ON coupon_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_analytics_on_redemption();
```

This trigger:
- Fires when a coupon is redeemed
- Increments `usage_count` in `business_coupons` table
- Updates analytics in `coupon_analytics` table

#### 2. Collection Trigger
```sql
CREATE TRIGGER update_analytics_on_collection
    AFTER INSERT ON user_coupon_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_analytics_on_collection();
```

This trigger:
- Fires when a coupon is collected
- Increments `collection_count` in `business_coupons` table
- Updates analytics in `coupon_analytics` table

### Duplicate Collections
As of migration `20251003000000_allow_duplicate_coupons.sql`, the unique constraint on `(user_id, coupon_id)` was removed to support:
- Users receiving the same coupon multiple times via sharing
- Tracking each individual coupon instance

**This means**:
- A user can have multiple copies of the same coupon
- Each copy is a separate collection entry
- `collection_count` reflects the total number of collections (including duplicates)
- This is **correct behavior** for the sharing system

## Verification & Fixing

### When to Verify
You should verify coupon statistics if:
- You suspect the numbers don't match reality
- After data migrations or bulk operations
- After system updates or bug fixes
- Periodically as part of maintenance

### How to Verify (Frontend)

1. Navigate to the Coupon Manager page for your business
2. Click the **"Verify Stats"** button in the header
3. The system will:
   - Check all coupons for this business
   - Compare stored counts with actual data
   - Automatically fix any discrepancies
   - Show a toast notification with results

### How to Verify (Database)

#### Check for Discrepancies
```sql
SELECT * FROM recalculate_coupon_stats();
```

This will return a table showing:
- `coupon_id` - The coupon's UUID
- `coupon_title` - The coupon's title
- `old_usage_count` - Current stored usage count
- `new_usage_count` - Actual usage count from redemptions table
- `old_collection_count` - Current stored collection count
- `new_collection_count` - Actual collection count from collections table
- `usage_diff` - Difference in usage count
- `collection_diff` - Difference in collection count

#### Fix All Discrepancies
```sql
SELECT fix_coupon_stats();
```

This will:
- Recalculate all coupon statistics
- Update any coupons with incorrect counts
- Return a JSON summary of changes

Example output:
```json
{
  "success": true,
  "fixed_count": 3,
  "message": "Updated 3 coupon(s) with incorrect statistics"
}
```

### How to Verify (Code)

```typescript
import { couponStatsService } from '../services/couponStatsService';

// Verify stats for all coupons in a business
const discrepancies = await couponStatsService.verifyStats(businessId);

if (discrepancies.length > 0) {
  console.log('Found discrepancies:', discrepancies);
  
  // Fix them
  const result = await couponStatsService.fixStats();
  console.log('Fix result:', result);
}

// Get accurate stats for a specific coupon
const stats = await couponStatsService.getCouponStats(couponId);
console.log(`Usage: ${stats.usage_count}, Collections: ${stats.collection_count}`);
```

## Common Scenarios

### Scenario 1: Coupon Shared Multiple Times
**User A shares a coupon to User B and User C**
- Initial: `collection_count = 1` (User A)
- After share to B: `collection_count = 2` (A + B)
- After share to C: `collection_count = 3` (A + B + C)

✅ This is correct! Each share creates a new collection.

### Scenario 2: User Has Multiple Copies
**User A receives the same coupon from 2 friends**
- Friend 1 shares: User A gets copy #1, `collection_count++`
- Friend 2 shares: User A gets copy #2, `collection_count++`

✅ This is correct! User A has 2 copies, counted as 2 collections.

### Scenario 3: Coupon Redeemed Once Per Copy
**User A has 2 copies and uses one**
- Before: `usage_count = 0`, `collection_count = 2`
- After redeeming one: `usage_count = 1`, `collection_count = 2`

✅ This is correct! Usage tracks redemptions, not how many copies are left.

## Troubleshooting

### Stats Don't Match
**Problem**: The usage or collection count seems wrong

**Solution**:
1. Click "Verify Stats" in Coupon Manager
2. Or run `SELECT fix_coupon_stats();` in database
3. Refresh the page

### Trigger Not Firing
**Problem**: Stats not updating when coupons are collected/redeemed

**Check**:
```sql
-- Check if triggers exist
SELECT * FROM pg_trigger 
WHERE tgname IN ('update_analytics_on_collection', 'update_analytics_on_redemption');

-- Check if functions exist
SELECT * FROM pg_proc 
WHERE proname IN ('update_coupon_analytics_on_collection', 'update_coupon_analytics_on_redemption');
```

**Fix**: Re-run the migration:
```bash
supabase db reset
# or
supabase migration up
```

### Stats Zero After Migration
**Problem**: All stats show 0 after migration

**Solution**: Run the fix function to recalculate from existing data:
```sql
SELECT fix_coupon_stats();
```

## Migration Reference

### Key Migrations
- `20241225_create_coupon_tables.sql` - Created the triggers
- `20251003000000_allow_duplicate_coupons.sql` - Removed unique constraint
- `20251003000001_verify_coupon_stats.sql` - Added verification functions

### Verification Functions Added
- `recalculate_coupon_stats()` - Checks for discrepancies
- `fix_coupon_stats()` - Fixes all discrepancies

## API Reference

### Frontend Service

```typescript
// couponStatsService.ts

// Verify stats for a business
couponStatsService.verifyStats(businessId?: string): Promise<CouponStatsDiscrepancy[]>

// Fix all stats
couponStatsService.fixStats(): Promise<FixStatsResult>

// Get stats for one coupon
couponStatsService.getCouponStats(couponId: string): Promise<{ usage_count, collection_count }>

// Manually update (use with caution)
couponStatsService.updateCouponStats(couponId, usage, collection): Promise<boolean>
```

### Database Functions

```sql
-- Check for discrepancies
SELECT * FROM recalculate_coupon_stats();

-- Fix all discrepancies
SELECT fix_coupon_stats();
```

## Best Practices

1. **Regular Verification**: Run stats verification monthly or after major updates
2. **Monitor Logs**: Check application logs for trigger failures
3. **Test Before Production**: Verify stats work correctly in dev/staging first
4. **Backup Before Fix**: Always backup before running fix_coupon_stats()
5. **Understand Duplicates**: Remember that collection_count includes all copies

## Support

If you encounter issues with coupon statistics:
1. Check this documentation first
2. Run the verification tool
3. Check database logs for trigger errors
4. Verify the migrations have been applied
5. Contact the development team with error details
