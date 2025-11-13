# Firebase Cloud Messaging - Implementation Checklist

## Story 7.4.2: Firebase Cloud Messaging Setup

This checklist guides you through the manual steps required to complete Firebase setup for Android push notifications.

---

## ✅ Pre-Setup (Already Complete)

- [x] Capacitor push notifications plugin installed
- [x] Android build files configured with Google Services classpath
- [x] Smart conditional google-services.json detection implemented
- [x] Firebase dependencies added to build.gradle
- [x] Documentation created

---

## 🔥 Firebase Console Steps (Manual)

### Step 1: Create Firebase Project

**URL**: https://console.firebase.google.com/

- [ ] Logged into Firebase Console with Google account
- [ ] Clicked "Add project" or "Create a project"
- [ ] Entered project name: `sync-app` (or your preference)
- [ ] Enabled Google Analytics (recommended)
- [ ] Selected or created Google Analytics account
- [ ] Clicked "Create project"
- [ ] Waited for project creation (~30-60 seconds)
- [ ] Noted Firebase Project ID: `________________`

---

### Step 2: Add Android App to Firebase

**In your Firebase project**:

- [ ] Clicked Android icon or "Add app" → Android
- [ ] Entered package name: `com.syncapp.mobile` (MUST MATCH EXACTLY)
- [ ] Entered app nickname: `SynC Android`
- [ ] Skipped debug signing certificate (optional for now)
- [ ] Clicked "Register app"
- [ ] Android app now shows in project overview

---

### Step 3: Download and Place google-services.json

- [ ] Downloaded `google-services.json` from Firebase Console
- [ ] Saved file to known location

**Place file in project**:

```powershell
# Replace path\to\Downloads with your actual download location
Copy-Item "path\to\Downloads\google-services.json" "android\app\google-services.json"
```

- [ ] File placed at `android/app/google-services.json`
- [ ] Verified package_name in file is `com.syncapp.mobile`
- [ ] File is valid JSON (no corruption)

---

### Step 4: Get FCM Server Key

**In Firebase Console**:

- [ ] Clicked ⚙️ Project Settings
- [ ] Navigated to "Cloud Messaging" tab
- [ ] Scrolled to "Cloud Messaging API (Legacy)" section
- [ ] Copied Server key (starts with `AAAA...`)

**Store server key securely**:

**Option A: Local .env file**
```powershell
echo "FCM_SERVER_KEY=YOUR_KEY_HERE" >> .env
```
- [ ] Created/updated .env file with FCM_SERVER_KEY
- [ ] Verified .env is in .gitignore

**Option B: Supabase Vault** (Recommended for production)
- [ ] Logged into Supabase Dashboard
- [ ] Went to Project Settings → Vault
- [ ] Created secret: `FCM_SERVER_KEY`
- [ ] Pasted server key as value
- [ ] Saved secret

---

## 🔧 Build and Test

### Step 5: Sync and Build

**Run from project root**:

```powershell
# Sync Capacitor
npx cap sync android
```

- [ ] Ran `npx cap sync android`
- [ ] No errors during sync
- [ ] Firebase dependencies downloaded

**Open in Android Studio**:

```powershell
npx cap open android
```

- [ ] Opened project in Android Studio
- [ ] File → Sync Project with Gradle Files
- [ ] Gradle sync completed successfully
- [ ] No build errors
- [ ] Firebase initialization logs visible

---

### Step 6: Test Token Registration

**Deploy to Android device/emulator**:

- [ ] Built and ran app on Android device
- [ ] App launches successfully
- [ ] Logged in with test user
- [ ] Notification permission prompt appeared
- [ ] Granted notification permission

**Check Logcat for token**:

- [ ] Opened Android Studio Logcat
- [ ] Filtered for "PushNotifications" or "usePushNotifications"
- [ ] Saw log: `[PushNotifications] Registration success: <FCM_TOKEN>`
- [ ] Saw log: `✅ Push notifications fully enabled`
- [ ] Copied FCM token from Logcat

**Token format check**:
- FCM Token: `_________________________________`
- [ ] Token is 150+ characters long
- [ ] Token starts with characters like `f9K`, `dL3`, `cN7`, etc.

**Verify in Supabase**:

```sql
SELECT * FROM push_tokens WHERE platform = 'android';
```

- [ ] Queried push_tokens table
- [ ] Found new entry with platform='android'
- [ ] Token matches token from Logcat
- [ ] user_id matches test user

---

### Step 7: Send Test Notification

**In Firebase Console**:

- [ ] Navigated to Engage → Cloud Messaging
- [ ] Clicked "Create your first campaign" or "New campaign"
- [ ] Selected "Firebase Notification messages"
- [ ] Entered notification title: `Test Notification`
- [ ] Entered notification text: `This is a test from Firebase! 🔥`
- [ ] Clicked "Send test message"
- [ ] Pasted FCM token from Step 6 (no spaces!)
- [ ] Clicked "Test"

**Verify notification received**:

**App in foreground**:
- [ ] Saw console log: `[PushNotifications] Notification received`
- [ ] Foreground notification handling working

**App in background**:
- [ ] Put app in background
- [ ] Sent another test notification
- [ ] Notification appeared in Android notification tray
- [ ] Clicked notification
- [ ] App opened successfully
- [ ] Saw log: `[PushNotifications] Notification action performed`

---

## 📝 Documentation

### Step 8: Update Project Documentation

- [ ] Reviewed `docs/FIREBASE_SETUP.md`
- [ ] Noted Firebase Project ID in documentation
- [ ] Updated any project-specific configuration

**Optional: Add to project README**:
- [ ] Added Firebase setup section to main README
- [ ] Linked to FIREBASE_SETUP.md
- [ ] Documented FCM server key location (Supabase Vault)

---

## 🎯 Commit Changes

### Step 9: Commit to Git

**Files to commit**:

```powershell
git add android/app/google-services.json
git add android/app/build.gradle
git add docs/FIREBASE_SETUP.md
git add FIREBASE_IMPLEMENTATION_CHECKLIST.md
```

- [ ] Staged all Firebase configuration files
- [ ] google-services.json included (safe to commit)
- [ ] FCM server key NOT included (kept secure)

**Commit message**:

```powershell
git commit -m "feat: Configure Firebase Cloud Messaging for Android - Story 7.4.2

- Added Firebase project configuration
- Placed google-services.json for Android app
- Added Firebase dependencies to build.gradle
- Obtained and stored FCM server key in Supabase Vault
- Tested token registration on Android device
- Verified test notification delivery
- Created comprehensive documentation

Changes:
- android/app/google-services.json: Firebase config file
- android/app/build.gradle: Firebase dependencies
- docs/FIREBASE_SETUP.md: Setup guide
- FIREBASE_IMPLEMENTATION_CHECKLIST.md: Implementation checklist

Story: 7.4.2 - Firebase Cloud Messaging
Epic: 7.4 - Push Notifications Infrastructure"
```

- [ ] Committed changes with descriptive message
- [ ] Pushed to remote: `git push origin mobile-app-setup`

---

## ✅ Story 7.4.2 Acceptance Criteria

- [ ] Firebase project created
- [ ] Android app added to Firebase
- [ ] google-services.json downloaded and placed
- [ ] Android project configured with FCM
- [ ] FCM server key obtained
- [ ] Test notification sent to Android device
- [ ] Token registration verified
- [ ] Documentation created
- [ ] Changes committed to git

**All checked?** ✅ **Story 7.4.2 is COMPLETE!**

---

## 🚀 Next Steps

After completing this story:

1. **Story 7.4.3**: Apple Push Notifications (iOS)
   - Requires Apple Developer account ($99/year)
   - Requires Mac with Xcode
   - Similar process but for iOS devices

2. **Story 7.4.4**: Supabase Edge Function
   - Backend notification sending
   - Uses FCM server key from Supabase Vault
   - Handles different notification types
   - Batch sending to multiple devices

---

## 🆘 Need Help?

### Common Issues

**Can't access Firebase Console**:
- Ensure you're logged in with correct Google account
- Check internet connection
- Try incognito/private browsing

**Package name mismatch**:
- Check `capacitor.config.ts` → `appId`
- Check `android/app/build.gradle` → `applicationId`
- Both must be `com.syncapp.mobile`
- Re-download google-services.json if you change package name

**Build errors after adding google-services.json**:
- Sync Gradle: File → Sync Project with Gradle Files
- Clean build: `./gradlew clean build`
- Invalidate caches: File → Invalidate Caches and Restart

**Token not registering**:
- Check Firebase dependencies in build.gradle
- Verify google-services.json is valid JSON
- Check Logcat for Firebase errors
- Rebuild app completely

**Test notification not received**:
- Verify token is copied correctly (no spaces)
- Check device has internet connection
- Ensure notification permission granted
- Try with app in background
- Wait 1-2 minutes (FCM has slight delay)

### Documentation

- **Firebase Setup Guide**: `docs/FIREBASE_SETUP.md`
- **Push Notifications Setup**: `docs/PUSH_NOTIFICATIONS_SETUP.md`
- **Firebase Documentation**: https://firebase.google.com/docs/cloud-messaging
- **Capacitor Firebase Guide**: https://capacitorjs.com/docs/guides/push-notifications-firebase

---

**Implementation Date**: ___/___/_____  
**Implementer**: ________________  
**Time Spent**: _____ hours  
**Status**: [ ] In Progress  [ ] Complete  [ ] Blocked

**Notes**:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
