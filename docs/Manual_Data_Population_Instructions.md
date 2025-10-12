# Manual Data Population for Campaign Targeting Demo

## Issue Encountered

The automated SQL scripts couldn't insert data due to Row Level Security (RLS) policies on the `profiles` table. The RLS policy "Users can insert own profile" requires `auth.uid()` to match, which blocks bulk inserts.

## Solution: Manual Population via Supabase Dashboard

Follow these steps to populate test data manually:

---

## Step 1: Access Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo
2. Log in if prompted
3. Navigate to **SQL Editor** in the left sidebar
4. Click **+ New query**

---

## Step 2: Run Data Population Scripts

Copy and paste each script below into the SQL Editor and click **Run** (or press Ctrl+Enter).

### Script 1: Create 100 Test Profiles

```sql
-- IMPORTANT: Run this as a single script
BEGIN;

-- Temporarily disable RLS for data population
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Insert 100 test profiles
INSERT INTO profiles (id, email, full_name, city, interests, is_driver, driver_score, created_at)
SELECT 
  gen_random_uuid(),
  'test_user_' || series || '@targetingdemo.com',
  'Demo User ' || series,
  CASE (series % 4)
    WHEN 0 THEN 'New York'
    WHEN 1 THEN 'Los Angeles'
    WHEN 2 THEN 'Chicago'
    ELSE 'Houston'
  END,
  ARRAY[
    CASE WHEN (series % 5) = 0 THEN 'food_dining' END,
    CASE WHEN (series % 4) = 0 THEN 'shopping_retail' END,
    CASE WHEN (series % 3) = 0 THEN 'entertainment' END,
    CASE WHEN (series % 6) = 0 THEN 'luxury' END,
    CASE WHEN (series % 7) = 0 THEN 'premium_dining' END
  ]::text[],
  (series % 5) = 0, -- 20% are drivers
  CASE WHEN (series % 5) = 0 THEN (20 + (series % 80))::INT ELSE NULL END,
  NOW() - ((series || ' days')::INTERVAL)
FROM generate_series(1, 100) AS series
ON CONFLICT (email) DO NOTHING;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify insertion
SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE is_driver = true) as drivers
FROM profiles;
```

**Expected Result**: Should show ~103 total profiles (3 existing + 100 new), ~20 drivers

---

### Script 2: Create Driver Profiles

```sql
-- Create driver_profiles for users marked as drivers
BEGIN;

ALTER TABLE driver_profiles DISABLE ROW LEVEL SECURITY;

INSERT INTO driver_profiles (user_id, is_driver, total_activity_score, created_at)
SELECT 
  id,
  true,
  COALESCE(driver_score, 50),
  created_at
FROM profiles
WHERE is_driver = true
  AND id NOT IN (SELECT user_id FROM driver_profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify
SELECT COUNT(*) as driver_profiles_count FROM driver_profiles;
```

**Expected Result**: Should show ~20 driver profiles

---

### Script 3: Update Businesses with City Data

```sql
-- Update existing businesses with city information
UPDATE businesses 
SET city_id = CASE 
  WHEN (ascii(substring(id::text, 1, 1)) % 4) = 0 THEN 'New York'
  WHEN (ascii(substring(id::text, 1, 1)) % 4) = 1 THEN 'Los Angeles'
  WHEN (ascii(substring(id::text, 1, 1)) % 4) = 2 THEN 'Chicago'
  ELSE 'Houston'
END
WHERE city_id IS NULL OR city_id = '';

-- Verify
SELECT COUNT(*) as businesses_with_city FROM businesses WHERE city_id IS NOT NULL;
```

**Expected Result**: All 4 businesses should have city_id

---

### Script 4: Create Business Customer Profiles

```sql
-- Create customer demographic profiles for businesses
BEGIN;

ALTER TABLE business_customer_profiles DISABLE ROW LEVEL SECURITY;

INSERT INTO business_customer_profiles (
  business_id,
  primary_age_ranges,
  income_levels,
  interest_categories,
  created_at
)
SELECT 
  id,
  ARRAY['25-34', '35-44']::text[],
  ARRAY['middle', 'upper_middle']::text[],
  ARRAY['food_dining', 'shopping_retail']::text[],
  NOW()
FROM businesses
WHERE id NOT IN (SELECT business_id FROM business_customer_profiles)
LIMIT 10
ON CONFLICT (business_id) DO NOTHING;

ALTER TABLE business_customer_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify
SELECT COUNT(*) as customer_profiles FROM business_customer_profiles;
```

**Expected Result**: Should show 4-10 customer profiles (depending on conflicts)

---

## Step 3: Verify All Data

Run this final verification query:

```sql
SELECT 
  (SELECT COUNT(*) FROM profiles) as profiles_count,
  (SELECT COUNT(*) FROM profiles WHERE is_driver = true) as drivers_marked,
  (SELECT COUNT(*) FROM driver_profiles) as driver_profiles_count,
  (SELECT COUNT(*) FROM businesses WHERE city_id IS NOT NULL) as businesses_with_city,
  (SELECT COUNT(*) FROM business_customer_profiles) as customer_profiles_count;
```

### Expected Results:
- **profiles_count**: ~103
- **drivers_marked**: ~20
- **driver_profiles_count**: ~20
- **businesses_with_city**: 4
- **customer_profiles_count**: 4-10

---

## Step 4: Get a Valid Business ID for the Demo

Run this query to get a real business ID:

```sql
SELECT id, name FROM businesses LIMIT 1;
```

Copy the `id` value and update your demo page:

```typescript
// In src/pages/CampaignTargetingDemo.tsx
// Replace this line:
const [businessId] = useState('demo-business-123');

// With the actual ID:
const [businessId] = useState('PASTE_THE_REAL_ID_HERE');
```

---

## Troubleshooting

### If Script 1 Fails with RLS Error

The RLS disable might not work with your current permissions. Alternative:

1. Go to **Authentication** → **Policies**
2. Find the `profiles` table
3. Temporarily click the 🔓 icon to disable RLS
4. Run the INSERT statement without the ALTER commands
5. Re-enable RLS after insertion

### If You Get "permission denied"

You might need to run as service_role:

1. In SQL Editor, look for the "Role" dropdown
2. Change from `anon` or `authenticated` to `postgres` or `service_role`
3. Run the scripts again

### If Conflicts Occur

If you see "ON CONFLICT DO NOTHING" messages:
- This is normal - it means some emails already exist
- As long as you see ~100 new rows inserted, it's working

---

## After Population: Test the Demo

1. Restart your dev server (Ctrl+C then `npm run dev`)
2. Open: `http://localhost:5173/demo/campaign-targeting`
3. Try each preset:
   - **Broad Reach**: Should show ~80-100 matching users
   - **Premium Audience**: Should show ~10-20 matching users
   - **Focused Targeting**: Should show ~30-50 matching users
4. Check console for errors

---

## Expected Demo Behavior After Population

### Targeting Validator
- ✅ Should show validation messages
- ✅ Warnings for broad targeting
- ✅ Suggestions for optimization

### Reach Estimator
- ✅ Matching Drivers: 10-80 (depending on targeting)
- ✅ Est. Monthly Impressions: 150-1,200
- ✅ Demographic breakdowns by city
- ✅ Confidence levels: medium/high

### AI Recommendations
- ✅ Should load without errors
- ✅ Shows 5 recommendation cards
- ✅ "Apply" button works
- ✅ Applied recommendations update other components

---

## Alternative: Keep Mock Data Mode

If manual population is too complex, you can keep using mock data:

```typescript
// In src/pages/CampaignTargetingDemo.tsx
// Change back to:
useMockData={true}  // All three components
```

This gives you a fully functional demo without needing real database data.

---

## Need Help?

If you encounter issues:

1. Check the browser console for specific error messages
2. Verify RLS policies in Supabase Dashboard
3. Ensure you're logged in with sufficient permissions
4. Try running as postgres/service_role if available

---

**Last Updated**: 2025-01-11  
**Status**: Manual Population Required
