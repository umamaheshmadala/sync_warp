# How to Apply Targeted Campaigns Migration

## Quick Start

### Via Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Load Migration File**
   - Open the file: `C:\Users\umama\Documents\GitHub\sync_warp\supabase\migrations\20250110_create_targeted_campaigns_system.sql`
   - Copy ALL contents (719 lines)
   - Paste into the Supabase SQL Editor

4. **Execute**
   - Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for completion (should take ~5-10 seconds)

5. **Verify Success**
   - You should see success messages in the output panel
   - Final message: "Targeted Campaigns System Migration Complete"

---

## What This Migration Creates

### Tables (5):
1. **campaigns** - Campaign definitions and metadata
2. **driver_profiles** - User activity scores and rankings
3. **driver_algorithm_config** - Configurable scoring weights
4. **campaign_analytics** - Time-series performance metrics
5. **campaign_targets** - User-campaign relationships

### Functions (3):
1. **calculate_driver_score()** - Calculate weighted activity score for a user
2. **update_driver_rankings()** - Recalculate driver scores and rankings
3. **estimate_campaign_reach()** - Estimate audience size based on targeting

### Security:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Policies restrict access to business owners/users
- ✅ Secure DEFINER functions for calculations

### Default Data:
- 1 default driver_algorithm_config entry with standard weights

---

## Verification After Migration

Run these queries in SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'campaigns', 
    'driver_profiles', 
    'driver_algorithm_config', 
    'campaign_analytics', 
    'campaign_targets'
  );
-- Should return 5 rows

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'calculate_driver_score', 
    'update_driver_rankings', 
    'estimate_campaign_reach'
  );
-- Should return 3 rows

-- Check default config exists
SELECT * FROM driver_algorithm_config;
-- Should return 1 row with weights summing to 100

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'campaign%' OR tablename = 'driver_profiles';
-- All should show rowsecurity = true
```

---

## Troubleshooting

### Error: "relation already exists"
**Solution:** Some tables may already exist. You can either:
- **Option A:** Drop existing tables first (⚠️ **DATA LOSS**)
  ```sql
  DROP TABLE IF EXISTS campaign_targets CASCADE;
  DROP TABLE IF EXISTS campaign_analytics CASCADE;
  DROP TABLE IF EXISTS campaigns CASCADE;
  DROP TABLE IF EXISTS driver_profiles CASCADE;
  DROP TABLE IF EXISTS driver_algorithm_config CASCADE;
  ```
  Then run the migration again.

- **Option B:** Skip the existing table and continue with new ones.

### Error: "function already exists"
**Solution:** Drop and recreate:
```sql
DROP FUNCTION IF EXISTS calculate_driver_score(UUID, UUID);
DROP FUNCTION IF EXISTS update_driver_rankings(UUID);
DROP FUNCTION IF EXISTS estimate_campaign_reach(JSONB, UUID);
```

### Error: "constraint violation"
**Cause:** Foreign key references missing (profiles, cities, businesses tables)
**Solution:** Ensure these base tables exist:
- profiles
- cities
- businesses
- user_coupons
- coupon_sharing_log
- check_ins
- reviews
- friend_requests
- activity_feed

---

## Next Steps After Migration

Once migration is successful:

1. ✅ **Mark todo as complete**: Phase 1 Database Schema
2. ➡️ **Move to Phase 1**: TypeScript Types implementation
3. Test driver score calculation with sample user data
4. Verify campaign reach estimation works

---

## Migration Status

- [x] Migration file created
- [ ] Migration applied to Supabase
- [ ] Verification queries passed
- [ ] Ready for TypeScript types

---

**Need help?** Check Supabase logs in Dashboard → Logs → Postgres Logs
