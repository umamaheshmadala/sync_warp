# Quick Test Guide - Story 4B.4 Bug Fix

## 🎯 Test Now

### Step 1: Navigate to Onboarding
Open your browser and go to:
```
http://localhost:5173/business/onboarding
```

### Step 2: Expected Results

You should see ONE of these three scenarios:

#### ✅ Scenario A: You Have No Businesses Yet
```
┌─────────────────────────────────────┐
│     No Business Found               │
│                                     │
│  Please register a business before  │
│  starting the onboarding process.   │
│                                     │
│  [Register Business]                │
└─────────────────────────────────────┘
```
**Action:** Click "Register Business" → Complete registration → Return to onboarding

#### ✅ Scenario B: You Have Businesses
```
┌─────────────────────────────────────┐
│  Business Onboarding                │
│  Step 1 of 5: Welcome               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│                                     │
│  Welcome message and instructions   │
│                                     │
│  [Let's Get Started]                │
└─────────────────────────────────────┘
```
**Action:** Proceed through the wizard

#### ✅ Scenario C: Loading
```
┌─────────────────────────────────────┐
│     🔄 Loading...                   │
│                                     │
│  Loading business information...    │
└─────────────────────────────────────┘
```
**This should be very brief (1-2 seconds)**

### Step 3: What Should NOT Happen

❌ **NO double toast errors**
❌ **NO "Failed to load business profile" messages**
❌ **NO blank white screen**
❌ **NO infinite loading**

---

## 🧪 Additional Tests

### Test 1: With Specific Business ID
If you know a business ID, try:
```
http://localhost:5173/business/onboarding?businessId=YOUR_BUSINESS_ID
```

**Expected:** Onboarding wizard loads for that specific business

### Test 2: From Business Dashboard
1. Go to: `http://localhost:5173/business/dashboard`
2. Look for your businesses
3. Click any link to onboarding (if available)

**Expected:** Smooth navigation to onboarding

### Test 3: Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to onboarding page

**Expected:** 
- No red error messages
- No "Failed to load business profile"
- Only normal API calls visible in Network tab

---

## 🐛 If Issues Persist

### Issue: Still Getting Double Toast
**Possible Cause:** Old code still cached
**Solution:**
```bash
# Hard refresh browser
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)

# Or clear cache
Ctrl + Shift + Delete → Clear cached images and files
```

### Issue: "No Business Found" But I Have Businesses
**Possible Cause:** User ID mismatch
**Check:**
1. Open DevTools → Application → Local Storage
2. Look for your auth token
3. Verify you're logged in as the right user

**Solution:**
```bash
# Log out and log back in
http://localhost:5173/auth/login
```

### Issue: Page Loads But Wizard Doesn't Start
**Possible Cause:** Database tables not created
**Check:**
Open Supabase dashboard and run:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'business_customer_profiles',
    'business_metrics',
    'business_marketing_goals',
    'business_onboarding_progress'
  );
```

**Expected:** Should return 4 rows

**If not:** Run the migration from `supabase/migrations/20250110_enhanced_onboarding.sql`

---

## ✅ Success Criteria

The fix is working if:
- ✅ Page loads without errors
- ✅ No double toast messages
- ✅ Clear user guidance (either register or start onboarding)
- ✅ Smooth navigation
- ✅ No console errors

---

## 📝 Report Results

After testing, please report:

1. **Which scenario did you see?** (A, B, or C)
2. **Did the error disappear?** (Yes/No)
3. **Any remaining issues?** (Describe)
4. **Browser used:** (Chrome/Firefox/Safari/Edge)

---

**Ready to proceed with full testing!** 🚀
