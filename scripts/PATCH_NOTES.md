# Seeding Script Patch Notes

## Version 1.1 - Enum Fix (2025-10-12)

### Issue Fixed
**Error**: `invalid input value for enum user_role: "driver"`

### Root Cause
The `user_role` enum in the database only contains these values:
- `customer`
- `business_owner`
- `admin`

There is **NO** `driver` enum value. Drivers are identified by the `is_driver` boolean field, not by their role.

### Changes Made

#### 1. Updated `scripts/MANUAL_SEED_DATA.sql`
**Before**:
```sql
CASE 
  WHEN n <= 70 THEN 'customer'::user_role
  WHEN n <= 85 THEN 'driver'::user_role  -- ❌ This was wrong
  ELSE 'business_owner'::user_role
END
```

**After**:
```sql
CASE 
  WHEN n <= 70 THEN 'customer'::user_role
  WHEN n <= 85 THEN 'customer'::user_role  -- ✅ Drivers are customers with is_driver=true
  ELSE 'business_owner'::user_role
END
```

#### 2. How Drivers Are Identified
```sql
-- Drivers have two identifying characteristics:
1. role = 'customer'
2. is_driver = true  -- ✅ This is the key field

-- Example:
INSERT INTO profiles (role, is_driver)
VALUES ('customer'::user_role, true);  -- This is a driver
```

### User Profile Breakdown

After seeding, you'll have:

| Profile Type | Count | role | is_driver |
|-------------|-------|------|-----------|
| Regular Customers | 70 | customer | false |
| Drivers | 15 | customer | true ✅ |
| Business Owners | 15 | business_owner | false |
| **Total** | **100** | - | - |

### Verification Query

To verify drivers were created correctly:

```sql
-- Check driver creation
SELECT 
  role,
  is_driver,
  COUNT(*) as count
FROM profiles
WHERE email LIKE '%@sync.app'
GROUP BY role, is_driver
ORDER BY role, is_driver;

-- Expected output:
-- role          | is_driver | count
-- --------------|-----------|-------
-- customer      | false     | 70
-- customer      | true      | 15     ← These are the drivers
-- business_owner| false     | 15
```

### Files Updated
- ✅ `scripts/MANUAL_SEED_DATA.sql`
- ✅ `docs/SEEDING_TASK_SUMMARY.md`
- ✅ `docs/DATA_SEEDING_GUIDE.md`

### Action Required
**Re-run the seeding script**:
1. Open: https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo
2. Go to SQL Editor
3. Copy contents of updated `scripts/MANUAL_SEED_DATA.sql`
4. Paste and Run
5. ✅ Should complete successfully now!

---

**Status**: ✅ FIXED  
**Version**: 1.1  
**Date**: 2025-10-12  
**Impact**: Critical fix - script now runs successfully
