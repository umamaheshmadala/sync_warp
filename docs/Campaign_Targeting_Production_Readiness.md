# Campaign Targeting Demo - Production Readiness Guide

**Date**: 2025-01-11  
**Status**: ⚠️ NEEDS DATA POPULATION  
**Demo Mode**: ✅ Switched to Production (`useMockData={false}`)

---

## Current Status

### ✅ What's Ready

1. **Components Updated**
   - ✅ `TargetingValidator` - Now uses real `targetingService`
   - ✅ `ReachEstimator` - Now uses real `targetingService`
   - ✅ `RecommendationCard` - Now uses real `targetingService`
   - All components have `useMockData={false}`

2. **Backend Infrastructure**
   - ✅ Supabase project: `sync_warp` (ID: ysxmgbblljoyebvugrfo)
   - ✅ Database status: ACTIVE_HEALTHY
   - ✅ Function `estimate_campaign_reach` exists
   - ✅ All required tables exist:
     - profiles
     - businesses
     - driver_profiles
     - business_customer_profiles
     - campaigns
     - campaign_analytics
     - campaign_targets

3. **Service Layer**
   - ✅ `targetingService.ts` properly configured
   - ✅ API signatures match component expectations
   - ✅ Error handling in place
   - ✅ Supabase client configured

### ⚠️ What Needs Attention

1. **Database Population** (Critical)
   - **Profiles**: 3 users (very limited)
   - **Businesses**: 4 businesses
   - **Driver Profiles**: **0 drivers** ⚠️ **CRITICAL**
   - **Customer Profiles**: 1 profile
   - **Campaigns**: 0 campaigns

2. **Expected Behavior with Limited Data**
   - **ReachEstimator** will show very low numbers (0-3 users)
   - **TargetingValidator** will work but suggest broader targeting
   - **RecommendationCard** may fail if businessId doesn't exist

---

## Testing Strategy

### Option A: Test with Current Limited Data ⚠️
**Expected Results**:
- Components will load without errors
- Reach estimates will be extremely low (0-3 users)
- Validation will suggest very broad targeting
- Recommendations may fail for non-existent business IDs

**Steps**:
1. Open demo at `http://localhost:5173/demo/campaign-targeting`
2. Observe console for any errors
3. Check if components load (even with low numbers)
4. Verify no crashes or uncaught exceptions

**Use Case**: Verify technical functionality without realistic data

---

### Option B: Populate Database with Test Data ✅ **RECOMMENDED**
**Advantages**:
- Realistic demonstration
- Proper validation messages
- Meaningful reach estimates
- Full component testing

**Required Data**:
1. **50-100 profiles** (users with demographics)
2. **10-20 driver_profiles** (drivers with activity scores)
3. **5-10 businesses** (various categories)
4. **2-3 customer_profiles** (business demographics)

---

## Data Population Script

I can create test data for you. Here's what we need:

### 1. Create Test Profiles (Users)

```sql
-- Generate 100 test profiles with varied demographics
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO profiles (
      id,
      email,
      age_range,
      gender,
      city_id,
      interests,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'test_user_' || i || '@example.com',
      CASE (i % 6)
        WHEN 0 THEN '18-24'
        WHEN 1 THEN '25-34'
        WHEN 2 THEN '35-44'
        WHEN 3 THEN '45-54'
        WHEN 4 THEN '55-64'
        ELSE '65+'
      END,
      CASE (i % 3)
        WHEN 0 THEN 'male'
        WHEN 1 THEN 'female'
        ELSE 'other'
      END,
      CASE (i % 4)
        WHEN 0 THEN 'New York'
        WHEN 1 THEN 'Los Angeles'
        WHEN 2 THEN 'Chicago'
        ELSE 'Houston'
      END,
      ARRAY[
        CASE WHEN (i % 5) = 0 THEN 'food_dining' ELSE NULL END,
        CASE WHEN (i % 4) = 0 THEN 'shopping_retail' ELSE NULL END,
        CASE WHEN (i % 3) = 0 THEN 'entertainment' ELSE NULL END
      ]::text[],
      NOW() - (random() * INTERVAL '365 days')
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
```

### 2. Create Test Driver Profiles

```sql
-- Generate 20 test driver profiles
DO $$
DECLARE
  profile_record RECORD;
  driver_count INT := 0;
BEGIN
  FOR profile_record IN 
    SELECT id FROM profiles 
    WHERE id NOT IN (SELECT user_id FROM driver_profiles WHERE user_id IS NOT NULL)
    LIMIT 20
  LOOP
    INSERT INTO driver_profiles (
      user_id,
      is_driver,
      total_activity_score,
      created_at
    ) VALUES (
      profile_record.id,
      true,
      FLOOR(random() * 100)::INT, -- Activity score 0-100
      NOW() - (random() * INTERVAL '180 days')
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    driver_count := driver_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % driver profiles', driver_count;
END $$;
```

### 3. Update Businesses with Demographics

```sql
-- Ensure businesses have city_id
UPDATE businesses 
SET city_id = CASE 
  WHEN id % 4 = 0 THEN 'New York'
  WHEN id % 4 = 1 THEN 'Los Angeles'
  WHEN id % 4 = 2 THEN 'Chicago'
  ELSE 'Houston'
END
WHERE city_id IS NULL;
```

### 4. Create Customer Profiles for Businesses

```sql
-- Create customer profiles for each business
INSERT INTO business_customer_profiles (
  business_id,
  primary_age_ranges,
  income_levels,
  interest_categories,
  created_at
)
SELECT 
  id as business_id,
  ARRAY['25-34', '35-44']::text[] as primary_age_ranges,
  ARRAY['middle', 'upper_middle']::text[] as income_levels,
  ARRAY['food_dining', 'shopping_retail']::text[] as interest_categories,
  NOW() as created_at
FROM businesses
WHERE id NOT IN (SELECT business_id FROM business_customer_profiles)
LIMIT 5
ON CONFLICT (business_id) DO NOTHING;
```

---

## Implementation Steps

### Step 1: Choose Your Approach

**Option A - Quick Test (Current Data)**
```bash
# No additional steps needed
# Just test with limited data
```

**Option B - Populate Test Data (Recommended)**
```bash
# See "Execute Data Population" section below
```

---

### Step 2: Execute Data Population

If you chose Option B, I can help you populate the database using Supabase MCP:

**Method 1: Using Supabase MCP** (Recommended)
I can execute these SQL scripts directly through the MCP tool.

**Method 2: Manual via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo
2. Navigate to SQL Editor
3. Copy and paste each script above
4. Run them one by one

---

### Step 3: Test the Demo

After population (or with current data):

1. **Open the demo**:
   ```
   http://localhost:5173/demo/campaign-targeting
   ```

2. **Test each component**:
   - Click "Targeting Validator" tab
   - Click "Reach Estimator" tab
   - Click "AI Recommendations" tab

3. **Try preset scenarios**:
   - Click "Broad Reach" - should show larger numbers
   - Click "Premium Audience" - should show smaller, focused numbers
   - Click "Focused Targeting" - should show medium numbers

4. **Check console for errors**:
   - Open browser DevTools (F12)
   - Check Console tab
   - Look for any red errors
   - Verify API calls complete successfully

---

### Step 4: Verify Production Behavior

**Success Indicators**:
- ✅ No console errors
- ✅ Components load without crashes
- ✅ Reach estimates display (even if low)
- ✅ Validation messages appear
- ✅ Demographic breakdowns show (if data exists)
- ✅ Recommendations load for valid business IDs

**Expected Warnings** (if data is limited):
- Low reach numbers (0-3 users) if no data
- "Consider broadening targeting" messages
- No demographic breakdowns if data is sparse
- 404 or empty results for recommendations

---

## Troubleshooting

### Issue: "Failed to estimate audience reach" Error

**Possible Causes**:
1. Database function not accessible
2. RLS policies blocking access
3. Invalid targeting rules

**Solution**:
```sql
-- Check RLS policies on profiles table
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check if function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'estimate_campaign_reach';

-- Test function directly
SELECT estimate_campaign_reach(
  '{"age_ranges": ["25-34"], "drivers_only": true}'::jsonb,
  'New York'
);
```

---

### Issue: "Failed to fetch business profile" Error

**Possible Causes**:
1. Business ID doesn't exist
2. RLS policies blocking access
3. Missing business_customer_profiles

**Solution**:
```sql
-- Check if business exists
SELECT id, name FROM businesses LIMIT 5;

-- Use an existing business ID in the demo
-- Update CampaignTargetingDemo.tsx with a real business ID:
const [businessId] = useState('PASTE_REAL_BUSINESS_ID_HERE');
```

---

### Issue: Very Low Reach Numbers (0-3)

**Cause**: Not enough data in database

**Solution**: Populate test data using scripts above

---

### Issue: No Demographic Breakdowns

**Cause**: 
- Not enough users with demographics
- City/age filters returning empty results

**Solution**:
1. Populate test data
2. Use broader targeting (remove city filter)
3. Lower activity score threshold

---

## Monitoring & Logging

### Enable Debug Logging

Add to `src/services/targetingService.ts`:

```typescript
// At the top of each function
console.log('[TargetingService] Calling estimateAudienceReach with:', request);

// After API call
console.log('[TargetingService] API response:', data);
```

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Logs → Database
3. Filter by timeframe
4. Look for RPC calls to `estimate_campaign_reach`

---

## Rollback to Mock Data

If production testing reveals issues, you can quickly rollback:

```typescript
// In src/pages/CampaignTargetingDemo.tsx
// Change all three components:
useMockData={true}  // Back to mock mode
```

Or use an environment variable:

```typescript
const useMock = import.meta.env.MODE === 'development';

<TargetingValidator 
  targetingRules={targetingRules}
  useMockData={useMock}
/>
```

---

## Next Steps - Decision Required

### Option 1: Test with Current Limited Data
**Action**: Open demo and verify technical functionality
**Expected**: Low numbers but no errors
**Time**: 5 minutes

### Option 2: Populate Test Data First (Recommended)
**Action**: Let me execute the data population scripts
**Expected**: Realistic demo with proper numbers
**Time**: 10 minutes to populate + 5 minutes to test

### Option 3: Hybrid Approach
**Action**: Create a production/demo mode toggle
**Expected**: Easy switching between mock and real data
**Time**: 5 minutes to implement + ongoing flexibility

---

## Recommendation

I recommend **Option 2 - Populate Test Data** because:

1. ✅ You'll see realistic demonstration
2. ✅ Proper validation of all components
3. ✅ Accurate testing of API integration
4. ✅ Confidence in production deployment
5. ✅ Better stakeholder demos

**Would you like me to:**
- ⚡ Execute the data population scripts now?
- 🧪 Test with current limited data first?
- 🔧 Add an environment-based toggle for easy switching?

Please let me know which option you prefer!

---

**Last Updated**: 2025-01-11  
**Status**: ⚠️ Awaiting Data Population Decision  
**Demo Mode**: ✅ Production (useMockData=false)
