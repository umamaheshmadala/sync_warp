# Story 4B.4 - Database Setup Guide

**Issue:** `column businesses.onboarding_completed_at does not exist`  
**Solution:** Apply database migration to add required columns

---

## 🎯 Quick Fix (2 minutes)

### Option 1: Using Supabase MCP (Recommended)

Since you have Supabase MCP set up, let's use it to apply the migration directly:

```bash
# Open your terminal and run
warp mcp run supabase "apply migration from supabase/migrations/quick_fix_businesses_columns.sql"
```

### Option 2: Using Supabase Dashboard (Manual)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Paste this SQL**

```sql
-- Quick Fix: Add missing columns to businesses table

-- Add new columns for enhanced business profiling
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS employees_count INTEGER,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMPTZ DEFAULT now();

-- Add constraints for new columns
ALTER TABLE businesses
ADD CONSTRAINT IF NOT EXISTS chk_employees_count CHECK (employees_count IS NULL OR employees_count > 0);

ALTER TABLE businesses
ADD CONSTRAINT IF NOT EXISTS chk_years_in_business CHECK (years_in_business IS NULL OR years_in_business >= 0);

ALTER TABLE businesses
ADD CONSTRAINT IF NOT EXISTS chk_profile_completion CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100);

-- Add index for profile completion queries
CREATE INDEX IF NOT EXISTS idx_businesses_profile_completion 
ON businesses(profile_completion_percentage) 
WHERE profile_completion_percentage < 100;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'businesses'
  AND column_name IN (
    'employees_count',
    'years_in_business',
    'profile_completion_percentage',
    'onboarding_completed_at',
    'last_profile_update'
  );
```

4. **Click "Run" button**

5. **Verify Success**
   You should see output showing 5 rows with the new columns:
   ```
   column_name                        | data_type                | is_nullable
   -----------------------------------|--------------------------|------------
   employees_count                    | integer                  | YES
   years_in_business                  | integer                  | YES
   profile_completion_percentage      | integer                  | YES
   onboarding_completed_at            | timestamp with time zone | YES
   last_profile_update                | timestamp with time zone | YES
   ```

---

## ✅ Test the Fix

1. **Refresh your browser** at `http://localhost:5173/business/onboarding`

2. **Expected Result:**
   - ✅ No more "column does not exist" error
   - ✅ Page should now load properly
   - ✅ You'll see either:
     - Onboarding wizard (if you have businesses)
     - "Register Business" prompt (if you don't)

---

## 🚀 Full Migration (Optional - For Complete Features)

The quick fix above adds the basic columns needed. For the **full Story 4B.4 functionality**, you should apply the complete migration which includes:

- ✅ Customer profile tables
- ✅ Business metrics tables
- ✅ Marketing goals tables
- ✅ Onboarding progress tracking
- ✅ Profile completion calculation functions

### Apply Full Migration

#### Using Supabase MCP:
```bash
warp mcp run supabase "apply migration from supabase/migrations/20250110_enhanced_business_onboarding.sql"
```

#### Using Supabase Dashboard:

1. Go to SQL Editor in Supabase Dashboard
2. Open the file: `supabase/migrations/20250110_enhanced_business_onboarding.sql`
3. Copy the entire content (it's ~600 lines)
4. Paste into SQL Editor
5. Click "Run"

**This will create:**
- `business_customer_profiles` table
- `business_metrics` table
- `business_marketing_goals` table
- `business_onboarding_progress` table
- All necessary functions, triggers, and RLS policies

---

## 🧪 Verify Full Migration

Run this in SQL Editor:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'businesses',
    'business_customer_profiles',
    'business_metrics',
    'business_marketing_goals',
    'business_onboarding_progress'
  )
ORDER BY table_name;
```

**Expected Output:** 5 tables

---

## 🐛 Troubleshooting

### Error: "permission denied"
**Solution:** Make sure you're connected as the database owner in Supabase Dashboard

### Error: "relation already exists"
**Solution:** This is fine - it means some tables already exist. The migration uses `IF NOT EXISTS` so it's safe.

### Error: "constraint already exists"
**Solution:** Also fine - the migration handles existing constraints.

### Page still shows error after migration
**Solution:**
1. Hard refresh browser: `Ctrl + Shift + R`
2. Clear Supabase cache (if using local development)
3. Check browser console for different errors

---

## 📝 Migration Status Checklist

After running the migration, verify:

- [x] `businesses` table has new columns
  - `employees_count`
  - `years_in_business`
  - `profile_completion_percentage`
  - `onboarding_completed_at`
  - `last_profile_update`

- [ ] New tables created (for full migration):
  - `business_customer_profiles`
  - `business_metrics`
  - `business_marketing_goals`
  - `business_onboarding_progress`

- [ ] Functions created (for full migration):
  - `calculate_profile_completion()`
  - Various triggers for auto-updates

- [ ] RLS policies enabled
  - Business owners can access their data
  - Admins can access all data

---

## 🎉 Success!

Once the migration is applied:
- ✅ Onboarding page will load without errors
- ✅ You can complete the 5-step onboarding wizard
- ✅ Profile completion tracking will work
- ✅ All Story 4B.4 features will be functional

---

## 📞 Need Help?

If you encounter issues:

1. **Check Supabase Logs:**
   - Dashboard → Logs → Select time range
   - Look for migration errors

2. **Verify Database Connection:**
   ```sql
   SELECT current_database(), current_user;
   ```

3. **Check Migration History:**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   ORDER BY version DESC 
   LIMIT 10;
   ```

---

**Next Step:** After applying the migration, proceed with the frontend testing guide!
