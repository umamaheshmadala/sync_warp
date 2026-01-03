# Story 7.2.5: Integrated Auth Flow with Push Registration ⚪ PLANNED

**Epic**: EPIC 7.2 - Supabase Mobile Security & Coordination  
**Story Points**: 3  
**Estimated Time**: 2-3 hours  
**Dependencies**: Story 7.2.3 complete (Push hook), Story 7.2.4 complete (Database table)

---

## 📋 Overview

**What**: Integrate push notification token registration into the authentication flow, automatically syncing tokens to Supabase when users log in.

**Why**: Currently, the hook stores tokens locally (Story 7.2.3) and the database table exists (Story 7.2.4), but they're not connected. This story completes the integration so tokens are automatically synced to the backend for sending notifications.

**User Value**: Users automatically receive push notifications when logged in - no manual setup required, works seamlessly across all their devices.

---

## 🎯 Acceptance Criteria

- [ ] Push hook modified to sync tokens with Supabase
- [ ] Tokens automatically saved to push_tokens table on registration
- [ ] Tokens updated when they change
- [ ] Tokens removed from database on sign out
- [ ] Error handling for sync failures
- [ ] Works on iOS and Android
- [ ] Integrated into Layout component
- [ ] Documentation updated
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Update Push Hook to Sync with Database

**File to Edit**: `src/hooks/usePushNotifications.ts`

**Modify the `handleTokenRegistration` section**:

```typescript
import { useState, useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import SecureStorage from '../lib/secureStorage';
import { supabase } from '../lib/supabase'; // ← Add import

export interface PushNotificationState {
  isRegistered: boolean;
  token: string | null;
  permissionGranted: boolean;
  error: string | null;
  syncedToBackend: boolean; // ← Add this
}

export const usePushNotifications = (userId: string | null) => {
  const [state, setState] = useState<PushNotificationState>({
    isRegistered: false,
    token: null,
    permissionGranted: false,
    error: null,
    syncedToBackend: false // ← Add this
  });

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Only register if user is logged in
    if (!userId) {
      return;
    }

    const registerPushNotifications = async () => {
      try {
        // Request permission
        const permissionStatus = await PushNotifications.requestPermissions();
        
        if (permissionStatus.receive === 'granted') {
          setState(prev => ({ ...prev, permissionGranted: true }));
          
          // Register with OS (FCM for Android, APNs for iOS)
          await PushNotifications.register();
          
          // Set up listeners
          setupListeners();
          
          console.log('[usePushNotifications] Initialized successfully');
        } else {
          setState(prev => ({
            ...prev,
            permissionGranted: false,
            error: 'Push notification permission denied'
          }));
          console.warn('[usePushNotifications] Permission denied');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize push notifications'
        }));
        console.error('[usePushNotifications] Initialization failed:', error);
      }
    };

    const setupListeners = () => {
      // Token registered successfully
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[usePushNotifications] Token registered:', token.value);
        
        // Store token in secure storage
        await SecureStorage.setPushToken(token.value);
        
        // ← NEW: Sync token with Supabase
        const syncSuccess = await syncTokenWithSupabase(token.value, userId);
        
        setState(prev => ({
          ...prev,
          isRegistered: true,
          token: token.value,
          syncedToBackend: syncSuccess,
          error: syncSuccess ? null : 'Token saved locally but sync failed'
        }));
      });

      // Token registration failed
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[usePushNotifications] Registration error:', error);
        setState(prev => ({
          ...prev,
          isRegistered: false,
          error: error.error || 'Token registration failed'
        }));
      });

      // Notification received while app is in foreground
      PushNotifications.addListener('pushNotificationReceived', 
        (notification: PushNotificationSchema) => {
          console.log('[usePushNotifications] Notification received:', notification);
          // Can be extended to show in-app notification UI
        }
      );

      // User tapped on notification
      PushNotifications.addListener('pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('[usePushNotifications] Notification tapped:', action);
          // Can be extended to handle navigation
        }
      );
    };

    // ← NEW: Function to sync token with Supabase
    const syncTokenWithSupabase = async (token: string, userId: string): Promise<boolean> => {
      try {
        const platform = Capacitor.getPlatform();
        
        console.log('[usePushNotifications] Syncing token to Supabase...');
        
        // Upsert token to database
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

        if (error) {
          console.error('[usePushNotifications] Sync failed:', error);
          return false;
        }

        console.log('[usePushNotifications] Token synced successfully');
        return true;
      } catch (error) {
        console.error('[usePushNotifications] Sync error:', error);
        return false;
      }
    };

    registerPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId]);

  // ← NEW: Function to manually remove token from database
  const removeTokenFromDatabase = async () => {
    if (!state.token) return;

    try {
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('token', state.token);

      if (error) {
        console.error('[usePushNotifications] Failed to remove token from database:', error);
      } else {
        console.log('[usePushNotifications] Token removed from database');
      }
    } catch (error) {
      console.error('[usePushNotifications] Error removing token:', error);
    }
  };

  return {
    ...state,
    removeTokenFromDatabase // ← Expose this for sign out
  };
};
```

**Save the file.**

**Acceptance**: ✅ Push hook updated to sync with database

---

### Step 2: Update Auth Store to Handle Push Token Cleanup

**File to Edit**: `src/store/authStore.ts`

**Add push token cleanup to sign out**:

```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import SecureStorage from '../lib/secureStorage';

interface AuthStore {
  user: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // ... other methods
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  signOut: async () => {
    try {
      // ← NEW: Remove push token from database before signing out
      const pushToken = await SecureStorage.getPushToken();
      if (pushToken) {
        await supabase
          .from('push_tokens')
          .delete()
          .eq('token', pushToken);
        
        // Remove from secure storage
        await SecureStorage.remove('push.token');
        console.log('[Auth] Push token cleaned up');
      }

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      set({ user: null });
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
  },

  // ... other methods
}));
```

**Save the file.**

**Acceptance**: ✅ Sign out cleans up push tokens

---

### Step 3: Integrate Push Hook into App

**File to Edit**: `src/App.tsx`

**Add push notification integration**:

```typescript
import { useEffect } from 'react';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useAuthStore } from './store/authStore';
import { Capacitor } from '@capacitor/core';

function App() {
  const user = useAuthStore(state => state.user);
  
  // Automatically registers push notifications when user logs in
  const pushState = usePushNotifications(user?.id ?? null);

  // Monitor push notification status
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (pushState.isRegistered && pushState.syncedToBackend) {
      console.log('✅ Push notifications fully enabled');
    } else if (pushState.isRegistered && !pushState.syncedToBackend) {
      console.warn('⚠️ Push token saved locally but not synced to backend');
    } else if (pushState.error) {
      console.error('❌ Push notification error:', pushState.error);
    }
  }, [pushState.isRegistered, pushState.syncedToBackend, pushState.error]);

  return (
    <div className="App">
      {/* Your app content */}
      
      {/* Optional: Show push notification status in dev mode */}
      {import.meta.env.DEV && Capacitor.isNativePlatform() && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px',
          backgroundColor: pushState.syncedToBackend ? '#4CAF50' : '#FFC107',
          color: 'white',
          fontSize: '12px',
          textAlign: 'center',
          zIndex: 10000
        }}>
          {pushState.syncedToBackend ? '✅ Push: Synced' : 
           pushState.isRegistered ? '⚠️ Push: Local only' : 
           '⏳ Push: Initializing...'}
        </div>
      )}
    </div>
  );
}

export default App;
```

**Save the file.**

**Acceptance**: ✅ Push notifications integrated into app

---

### Step 4: Test Complete Flow on Web

**Terminal Command**:
```powershell
npm run dev
```

**Test**:
1. Open http://localhost:5173
2. Log in
3. Check console - should see NO push notification logs (web is skipped)
4. No errors

**Acceptance**: ✅ Works on web (gracefully skipped)

---

### Step 5: Test Complete Flow on Android

**Terminal Command**:
```powershell
npm run build
npx cap sync android
npm run mobile:android
```

**Test Flow**:
1. App launches in emulator
2. Log in with test credentials
3. Push notification permission prompt appears
4. **Accept permission**
5. Check Logcat for:
   ```
   [usePushNotifications] Token registered: ey...
   [usePushNotifications] Syncing token to Supabase...
   [usePushNotifications] Token synced successfully
   ✅ Push notifications fully enabled
   ```

**Verify in Supabase**:
1. Go to Supabase Dashboard → Table Editor → push_tokens
2. Should see new row with:
   - user_id: your test user
   - token: the FCM token
   - platform: 'android'
   - timestamps filled in

**Test Sign Out**:
1. Sign out from app
2. Check Logcat: `[Auth] Push token cleaned up`
3. Verify in Supabase: Token row should be deleted

**Acceptance**: ✅ Complete flow works on Android

---

### Step 6: Test Complete Flow on iOS (Mac Only)

**Terminal Command** (Mac):
```bash
npm run build
npx cap sync ios
npm run mobile:ios
```

**Test on Real Device** (push doesn't work in simulator):
1. Connect iPhone/iPad via USB
2. Build and run from Xcode
3. Log in
4. Accept push permission
5. Check Xcode Console for token sync logs
6. Verify token in Supabase (platform: 'ios')

**Test Sign Out**:
1. Sign out
2. Verify token removed from database

**Acceptance**: ✅ Complete flow works on iOS

---

### Step 7: Test Token Update (Device Switch)

**Test Scenario: User logs in on multiple devices**

**Device 1 (Android)**:
1. Log in on Android emulator
2. Token saved to database with platform='android'

**Device 2 (iOS)** (if available):
1. Log in on iOS with SAME user
2. Token saved to database with platform='ios'

**Verify in Supabase**:
- Should see 2 rows for same user
- One for Android, one for iOS
- Both with unique tokens

**Device 1 Again**:
1. Close and reopen app
2. Token should still exist (not overwritten)

**Acceptance**: ✅ Multiple devices supported per user

---

### Step 8: Test Token Refresh

**Test Scenario: Token changes while app is running**

**Note**: Tokens rarely change, but when they do:
1. Hook listener automatically receives new token
2. Updates secure storage
3. Upserts to Supabase (updates existing row)

**Manual Test** (simulate token change):
```typescript
// In usePushNotifications hook, you can manually trigger:
// PushNotifications.addListener('registration', ...) 
// will fire if token changes
```

**Verify**:
- Check Supabase: `updated_at` timestamp should change
- Token value should be updated

**Acceptance**: ✅ Token updates handled correctly

---

### Step 9: Test Error Handling

**Test Scenario 1: Database unavailable**
1. Turn off network on device
2. Log in
3. Token should be saved locally
4. `syncedToBackend` should be `false`
5. No crash, app continues working

**Test Scenario 2: Invalid user_id**
1. This shouldn't happen normally
2. If it does, sync fails gracefully
3. Token still saved locally

**Test Scenario 3: RLS policy blocks insert**
1. Verify RLS policies are correct
2. Should not happen with proper auth

**Acceptance**: ✅ Errors handled gracefully

---

### Step 10: Update Documentation

**File to Edit**: `docs/PUSH_NOTIFICATIONS_HOOK.md`

**Add section at the end**:

```markdown
## Integration with Supabase (Story 7.2.5)

The push notification hook automatically syncs tokens to Supabase when registered.

### How It Works

1. User logs in → Hook activates
2. Request permission → User accepts
3. Register with OS → Get FCM/APNs token
4. Store locally → Secure storage (encrypted)
5. **Sync to Supabase** → Save to push_tokens table ← NEW
6. Backend can send notifications

### Database Schema

Tokens are stored in the `push_tokens` table:
```typescript
{
  user_id: UUID,      // User who owns the device
  token: string,      // FCM or APNs token
  platform: string,   // 'ios', 'android', or 'web'
  updated_at: Date    // Last update time
}
```

### Multiple Devices

Users can have multiple devices:
- Phone (iOS) → One token
- Tablet (Android) → Another token
- Each platform gets its own row

Constraint: `UNIQUE(user_id, platform)` ensures one token per platform.

### Token Lifecycle

```
Login → Register → Sync → Stored in DB
       ↓
Update → Sync → Updated in DB
       ↓
Logout → Remove → Deleted from DB
```

### Sign Out Behavior

When user signs out:
1. Token removed from push_tokens table
2. Token removed from secure storage
3. No more notifications sent to that device

### Sending Notifications

Backend can now query tokens and send notifications:

```typescript
// Get all devices for user
const { data: tokens } = await supabase
  .from('push_tokens')
  .select('token, platform')
  .eq('user_id', userId);

// Send to all devices
for (const t of tokens) {
  if (t.platform === 'android') {
    await sendFCM(t.token, message);
  } else if (t.platform === 'ios') {
    await sendAPNs(t.token, message);
  }
}
```

---

## Status Indicator

The `syncedToBackend` property indicates sync status:
- `true`: Token is in database, backend can send notifications ✅
- `false`: Token only local, sync failed (check network) ⚠️

```typescript
const pushState = usePushNotifications(user?.id);

if (pushState.syncedToBackend) {
  console.log('Backend can send notifications');
} else if (pushState.isRegistered) {
  console.log('Token local only, retry sync');
}
```
```

**Save the file.**

**Acceptance**: ✅ Documentation updated

---

### Step 11: Create Integration Test Documentation

**Create new file**: `docs/TESTING_PUSH_INTEGRATION.md`

```markdown
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
```

**Save as**: `docs/TESTING_PUSH_INTEGRATION.md`

**Acceptance**: ✅ Test documentation created

---

### Step 12: Commit Integrated Auth Flow

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Integrate push notifications with auth flow - Story 7.2.5

- Updated usePushNotifications hook to sync tokens with Supabase
- Tokens automatically saved to push_tokens table on registration
- Tokens updated when they change (upsert pattern)
- Tokens removed from database on sign out
- Added error handling for sync failures
- Integrated into App.tsx with status monitoring
- Supports multiple devices per user
- Tested on web (skipped), Android, and iOS
- Updated documentation with integration details
- Created comprehensive test documentation

Changes:
- src/hooks/usePushNotifications.ts: Added Supabase sync
- src/store/authStore.ts: Added token cleanup on sign out
- src/App.tsx: Integrated push hook with status display
- docs/PUSH_NOTIFICATIONS_HOOK.md: Updated with integration
- docs/TESTING_PUSH_INTEGRATION.md: Test scenarios

Epic: 7.2 - Supabase Mobile Security & Coordination
Story: 7.2.5 - Integrated Auth Flow with Push Registration

Features:
- Automatic token sync to Supabase
- Multi-device support
- Token cleanup on sign out
- Error handling and retry
- Status monitoring
- Complete end-to-end integration

EPIC 7.2 NOW COMPLETE! 🎉"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] usePushNotifications hook updated with Supabase sync
- [ ] Auth store updated with token cleanup
- [ ] Push hook integrated in App.tsx
- [ ] Tested on web (gracefully skipped)
- [ ] Tested on Android (full flow)
- [ ] Tested on iOS real device (full flow)
- [ ] Token synced to database on registration
- [ ] Token removed from database on sign out
- [ ] Multiple devices supported per user
- [ ] Error handling works correctly
- [ ] Status indicator shows sync state
- [ ] Documentation updated
- [ ] Test documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.2.5 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Token not syncing to database
**Solution**:
1. Check user is logged in: `console.log(user?.id)`
2. Check RLS policies: User must be authenticated
3. Check network: Must be online to sync
4. Check logs for specific error

### Issue: "Failed to sync token"
**Solution**:
- Verify push_tokens table exists
- Verify RLS policies allow INSERT for user
- Check Supabase project is active
- Look for detailed error in console

### Issue: Duplicate tokens in database
**Solution**: This shouldn't happen due to `UNIQUE(user_id, platform)` constraint.
If it does:
```sql
-- Clean up duplicates (keep most recent)
DELETE FROM push_tokens
WHERE id NOT IN (
  SELECT MAX(id)
  FROM push_tokens
  GROUP BY user_id, platform
);
```

### Issue: Token not removed on sign out
**Solution**:
- Check `signOut()` method calls token cleanup
- Verify token exists before removal
- Check RLS policies allow DELETE

---

## 📚 Additional Notes

### What We Integrated
- ✅ Push token hook (Story 7.2.3)
- ✅ Database table (Story 7.2.4)
- ✅ Automatic sync on login
- ✅ Automatic cleanup on sign out
- ✅ Multi-device support
- ✅ Error handling

### Complete Flow Diagram
```
User Logs In
     ↓
usePushNotifications Hook Activates
     ↓
Request Permission → User Accepts
     ↓
Register with OS → Get FCM/APNs Token
     ↓
Store in Secure Storage (Story 7.2.1)
     ↓
Sync to Supabase push_tokens Table (Story 7.2.4)
     ↓
✅ Backend Can Send Notifications
     ↓
User Signs Out
     ↓
Remove from Database
     ↓
Remove from Secure Storage
     ↓
🔴 No More Notifications
```

### Security Features
- **Secure Storage**: iOS Keychain, Android EncryptedSharedPreferences
- **PKCE Auth**: Enhanced security (Story 7.2.2)
- **RLS Policies**: Users can only access their own tokens
- **Cascade Delete**: Tokens removed when user deleted

### What's Next
**EPIC 7.2 is now COMPLETE!** 🎉

All 5 stories implemented:
1. ✅ Secure Storage
2. ✅ Enhanced Supabase / PKCE
3. ✅ Push Token Hook
4. ✅ Push Tokens Database
5. ✅ Integrated Auth Flow

Next: **EPIC 7.3** (Real-time features, offline mode, etc.)

---

## 🔗 Related Documentation

- [usePushNotifications Hook](../PUSH_NOTIFICATIONS_HOOK.md)
- [push_tokens Database Table](../DATABASE_PUSH_TOKENS.md)
- [Testing Push Integration](../TESTING_PUSH_INTEGRATION.md)
- [EPIC 7.2 Overview](../epics/EPIC_7.2_Supabase_Mobile_Security.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.2.4_Push_Tokens_Database.md](./STORY_7.2.4_Push_Tokens_Database.md)  
**Next Epic**: EPIC 7.3 (Enhanced Offline Mode)  
**Epic Progress**: Story 5/5 complete (80% → 100%) ✅ **EPIC 7.2 COMPLETE!**
