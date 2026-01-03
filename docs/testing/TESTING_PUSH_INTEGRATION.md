# Testing Push Notification Integration 🧪

## Complete Flow Test

### Preparation
1. Have test user account in Supabase
2. Android emulator running OR iOS device connected
3. Firebase (Android) or Apple Developer (iOS) configured

---

## Test 1: First-Time Login

### Steps
1. Install app on device
2. Launch app
3. Log in with test account
4. Accept push notification permission

### Expected Results
- ✅ Permission dialog appears
- ✅ Token registered locally
- ✅ Token synced to Supabase
- ✅ Row appears in push_tokens table
- ✅ Console logs: "Token synced successfully"

### Verify
```sql
SELECT * FROM push_tokens WHERE user_id = '<your-test-user-id>';
```
Should return 1 row with correct platform.

---

## Test 2: Sign Out

### Steps
1. User already logged in
2. Sign out

### Expected Results
- ✅ Token removed from database
- ✅ Token removed from secure storage
- ✅ Console logs: "Push token cleaned up"

### Verify
```sql
SELECT * FROM push_tokens WHERE user_id = '<your-test-user-id>';
```
Should return 0 rows.

---

## Test 3: Multiple Devices

### Steps
1. Log in on Android device
2. Log in on iOS device with SAME account

### Expected Results
- ✅ Android token saved (platform='android')
- ✅ iOS token saved (platform='ios')
- ✅ Both tokens in database

### Verify
```sql
SELECT * FROM push_tokens WHERE user_id = '<your-test-user-id>';
```
Should return 2 rows (one per platform).

---

## Test 4: Network Failure

### Steps
1. Turn off device network
2. Log in
3. Accept push permission

### Expected Results
- ✅ Token registered locally
- ✅ Sync fails (network error)
- ✅ App continues working
- ✅ `syncedToBackend` = false
- ✅ No crash

### Recovery
1. Turn network back on
2. Close and reopen app
3. Token should sync on next login

---

## Test 5: Permission Denial

### Steps
1. Install app
2. Log in
3. **Deny** push permission

### Expected Results
- ✅ App continues working
- ✅ No token registered
- ✅ No database entry
- ✅ Console logs: "Permission denied"
- ✅ No crash

---

## Test 6: Token Update

### Steps
1. Log in (token registered)
2. Simulate token change (rare, but can happen)

### Expected Results
- ✅ New token synced to database
- ✅ `updated_at` timestamp changes
- ✅ Same row updated (not duplicate)

---

## Troubleshooting Checklist

If tests fail, check:

- [ ] Firebase/APNs configured correctly
- [ ] `google-services.json` in place (Android)
- [ ] Push Notifications capability enabled (iOS)
- [ ] push_tokens table exists in Supabase
- [ ] RLS policies allow INSERT/UPDATE/DELETE
- [ ] User is authenticated (auth.uid() works)
- [ ] Network connection active
- [ ] Console logs for specific errors

---

## Expected Database State

After all tests, database should have:
- Tokens for currently logged-in devices
- No tokens for logged-out devices
- One row per user per platform
- All timestamps populated
- No duplicate tokens

```sql
-- Check all tokens
SELECT 
  user_id,
  platform,
  LEFT(token, 10) as token_preview,
  created_at,
  updated_at
FROM push_tokens
ORDER BY user_id, platform;
```
