# Story 7.4.2: Firebase Cloud Messaging Setup (Android) ✅ COMPLETE

**Epic**: EPIC 7.4 - Push Notifications Infrastructure  
**Story Points**: 5  
**Estimated Time**: 3-4 hours  
**Dependencies**: Story 7.4.1 complete (Capacitor Push Plugin)

---

## 📋 Overview

**What**: Create Firebase project and configure Firebase Cloud Messaging (FCM) for Android to enable push notification delivery to Android devices.

**Why**: Android push notifications require Firebase Cloud Messaging. FCM acts as the delivery service between your backend and Android devices, handling message routing, queuing, and delivery.

**User Value**: Android users can receive real-time push notifications about reviews, offers, and business updates directly on their devices.

---

## 🎯 Acceptance Criteria

- [x] Firebase project created
- [x] Android app added to Firebase
- [x] google-services.json downloaded and placed
- [x] Android project configured with FCM
- [x] FCM server key obtained
- [x] Test notification sent to Android device
- [x] Token registration verified
- [x] Documentation created
- [x] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Create Firebase Project

**Navigate to**: https://console.firebase.google.com/

**Steps**:
1. Click "Add project"
2. **Project name**: `sync-app` (or your app name)
3. ✅ Enable Google Analytics (recommended)
4. Select Analytics account or create new
5. Click "Create project"
6. Wait for project to be created (~30 seconds)

**Acceptance**: ✅ Firebase project created

---

### Step 2: Add Android App to Firebase

**In Firebase Console**:

1. Click "Add app" → Select Android icon
2. **Android package name**: `com.sync.app` (must match capacitor.config.ts appId)
3. **App nickname**: `SynC Android`
4. **Debug signing certificate** (optional for now, skip)
5. Click "Register app"

**Acceptance**: ✅ Android app registered

---

### Step 3: Download google-services.json

**In Firebase Console**:

1. After registering app, click "Download google-services.json"
2. Save file to your computer

**Place file in Android project**:
```powershell
# Copy google-services.json to Android app directory
Copy-Item "path\to\downloaded\google-services.json" "android\app\google-services.json"
```

**Verify placement**:
```
android/
  app/
    google-services.json  ← Should be here
    src/
    build.gradle
```

**Acceptance**: ✅ google-services.json placed correctly

---

### Step 4: Configure Android Build Files

**File to Edit**: `android/build.gradle` (project-level)

**Add Google services classpath**:
```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.0.0'
        classpath 'com.google.gms:google-services:4.4.0'  // Add this line
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

**File to Edit**: `android/app/build.gradle` (app-level)

**Apply Google services plugin** (add at the bottom):
```gradle
apply plugin: 'com.android.application'
// ... existing config ...

// Add this at the very bottom of the file
apply plugin: 'com.google.gms.google-services'
```

**Also add Firebase dependencies** (in dependencies section):
```gradle
dependencies {
    // ... existing dependencies ...
    
    // Firebase dependencies
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

**Sync Gradle**:
```powershell
# In Android Studio: File → Sync Project with Gradle Files
# Or via command line:
cd android
./gradlew clean build
```

**Acceptance**: ✅ Android configured with FCM

---

### Step 5: Get FCM Server Key

**In Firebase Console**:

1. Go to **Project Settings** (gear icon)
2. Navigate to **Cloud Messaging** tab
3. Scroll to **Cloud Messaging API (Legacy)**
4. Copy **Server key**

**Save Server Key Securely**:
```powershell
# Create .env file (if not exists)
echo "FCM_SERVER_KEY=your-server-key-here" >> .env

# Add to .gitignore to keep secret
echo ".env" >> .gitignore
```

**Alternatively, store in Supabase Secrets** (recommended):
- Supabase Dashboard → Project Settings → Vault
- Add secret: `FCM_SERVER_KEY` = `your-server-key`

**Acceptance**: ✅ FCM server key obtained and stored

---

### Step 6: Test FCM Token Registration

**Build and run app**:
```powershell
npm run build
npx cap sync android
npm run mobile:android
```

**Test Steps**:
1. Open app on Android device/emulator
2. Log in as a user
3. Grant push notification permission
4. Check Logcat for: `[PushNotifications] Registration success: <FCM_TOKEN>`
5. Verify token in Supabase push_tokens table
6. ✅ Token should start with something like `f9K...` (FCM tokens are long)

**Check in Firebase Console**:
- Go to **Cloud Messaging**
- Select your app
- Should see 1 device registered

**Acceptance**: ✅ Token registration working

---

### Step 7: Send Test Notification via Firebase Console

**In Firebase Console**:

1. Navigate to **Cloud Messaging**
2. Click **Send your first message**
3. **Notification title**: `Test Notification`
4. **Notification text**: `This is a test from Firebase!`
5. Click **Send test message**
6. **Add FCM registration token**: (paste token from Step 6)
7. Click **Test**

**Expected Result**:
- ✅ Notification appears on Android device
- ✅ App logs show notification received
- If app is in foreground: notification logged in console
- If app is in background: notification appears in system tray

**Acceptance**: ✅ Test notification received

---

### Step 8: Create Firebase Configuration Documentation

**Create new file**: `docs/FIREBASE_SETUP.md`

```markdown
# Firebase Cloud Messaging Setup 🔥

## Overview

Firebase Cloud Messaging (FCM) configuration for Android push notifications.

---

## Firebase Project

- **Project Name**: sync-app
- **Project ID**: sync-app-xxxxx
- **Console**: https://console.firebase.google.com/project/sync-app-xxxxx

---

## Android App Configuration

### Package Name
```
com.sync.app
```

### google-services.json Location
```
android/app/google-services.json
```

### Build Configuration

**android/build.gradle**:
```gradle
classpath 'com.google.gms:google-services:4.4.0'
```

**android/app/build.gradle**:
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

---

## FCM Server Key

**Location**: Firebase Console → Project Settings → Cloud Messaging

**Storage**: 
- Development: `.env` file (not committed)
- Production: Supabase Vault secrets

**Usage**: Required for sending notifications from Supabase Edge Functions

---

## Testing

### Verify Token Registration
1. Build and run Android app
2. Grant notification permission
3. Check Logcat for FCM token
4. Verify token in push_tokens table

### Send Test Notification
1. Firebase Console → Cloud Messaging
2. Send test message
3. Add FCM registration token
4. Verify notification appears on device

---

## Token Format

FCM tokens look like:
```
f9K3x2L8...very-long-string...9mP7
```

Stored in `push_tokens` table:
```sql
{
  user_id: 'uuid',
  token: 'f9K3x2L8...',
  platform: 'android',
  device_name: 'android device'
}
```

---

## Troubleshooting

### google-services.json not found
**Solution**:
- Verify file at `android/app/google-services.json`
- Check package name matches capacitor.config.ts
- Re-download from Firebase Console if needed

### Token not registering
**Solution**:
- Check Firebase dependencies in build.gradle
- Verify google-services plugin applied
- Sync Gradle files
- Rebuild app

### Test notification not received
**Solution**:
- Verify FCM token is correct
- Check device has internet connection
- Ensure app has notification permission
- Check Firebase Console for delivery status

### Build errors
**Solution**:
- Sync Gradle: File → Sync Project with Gradle Files
- Clean build: `./gradlew clean build`
- Check Firebase BOM version compatibility
- Verify google-services.json is valid JSON

---

## Security Notes

- ✅ google-services.json is safe to commit (contains only public config)
- ❌ FCM Server Key must NEVER be committed
- ✅ Store FCM Server Key in Supabase Vault
- ✅ Use environment variables for local development

---

## Related

- **Story 7.4.1**: Capacitor Push Plugin
- **Story 7.4.3**: Apple Push Notifications (iOS)
- **Story 7.4.4**: Supabase Edge Function for sending
```

**Save as**: `docs/FIREBASE_SETUP.md`

**Acceptance**: ✅ Documentation created

---

### Step 9: Commit Firebase Configuration

**Terminal Commands**:
```powershell
git add android/app/google-services.json
git add android/build.gradle
git add android/app/build.gradle
git add docs/FIREBASE_SETUP.md

git commit -m "feat: Configure Firebase Cloud Messaging for Android - Story 7.4.2

- Created Firebase project for SynC app
- Added Android app to Firebase
- Configured google-services.json
- Added Firebase dependencies to Android build
- Obtained and stored FCM server key
- Tested token registration on Android
- Verified test notification delivery
- Created Firebase setup documentation

Changes:
- android/app/google-services.json: Firebase configuration
- android/build.gradle: Added Google services classpath
- android/app/build.gradle: Firebase dependencies and plugin
- docs/FIREBASE_SETUP.md: Setup documentation

Epic: 7.4 - Push Notifications Infrastructure
Story: 7.4.2 - Firebase Cloud Messaging Setup (Android)

Features:
- FCM token registration
- Android push notification delivery
- Firebase Console integration
- Test notification capability"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] Firebase project created
- [ ] Android app registered in Firebase
- [ ] google-services.json downloaded and placed
- [ ] Android build.gradle configured
- [ ] Firebase dependencies added
- [ ] FCM server key obtained and stored
- [ ] Token registration verified
- [ ] Test notification sent successfully
- [ ] Notification received on Android device
- [ ] Documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.4.2 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: google-services.json not found
**Solution**:
- Verify file location: `android/app/google-services.json`
- Ensure package name matches exactly
- Re-download from Firebase if corrupted

### Issue: Gradle sync fails
**Solution**:
- Update to latest Gradle version
- Check Firebase BOM version compatibility
- Clean and rebuild: `./gradlew clean build`

### Issue: Token not generated
**Solution**:
- Verify google-services plugin applied at end of app/build.gradle
- Check Firebase dependencies correct
- Rebuild app completely
- Check Logcat for Firebase initialization errors

### Issue: Can't send test notification
**Solution**:
- Verify FCM token copied correctly (no spaces)
- Check device has internet
- Ensure app is running or in background
- Check Firebase Console for error messages

---

## 📚 Additional Notes

### What We Built
- ✅ Firebase project setup
- ✅ Android FCM integration
- ✅ Token registration system
- ✅ Test notification capability

### Firebase Console Features
- **Cloud Messaging**: Send test notifications
- **Analytics**: Track notification open rates
- **Crashlytics**: Monitor app stability (optional)

### What's Next
- **Story 7.4.3**: Apple Push Notifications (iOS setup)
- **Story 7.4.4**: Supabase Edge Function to send notifications programmatically

---

## 🔗 Related Documentation

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Firebase](https://capacitorjs.com/docs/guides/push-notifications-firebase)
- [EPIC 7.4 Overview](../epics/EPIC_7.4_Push_Notifications.md)

---

**Story Status**: ✅ COMPLETE (Completed: November 8, 2025)
**Previous Story**: [STORY_7.4.1_Capacitor_Push_Plugin.md](./STORY_7.4.1_Capacitor_Push_Plugin.md)  
**Next Story**: [STORY_7.4.3_Apple_Push_Notifications.md](./STORY_7.4.3_Apple_Push_Notifications.md)  
**Epic Progress**: Story 2/6 complete (33%)
