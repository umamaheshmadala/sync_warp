# Firebase Cloud Messaging Setup 🔥

## Overview

Complete guide for setting up Firebase Cloud Messaging (FCM) for Android push notifications in the SynC app.

---

## Current Status

✅ **Android build files are pre-configured!**
- `android/build.gradle` already has Google Services classpath
- `android/app/build.gradle` has smart conditional google-services.json detection
- Ready to add `google-services.json` and Firebase dependencies

---

## Step-by-Step Setup

### 1. Create Firebase Project

**URL**: https://console.firebase.google.com/

**Steps**:
1. Click **"Add project"** or **"Create a project"**
2. **Project name**: `sync-app` (or `SynC` or your preferred name)
3. **Project ID**: Will be auto-generated (e.g., `sync-app-abc123`)
4. ✅ **Enable Google Analytics**: Recommended (helps track notification engagement)
5. Select or create **Google Analytics account**
6. Click **"Create project"**
7. Wait ~30-60 seconds for project creation

**Result**: You now have a Firebase project!

---

### 2. Add Android App to Firebase

**In Firebase Console**:

1. On project overview page, click the **Android icon** (or "Add app" → Android)
2. **Android package name**: `com.syncapp.mobile`
   - ⚠️ **MUST MATCH** the `appId` in `capacitor.config.ts`
   - ⚠️ **MUST MATCH** `applicationId` in `android/app/build.gradle`
   - Our app uses: `com.syncapp.mobile`
3. **App nickname** (optional): `SynC Android` or `Sync App`
4. **Debug signing certificate SHA-1** (optional): Leave blank for now
   - Only needed for Google Sign-In or Dynamic Links
   - Can be added later if needed
5. Click **"Register app"**

**Result**: Android app is registered in Firebase!

---

### 3. Download google-services.json

**In Firebase Console**:

1. After registering the app, you'll see **"Download google-services.json"**
2. Click to download the file
3. **Save it** to a known location on your computer

**Place the file in the Android project**:

```powershell
# From your project root directory
# Copy the downloaded file to android/app/

Copy-Item "path\to\your\Downloads\google-services.json" "android\app\google-services.json"
```

**Verify correct placement**:
```
android/
  app/
    google-services.json  ← Must be here!
    src/
    build.gradle
```

**Important Notes**:
- ✅ `google-services.json` is **safe to commit** to git
- ✅ It contains only public configuration (no secrets)
- ✅ It's required for Firebase to work
- ⚠️ Package name in the file must match `com.syncapp.mobile`

---

### 4. Add Firebase Dependencies

**Edit**: `android/app/build.gradle`

**Add Firebase dependencies** to the `dependencies` section:

```gradle
dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
    
    // 🔥 Add these Firebase dependencies
    implementation platform('com.google.firebase:firebase-bom:33.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    implementation 'com.google.firebase:firebase-analytics'
}
```

**What each dependency does**:
- `firebase-bom`: Bill of Materials - manages Firebase versions
- `firebase-messaging`: FCM for push notifications
- `firebase-analytics`: (Optional) Track notification engagement

---

### 5. Sync and Build

**Option A: Using Android Studio** (Recommended)

1. Open `android/` folder in Android Studio
2. File → **Sync Project with Gradle Files**
3. Wait for sync to complete
4. Build → **Make Project**

**Option B: Command Line**

```powershell
cd android
./gradlew clean build
```

**Expected Result**:
- ✅ Build succeeds
- ✅ No errors about google-services.json
- ✅ Firebase dependencies downloaded

---

### 6. Get FCM Server Key

**In Firebase Console**:

1. Click **⚙️ Project Settings** (gear icon, top left)
2. Navigate to **"Cloud Messaging"** tab
3. Scroll down to **"Cloud Messaging API (Legacy)"** section
4. Copy the **"Server key"**
   - Format: `AAAAxxxxxxxx...` (long string)
   - This is your FCM server key!

**Store the Server Key Securely**:

**Option A: Local Development (.env file)**

```powershell
# Create or edit .env file in project root
echo "FCM_SERVER_KEY=AAAAyour-server-key-here" >> .env

# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

**Option B: Supabase Vault (Production - Recommended)**

1. Go to Supabase Dashboard
2. Navigate to **Project Settings** → **Vault**
3. Click **"New Secret"**
4. **Name**: `FCM_SERVER_KEY`
5. **Value**: `AAAAyour-server-key-here`
6. Save

**⚠️ SECURITY WARNING**:
- ❌ **NEVER** commit the FCM server key to git
- ❌ **NEVER** expose it in client-side code
- ✅ **ALWAYS** store in environment variables or Supabase Vault
- ✅ **USE** only in backend/edge functions

---

### 7. Test Token Registration

**Build and Deploy**:

```powershell
# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio and run
npx cap open android
```

**Or use direct run**:
```powershell
npx cap run android
```

**Testing Steps**:

1. **Launch app** on Android device or emulator
2. **Log in** with a test user
3. **Grant notification permission** when prompted
4. **Check Android Logcat** for:
   ```
   [PushNotifications] Registration success: f9K3x2L8...
   [usePushNotifications] Token registered: f9K3x2L8...
   ✅ Push notifications fully enabled
   ```

5. **Verify in Supabase**:
   ```sql
   SELECT * FROM push_tokens WHERE platform = 'android';
   ```
   Should see the new FCM token

**FCM Token Format**:
- Very long string (150+ characters)
- Starts with characters like `f9K`, `dL3`, `cN7`, etc.
- Example: `f9K3x2L8mP7qR5nT4vY8wZ1xC6bV3...`

---

### 8. Send Test Notification

**In Firebase Console**:

1. Navigate to **Engage** → **Cloud Messaging** (left sidebar)
2. Click **"Create your first campaign"** or **"New campaign"**
3. Select **"Firebase Notification messages"**
4. **Notification title**: `Test Notification`
5. **Notification text**: `This is a test from Firebase! 🔥`
6. Click **"Send test message"**
7. **Add FCM registration token**: 
   - Paste the token from Step 7 (from Logcat or Supabase)
   - Make sure there are no spaces
8. Click **"Test"**

**Expected Results**:

**If app is in foreground**:
- ✅ Console log: `[PushNotifications] Notification received`
- ✅ May not show system notification (foreground behavior)

**If app is in background/closed**:
- ✅ Notification appears in Android notification tray
- ✅ Clicking notification opens the app
- ✅ Console log: `[PushNotifications] Notification action performed`

---

## Configuration Summary

### Package Name
```
com.syncapp.mobile
```

### File Locations
```
android/
  app/
    google-services.json          ← Firebase config
    build.gradle                   ← Has Firebase dependencies
  build.gradle                     ← Has Google Services classpath
capacitor.config.ts               ← appId matches package name
```

### Firebase Dependencies (in android/app/build.gradle)
```gradle
implementation platform('com.google.firebase:firebase-bom:33.7.0')
implementation 'com.google.firebase:firebase-messaging'
implementation 'com.google.firebase:firebase-analytics'
```

### Build Configuration (already configured!)
```gradle
// android/build.gradle
classpath 'com.google.gms:google-services:4.4.2'

// android/app/build.gradle
// Auto-applies plugin when google-services.json exists
try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found")
}
```

---

## Troubleshooting

### Issue: "google-services.json not found"

**Symptoms**: Build warning or error about missing google-services.json

**Solutions**:
1. Verify file is at `android/app/google-services.json` (not `android/google-services.json`)
2. Check package name in file matches `com.syncapp.mobile`
3. Re-download from Firebase Console if needed
4. Run `npx cap sync android` after adding the file

---

### Issue: "Package name mismatch"

**Symptoms**: App doesn't register for push notifications

**Solutions**:
1. Check `capacitor.config.ts` → `appId: 'com.syncapp.mobile'`
2. Check `android/app/build.gradle` → `applicationId "com.syncapp.mobile"`
3. Check `google-services.json` → `package_name: "com.syncapp.mobile"`
4. All three MUST match exactly
5. If you change package name, re-download google-services.json from Firebase

---

### Issue: Gradle sync fails

**Symptoms**: Android Studio shows sync errors

**Solutions**:
1. File → **Invalidate Caches and Restart**
2. Clean build: `./gradlew clean build`
3. Check Firebase BOM version is compatible
4. Ensure `google-services.json` is valid JSON (open in text editor)
5. Update Android Studio to latest version

---

### Issue: Token not registering

**Symptoms**: No token in Logcat or Supabase

**Solutions**:
1. Check Firebase dependencies are added
2. Verify `google-services.json` is present
3. Check app has notification permission
4. Rebuild app: `npx cap sync android` → rebuild
5. Check Logcat for Firebase initialization errors:
   ```
   adb logcat | grep -i firebase
   ```

---

### Issue: Test notification not received

**Symptoms**: Sent from Firebase Console but doesn't appear

**Solutions**:
1. **Verify FCM token is correct**:
   - No spaces when pasting
   - Copy full token from Logcat or Supabase
2. **Check device has internet connection**
3. **Ensure app has notification permission** granted
4. **Check Firebase Console** → Cloud Messaging → "Notification delivery"
5. **Try with app in background** (foreground notifications may not show)
6. **Wait 1-2 minutes** (FCM has slight delay)

---

### Issue: Build error "Duplicate class found"

**Symptoms**: Build fails with duplicate class error

**Solutions**:
1. Check you're using Firebase BOM (manages versions)
2. Don't specify versions for individual Firebase libraries when using BOM
3. Clean build: `./gradlew clean`
4. Check for conflicting dependencies in `build.gradle`

---

## Security Best Practices

### ✅ Safe to Commit
- `google-services.json` - Contains only public config
- `android/build.gradle` - Build configuration
- `android/app/build.gradle` - Dependencies

### ❌ Never Commit
- FCM Server Key - Keep in `.env` or Supabase Vault
- `.env` file - Add to `.gitignore`
- Private keys or certificates

### 🔐 Server Key Usage
- **Only use in backend** (Supabase Edge Functions)
- **Never expose** in client-side code
- **Store securely** in Supabase Vault for production
- **Rotate regularly** if compromised

---

## Testing Checklist

- [ ] Firebase project created
- [ ] Android app added to Firebase
- [ ] `google-services.json` downloaded
- [ ] `google-services.json` placed at `android/app/google-services.json`
- [ ] Firebase dependencies added to `android/app/build.gradle`
- [ ] Gradle sync successful
- [ ] App builds without errors
- [ ] FCM server key obtained and stored securely
- [ ] App deployed to Android device
- [ ] User logged in
- [ ] Notification permission granted
- [ ] FCM token appears in Logcat
- [ ] Token saved to Supabase `push_tokens` table
- [ ] Test notification sent from Firebase Console
- [ ] Notification received on device

---

## Next Steps

### After Firebase Setup Complete

1. **Story 7.4.3**: Apple Push Notifications (iOS)
   - Similar setup for iOS devices
   - Requires Apple Developer account
   - Requires Mac with Xcode

2. **Story 7.4.4**: Supabase Edge Function
   - Backend notification sending
   - Uses FCM server key
   - Handles different notification types

### Optional Enhancements

- **Firebase Analytics**: Track notification open rates
- **Firebase Crashlytics**: Monitor app crashes
- **A/B Testing**: Test different notification messages
- **Remote Config**: Update notification behavior without app update

---

## Firebase Console Quick Links

- **Project Overview**: https://console.firebase.google.com/project/YOUR_PROJECT_ID
- **Cloud Messaging**: https://console.firebase.google.com/project/YOUR_PROJECT_ID/messaging
- **Project Settings**: https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings/general
- **Analytics**: https://console.firebase.google.com/project/YOUR_PROJECT_ID/analytics

(Replace `YOUR_PROJECT_ID` with your actual Firebase project ID)

---

## Related Documentation

- **Push Notifications Setup**: `PUSH_NOTIFICATIONS_SETUP.md`
- **Story 7.4.1**: Capacitor Push Plugin
- **Story 7.4.2**: Firebase Cloud Messaging (this document)
- **Firebase Documentation**: https://firebase.google.com/docs/cloud-messaging/android/client
- **Capacitor Push Guide**: https://capacitorjs.com/docs/guides/push-notifications-firebase

---

**Last Updated**: 2025-01-08  
**Version**: 1.0  
**Status**: Ready for implementation
