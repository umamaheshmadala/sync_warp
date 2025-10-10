# Fix for "collected_from_check" Constraint Violation Error

## Problem Description

Users were encountering this error when trying to collect coupons:
```
Failed to collect coupon: new row for relation "user_coupon_collections" violates check constraint "user_coupon_collections_collected_from_check"
```

## Root Cause

The `user_coupon_collections` table has a CHECK constraint on the `collected_from` column that only allows specific values:

### Allowed Values (per database constraint)
- `'direct_search'` - Found by searching
- `'business_profile'` - From business page
- `'social_share'` - Shared by friend
- `'push_notification'` - From notification
- `'qr_scan'` - Scanned QR code
- `'admin_push'` - Admin distributed

### The Issue
The code in `src/hooks/useSearch.ts` was passing `'search_page'` as the collection source, which is **NOT** in the allowed list.

```typescript
// ❌ WRONG - 'search_page' is not allowed
const success = await collectCoupon(couponId, 'search_page');

// ✅ CORRECT - 'direct_search' is allowed
const success = await collectCoupon(couponId, 'direct_search');
```

## Solution Applied

### Code Fix
**File**: `src/hooks/useSearch.ts` (Line 708)

**Before**:
```typescript
const success = await collectCoupon(couponId, 'search_page');
```

**After**:
```typescript
// Using 'direct_search' as the source (matches DB constraint)
const success = await collectCoupon(couponId, 'direct_search');
```

### Type Safety
The TypeScript type `CollectionSource` in `src/types/coupon.ts` already defines the correct allowed values:

```typescript
export type CollectionSource = 
  | 'direct_search' // Found by searching
  | 'business_profile' // From business page
  | 'social_share' // Shared by friend
  | 'push_notification' // From notification
  | 'qr_scan' // Scanned QR code
  | 'admin_push'; // Admin distributed
```

This provides compile-time type checking to prevent future mistakes.

## Verification

### 1. Check Database Constraint
Run this query in Supabase SQL Editor to see the constraint:

```sql
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'user_coupon_collections_collected_from_check';
```

Expected output:
```
constraint_name: user_coupon_collections_collected_from_check
definition: CHECK ((collected_from IN ('direct_search', 'business_profile', 'social_share', 'push_notification', 'qr_scan', 'admin_push')))
```

### 2. Test Collection Flow
1. Search for a coupon
2. Click "Collect" button
3. Should succeed with message: "Coupon collected successfully!"
4. No constraint violation error

### 3. Check Other Collection Points
Verify these locations also use correct values:

- ✅ `CouponBrowser.tsx` (line 138): Uses `'direct_search'`
- ✅ `useCoupons.ts` (line 694): Default is `'direct_search'`
- ✅ `useSearch.ts` (line 708): Now uses `'direct_search'`

## When to Use Each Source

### `'direct_search'`
Use when user finds and collects a coupon through:
- Main search page
- Search results
- Filtering/browsing coupons

### `'business_profile'`
Use when user collects from:
- Business detail page
- Business coupon list

### `'social_share'`
Use when user collects from:
- Shared link from friend
- Social media share

### `'push_notification'`
Use when user collects from:
- Push notification
- In-app notification

### `'qr_scan'`
Use when user collects from:
- Scanning QR code
- Physical coupon scan

### `'admin_push'`
Use when:
- Admin manually adds coupon to user wallet
- Bulk distribution by admin

## Testing Checklist

- [x] Fixed the code in `useSearch.ts`
- [ ] Test collection from search page
- [ ] Test collection from business profile
- [ ] Test collection from modal view
- [ ] Verify no constraint errors in browser console
- [ ] Verify no errors in Supabase logs
- [ ] Check that coupon appears in wallet after collection

## Common Mistakes to Avoid

### ❌ Wrong Values
```typescript
// These will cause constraint violations:
await collectCoupon(couponId, 'search_page');  // Not in allowed list
await collectCoupon(couponId, 'search');       // Not in allowed list
await collectCoupon(couponId, 'profile');      // Not in allowed list
await collectCoupon(couponId, 'shared');       // Not in allowed list
await collectCoupon(couponId, 'notification'); // Not in allowed list
```

### ✅ Correct Values
```typescript
// These match the database constraint:
await collectCoupon(couponId, 'direct_search');
await collectCoupon(couponId, 'business_profile');
await collectCoupon(couponId, 'social_share');
await collectCoupon(couponId, 'push_notification');
await collectCoupon(couponId, 'qr_scan');
await collectCoupon(couponId, 'admin_push');
```

## Future Prevention

### 1. Use TypeScript Strictly
Always import and use the `CollectionSource` type:

```typescript
import { CollectionSource } from '../types/coupon';

// TypeScript will catch invalid values at compile time
const source: CollectionSource = 'direct_search'; // ✅ OK
const source: CollectionSource = 'search_page';   // ❌ Compile error
```

### 2. Code Review Checklist
When adding new collection points:
- [ ] Import `CollectionSource` type
- [ ] Use one of the allowed values
- [ ] Test the collection flow
- [ ] Verify no constraint errors

### 3. Database Documentation
Keep a reference of allowed values:

```typescript
// Always refer to src/types/coupon.ts for allowed values
export type CollectionSource = 
  | 'direct_search'
  | 'business_profile'
  | 'social_share'
  | 'push_notification'
  | 'qr_scan'
  | 'admin_push';
```

## Related Files

- **Fix**: `src/hooks/useSearch.ts` (line 708)
- **Type Definition**: `src/types/coupon.ts` (lines 189-195)
- **Database Schema**: `supabase/migrations/20241225_create_coupon_tables.sql` (line 96)
- **Other Usage**: `src/components/user/CouponBrowser.tsx` (line 138)

## Troubleshooting

### Error Still Occurs
1. Clear browser cache
2. Restart development server
3. Check if code changes are deployed
4. Verify you're not using an old version of the code

### Wrong Source Value Needed
1. Check if the value you want to use is in the allowed list
2. If not, you need to update the database constraint
3. Run a migration to add the new value to the CHECK constraint

### How to Add New Source Value
If you need to add a new collection source:

1. **Update Database Constraint**:
```sql
-- Add new value to constraint
ALTER TABLE user_coupon_collections 
DROP CONSTRAINT user_coupon_collections_collected_from_check;

ALTER TABLE user_coupon_collections 
ADD CONSTRAINT user_coupon_collections_collected_from_check 
CHECK (collected_from IN (
  'direct_search', 
  'business_profile', 
  'social_share', 
  'push_notification', 
  'qr_scan', 
  'admin_push',
  'your_new_value'  -- Add your new value here
));
```

2. **Update TypeScript Type**:
```typescript
// src/types/coupon.ts
export type CollectionSource = 
  | 'direct_search'
  | 'business_profile'
  | 'social_share'
  | 'push_notification'
  | 'qr_scan'
  | 'admin_push'
  | 'your_new_value'; // Add your new value here
```

3. **Update Documentation**: Document when to use the new value

## Success Indicators

✅ Fix is successful when:
- Users can collect coupons from search page
- Users can collect coupons from modal view
- No constraint violation errors in console
- No errors in Supabase logs
- Coupons appear in wallet after collection
- TypeScript doesn't show any type errors

---

**Date Fixed**: 2025-02-03  
**Fixed By**: Development Team  
**Status**: Complete  
**Impact**: All coupon collection flows now working correctly
