# Story 7.2.3: Push Token Registration Hook ⚪ PLANNED

**Epic**: EPIC 7.2 - Supabase Mobile Security & Coordination  
**Story Points**: 3  
**Estimated Time**: 2-3 hours  
**Dependencies**: Story 7.2.1 complete (Secure storage), Story 7.2.2 complete (Enhanced Supabase config)

---

## 📋 Overview

**What**: Create a React hook that automatically handles push notification token registration when users log in.

**Why**: Mobile apps need push notifications for real-time updates. The hook will abstract the complexity of requesting permissions, registering tokens, and handling updates/refreshes automatically.

**User Value**: Users receive timely push notifications without manual setup - it just works automatically when they log in.

---

## 🎯 Acceptance Criteria

- [ ] @capacitor/push-notifications plugin installed
- [ ] `usePushNotifications` hook created
- [ ] Hook requests push permissions on mobile
- [ ] Hook listens for device tokens (FCM/APNs)
- [ ] Hook stores token locally for later sync
- [ ] Hook handles permission denial gracefully
- [ ] Hook tested on iOS and Android
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Install Push Notifications Plugin

**Terminal Commands** (Windows PowerShell):
```powershell
# Install Capacitor Push Notifications plugin
npm install @capacitor/push-notifications

# Sync to native projects
npx cap sync
```

**Expected Output**:
```
added 1 package, and audited 1525 packages in 9s
✔ Copying web assets
✔ Updating Android plugins
✔ Updating iOS plugins
```

**Verify Installation**:
```powershell
grep "capacitor/push-notifications" package.json
```

**Acceptance**: ✅ Push notifications plugin installed

---

### Step 2: Create usePushNotifications Hook

**Create new file**: `src/hooks/usePushNotifications.ts`

```typescript
import { useState, useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import SecureStorage from '../lib/secureStorage';

export interface PushNotificationState {
  isRegistered: boolean;
  token: string | null;
  permissionGranted: boolean;
  error: string | null;
}

export const usePushNotifications = (userId: string | null) => {
  const [state, setState] = useState<PushNotificationState>({
    isRegistered: false,
    token: null,
    permissionGranted: false,
    error: null
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
        
        setState(prev => ({
          ...prev,
          isRegistered: true,
          token: token.value,
          error: null
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

    registerPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId]);

  return state;
};
```

**Save the file.**

**Acceptance**: ✅ `usePushNotifications` hook created

---

### Step 3: Configure Android for Push Notifications (FCM)

**Note**: Firebase Cloud Messaging (FCM) setup required for Android.

**Steps**:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Add Android app to project
4. Download `google-services.json`
5. Place in `android/app/` directory

**File to Edit**: `android/build.gradle`

**Add Google Services plugin**:
```gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

**File to Edit**: `android/app/build.gradle`

**Apply Google Services plugin**:
```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services' // ← Add this line

android {
    // ...existing config
}
```

**Sync Project**:
```powershell
npx cap sync android
```

**Acceptance**: ✅ Android FCM configured

---

### Step 4: Configure iOS for Push Notifications (APNs)

**Note**: This requires a Mac with Xcode and an Apple Developer Account.

**Steps** (Mac only):
1. Open `ios/App/App.xcodeproj` in Xcode
2. Select target → Signing & Capabilities
3. Click "+ Capability"
4. Add "Push Notifications"
5. Add "Background Modes"
6. Enable "Remote notifications" under Background Modes

**File to Edit**: `ios/App/App/AppDelegate.swift` (if customization needed)

```swift
import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, 
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Register for remote notifications
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    // Handle remote notification registration
    func application(_ application: UIApplication, 
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, 
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
}

extension AppDelegate: UNUserNotificationCenterDelegate {
    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, 
                                willPresent notification: UNNotification, 
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }
}
```

**Sync Project**:
```bash
npx cap sync ios
```

**Acceptance**: ✅ iOS APNs configured (Mac only)

---

### Step 5: Test Hook on Web (Should Skip)

**Terminal Command**:
```powershell
npm run dev
```

**Test**:
1. Open http://localhost:5173
2. Log in
3. Open DevTools → Console
4. Should see: `[usePushNotifications] Skipping - not a native platform` (or no push logs)
5. No errors

**Acceptance**: ✅ Hook gracefully skips on web

---

### Step 6: Test Hook on Android

**Terminal Command**:
```powershell
npm run mobile:android
```

**Test Flow**:
1. App launches in emulator
2. Log in with test credentials
3. Push notification permission prompt appears
4. **Accept permission**
5. Check Logcat for:
   ```
   [usePushNotifications] Initialized successfully
   [usePushNotifications] Token registered: ey...
   ```
6. Token should be saved to secure storage

**Verify Token Storage**:
```powershell
# Token is in encrypted storage - can't view directly
# But can verify it's saved via logs
```

**Acceptance**: ✅ Hook works on Android

---

### Step 7: Test Hook on iOS (Mac Only)

**Terminal Command** (Mac):
```bash
npm run mobile:ios
```

**Test Flow**:
1. App launches in simulator
2. Log in with test credentials
3. Push notification permission prompt appears
4. **Accept permission**
5. Check Xcode Console for token registration

**Note**: Push notifications don't work in iOS Simulator - test on real device.

**Test on Real iOS Device**:
1. Connect iPhone/iPad via USB
2. Select device in Xcode
3. Build and run
4. Accept push notification permission
5. Token should be registered

**Acceptance**: ✅ Hook works on iOS (real device)

---

### Step 8: Test Permission Denial

**Test on Android/iOS**:
1. Uninstall app
2. Reinstall app
3. Log in
4. **Deny** push notification permission
5. App should continue working normally
6. Check logs:
   ```
   [usePushNotifications] Permission denied
   ```
7. No crashes or errors

**Acceptance**: ✅ Permission denial handled gracefully

---

### Step 9: Use Hook in App Component

**File to Edit**: `src/App.tsx`

**Add hook usage**:
```typescript
import { usePushNotifications } from './hooks/usePushNotifications';
import { useAuthStore } from './store/authStore';

function App() {
  const user = useAuthStore(state => state.user);
  
  // Automatically registers push notifications when user logs in
  const pushState = usePushNotifications(user?.id ?? null);

  // Optional: Show registration status
  useEffect(() => {
    if (pushState.isRegistered) {
      console.log('✅ Push notifications registered');
    }
    if (pushState.error) {
      console.error('❌ Push notification error:', pushState.error);
    }
  }, [pushState.isRegistered, pushState.error]);

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}

export default App;
```

**Save the file.**

**Acceptance**: ✅ Hook integrated into app

---

### Step 10: Create Hook Documentation

**Create new file**: `docs/PUSH_NOTIFICATIONS_HOOK.md`

```markdown
# usePushNotifications Hook 📱

## Overview

React hook that automatically handles push notification registration when users log in.

---

## Usage

```typescript
import { usePushNotifications } from './hooks/usePushNotifications';

function MyComponent() {
  const user = useUser(); // Your auth hook
  
  // Automatically registers when user logs in
  const pushState = usePushNotifications(user?.id ?? null);

  return (
    <div>
      {pushState.isRegistered && <p>✅ Push notifications enabled</p>}
      {pushState.error && <p>❌ {pushState.error}</p>}
    </div>
  );
}
```

---

## API

### Parameters
- `userId: string | null` - Current user ID (null if not logged in)

### Returns
```typescript
{
  isRegistered: boolean;     // Whether token is registered
  token: string | null;      // Push token (if registered)
  permissionGranted: boolean; // Whether permission was granted
  error: string | null;      // Error message (if any)
}
```

---

## How It Works

1. **Check Platform**: Only runs on iOS/Android (skips web)
2. **Check User**: Only registers if user is logged in
3. **Request Permission**: Shows native permission dialog
4. **Register Token**: Gets FCM (Android) or APNs (iOS) token
5. **Store Token**: Saves to secure storage for later sync
6. **Listen for Updates**: Handles token changes automatically

---

## Platform Support

- ✅ **iOS**: APNs tokens (requires real device)
- ✅ **Android**: FCM tokens
- ⏭️ **Web**: Gracefully skipped

---

## Requirements

### Android
- Firebase project set up
- `google-services.json` in `android/app/`
- Google Services plugin applied

### iOS
- Push Notifications capability enabled in Xcode
- Apple Developer account
- Real device (simulator doesn't support push)

---

## Error Handling

The hook handles errors gracefully:
- Permission denial → Returns error, app continues
- Registration failure → Logs error, can retry
- Platform not supported → Silently skips

---

## Next Steps

After implementing this hook:
1. **Story 7.2.4**: Create push_tokens database table
2. **Story 7.2.5**: Sync tokens with Supabase (integrated auth flow)

---

## Related

- **Story 7.2.1**: Secure Storage (where tokens are stored)
- **Story 7.2.2**: Enhanced Supabase Client
```

**Save as**: `docs/PUSH_NOTIFICATIONS_HOOK.md`

**Acceptance**: ✅ Documentation created

---

### Step 11: Commit Push Notification Hook

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Create push notification registration hook - Story 7.2.3

- Installed @capacitor/push-notifications plugin
- Created usePushNotifications hook for React
- Hook automatically requests permissions when user logs in
- Handles FCM tokens (Android) and APNs tokens (iOS)
- Stores tokens in secure storage
- Handles permission denial gracefully
- Configured Android FCM setup
- Configured iOS APNs setup
- Created hook documentation

Changes:
- src/hooks/usePushNotifications.ts: Push notification hook
- src/App.tsx: Integrated hook into app
- docs/PUSH_NOTIFICATIONS_HOOK.md: Hook documentation
- android/: FCM configuration
- ios/: APNs configuration (Mac)

Epic: 7.2 - Supabase Mobile Security
Story: 7.2.3 - Push Token Registration Hook

Features:
- Automatic token registration on login
- Secure token storage
- Permission handling
- Cross-platform support (iOS/Android)"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] @capacitor/push-notifications installed
- [ ] `src/hooks/usePushNotifications.ts` created
- [ ] Hook integrated in App.tsx
- [ ] Android FCM configured
- [ ] iOS APNs configured (Mac only)
- [ ] Hook tested on web (gracefully skips)
- [ ] Hook tested on Android (token registered)
- [ ] Hook tested on iOS real device
- [ ] Permission denial handled gracefully
- [ ] Token stored in secure storage
- [ ] `docs/PUSH_NOTIFICATIONS_HOOK.md` created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.2.3 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: "google-services.json not found" (Android)
**Solution**:
1. Go to Firebase Console
2. Download `google-services.json`
3. Place in `android/app/`
4. Run: `npx cap sync android`

### Issue: Push notifications not working on iOS Simulator
**Solution**: iOS Simulator doesn't support push notifications. Test on a real device.

### Issue: "Token registration failed"
**Solution**:
- Check permissions granted
- Verify FCM/APNs configuration
- Check console for error messages
- Ensure `google-services.json` (Android) or certificates (iOS) are correct

### Issue: Hook not registering
**Solution**:
- Ensure user is logged in (userId is not null)
- Check platform: Must be iOS or Android
- Verify plugin installed: `npm list @capacitor/push-notifications`
- Check logs for specific error messages

---

## 📚 Additional Notes

### What We Built
- ✅ React hook for push notifications
- ✅ Automatic registration on login
- ✅ Permission request handling
- ✅ Token storage in secure storage
- ✅ Cross-platform support

### What's NOT in This Story
- ❌ Syncing tokens with Supabase (Story 7.2.5)
- ❌ Creating push_tokens table (Story 7.2.4)
- ❌ Sending notifications (future epic)

### Hook Lifecycle
1. User logs in → Hook activates
2. Request permission → User accepts/denies
3. Register with OS → Get FCM/APNs token
4. Store token → Secure storage (encrypted)
5. User logs out → Hook cleans up

---

## 🔗 Related Documentation

- [@capacitor/push-notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification service](https://developer.apple.com/documentation/usernotifications)
- [EPIC 7.2 Overview](../epics/EPIC_7.2_Supabase_Mobile_Security.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.2.2_PKCE_Auth_Flow.md](./STORY_7.2.2_PKCE_Auth_Flow.md)  
**Next Story**: [STORY_7.2.4_Push_Tokens_Database.md](./STORY_7.2.4_Push_Tokens_Database.md)  
**Epic Progress**: Story 3/5 complete (40% → 60%)
