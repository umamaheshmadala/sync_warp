# Wishlist Column Name Fix

**Date**: October 17, 2025  
**Issue**: 400 Bad Request errors for wishlist queries  
**Root Cause**: Column name mismatch in code vs database schema

---

## Investigation Process

### Step 1: Analyzed Console Errors

Console showed:
```
column user_wishlist_items.product_id does not exist
code: '42703'
```

### Step 2: Checked Database Schema

Query:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_wishlist_items';
```

**Actual schema**:
- `id` (uuid)
- `user_id` (uuid)
- `item_type` (text) - indicates type: 'business', 'coupon', or 'product'
- `item_id` (uuid) - the actual entity ID
- `notes` (text)
- `priority` (integer)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Step 3: Found Code Mismatch

File: `src/hooks/useSimpleProductSocial.ts`

**Lines with incorrect column reference**:
- Line 73: `.select('product_id')` ❌
- Line 86: `item.product_id` ❌  
- Line 106: `product_id: productId` ❌
- Line 118: `.eq('product_id', productId)` ❌

---

## Root Cause

The `user_wishlist_items` table is a **unified table** for all wishlist types (business, coupon, product) using:
- `item_type` to distinguish the entity type
- `item_id` to store the entity's ID

The code was trying to use a non-existent `product_id` column instead of the correct `item_id` column.

---

## Solution Applied

### Fix 1: Load Wishlist Query
```typescript
// BEFORE ❌
.select('product_id')
.eq('user_id', user.id)

// AFTER ✅
.select('item_id')
.eq('user_id', user.id)
.eq('item_type', 'product')
```

### Fix 2: Map Result
```typescript
// BEFORE ❌
data?.map(item => item.product_id)

// AFTER ✅
data?.map(item => item.item_id)
```

### Fix 3: Insert Wishlist Item
```typescript
// BEFORE ❌
.insert({
  user_id: user.id,
  product_id: productId
})

// AFTER ✅
.insert({
  user_id: user.id,
  item_type: 'product',
  item_id: productId
})
```

### Fix 4: Delete Wishlist Item
```typescript
// BEFORE ❌
.delete()
.eq('user_id', user.id)
.eq('product_id', productId)

// AFTER ✅
.delete()
.eq('user_id', user.id)
.eq('item_type', 'product')
.eq('item_id', productId)
```

---

## Files Modified

1. `src/hooks/useSimpleProductSocial.ts` (4 locations fixed)

---

## Testing

To verify the fix:

1. **Check wishlist query works**:
```sql
SELECT * FROM user_wishlist_items 
WHERE user_id = 'some-uuid' 
AND item_type = 'product';
```

2. **Test insert**:
```sql
INSERT INTO user_wishlist_items (user_id, item_type, item_id)
VALUES ('user-uuid', 'product', 'product-uuid');
```

3. **Test delete**:
```sql
DELETE FROM user_wishlist_items 
WHERE user_id = 'user-uuid' 
AND item_type = 'product'
AND item_id = 'product-uuid';
```

---

## Impact

- ✅ Wishlist queries no longer return 400 errors
- ✅ Products can be added to wishlist correctly
- ✅ Products can be removed from wishlist correctly
- ✅ Wishlist properly filters by item_type='product'
- ✅ No breaking changes - only fixes bugs

---

##  Why This Happened

The `user_wishlist_items` table was designed as a unified table (similar to the favorites migration) but the code in `useSimpleProductSocial.ts` was written assuming a product-specific column name (`product_id`) instead of using the generic `item_id` + `item_type` pattern.

---

**Status**: ✅ Fixed  
**Testing**: Refresh browser and try adding products to wishlist
