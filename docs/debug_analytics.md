# Debug Follower Analytics - Chrome DevTools Guide

## Issue: Analytics showing zeros

Follow these steps in Chrome DevTools to debug:

### Step 1: Open Chrome DevTools Console
1. Navigate to: `http://localhost:5173/business/YOUR_BUSINESS_ID/followers/analytics`
2. Press `F12` or right-click → Inspect
3. Go to **Console** tab

### Step 2: Check Console Logs
Look for these log messages from `useFollowerAnalytics`:
- `[FollowerAnalytics] Fetching analytics for business: {businessId}`
- `[FollowerAnalytics] Business name: {name}`
- `[FollowerAnalytics] Fetched X followers`
- `[FollowerAnalytics] Fetched X profiles`

### Step 3: Manual Database Query Check

Run this in the Console to check if business_followers table has data:

```javascript
// Check if business_followers table exists and has data
const { createClient } = window.supabase || {};
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Get your business ID from URL
const businessId = window.location.pathname.split('/')[2];
console.log('Testing business ID:', businessId);

// Test 1: Check if table exists and has any followers
const testFollowers = async () => {
  console.log('=== TEST 1: Check business_followers table ===');
  const { data, error, count } = await supabase
    .from('business_followers')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId);
  
  console.log('Followers data:', data);
  console.log('Count:', count);
  console.log('Error:', error);
  
  return { data, error, count };
};

// Test 2: Check business exists
const testBusiness = async () => {
  console.log('=== TEST 2: Check business exists ===');
  const { data, error } = await supabase
    .from('businesses')
    .select('id, business_name')
    .eq('id', businessId)
    .single();
  
  console.log('Business:', data);
  console.log('Error:', error);
  
  return { data, error };
};

// Test 3: Check if you're a follower
const testCurrentUser = async () => {
  console.log('=== TEST 3: Check current user is following ===');
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('No user logged in!');
    return;
  }
  
  console.log('Current user ID:', user.id);
  
  const { data, error } = await supabase
    .from('business_followers')
    .select('*')
    .eq('user_id', user.id)
    .eq('business_id', businessId);
  
  console.log('Current user following status:', data);
  console.log('Error:', error);
  
  return { data, error };
};

// Run all tests
(async () => {
  await testBusiness();
  await testFollowers();
  await testCurrentUser();
})();
```

### Step 4: Check Network Tab
1. Go to **Network** tab in DevTools
2. Filter by `business_followers`
3. Look for failed requests (red) or 404 errors

### Step 5: Verify Real-time Subscription
Look for these console messages:
- `[FollowerAnalytics] Setting up real-time subscription`
- `[FollowerAnalytics] Subscription status: SUBSCRIBED`

If you see:
- `CHANNEL_ERROR` or `TIMED_OUT` - subscription failed
- No subscription messages - hook not setting up properly

### Step 6: Test Follow Action
1. Open `/following` page in another tab
2. Follow a business
3. Switch back to analytics tab
4. Check console for: `[FollowerAnalytics] Real-time update received: INSERT`
5. Analytics should auto-refresh

## Common Issues & Fixes

### Issue 1: Table doesn't exist (404 error)
**Symptom**: Console shows "relation 'public.business_followers' does not exist"

**Fix**: The migration hasn't been applied. Run:
```bash
# Check if migration was applied
supabase migration list

# If not, apply it
supabase db push
```

### Issue 2: No data even though you followed
**Symptom**: `Fetched 0 followers` in console, but you know you followed

**Possible causes**:
1. **is_active = false**: Check database
   ```sql
   SELECT * FROM business_followers WHERE business_id = 'YOUR_ID';
   ```
   
2. **Wrong business_id**: Verify URL parameter matches database

3. **Foreign key constraint**: Check if insert succeeded
   ```sql
   SELECT * FROM business_followers ORDER BY followed_at DESC LIMIT 5;
   ```

### Issue 3: Profiles not loading
**Symptom**: `Fetched 0 profiles` but followers exist

**Fix**: Check if profiles table has entries for users
```sql
SELECT p.* 
FROM profiles p
JOIN business_followers bf ON p.id = bf.user_id
WHERE bf.business_id = 'YOUR_BUSINESS_ID';
```

If profiles are missing, users need to complete their profile.

### Issue 4: Real-time not working
**Symptom**: No auto-refresh when following from another tab

**Checks**:
1. Are both tabs logged in as same user?
2. Is Supabase realtime enabled for the table?
3. Check RLS policies allow SELECT for real-time

**Fix**: Enable realtime in Supabase dashboard:
```sql
ALTER TABLE business_followers REPLICA IDENTITY FULL;
```

## Quick Fix Command

If analytics shows zeros but `/following` page works, run this in Console:

```javascript
// Force refresh analytics
window.location.reload();

// Or manually trigger the hook refresh
// (if you have access to the component's refresh function)
```

## Expected Console Output (Healthy State)

```
[FollowerAnalytics] Fetching analytics for business: abc-123-def
[FollowerAnalytics] Business name: Joe's Pizza
[FollowerAnalytics] Fetched 5 followers
[FollowerAnalytics] Fetched 5 profiles
[FollowerAnalytics] Analytics calculated successfully
[FollowerAnalytics] Setting up real-time subscription
[FollowerAnalytics] Subscription status: SUBSCRIBED
```

## Next Steps After Debugging

Once you identify the issue:
1. **Missing table**: Apply migration
2. **No followers**: Test follow action from UI
3. **Profile data missing**: Users need to complete profile setup
4. **Real-time issues**: Check Supabase realtime settings

---

**Need more help?** Check the full logs in the Console and share the error messages.
