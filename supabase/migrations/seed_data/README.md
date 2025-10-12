# Database Seed Data Population Scripts

This directory contains SQL scripts to populate your Supabase database with realistic test data for the targeted campaigns system.

## 📋 Overview

These scripts will create:
- **100 test user profiles** with realistic information
- **20 driver profiles** with varied performance metrics
- **City data** for existing businesses (location-based targeting)
- **80 customer profiles** for non-driver users

## 🚀 Quick Start

### Option 1: Run All Scripts Automatically

Use the master script to run all 4 scripts in sequence:

```bash
# Navigate to the seed_data directory
cd C:\Users\umama\Documents\GitHub\sync_warp\supabase\migrations\seed_data

# Run the master script via Supabase CLI
supabase db execute -f run_all_seeds.sql
```

### Option 2: Run Scripts Individually (Recommended for debugging)

Run each script one at a time through the Supabase Dashboard SQL Editor:

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo/sql/new
2. **Copy and paste** the content of each script in order
3. **Execute** and verify the results before moving to the next script

#### Script Execution Order:

1. **01_populate_profiles.sql**
   - Creates 100 test user profiles
   - Expected result: 100 new profiles in the `profiles` table

2. **02_populate_driver_profiles.sql**
   - Creates 20 driver profiles with realistic metrics
   - Expected result: 20 new records in `driver_profiles` table
   - Dependencies: Must run after script 01

3. **03_update_businesses_with_cities.sql**
   - Adds city information to existing businesses
   - Expected result: All businesses have city assignments
   - Dependencies: None (can run independently)

4. **04_populate_customer_profiles.sql**
   - Creates customer profiles for all non-driver users
   - Expected result: ~80 new records in `customer_profiles` table
   - Dependencies: Must run after scripts 01 and 02

## 🔍 Verification

After running all scripts, verify the data:

```sql
-- Check total counts
SELECT 
  (SELECT COUNT(*) FROM profiles) as profiles_count,
  (SELECT COUNT(*) FROM driver_profiles) as drivers_count,
  (SELECT COUNT(*) FROM customer_profiles) as customers_count,
  (SELECT COUNT(*) FROM businesses WHERE city IS NOT NULL) as businesses_with_city;
```

Expected results:
- `profiles_count`: ~103 (100 new + 3 existing)
- `drivers_count`: 20
- `customers_count`: ~80
- `businesses_with_city`: All businesses should have cities

## 🔐 Row Level Security (RLS)

Each script temporarily disables RLS for bulk operations and re-enables it afterward. This is safe for seeding test data but **never do this in production** with user data.

## 🐛 Troubleshooting

### Script Fails with RLS Error
If you see an RLS policy error:
1. Make sure you're running the script as a database administrator
2. Check that the `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` command executed successfully
3. Verify RLS is re-enabled after script completion

### Script Fails with Duplicate Key Error
This means the data already exists. You can:
1. Clear existing test data and rerun
2. Or skip the script (data is already populated)

### How to Clear Test Data
```sql
-- ⚠️ DANGER: This deletes all test data
-- Run only if you want to start fresh
DELETE FROM customer_profiles WHERE profile_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@synctest.com'
);
DELETE FROM driver_profiles WHERE profile_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@synctest.com'
);
DELETE FROM profiles WHERE email LIKE '%@synctest.com';
```

## 📊 Data Characteristics

### User Profiles
- Email format: `user1@synctest.com` to `user100@synctest.com`
- Created over the past year
- Realistic names and phone numbers
- Avatar URLs using DiceBear API

### Driver Profiles
- Driver scores: 60-98 (realistic distribution)
- Trip counts: 50-500 trips per driver
- Acceptance rates: 75-98%
- Ratings: 3.8-5.0 stars
- Vehicle types: Sedan (50%), SUV (20%), Luxury (10%), Van (10%), Economy (10%)
- 80% verified drivers

### Customer Profiles
- Trip counts: 5-100 trips
- Loyalty tiers: Bronze (50%), Silver (30%), Gold (20%), Platinum (10%)
- Payment methods: Credit card (60%), Debit (20%), Digital wallet (10%), Cash (10%)
- Average trip costs: $8-$45

### Businesses
- Cities: 10 major US cities randomly assigned
- Even distribution across cities

## 📝 Notes

- All scripts use `ON CONFLICT DO NOTHING` to prevent duplicate entries
- Scripts include verification queries at the end to confirm success
- Each script displays sample data after execution
- Random data ensures realistic variation in metrics

## 🔗 Next Steps

After populating the data:
1. Test the Campaign Targeting Demo with real data
2. Verify the reach estimator shows realistic numbers
3. Test targeting recommendations with actual business profiles
4. Run integration tests to ensure all components work with real data

## 📚 Related Documentation

- [Targeted Campaigns System Documentation](../../../docs/targeted-campaigns.md)
- [Supabase Project](https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo)
- [Database Schema](../20250110_create_targeted_campaigns_system.sql)
