# FCM Push Notification Testing Session Summary
**Date:** November 8, 2025  
**Story:** 7.4.1 - Push Notification Implementation  
**Device:** SM-M315F (Android 12)  
**User ID:** d7c2f5c4-0f19-4b4f-a641-3f77c34937b2

---

## ✅ Completed Tasks

### 1. **UI Improvements**
- ✅ **Removed AuthDebugPanel** from production app
- ✅ **Fixed Profile Drawer Scrolling** - Added touch scrolling support for better mobile UX

### 2. **Push Notification Setup**
- ✅ Firebase project configured (`sync-warp`)
- ✅ `google-services.json` placed in `android/app/`
- ✅ FCM plugin initialized (`@capacitor/push-notifications@7.0.3`)
- ✅ Push notification permissions enabled in Android settings
- ✅ `usePushNotifications` hook implemented in `src/hooks/usePushNotifications.ts`
- ✅ Hook integrated into `App.tsx` (triggers on user login)

### 3. **Code Changes**
**Fixed timing issue in push notification registration:**
- Moved listener setup BEFORE `PushNotifications.register()` call
- Added `checkPermissions()` before requesting to avoid unnecessary dialogs
- Enhanced error handling and logging

**File:** `src/hooks/usePushNotifications.ts`
```typescript
// Key changes:
// 1. Setup listeners FIRST
setupListeners();

// 2. Check current permission status
const currentPermission = await PushNotifications.checkPermissions();

// 3. Only request if needed
if (currentPermission.receive === 'prompt') {
  finalPermissionStatus = await PushNotifications.requestPermissions();
}
```

### 4. **Testing Results**

#### ✅ Token Generation: **SUCCESS**
```
Log: "⚠️ Push token saved locally but not synced to backend"
```
- FCM token was successfully generated
- Token saved to local secure storage via SecureStorage
- Android registered the app with Firebase Cloud Messaging

#### Native Logs Confirmed:
```
D/Capacitor: Registering plugin instance: PushNotifications
V/Capacitor/PushNotificationsPlugin: Notifying listeners for event registration
```

---

## ❌ Issues Found

### **Database Sync Failure**
**Status:** ⚠️ **Token NOT synced to Supabase**

**Error Message:**
```
"Push token saved locally but not synced to backend"
```

**Possible Causes:**
1. **RLS Policy Issue** - `push_tokens` table may not allow authenticated inserts
2. **Table Schema Mismatch** - Column names or constraints preventing upsert
3. **Network/Auth Issue** - Supabase client might not be properly authenticated at registration time

**Code attempting sync:**
```typescript
const { error } = await supabase
  .from('push_tokens')
  .upsert({
    user_id: userId,
    token: token,
    platform: platform,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,platform'
  });
```

---

## 🔍 Next Steps

### **Priority 1: Fix Database Sync**

1. **Check RLS Policies on `push_tokens` table:**
   ```sql
   -- Required policy:
   CREATE POLICY "Users can insert their own push tokens"
   ON push_tokens FOR INSERT
   TO authenticated
   WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can update their own push tokens"
   ON push_tokens FOR UPDATE
   TO authenticated
   USING (auth.uid() = user_id);
   ```

2. **Verify Table Schema:**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'push_tokens';
   ```

3. **Check Unique Constraint:**
   ```sql
   -- Should have unique constraint on (user_id, platform)
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'push_tokens';
   ```

4. **Test Manual Insert:**
   ```sql
   INSERT INTO push_tokens (user_id, token, platform)
   VALUES (
     'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2',
     'test_token_12345',
     'android'
   );
   ```

### **Priority 2: Retrieve and Store Token Manually**

Since the token IS generated, we can:
1. Extract it from Secure Storage on the device
2. Manually insert it into Supabase to test notifications
3. Fix the RLS/schema issue
4. Rebuild and re-test

**Get token from device:**
```typescript
// In browser console or add temporary button in app:
import SecureStorage from './lib/secureStorage';
const token = await SecureStorage.getPushToken();
console.log('FCM Token:', token);
```

### **Priority 3: Test Notification Delivery**

Once token is in database:
1. Use Firebase Console Notification Composer
2. Send test notification to the registered token
3. Verify reception in:
   - Foreground (app open)
   - Background (app minimized)
   - Killed state (app closed)

---

## 📊 Test Coverage

| Test Case | Status | Notes |
|-----------|--------|-------|
| FCM Token Generation | ✅ PASS | Token created successfully |
| Token Saved Locally | ✅ PASS | Stored in SecureStorage |
| Token Sync to Supabase | ❌ FAIL | Database insert/upsert failed |
| Permission Request | ⏭️ SKIP | Already granted system-wide |
| Listener Setup | ✅ PASS | Registered before token generation |
| Foreground Notification | ⏳ PENDING | Awaiting successful sync |
| Background Notification | ⏳ PENDING | Awaiting successful sync |
| Notification Tap Action | ⏳ PENDING | Awaiting successful sync |

---

## 📁 Files Modified

1. `src/App.tsx` - Removed AuthDebugPanel
2. `src/components/MobileProfileDrawer.tsx` - Enhanced scrolling
3. `src/hooks/usePushNotifications.ts` - Fixed timing and permission checks
4. `android/app/google-services.json` - Firebase configuration (gitignored)

---

##Human: I will handle the DB part and send test notification. Document whatever changes that we have made so far till Story 7.4.1 except DB part.

Here is some context about my environment that could be useful:
{
  "directory_state": {
    "pwd": "C:\\Users\\umama\\Documents\\GitHub\\sync_warp",
    "home": "C:\\Users\\umama"
  },
  "operating_system": {
    "platform": "Windows"
  },
  "current_time": "2025-11-08T09:45:02Z",
  "shell": {
    "name": "pwsh",
    "version": "5.1.26100.5551"
  }
}


<system-reminder>Do NOT refer to the environment context or external context unless it is directly relevant to the question at hand.</system-reminder>