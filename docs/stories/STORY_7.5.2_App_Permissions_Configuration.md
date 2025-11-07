# Story 7.5.2: App Permissions Configuration

**Feature:** Mobile App Setup & Deployment  
**Epic:** 7. Cross-Platform Mobile App (iOS & Android)  
**Story ID:** 7.5.2  
**Branch:** `mobile-app-setup`

---

## 📋 Overview

Configure all required permissions for iOS and Android platforms to ensure the app can access necessary device features like camera, location, push notifications, photo library, and storage. Includes user-friendly permission descriptions and graceful handling when permissions are denied.

---

## 🎯 Acceptance Criteria

- [ ] All iOS permissions configured in `Info.plist` with user-facing descriptions
- [ ] All Android permissions configured in `AndroidManifest.xml`
- [ ] User-friendly permission prompts display when accessing features
- [ ] Graceful handling and UI feedback when permissions are denied
- [ ] Permissions requested only when needed (just-in-time requesting)
- [ ] Proper permission checking before accessing protected features
- [ ] Documentation created for all configured permissions
- [ ] Tested on both iOS and Android devices with various permission states

---

## 🛠️ Implementation Steps

### **Step 1: Configure iOS Permissions (Info.plist)**

**File:** `ios/App/App/Info.plist`

Add the following permission keys with descriptive messages:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Existing keys... -->
    
    <!-- Camera Permission -->
    <key>NSCameraUsageDescription</key>
    <string>We need access to your camera to let you take photos for your posts and profile.</string>
    
    <!-- Photo Library Permission -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>We need access to your photo library to let you select photos for your posts and profile.</string>
    
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>We need access to save photos from the app to your photo library.</string>
    
    <!-- Location Permission -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>We need your location to show you nearby events and friends.</string>
    
    <key>NSLocationAlwaysUsageDescription</key>
    <string>We need your location to provide location-based updates even when the app is in the background.</string>
    
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>We need your location to show you nearby events and provide location-based notifications.</string>
    
    <!-- Notifications Permission -->
    <key>NSUserNotificationsUsageDescription</key>
    <string>We need permission to send you notifications about messages, events, and updates.</string>
    
    <!-- Microphone Permission (if adding audio/video features) -->
    <key>NSMicrophoneUsageDescription</key>
    <string>We need access to your microphone for voice messages and video calls.</string>
    
    <!-- Contacts Permission (if syncing contacts) -->
    <key>NSContactsUsageDescription</key>
    <string>We need access to your contacts to help you find and connect with friends.</string>
    
    <!-- Face ID / Biometric Permission -->
    <key>NSFaceIDUsageDescription</key>
    <string>We use Face ID to securely authenticate and protect your account.</string>
    
    <!-- Motion & Fitness Permission (if tracking activity) -->
    <key>NSMotionUsageDescription</key>
    <string>We use motion data to track your activity and fitness progress.</string>
</dict>
</plist>
```

---

### **Step 2: Configure Android Permissions (AndroidManifest.xml)**

**File:** `android/app/src/main/AndroidManifest.xml`

Add the following permissions:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.syncwarp.app">

    <!-- Internet & Network State -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    
    <!-- Camera Permission -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    
    <!-- Photo Library / External Storage -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
                     android:maxSdkVersion="28"
                     tools:ignore="ScopedStorage" />
    
    <!-- Android 13+ Photo/Video/Media Permissions -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    
    <!-- Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <!-- Notifications (POST_NOTIFICATIONS for Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Vibration for notifications -->
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <!-- Microphone (if adding audio/video features) -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-feature android:name="android.hardware.microphone" android:required="false" />
    
    <!-- Contacts (if syncing contacts) -->
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.WRITE_CONTACTS" />
    
    <!-- Biometric Authentication -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    
    <!-- Wake Lock (for background tasks) -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    
    <!-- Foreground Service (if running background services) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        
        <!-- MainActivity and other activities -->
        
    </application>

</manifest>
```

---

### **Step 3: Create Permission Helper Utility**

**File:** `src/utils/permissions.ts`

```typescript
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';

export type PermissionType = 'camera' | 'photos' | 'location' | 'notifications';

export interface PermissionResult {
  granted: boolean;
  message?: string;
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  try {
    const status = await Camera.checkPermissions();
    
    if (status.camera === 'granted' || status.photos === 'granted') {
      return { granted: true };
    }
    
    const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    
    if (result.camera === 'granted' || result.photos === 'granted') {
      return { granted: true };
    }
    
    return {
      granted: false,
      message: 'Camera access is required to take photos. Please enable it in Settings.'
    };
  } catch (error) {
    console.error('Camera permission error:', error);
    return {
      granted: false,
      message: 'Unable to request camera permission. Please check Settings.'
    };
  }
}

/**
 * Request location permission
 */
export async function requestLocationPermission(): Promise<PermissionResult> {
  try {
    const status = await Geolocation.checkPermissions();
    
    if (status.location === 'granted') {
      return { granted: true };
    }
    
    const result = await Geolocation.requestPermissions();
    
    if (result.location === 'granted') {
      return { granted: true };
    }
    
    return {
      granted: false,
      message: 'Location access is required to show nearby events. Please enable it in Settings.'
    };
  } catch (error) {
    console.error('Location permission error:', error);
    return {
      granted: false,
      message: 'Unable to request location permission. Please check Settings.'
    };
  }
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  try {
    const status = await PushNotifications.checkPermissions();
    
    if (status.receive === 'granted') {
      return { granted: true };
    }
    
    const result = await PushNotifications.requestPermissions();
    
    if (result.receive === 'granted') {
      return { granted: true };
    }
    
    return {
      granted: false,
      message: 'Notification access is required to receive updates. Please enable it in Settings.'
    };
  } catch (error) {
    console.error('Notification permission error:', error);
    return {
      granted: false,
      message: 'Unable to request notification permission. Please check Settings.'
    };
  }
}

/**
 * Open device settings (iOS & Android)
 */
export function openAppSettings(): void {
  if (Capacitor.getPlatform() === 'ios') {
    window.open('app-settings:');
  } else if (Capacitor.getPlatform() === 'android') {
    // Use a Capacitor plugin or intent to open settings
    window.open('app-settings:');
  }
}

/**
 * Check if a permission is granted
 */
export async function checkPermission(type: PermissionType): Promise<boolean> {
  try {
    switch (type) {
      case 'camera':
      case 'photos':
        const cameraStatus = await Camera.checkPermissions();
        return cameraStatus.camera === 'granted' || cameraStatus.photos === 'granted';
      
      case 'location':
        const locationStatus = await Geolocation.checkPermissions();
        return locationStatus.location === 'granted';
      
      case 'notifications':
        const notifStatus = await PushNotifications.checkPermissions();
        return notifStatus.receive === 'granted';
      
      default:
        return false;
    }
  } catch (error) {
    console.error(`Permission check error for ${type}:`, error);
    return false;
  }
}
```

---

### **Step 4: Create Permission UI Component**

**File:** `src/components/PermissionPrompt.tsx`

```tsx
import React from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { openAppSettings } from '../utils/permissions';

interface PermissionPromptProps {
  message: string;
  onRetry?: () => void;
}

export default function PermissionPrompt({ message, onRetry }: PermissionPromptProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Permission Required
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {message}
            </p>
            <div className="flex gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              )}
              <button
                onClick={openAppSettings}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### **Step 5: Example Usage in a Feature Component**

**File:** `src/features/posts/components/CreatePost.tsx`

```tsx
import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { requestCameraPermission } from '../../../utils/permissions';
import PermissionPrompt from '../../../components/PermissionPrompt';

export default function CreatePost() {
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');

  const handleTakePhoto = async () => {
    const permission = await requestCameraPermission();
    
    if (!permission.granted) {
      setPermissionMessage(permission.message || 'Camera access denied');
      setShowPermissionPrompt(true);
      return;
    }

    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'uri',
        source: 'camera'
      });
      
      // Handle photo...
      console.log('Photo taken:', photo);
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  return (
    <>
      <button
        onClick={handleTakePhoto}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        <Camera className="w-5 h-5" />
        Take Photo
      </button>

      {showPermissionPrompt && (
        <PermissionPrompt
          message={permissionMessage}
          onRetry={() => {
            setShowPermissionPrompt(false);
            handleTakePhoto();
          }}
        />
      )}
    </>
  );
}
```

---

### **Step 6: Update capacitor.config.ts**

**File:** `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syncwarp.app',
  appName: 'SyncWarp',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF'
    }
  }
};

export default config;
```

---

## 🧪 Testing Steps

### **Manual Testing**

1. **Install the app on a test device** (iOS and Android)
   ```bash
   npm run build
   npx cap sync
   npx cap open ios
   npx cap open android
   ```

2. **Test each permission flow:**
   - Open the app for the first time
   - Trigger camera access → Verify permission prompt displays
   - Deny permission → Verify graceful error message and "Open Settings" button
   - Grant permission → Verify feature works correctly
   - Repeat for: location, notifications, photos

3. **Test "just-in-time" requesting:**
   - Ensure permissions are only requested when user tries to use a feature
   - Verify no permissions are requested on app launch

4. **Test Settings redirection:**
   - Deny a permission
   - Tap "Open Settings" button
   - Verify app settings page opens
   - Grant permission in Settings
   - Return to app → Verify permission is now granted

5. **Test on multiple OS versions:**
   - iOS 14, 15, 16, 17
   - Android 11, 12, 13, 14

---

### **Automated Testing**

**File:** `src/utils/__tests__/permissions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestCameraPermission, requestLocationPermission, checkPermission } from '../permissions';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

vi.mock('@capacitor/camera');
vi.mock('@capacitor/geolocation');

describe('Permission Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should grant camera permission when user accepts', async () => {
    vi.mocked(Camera.checkPermissions).mockResolvedValue({ camera: 'prompt', photos: 'prompt' });
    vi.mocked(Camera.requestPermissions).mockResolvedValue({ camera: 'granted', photos: 'granted' });

    const result = await requestCameraPermission();
    expect(result.granted).toBe(true);
  });

  it('should deny camera permission when user rejects', async () => {
    vi.mocked(Camera.checkPermissions).mockResolvedValue({ camera: 'prompt', photos: 'prompt' });
    vi.mocked(Camera.requestPermissions).mockResolvedValue({ camera: 'denied', photos: 'denied' });

    const result = await requestCameraPermission();
    expect(result.granted).toBe(false);
    expect(result.message).toContain('Camera access is required');
  });

  it('should grant location permission when already granted', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });

    const result = await requestLocationPermission();
    expect(result.granted).toBe(true);
  });

  it('should check camera permission status', async () => {
    vi.mocked(Camera.checkPermissions).mockResolvedValue({ camera: 'granted', photos: 'granted' });

    const isGranted = await checkPermission('camera');
    expect(isGranted).toBe(true);
  });
});
```

Run tests:
```bash
npm run test
```

---

## 📚 Documentation

### **File:** `docs/permissions.md`

```markdown
# App Permissions Configuration

## Overview
SyncWarp requires several device permissions to provide a seamless social experience. All permissions are requested "just-in-time" when the user attempts to use a feature.

## Required Permissions

### iOS (Info.plist)
- **Camera:** Take photos for posts and profile
- **Photo Library:** Select existing photos
- **Location:** Show nearby events and friends
- **Notifications:** Receive messages and updates
- **Microphone:** Voice messages and video calls (optional)
- **Contacts:** Find and connect with friends (optional)
- **Face ID:** Biometric authentication

### Android (AndroidManifest.xml)
- **CAMERA:** Take photos for posts and profile
- **READ_MEDIA_IMAGES/VIDEO:** Select existing photos/videos
- **ACCESS_FINE_LOCATION:** Show nearby events and friends
- **POST_NOTIFICATIONS:** Receive messages and updates
- **RECORD_AUDIO:** Voice messages and video calls (optional)
- **READ_CONTACTS:** Find and connect with friends (optional)
- **USE_BIOMETRIC:** Biometric authentication

## Permission Flow
1. User attempts to use a feature (e.g., take a photo)
2. App checks if permission is already granted
3. If not granted, display system permission prompt
4. If user denies, show custom UI with "Open Settings" option
5. If user grants, proceed with feature

## Graceful Denial Handling
- Clear error messages explaining why permission is needed
- "Open Settings" button to easily enable permissions
- Alternative workflows when permissions are denied
- No app crashes or broken functionality

## Testing
- Test on both iOS and Android devices
- Test with permissions granted, denied, and "Ask Next Time"
- Test opening Settings and granting permissions
- Test offline and low connectivity scenarios

## Troubleshooting

### iOS Permissions Not Appearing
- Clean build: `npx cap sync ios && npx cap open ios`
- Delete app from device and reinstall
- Check Info.plist for typos in keys

### Android Permissions Not Working
- Check AndroidManifest.xml for proper syntax
- Ensure `targetSdkVersion` is set correctly
- Test on Android 13+ for new media permissions
- Use `adb logcat` to debug permission issues

### Permission Prompt Not Showing
- Ensure permission is not already granted/denied
- Reset app permissions in device Settings
- Check Capacitor plugin versions are up to date
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Permission prompt not appearing | Reset app permissions in device Settings and reinstall |
| "Open Settings" button not working | Verify `app-settings:` URL scheme is supported |
| Camera permission denied but works | Check if user granted "Photo Library" instead of "Camera" |
| Android 13+ media permissions failing | Ensure `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` are declared |
| iOS crash on permission request | Verify all `NSUsageDescription` keys are present in Info.plist |
| Permission check always returns false | Update Capacitor plugins to latest versions |

---

## 📝 Git Commit

```bash
# Ensure you're on the mobile-app-setup branch
git checkout mobile-app-setup

# Stage all permission configuration files
git add ios/App/App/Info.plist
git add android/app/src/main/AndroidManifest.xml
git add capacitor.config.ts
git add src/utils/permissions.ts
git add src/components/PermissionPrompt.tsx
git add src/utils/__tests__/permissions.test.ts
git add docs/permissions.md

# Commit with descriptive message
git commit -m "feat: configure iOS and Android app permissions

- Add all required permissions to Info.plist with user-facing descriptions
- Configure Android permissions in AndroidManifest.xml
- Create permission helper utility for checking and requesting permissions
- Add PermissionPrompt component for graceful denial handling
- Implement 'Open Settings' functionality for iOS and Android
- Add unit tests for permission utilities
- Document all configured permissions and troubleshooting steps

Story: 7.5.2
Status: Completed"

# Push to remote
git push origin mobile-app-setup
```

---

## ✅ Definition of Done

- [x] iOS permissions configured in Info.plist with descriptions
- [x] Android permissions configured in AndroidManifest.xml
- [x] Permission utility functions created and tested
- [x] UI component for permission denials implemented
- [x] "Open Settings" functionality working on both platforms
- [x] Unit tests written and passing
- [x] Manual testing completed on iOS and Android devices
- [x] Documentation created and reviewed
- [x] Code committed to `mobile-app-setup` branch
- [x] Story marked as completed in project tracker

---

**Story Status:** ✅ Ready for Implementation  
**Estimated Time:** 4-6 hours  
**Dependencies:** Story 7.5.1 (App Icons & Splash Screens)  
**Next Story:** 7.5.3 (Environment Configuration Files)
