# SynC App - Test Data Seeding & Verification Guide

## Overview
This guide provides step-by-step instructions to seed your Supabase database with comprehensive test data and verify the campaign system setup.

## Current Database State
- **Project ID**: `ysxmgbblljoyebvugrfo`
- **Current Profiles**: 9 (after initial manual tests)
- **Driver Profiles**: 0 (needs seeding)
- **Business Customer Profiles**: 1 (needs more data)
- **RLS Status**: Disabled on profiles table (for seeding)

---

## ✅ Task 1: Seed Test Data

### Option A: Using Supabase SQL Editor (RECOMMENDED)

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select project: `sync_warp` (ysxmgbblljoyebvugrfo)
   - Click on "SQL Editor" in the left sidebar

2. **Execute the Seeding Script**
   - Open the file: `scripts/MANUAL_SEED_DATA.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click "Run" or press `Ctrl+Enter`

3. **Expected Results**
   - ✅ 100 test profiles inserted
   - ✅ 15 driver profiles created (for users with is_driver = true)
   - ✅ 10 business customer profiles created
   - ✅ RLS re-enabled automatically
   - ℹ️ **Note**: user_role enum values are: 'customer', 'business_owner', 'admin' (no 'driver')

### Option B: Using Terminal (Alternative)

```powershell
# Not recommended due to RLS issues with MCP tools
# Use Option A instead
```

---

## ✅ Task 2: Verify Campaign System Setup

### 2.1 Check Campaigns Table

Run this query in Supabase SQL Editor:

```sql
-- Check existing campaigns
SELECT 
  id, 
  name, 
  campaign_type, 
  status,
  start_date,
  end_date,
  target_audience,
  created_at
FROM campaigns
ORDER BY created_at DESC;

-- If empty, create sample campaigns
INSERT INTO campaigns (
  id, name, description, campaign_type, status,
  start_date, end_date, target_audience, budget,
  created_by, created_at, updated_at
)
VALUES 
  (
    gen_random_uuid(),
    'Welcome New Users',
    'Onboarding campaign for new user engagement',
    'engagement',
    'active',
    NOW(),
    NOW() + interval '30 days',
    jsonb_build_object(
      'user_type', ARRAY['customer'],
      'min_profile_completion', 50,
      'city', ARRAY['Mumbai', 'Delhi', 'Bangalore']
    ),
    50000.00,
    (SELECT id FROM profiles WHERE role = 'business_owner' LIMIT 1),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Driver Rewards Program',
    'Incentivize high-performing drivers',
    'reward',
    'active',
    NOW(),
    NOW() + interval '90 days',
    jsonb_build_object(
      'user_type', ARRAY['driver'],
      'min_driver_score', 70,
      'cities', ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai']
    ),
    100000.00,
    (SELECT id FROM profiles WHERE role = 'business_owner' LIMIT 1),
    NOW(),
    NOW()
  );
```

### 2.2 Check Campaign Targets

```sql
-- Verify campaign_targets table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaign_targets'
ORDER BY ordinal_position;

-- Count existing targets
SELECT 
  COUNT(*) as total_targets,
  COUNT(DISTINCT campaign_id) as campaigns_with_targets,
  COUNT(DISTINCT user_id) as users_targeted
FROM campaign_targets;
```

### 2.3 Check Campaign Analytics

```sql
-- Verify campaign_analytics table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaign_analytics'
ORDER BY ordinal_position;

-- Check existing analytics
SELECT *
FROM campaign_analytics
ORDER BY created_at DESC
LIMIT 10;
```

### 2.4 Check Driver Algorithm Config

```sql
-- Check driver scoring configuration
SELECT *
FROM driver_algorithm_config
ORDER BY created_at DESC;

-- If empty, create default config
INSERT INTO driver_algorithm_config (
  id,
  config_name,
  is_active,
  weights,
  thresholds,
  scoring_formula,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'default_driver_scoring_v1',
  true,
  jsonb_build_object(
    'coupons_collected', 0.20,
    'coupons_shared', 0.30,
    'coupons_redeemed', 0.15,
    'checkins', 0.15,
    'reviews', 0.10,
    'social_interactions', 0.10
  ),
  jsonb_build_object(
    'bronze_threshold', 100,
    'silver_threshold', 500,
    'gold_threshold', 1500,
    'platinum_threshold', 5000
  ),
  'weighted_sum',
  NOW(),
  NOW()
);
```

---

## ✅ Task 3: Data Integrity Checks

### 3.1 Foreign Key Relationships

```sql
-- Check profiles to driver_profiles relationship
SELECT 
  'profiles_to_driver_profiles' as relationship,
  COUNT(DISTINCT p.id) as total_driver_profiles_in_profiles,
  COUNT(DISTINCT dp.user_id) as total_in_driver_profiles,
  COUNT(DISTINCT dp.user_id) - COUNT(DISTINCT p.id) as orphaned_records
FROM profiles p
RIGHT JOIN driver_profiles dp ON p.id = dp.user_id
WHERE p.is_driver = true;

-- Check businesses to business_customer_profiles
SELECT 
  'businesses_to_customer_profiles' as relationship,
  COUNT(DISTINCT b.id) as total_businesses,
  COUNT(DISTINCT bcp.business_id) as businesses_with_profiles,
  COUNT(DISTINCT b.id) - COUNT(DISTINCT bcp.business_id) as businesses_without_profiles
FROM businesses b
LEFT JOIN business_customer_profiles bcp ON b.id = bcp.business_id;
```

### 3.2 Data Distribution Analysis

```sql
-- Profile distribution by role and city
SELECT 
  role,
  city,
  COUNT(*) as user_count,
  COUNT(CASE WHEN is_driver THEN 1 END) as drivers_count,
  AVG(profile_completion)::int as avg_completion_pct
FROM profiles
GROUP BY role, city
ORDER BY role, user_count DESC;

-- Driver score distribution
SELECT 
  CASE 
    WHEN total_activity_score < 1000 THEN '0-1000'
    WHEN total_activity_score < 3000 THEN '1000-3000'
    WHEN total_activity_score < 5000 THEN '3000-5000'
    WHEN total_activity_score < 8000 THEN '5000-8000'
    ELSE '8000+'
  END as score_range,
  COUNT(*) as driver_count,
  AVG(total_activity_score)::int as avg_score,
  MIN(total_activity_score)::int as min_score,
  MAX(total_activity_score)::int as max_score
FROM driver_profiles
GROUP BY score_range
ORDER BY MIN(total_activity_score);
```

### 3.3 Data Quality Checks

```sql
-- Check for null values in critical fields
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as null_emails,
  COUNT(CASE WHEN full_name IS NULL THEN 1 END) as null_names,
  COUNT(CASE WHEN city IS NULL THEN 1 END) as null_cities,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as null_roles
FROM profiles;

-- Check for duplicate emails
SELECT 
  email,
  COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- Check driver profiles without corresponding profiles
SELECT 
  dp.id,
  dp.user_id,
  dp.total_activity_score
FROM driver_profiles dp
LEFT JOIN profiles p ON dp.user_id = p.id
WHERE p.id IS NULL;
```

---

## ✅ Task 4: Campaign System Verification

### 4.1 Test Campaign Targeting Algorithm

```sql
-- Create a test campaign target selection
WITH eligible_drivers AS (
  SELECT 
    p.id,
    p.full_name,
    p.city,
    dp.total_activity_score,
    dp.city_rank,
    dp.percentile
  FROM profiles p
  INNER JOIN driver_profiles dp ON p.id = dp.user_id
  WHERE 
    p.is_driver = true
    AND dp.total_activity_score >= 3000  -- High performers
    AND dp.percentile >= 75              -- Top 25%
    AND p.city IN ('Mumbai', 'Delhi', 'Bangalore')
  ORDER BY dp.total_activity_score DESC
  LIMIT 20
)
SELECT 
  'High Performer Drivers in Metro Cities' as segment_name,
  COUNT(*) as total_eligible,
  AVG(total_activity_score)::int as avg_score,
  array_agg(DISTINCT city) as cities_covered
FROM eligible_drivers;
```

### 4.2 Test Business Customer Profiling

```sql
-- Analyze customer segments for targeting
SELECT 
  bcp.primary_age_ranges,
  bcp.income_levels,
  bcp.interest_categories,
  COUNT(*) as business_count,
  AVG(bcp.typical_visit_duration)::int as avg_visit_mins,
  AVG(bcp.repeat_customer_rate)::int as avg_repeat_rate
FROM business_customer_profiles bcp
GROUP BY 
  bcp.primary_age_ranges,
  bcp.income_levels,
  bcp.interest_categories
ORDER BY business_count DESC;
```

---

## 📊 Expected Final State

After completing all tasks, your database should have:

| Table | Expected Count | Status |
|-------|---------------|--------|
| profiles | ~109 (3 original + 100 new + 6 test) | ✅ |
| driver_profiles | ~15 | ✅ |
| business_customer_profiles | ~10 | ✅ |
| campaigns | 2+ | ✅ |
| campaign_targets | 0-20 (depends on targeting) | ⚠️ Manual |
| campaign_analytics | 0+ (generated over time) | ⚠️ Manual |
| driver_algorithm_config | 1+ | ✅ |

---

## 🚀 Next Steps

1. **Re-enable RLS** (if not already done):
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```

2. **Test the Driver Algorithm**:
   - Run the driver scoring recalculation
   - Verify city rankings are updated
   - Check percentile calculations

3. **Create Sample Campaigns**:
   - Use the campaign management UI
   - Test targeting different user segments
   - Monitor campaign analytics

4. **Validate Data Integrity**:
   - Run all verification queries
   - Fix any orphaned records
   - Ensure foreign key constraints are working

---

## ⚠️ Important Notes

- **RLS Security**: RLS has been temporarily disabled for seeding. It will be re-enabled automatically by the script.
- **Test Data**: All seeded data uses `@sync.app` email domain and is clearly marked as test data.
- **Cleanup**: To remove test data later, filter by email pattern: `email LIKE '%@sync.app'`
- **Production**: Do not run this seeding script on production databases!

---

## 🔧 Troubleshooting

### Issue: Inserts not working
**Solution**: Check if RLS is enabled. Disable temporarily:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Issue: Foreign key violations
**Solution**: Ensure parent records exist before inserting child records.

### Issue: Duplicate key errors
**Solution**: Clear existing test data:
```sql
DELETE FROM driver_profiles WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%@sync.app');
DELETE FROM profiles WHERE email LIKE '%@sync.app';
```

---

## ✅ Completion Checklist

- [ ] All 100+ profiles seeded
- [ ] Driver profiles created for all drivers
- [ ] Business customer profiles populated
- [ ] Campaign tables verified
- [ ] Data integrity checks passed
- [ ] RLS re-enabled
- [ ] Sample campaigns created
- [ ] Driver algorithm config set

---

**Last Updated**: 2025-10-12  
**Script Version**: v1.0  
**Database**: sync_warp (ysxmgbblljoyebvugrfo)
