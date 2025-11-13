# Following Page 400 Error Fix

## Problem

Following page shows empty cards with "Unknown Business" and console shows **400 Bad Request** errors:

```
GET https://...supabase.co/rest/v1/businesses?select=id,business_name,...&id=eq.xxx 400 (Bad Request)
```

## Root Cause

The 400 error indicates one of two issues:

### 1. **RLS Policy Blocking Query** (Most Likely)
The `businesses` table has Row Level Security (RLS) policies that are blocking authenticated users from reading business data.

### 2. **Non-Existent Column** (Less Likely)
The SELECT statement includes a column that doesn't exist in the `businesses` table (e.g., `review_count`).

## Solution

### Step 1: Fix the Query (Already Done)

**File**: `src/hooks/useBusinessFollowing.ts`

Changed from:
```typescript
const { data: businessData } = await supabase
  .from('businesses')
  .select('id, business_name, business_type, logo_url, ...')
  .eq('id', follow.business_id)
  .single();
```

To:
```typescript
const { data: businessData, error: businessError } = await supabase
  .from('businesses')
  .select('*')  // ✅ Select all columns
  .eq('id', follow.business_id)
  .single();

if (businessError) {
  console.error(`Error fetching business ${follow.business_id}:`, businessError);
  return { ...follow, business: undefined };
}
```

**Benefits**:
- Uses `SELECT *` to avoid column name issues
- Handles errors gracefully with try-catch
- Logs specific error messages for debugging
- Returns undefined business data instead of crashing

### Step 2: Fix RLS Policies (YOU NEED TO DO THIS)

**Action Required**: Run the SQL script in Supabase SQL Editor

**File**: `docs/FIX_BUSINESSES_RLS.sql`

**Quick Fix SQL**:
```sql
-- Allow all authenticated users to read businesses
CREATE POLICY IF NOT EXISTS "Businesses are viewable by everyone"
ON businesses
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
```

**Steps**:
1. Open your Supabase project
2. Go to **SQL Editor**
3. Paste the SQL from `docs/FIX_BUSINESSES_RLS.sql`
4. Run the script
5. Refresh your app

## Verification

After applying the fixes:

### 1. Check Console Logs

The app will now log detailed errors:
```
[BusinessFollowing] Error fetching business xxx: { message: "...", details: "..." }
```

### 2. Check Business Data

Console logs should show:
```
🔍 [FollowingPage] Business data: {
  business_id: "xxx",
  business_name: "Test Business",
  logo_url: "https://...",
  cover_image_url: "https://...",
  has_business: true  ✅
}
```

### 3. Verify RLS Policies

Run this in Supabase SQL Editor:
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'businesses';
```

You should see a SELECT policy that allows authenticated users to read.

## Common Issues

### Issue 1: Still Getting 400 After Code Fix

**Cause**: RLS policies still blocking
**Solution**: Run the SQL script to fix policies

### Issue 2: Businesses Show But No Images

**Cause**: Database has null values for logo_url and cover_image_url
**Solution**: 
1. Check console logs - will show `logo_url: null`
2. Upload images for test businesses
3. Or use placeholder/generated images

### Issue 3: Only Seeing "Unknown Business"

**Cause**: businessData is undefined (query failed)
**Solution**: 
1. Check console for error messages
2. Verify RLS policies
3. Check if business IDs in `business_followers` table actually exist in `businesses` table

## Testing Steps

1. **Clear browser cache** and reload
2. Navigate to `/following` page
3. **Open console** (F12)
4. Look for logs:
   - `[BusinessFollowing] Loading followed businesses`
   - `[BusinessFollowing] Loaded X followed businesses`
   - `🔍 [FollowingPage] Business data: {...}`
   - `🎴 [StandardBusinessCard] Rendering with data: {...}`

5. **Check for errors**:
   - If you see `Error fetching business xxx`, check the error details
   - If you see 400 errors, RLS policies need fixing

6. **Verify data**:
   - `has_business` should be `true`
   - `business_name` should have a value (not undefined)
   - `logo_url` and `cover_image_url` may be null (that's ok, will show placeholders)

## Alternative: Simpler RLS Policy

If you want businesses to be publicly viewable (for search/discovery):

```sql
CREATE POLICY IF NOT EXISTS "Businesses are publicly viewable"
ON businesses
FOR SELECT
TO public
USING (true);
```

This allows both authenticated and anonymous users to view businesses.

## Debug Checklist

- [ ] Run SQL script to fix RLS policies
- [ ] Clear browser cache and reload
- [ ] Check console for `[BusinessFollowing]` logs
- [ ] Verify `has_business: true` in console
- [ ] Verify business_name has a value
- [ ] Check if 400 errors are gone
- [ ] Verify business cards show names (not "Unknown Business")
- [ ] Check if images load (if URLs exist in database)

## Next Steps

1. **Run the SQL script** from `docs/FIX_BUSINESSES_RLS.sql`
2. **Reload the app**
3. **Check console logs** to verify data is loading
4. **Report back** what you see in the console logs

The debug logging will help us identify exactly what's wrong!
