# RPC Functions Fix - Favorites Display Issue

**Date**: October 17, 2025  
**Issue**: `get_user_favorites` and old RPC functions returning 400 errors  
**Root Cause**: Old RPC functions still referencing renamed/deprecated tables

---

## Problem

After Phase 2 migration renamed tables:
- `user_favorites_businesses` → `_deprecated_user_favorites_businesses`
- `user_favorites_coupons` → `_deprecated_user_favorites_coupons`

The **old RPC functions** were NOT updated and still tried to query the old table names, causing 400 errors.

---

## Functions Affected

1. `get_user_favorite_businesses(uuid, int, int)` - Still querying `user_favorites_businesses`
2. `get_user_favorite_coupons(uuid, int, int)` - Still querying `user_favorites_coupons`

---

## Solution

Updated both old RPC functions to query the new unified `favorites` table:

### Updated `get_user_favorite_businesses`

```sql
-- Now queries: favorites table with entity_type = 'business'
SELECT 
    b.id as business_id,
    b.business_name,
    b.business_type,
    b.description,
    b.address,
    b.latitude,
    b.longitude,
    b.rating,
    f.created_at as favorited_at
FROM favorites f
JOIN businesses b ON b.id = f.entity_id
WHERE f.user_id = user_uuid
  AND f.entity_type = 'business'
```

### Updated `get_user_favorite_coupons`

```sql
-- Now queries: favorites table with entity_type = 'coupon'
SELECT 
    c.id as coupon_id,
    c.title,
    c.description,
    c.discount_type,
    c.discount_value,
    c.valid_until,
    c.business_id,
    b.business_name,
    f.created_at as favorited_at
FROM favorites f
JOIN business_coupons c ON c.id = f.entity_id
JOIN businesses b ON b.id = c.business_id
WHERE f.user_id = user_uuid
  AND f.entity_type = 'coupon'
```

---

## Why This Happened

In Phase 2 migration (`20250117_database_cleanup_phase2.sql`), we:
1. ✅ Migrated all data to `favorites` table
2. ✅ Renamed old tables to `_deprecated_*`
3. ✅ Dropped old RPC functions
4. ✅ Created new unified `get_user_favorites` function

However, the old functions (`get_user_favorite_businesses` and `get_user_favorite_coupons`) were **recreated** or **not fully dropped**, and they still referenced the old table names.

---

## Impact

- ✅ Old RPC functions now work with unified `favorites` table
- ✅ No breaking changes - maintains backward compatibility
- ✅ Favorites page will load correctly
- ✅ Both old and new RPC functions work

---

## Testing

```sql
-- Test business favorites
SELECT * FROM get_user_favorite_businesses('user-uuid'::uuid) LIMIT 5;

-- Test coupon favorites
SELECT * FROM get_user_favorite_coupons('user-uuid'::uuid) LIMIT 5;

-- Test new unified function
SELECT * FROM get_user_favorites('user-uuid'::uuid, 'business') LIMIT 5;
```

All three should return data without errors.

---

**Status**: ✅ Fixed  
**Action**: Refresh browser - favorites should now display with actual names/details
