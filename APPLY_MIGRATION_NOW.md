# ⚡ Apply Targeted Campaigns Migration - Quick Guide

## ✅ **Option 1: Supabase Dashboard (Easiest - 2 minutes)**

1. Open: https://supabase.com/dashboard
2. Select your SynC project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"** button
5. **Copy entire file** from:
   ```
   C:\Users\umama\Documents\GitHub\sync_warp\supabase\migrations\20250110_create_targeted_campaigns_system.sql
   ```
6. **Paste** into SQL Editor
7. Click **"Run"** (or press `Ctrl+Enter`)
8. Wait ~5-10 seconds for completion
9. ✅ You should see: **"Targeted Campaigns System Migration Complete"**

---

## ✅ **Option 2: Using Supabase CLI**

If your project is linked:

```powershell
cd "C:\Users\umama\Documents\GitHub\sync_warp"
supabase db push
```

If not linked, link first:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

---

##  ✅ **Option 3: Using Node.js Script (if you prefer automation)**

We created a script for you:

```powershell
cd "C:\Users\umama\Documents\GitHub\sync_warp"
node scripts/apply-campaigns-migration.js
```

**Note:** Make sure your `.env` file has:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)

---

## 🔍 **Verify Migration Success**

After running the migration, execute these queries in SQL Editor to verify:

```sql
-- Check all tables exist (should return 5 rows)
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

-- Check functions exist (should return 3 rows)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'calculate_driver_score', 
    'update_driver_rankings', 
    'estimate_campaign_reach'
  );

-- Check default config (should return 1 row with weights summing to 100)
SELECT * FROM driver_algorithm_config WHERE is_active = true;
```

---

## 🎉 **After Successful Migration**

Once you confirm the migration worked, tell me and I'll immediately proceed to:

1. ✅ Mark Phase 1 Database todo as complete
2. 🚀 Create TypeScript types file (`src/types/campaigns.ts`)
3. 🚀 Build the Driver service and hooks
4. 🚀 Start Campaign Builder UI components

---

## ⚠️ **Troubleshooting**

### Error: "relation already exists"
**Solution:** Tables already exist. Skip to verification step above.

### Error: "permission denied"
**Solution:** Make sure you're using your Supabase project's credentials in the dashboard.

### Error: "foreign key constraint"  
**Solution:** Some base tables may be missing. Check if these exist:
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

## 📋 **What This Migration Creates**

### 5 Tables:
1. **campaigns** - Campaign definitions and metadata
2. **driver_profiles** - User activity scores and Driver rankings
3. **driver_algorithm_config** - Configurable scoring weights (with default config)
4. **campaign_analytics** - Time-series performance metrics
5. **campaign_targets** - User-campaign relationships

### 3 Functions:
1. **calculate_driver_score()** - Calculate weighted activity score for a user
2. **update_driver_rankings()** - Recalculate rankings for all or specific city
3. **estimate_campaign_reach()** - Estimate audience size based on targeting rules

### Security:
- ✅ RLS enabled on all tables
- ✅ Policies restrict access appropriately
- ✅ Secure DEFINER functions

---

**🚀 Ready? Pick Option 1 and apply the migration in ~2 minutes!**

**Then come back here and let me know it's done so we can continue! 🎯**
