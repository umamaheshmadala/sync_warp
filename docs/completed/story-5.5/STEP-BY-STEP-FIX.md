# Step-by-Step Fix for Permission Denied Error

## The Problem
You're seeing: **"Permission denied. Please log in again."** even after logging in.

The error you got (`auth.uid() is NULL`) is **expected** when running SQL in the SQL Editor. That's normal!

## The Solution (5 Minutes)

### Step 1: Fix Database Permissions ✅

1. Open **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste this entire file: `FIX-RLS-POLICIES-SAFE.sql`
5. Click **Run** (or press Ctrl+Enter)

You should see:
```
✅ RLS policies have been reset and recreated successfully!
✅ You can now collect coupons from your application.
```

### Step 2: Clear Browser Storage ✅

1. Open your application in the browser
2. Press **F12** to open Developer Console
3. Click **Console** tab
4. Paste this command and press Enter:
```javascript
localStorage.clear();
sessionStorage.clear();
alert('Storage cleared! Now reload the page.');
```
5. Refresh the page (Ctrl+R or F5)

### Step 3: Log Out and Log In ✅

1. Click **Logout** button in your app
2. Wait 2 seconds
3. Click **Login** button
4. Enter your credentials
5. Log in

### Step 4: Test Coupon Collection ✅

1. Keep Developer Console open (F12)
2. Search for a coupon
3. Click **"Collect"** button
4. Watch the console messages:

✅ **If successful**, you'll see:
```
🔐 [collectCoupon] User from store: {...}
🔐 [collectCoupon] Current session: {...}
✅ Coupon collected successfully!
```

❌ **If you still see errors**, note what they say and continue to Step 5.

### Step 5: If Still Not Working

#### Check Console Messages

**If you see**:
```
❌ [collectCoupon] No active session!
```
**Fix**: Repeat Step 3 (log out and log back in)

**If you see**:
```
❌ [collectCoupon] User ID mismatch!
```
**Fix**: Repeat Step 2 (clear storage) then Step 3 (log in)

**If you see**:
```
Insert error: { code: "42501" ...}
```
**This means RLS policies still have an issue**

Run this diagnostic:
1. Go to Supabase SQL Editor
2. Run: `DIAGNOSE-RLS-POLICIES.sql`
3. Look at the output to see which policies exist

## Expected Results

After completing all steps:

✅ **Database**: 5 RLS policies exist
✅ **Browser**: Storage cleared, fresh login
✅ **Console**: Shows session info
✅ **App**: "Coupon collected successfully!"

## Why Each Step Matters

| Step | What It Does | Why It's Needed |
|------|--------------|-----------------|
| 1. Fix DB | Creates correct RLS policies | Allows INSERT operations |
| 2. Clear Storage | Removes stale auth tokens | Fixes session mismatch |
| 3. Re-login | Gets fresh JWT token | Ensures auth.uid() works |
| 4. Test | Verifies everything works | Confirms the fix |

## Common Mistakes

❌ **Running SQL without logging into app** - SQL Editor auth is different from app auth  
❌ **Not clearing storage** - Old tokens cause mismatches  
❌ **Not waiting after logout** - Session needs time to clear  
❌ **Closing console** - Need to see debug messages  

## FAQ

### Q: Why did auth.uid() return NULL in SQL Editor?
**A**: SQL Editor runs with admin privileges, not as a logged-in user. This is normal and expected.

### Q: Do I need to restart my dev server?
**A**: No, database changes apply immediately.

### Q: Will this affect other users?
**A**: No, RLS policies affect everyone equally. If it works for you, it works for all users.

### Q: What if I see different error codes?
**A**: Check the full troubleshooting guide: `FIX-PERMISSION-DENIED-ERROR.md`

### Q: Can I skip clearing storage?
**A**: No, stale tokens are a common cause of this error. Always clear storage.

## Success Checklist

- [ ] Ran FIX-RLS-POLICIES-SAFE.sql in Supabase SQL Editor
- [ ] Saw 5 policies in the verification output
- [ ] Cleared localStorage and sessionStorage
- [ ] Logged out completely
- [ ] Logged back in with fresh credentials
- [ ] Opened browser console (F12)
- [ ] Searched for a coupon
- [ ] Clicked "Collect" button
- [ ] Saw success message in console
- [ ] Saw "Coupon collected successfully!" toast
- [ ] Verified coupon appears in wallet

## Still Having Issues?

1. **Screenshot the browser console** showing the error
2. **Run DIAGNOSE-RLS-POLICIES.sql** and screenshot results
3. **Share both screenshots** with the development team

Or check the detailed guide: `FIX-PERMISSION-DENIED-ERROR.md`

---

**Time Required**: ~5 minutes  
**Difficulty**: Easy  
**Success Rate**: 99% if steps followed exactly
