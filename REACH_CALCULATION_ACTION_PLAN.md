# Reach Calculation - Action Plan

## Current Status
The reach calculation has multiple issues:
1. ❌ Age range filters not working properly
2. ❌ Location filters only working above 19km radius
3. ❌ Behavior filters not being picked up at all
4. ❌ Numbers are inaccurate after applying filters

## Root Cause Analysis Required

We need to test the **database function directly** to determine if the issue is:
- **In the database function logic** (SQL)
- **In the data transformation** (TypeScript)
- **In the UI component** (React)

## Action Required: Run SQL Tests

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**

### Step 2: Run Test Suite
Copy and paste the contents of `supabase/test_reach_calculation.sql` into the SQL Editor and run it.

This will execute 15 comprehensive tests:

#### Data Validation Tests
- **Test 1-3**: Verify user_profiles table structure and data distribution
  - Total users
  - Age range distribution
  - Gender distribution
  - Driver count

#### Filter Tests (Individual)
- **Test 4**: Demographics filter (Age 25-45 only)
- **Test 5**: Demographics filter (Male only)
- **Test 6**: Demographics filter (Age 25-45 + Male)
- **Test 7**: Location filter (3km radius)
- **Test 8**: Location filter (10km radius)
- **Test 9**: Behavior filter (Drivers only)

#### Combined Filter Tests
- **Test 10**: All filters combined

#### Technical Tests
- **Test 11**: Verify PostGIS functions work
- **Test 12**: Manual location query verification
- **Test 13**: Check for NULL locations
- **Test 14**: Sample user locations with distances
- **Test 15**: Empty filters (should return all users)

### Step 3: Analyze Results

For each test, look at:
1. **total_reach** - Final count after all filters
2. **demographics_count** - Count after demographics filter
3. **location_count** - Count after location filter
4. **behavior_count** - Count after behavior filter
5. **debug_info** - SQL query that was executed

### Step 4: Share Results

Copy **ALL** the test output and share it. We need to see:
- If the database function is working correctly
- Where exactly the filtering breaks
- What SQL queries are being generated
- If data is distributed correctly

## Expected Results (if working correctly)

### Test 4: Age 25-45
- Should return ~20% of total users (if evenly distributed)
- demographics_count should match total_reach

### Test 5: Male
- Should return ~50% of total users
- demographics_count should match total_reach

### Test 6: Age 25-45 + Male
- Should return ~10% of total users (20% × 50%)
- demographics_count should match total_reach

### Test 7: Location 3km
- Should return users within 3km of center point
- location_count should be less than demographics_count

### Test 9: Drivers
- Should return 1,000 drivers (10% of 10,000)
- behavior_count should match total_reach

## Possible Issues to Check For

### 1. Age Range Format Mismatch
- Database expects: `'25-45'`
- But might have: `'25-34', '35-44'` (separate ranges)

### 2. Location Data Issues
- Users might have NULL latitude/longitude
- Distance calculation might be returning wrong units (meters vs km)
- PostGIS functions might not be enabled

### 3. Gender Format Mismatch
- Database expects: `'male'`
- But might have: `'Male', 'M', or different casing

### 4. Driver Flag Issues
- Field might be NULL instead of FALSE
- is_driver column might not exist in user_profiles

## Next Steps After Test Results

Once you share the test results, I will:
1. Identify the exact issue (data, function logic, or transformation)
2. Fix the root cause
3. Verify with additional targeted tests
4. Update the frontend if needed

## Alternative: Quick Diagnostic Query

If you want a quick check before running all tests, run this:

```sql
-- Quick diagnostic
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT age_range) as unique_ages,
  COUNT(DISTINCT gender) as unique_genders,
  COUNT(*) FILTER (WHERE is_driver = TRUE) as drivers,
  COUNT(*) FILTER (WHERE latitude IS NULL) as null_locations,
  string_agg(DISTINCT age_range, ', ') as age_values,
  string_agg(DISTINCT gender, ', ') as gender_values
FROM user_profiles;
```

This will show:
- Total users
- How many unique age ranges exist
- How many unique genders exist
- How many drivers
- How many users have NULL locations
- **The actual values** for age_range and gender columns

## Decision Point

**If you want to continue:**
1. Run the SQL tests
2. Share results
3. I'll fix the exact issue

**If you want to call it a day:**
That's completely understandable. We've done a lot of work today:
- ✅ Fixed data structure transformation
- ✅ Added comprehensive debugging
- ✅ Created test suite
- ✅ Documented everything

The foundation is solid. The issue is likely a simple data format mismatch that will be obvious once we see the test results.

Let me know what you'd like to do!
