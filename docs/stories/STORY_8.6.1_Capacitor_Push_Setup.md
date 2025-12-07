# 📱 STORY 8.6.1: Capacitor Push Notifications Setup

**Parent Epic:** [EPIC 8.6 - Push Notifications & Real-time Updates](../epics/EPIC_8.6_Push_Notifications.md)  
**Story Owner:** Mobile Engineering  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Epic 8.1 (Database - user_push_tokens table exists)

---

## 🎯 **Story Goal**

Set up Capacitor Push Notifications with:

- FCM (Firebase Cloud Messaging) configuration for Android
- APNs (Apple Push Notification service) configuration for iOS
- Permission request flow
- Push token registration listener

---

## 📋 **Acceptance Criteria**

- [ ] FCM configured with `google-services.json` for Android
- [ ] APNs configured with certificates for iOS
- [ ] Push permission requested on app startup (post-login)
- [ ] Registration success/failure callbacks work
- [ ] Token obtained and logged to console

---

## 🧩 **Implementation Details**

### Task 1: Android FCM Configuration

#### 1.1 Add google-services.json

```bash
# Download from Firebase Console > Project Settings > Your App
# Place in: android/app/google-services.json
```

#### 1.2 Update android/build.gradle

```groovy
// android/build.gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

#### 1.3 Update android/app/build.gradle

```groovy
// android/app/build.gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.4.0'
}
```

---

### Task 2: iOS APNs Configuration

#### 2.1 Enable Push Notifications Capability

```bash
# In Xcode:
# 1. Open ios/App/App.xcworkspace
# 2. Select target > Signing & Capabilities
# 3. Click "+ Capability" > Add "Push Notifications"
# 4. Add "Background Modes" > Check "Remote notifications"
```

#### 2.2 Generate APNs Key (Firebase Console)

```bash
# Option A: APNs Auth Key (Recommended)
# 1. Apple Developer Portal > Certificates, Identifiers & Profiles
# 2. Keys > Create Key > Enable "Apple Push Notifications service (APNs)"
# 3. Download .p8 key file
# 4. Upload to Firebase Console > Project Settings > Cloud Messaging > iOS

# Option B: APNs Certificates
# Generate in Apple Developer Portal, export as .p12, upload to Firebase
```

#### 2.3 Update ios/App/App/AppDelegate.swift

```swift
import UIKit
import Capacitor
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Register for remote notifications
        UNUserNotificationCenter.current().delegate = self
        application.registerForRemoteNotifications()

        return true
    }

    // Handle token registration
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }
}

extension AppDelegate: UNUserNotificationCenterDelegate {
    // Show notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        NotificationCenter.default.post(name: Notification.Name("pushNotificationActionPerformed"), object: response)
        completionHandler()
    }
}
```

---

### Task 3: Initialize Push Service in React

#### 3.1 Create pushNotifications.ts

```typescript
// src/services/pushNotifications.ts
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

/**
 * Initialize push notifications
 * Call this after user login
 */
export async function initializePushNotifications(): Promise<string | null> {
  // Skip on web platform
  if (!Capacitor.isNativePlatform()) {
    console.log("[Push] Skipping - not a native platform");
    return null;
  }

  // Check current permission status
  const permStatus = await PushNotifications.checkPermissions();
  console.log("[Push] Current permission:", permStatus.receive);

  if (permStatus.receive === "prompt") {
    // Request permission
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== "granted") {
      console.warn("[Push] Permission denied");
      return null;
    }
  } else if (permStatus.receive !== "granted") {
    console.warn("[Push] Permission not granted:", permStatus.receive);
    return null;
  }

  // Register for push notifications
  await PushNotifications.register();

  // Set up listeners
  return new Promise((resolve) => {
    PushNotifications.addListener("registration", (token: Token) => {
      console.log("✅ [Push] Token received:", token.value);
      resolve(token.value);
    });

    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("❌ [Push] Registration error:", error);
      resolve(null);
    });
  });
}

/**
 * Set up notification listeners
 */
export async function setupNotificationListeners(
  onNotificationReceived: (notification: PushNotificationSchema) => void,
  onNotificationTapped: (action: ActionPerformed) => void
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Notification received while app is in foreground
  await PushNotifications.addListener(
    "pushNotificationReceived",
    onNotificationReceived
  );

  // User tapped on notification
  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    onNotificationTapped
  );
}

/**
 * Remove all listeners
 */
export async function cleanupPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await PushNotifications.removeAllListeners();
}
```

---

## 🔗 **MCP Integration**

### Supabase MCP - Verify Table Exists

```bash
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_push_tokens';"
```

### Context7 MCP - Analyze Best Practices

```bash
warp mcp run context7 "analyze Capacitor push notification setup for FCM and APNs best practices"
```

---

## 🧪 **Testing**

### Manual Testing Checklist

- [ ] Android: Build and run on physical device
  - [ ] Permission dialog appears
  - [ ] Token logged to console
- [ ] iOS: Build and run on physical device (simulator won't work for push)
  - [ ] Permission dialog appears
  - [ ] Token logged to console

---

## ✅ **Definition of Done**

- [ ] FCM google-services.json configured
- [ ] APNs capability enabled in Xcode
- [ ] Push permission request works on both platforms
- [ ] Token received and logged on registration
- [ ] No console errors during setup
- [ ] Documentation updated

---

**Next Story:** [STORY_8.6.2_Token_Management.md](./STORY_8.6.2_Token_Management.md)
