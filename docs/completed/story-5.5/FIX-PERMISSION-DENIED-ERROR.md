## Fix for "Permission denied. Please log in again." Error

## Problem Description

Users are encountering "Permission denied. Please log in again." error when trying to collect coupons, even after logging out and logging back in.

## Root Causes

This error (PostgreSQL error code `42501`) means the RLS (Row Level Security) policy on the `user_coupon_collections` table is preventing the INSERT operation. This can happen for several reasons:

### 1. **Session Token Expired or Invalid**
- The JWT token used by Supabase has expired
- The session is no longer valid
- `auth.uid()` returns NULL on the server side

### 2. **User ID Mismatch**
- The `user_id` being inserted doesn't match `auth.uid()`
- Client-side user store has a different ID than the server-side session

### 3. **RLS Policy Not Applied**
- The migration creating the INSERT policy wasn't run
- The policy was dropped and not recreated
- Multiple conflicting policies exist

## Solutions

### Solution 1: Fix RLS Policies (Run This First)

Run this script in Supabase SQL Editor:

```sql
-- File: docs/story-5.5/FIX-RLS-POLICIES.sql
```

This will:
1. Drop all conflicting policies
2. Recreate the correct policies
3. Verify the policies are in place
4. Test authentication

### Solution 2: Diagnose the Issue

Run the diagnostic script to identify the exact problem:

```sql
-- File: docs/story-5.5/DIAGNOSE-RLS-POLICIES.sql
```

This will show you:
- Whether RLS is enabled
- Which policies exist
- If `auth.uid()` is NULL
- If you can SELECT from the table

### Solution 3: Check Browser Console

After the code changes, check the browser console for debug messages:

```
🔐 [collectCoupon] User from store: { id: "...", email: "..." }
🔐 [collectCoupon] User ID: <user-id>
🔐 [collectCoupon] Current session: { ... }
🔐 [collectCoupon] Session error: null
```

Look for:
- ❌ "No active session!" - Session expired
- ❌ "User ID mismatch!" - Client/server mismatch
- Any other errors

### Solution 4: Force Session Refresh

If session is expired, force a refresh:

1. **Log out completely**:
   - Click logout button
   - Clear browser cookies for the site
   - Close all tabs

2. **Clear Supabase client storage**:
   ```javascript
   // Run in browser console
   localStorage.clear();
   sessionStorage.clear();
   ```

3. **Log back in**:
   - Fresh login
   - Check console for authentication messages

### Solution 5: Update Auth Store

Make sure your auth store properly updates the session:

Check `src/store/authStore.ts` to ensure it's using:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // Update user when session changes
});
```

## Step-by-Step Fix Process

### Step 1: Run RLS Fix Script
```sql
-- In Supabase SQL Editor
-- Run: docs/story-5.5/FIX-RLS-POLICIES.sql
```

### Step 2: Clear Browser State
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Step 3: Log Out and Log In
1. Click "Logout"
2. Wait 2 seconds
3. Click "Login"
4. Enter credentials
5. Check console for auth messages

### Step 4: Test Collection
1. Search for a coupon
2. Click "Collect"
3. Check browser console for debug messages
4. Should see success message

### Step 5: Verify in Database
```sql
-- Check if collection was created
SELECT * FROM user_coupon_collections
WHERE user_id = auth.uid()
ORDER BY collected_at DESC
LIMIT 5;
```

## Expected Console Output (Success)

```
🔐 [collectCoupon] User from store: Object { id: "abc-123", email: "user@example.com" }
🔐 [collectCoupon] User ID: abc-123
🔐 [collectCoupon] Current session: Object { access_token: "...", user: {...} }
🔐 [collectCoupon] Session error: null
✅ Coupon collected successfully!
```

## Expected Console Output (Failure)

### Scenario 1: Session Expired
```
🔐 [collectCoupon] User from store: Object { id: "abc-123", ... }
🔐 [collectCoupon] User ID: abc-123
🔐 [collectCoupon] Current session: null
🔐 [collectCoupon] Session error: null
❌ [collectCoupon] No active session!
Toast: "Your session has expired. Please log in again."
```

**Fix**: Log out and log back in

### Scenario 2: User ID Mismatch
```
🔐 [collectCoupon] User from store: Object { id: "abc-123", ... }
🔐 [collectCoupon] User ID: abc-123
🔐 [collectCoupon] Current session: Object { user: { id: "xyz-789" } }
❌ [collectCoupon] User ID mismatch! { storeUserId: "abc-123", sessionUserId: "xyz-789" }
Toast: "Authentication mismatch. Please log in again."
```

**Fix**: Clear storage and log in again

### Scenario 3: RLS Policy Issue
```
🔐 [collectCoupon] User from store: Object { id: "abc-123", ... }
🔐 [collectCoupon] User ID: abc-123
🔐 [collectCoupon] Current session: Object { user: { id: "abc-123" } }
Insert error: Object { code: "42501", message: "new row violates policy" }
Toast: "Permission denied. Please log in again."
```

**Fix**: Run FIX-RLS-POLICIES.sql

## Common Issues and Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Session expired | Log out, clear storage, log in |
| User ID mismatch | Clear storage, log in |
| RLS policy missing | Run FIX-RLS-POLICIES.sql |
| auth.uid() is NULL | Check JWT token in Network tab |
| Multiple policies conflict | Run FIX-RLS-POLICIES.sql |

## Debugging Checklist

- [ ] Ran `DIAGNOSE-RLS-POLICIES.sql`
- [ ] Verified RLS is enabled
- [ ] Verified INSERT policy exists
- [ ] Verified `auth.uid()` is not NULL
- [ ] Checked browser console for errors
- [ ] Checked Network tab for 401/403 errors
- [ ] Cleared browser storage
- [ ] Logged out and logged back in
- [ ] Ran `FIX-RLS-POLICIES.sql`
- [ ] Tested collection again

## Files Modified

1. **src/hooks/useCoupons.ts**
   - Added session validation
   - Added debug logging
   - Added user ID mismatch detection

## Files Created

1. **FIX-RLS-POLICIES.sql** - Fixes RLS policies
2. **DIAGNOSE-RLS-POLICIES.sql** - Diagnoses the issue
3. **FIX-PERMISSION-DENIED-ERROR.md** - This file

## Prevention

### For Developers

1. Always check session before database operations
2. Use `auth.uid()` in RLS policies, not client-provided IDs
3. Test with expired sessions
4. Add proper error handling
5. Log authentication state changes

### For Users

1. Keep browser up to date
2. Allow cookies for the site
3. Don't manually clear storage while logged in
4. Report errors with console output

## Support

If the error persists after all fixes:

1. **Check Supabase Dashboard**:
   - Go to Authentication > Users
   - Verify your user exists
   - Check last sign-in time

2. **Check Database Logs**:
   - Go to Database > Logs
   - Look for policy violation errors
   - Note the error details

3. **Export Debug Info**:
   ```javascript
   // Run in browser console
   console.log({
     user: authStore.user,
     session: await supabase.auth.getSession(),
     policies: 'see DIAGNOSE-RLS-POLICIES.sql results'
   });
   ```

4. **Contact Development Team** with:
   - Console output
   - Database logs
   - DIAGNOSE-RLS-POLICIES.sql results
   - Steps to reproduce

---

**Status**: Code changes complete, RLS fix script ready  
**Last Updated**: 2025-02-03  
**Version**: 1.2
