# 🚀 Manual Deployment Guide for Supabase

Since the Supabase CLI is for local development only, you'll need to run the migrations through the Supabase Dashboard.

## ✨ Quick Steps (5 minutes)

### **Step 1: Open SQL Editor**

Go to: **https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo/sql/new**

---

### **Step 2: Run Migration 1 - Create Table**

Copy and paste this SQL:

```sql
-- =============================================================================
-- User Profiles for Targeting
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Demographics
  age INTEGER CHECK (age >= 13 AND age <= 100),
  age_range TEXT CHECK (age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  income_range TEXT CHECK (income_range IN ('below_3lpa', '3-5lpa', '5-10lpa', '10-20lpa', 'above_20lpa')),
  
  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city TEXT,
  state TEXT,
  postal_code TEXT,
  
  -- Behavior
  interests TEXT[],
  purchase_history JSONB DEFAULT '[]'::jsonb,
  last_active_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_purchases INTEGER DEFAULT 0,
  total_spent_cents BIGINT DEFAULT 0,
  
  -- Driver specific
  is_driver BOOLEAN DEFAULT FALSE,
  driver_rating DECIMAL(3, 2),
  total_trips INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_age_range ON user_profiles(age_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON user_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_user_profiles_income_range ON user_profiles(income_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON user_profiles USING GIN (interests);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_driver ON user_profiles(is_driver);
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles(city);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY IF NOT EXISTS "Allow read access to user_profiles" 
  ON user_profiles FOR SELECT TO authenticated USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_profiles_updated_at();
```

Click **"RUN"** ✅

---

### **Step 3: Run Migration 2 - Create Function**

Open the file:
`C:\Users\umama\Documents\GitHub\sync_warp\supabase\migrations\20250113_calculate_reach_function.sql`

Copy its entire content and paste into SQL Editor, then click **"RUN"** ✅

---

### **Step 4: Run Migration 3 - Seed Data**

Open the file:
`C:\Users\umama\Documents\GitHub\sync_warp\supabase\migrations\20250113_seed_user_profiles.sql`

Copy its entire content and paste into SQL Editor, then click **"RUN"** ✅

**This will take 30-60 seconds** (inserting 10,000 records)

---

### **Step 5: Verify Deployment**

Run this verification query in SQL Editor:

```sql
-- Check user count
SELECT COUNT(*) as total_users FROM user_profiles;

-- Should return: 10,000

-- Test reach calculation
SELECT * FROM calculate_campaign_reach(
  '{"demographics": {"gender": ["male"]}}'::jsonb,
  false
);

-- Should return: total_reach ≈ 6,000
```

---

## ✅ Success Indicators

If you see:
- ✅ user_profiles table has **10,000 rows**
- ✅ calculate_campaign_reach() returns **~6,000** for males
- ✅ No errors in SQL Editor

**You're all set!** 🎉

---

## 🎯 Next: Test in UI

1. **Refresh browser** (Ctrl+Shift+R)
2. **Check slider** - should be clearly visible
3. **Test filters:**
   - Demographics (gender, age) → reach changes
   - Location (move marker, adjust radius) → reach changes
   - Behavior (driver only, interests) → reach changes

---

##  Alternative: Use Pre-built Queries

I've also created individual SQL files you can run:

**Location:** `C:\Users\umama\Documents\GitHub\sync_warp\supabase\migrations\`

1. `20250113_user_profiles_targeting.sql`
2. `20250113_calculate_reach_function.sql`
3. `20250113_seed_user_profiles.sql`

Just copy-paste each file's content into SQL Editor and run them in order.

---

## 📚 Documentation

- **Full Guide:** `ESTIMATED_REACH_IMPLEMENTATION.md`
- **Deployment Guide:** `DEPLOY_REACH_FIXES.md`

---

**Dashboard Link:** https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo/sql/new
