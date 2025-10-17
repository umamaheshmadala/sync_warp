# Fix: get_user_favorites RPC 400 Error

## Issue
The `get_user_favorites` RPC function was returning 400 Bad Request errors when called from the frontend, causing the favorites page to fail to load.

## Root Cause
The function was referencing `b.rating` in the SELECT statement:
```sql
b.rating as business_rating
```

However, the `businesses` table actually has the column named `average_rating`, not `rating`. This mismatch caused PostgreSQL to throw an error:
```
ERROR: column b.rating does not exist
```

## Investigation
1. Checked Supabase API logs and found multiple `POST | 400` errors to `/rest/v1/rpc/get_user_favorites`
2. Examined PostgreSQL logs and found the specific error: `column b.rating does not exist`
3. Queried `information_schema.columns` and confirmed the correct column name is `average_rating`

## Fix Applied
Updated the `get_user_favorites` function to use the correct column name:
```sql
CREATE OR REPLACE FUNCTION public.get_user_favorites(
  user_id_param uuid,
  entity_type_param text DEFAULT NULL
)
RETURNS TABLE(...)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ...
    b.average_rating as business_rating,  -- Fixed: was b.rating
    ...
  FROM favorites f
  LEFT JOIN businesses b ON f.entity_type = 'business' AND f.entity_id = b.id
  ...
END;
$$;
```

## Migration Applied
- **Migration Name**: `fix_get_user_favorites_rating_column`
- **Date**: 2025-01-17
- **Status**: Successfully applied

## Verification
1. Function now executes without errors
2. Frontend favorites page should now load properly
3. All three entity types (business, coupon, product) are supported

## Impact
- Fixes 400 errors on favorites page
- Restores functionality for viewing favorited businesses, coupons, and products
- No data loss or schema changes required

## Next Steps
- Clear browser cache and refresh the app
- Verify favorites page loads without errors
- Confirm that business details (including ratings) display correctly
