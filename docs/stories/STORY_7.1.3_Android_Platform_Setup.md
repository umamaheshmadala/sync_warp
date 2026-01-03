# Story 7.1.3: Android Platform Setup ⚪ PLANNED

**Epic**: EPIC 7.1 - Capacitor Setup & Mobile Platform Integration  
**Story Points**: 5  
**Estimated Time**: 2-3 hours  
**Dependencies**: Story 7.1.1 complete (Capacitor installed)

---

## 📋 Overview

**What**: Create native Android project and configure for development.

**Why**: Android platform needs its own native project structure (Gradle-based) to build and run on Android devices and emulators.

**User Value**: Enables Android app development and testing, accessible on Windows, Mac, and Linux.

---

## 🎯 Acceptance Criteria

- [x] `@capacitor/android` package installed
- [x] Android project created in `android/` folder
- [x] Android Studio can open project without errors
- [x] Application ID set to `com.syncapp.mobile`
- [x] App runs on Android emulator
- [x] Web content displays correctly in Android app
- [x] Changes committed to git

---

## ⚠️ Prerequisites

**Required**:
- **Android Studio**: Latest version (Flamingo or newer)
- **JDK**: Java Development Kit 11 or higher
- **Android SDK**: Installed via Android Studio
- **Disk Space**: At least 10 GB free

**Download Links**:
- Android Studio: https://developer.android.com/studio
- JDK: Bundled with Android Studio (recommended)

---

## 📝 Implementation Steps

### Step 1: Install Android Studio

**Download & Install**:
1. Visit https://developer.android.com/studio
2. Download Android Studio for Windows
3. Run installer (2-3 GB download)
4. Follow installation wizard
5. Choose "Standard" installation type
6. Install SDK components when prompted

**First Launch Setup**:
- SDK Manager will download required components
- Wait for completion (10-15 minutes)
- Note SDK location (e.g., `C:\Users\YourName\AppData\Local\Android\Sdk`)

**Acceptance**: ✅ Android Studio installed and launched

---

### Step 2: Configure Environment Variables

**Set ANDROID_HOME** (Windows):

```powershell
# Set for current session
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"

# Set permanently (restart terminal after)
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk", "User")

# Add to PATH
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

**Verify**:
```powershell
echo $env:ANDROID_HOME
# Should show: C:\Users\YourName\AppData\Local\Android\Sdk

adb --version
# Should show: Android Debug Bridge version...
```

**Acceptance**: ✅ Environment variables set correctly

---

### Step 3: Install Android Platform Package

**Terminal Command**:
```powershell
npm install @capacitor/android
```

**Verify Installation**:
```powershell
cat package.json | Select-String -Pattern "@capacitor/android"
```

**Expected in package.json**:
```json
{
  "dependencies": {
    "@capacitor/android": "^5.x.x"
  }
}
```

**Acceptance**: ✅ Android package installed

---

### Step 4: Add Android Platform

**Terminal Command**:
```powershell
npx cap add android
```

**Expected Output**:
```
✔ Creating android directory in 5-10 seconds...
✔ Adding native Android project in android/app...
✔ add in 8.32s
✔ Copying web assets from dist to android/app/src/main/assets/public in 892.45ms
✔ Creating capacitor.config.json in android/app/src/main/assets in 3.87ms
✔ copy android in 901.32ms
✔ Updating Android plugins in 5.43ms
✔ update android in 12.89ms
```

**What This Creates**:
```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/syncapp/mobile/
│   │       ├── res/
│   │       ├── assets/public/  ← Web files
│   │       └── AndroidManifest.xml
│   └── build.gradle  ← App-level config
├── gradle/
├── build.gradle  ← Project-level config
└── settings.gradle
```

**Acceptance**: ✅ `android/` folder created with Gradle project

---

### Step 5: Configure Android App Settings

**File to Edit**: `android/app/build.gradle`

**Verify Application ID** (should already be set):
```gradle
android {
    namespace "com.syncapp.mobile"
    
    defaultConfig {
        applicationId "com.syncapp.mobile"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0"
    }
}
```

**File to Edit**: `android/app/src/main/res/values/strings.xml`

**Update App Name**:
```xml
<resources>
    <string name="app_name">Sync App</string>
    <string name="title_activity_main">Sync App</string>
    <string name="package_name">com.syncapp.mobile</string>
    <string name="custom_url_scheme">syncapp</string>
</resources>
```

**Acceptance**: ✅ Application ID and name configured

---

### Step 6: Build and Sync Web Assets

**Terminal Commands**:
```powershell
# Build web app
npm run build

# Sync to Android
npx cap sync android
```

**Expected Output**:
```
✔ Copying web assets from dist to android/app/src/main/assets/public in 1.23s
✔ Creating capacitor.config.json in android/app/src/main/assets in 15.34ms
✔ copy android in 1.25s
✔ Updating Android plugins
✔ update android in 234.56ms
```

**Acceptance**: ✅ Web assets synced to Android project

---

### Step 7: Open Project in Android Studio

**Terminal Command**:
```powershell
npx cap open android
```

**Alternative**: Open Android Studio → Open → Select `android/` folder

**First Time Setup in Android Studio**:
1. **Gradle Sync**: Wait for automatic sync (2-5 minutes)
2. **SDK Components**: Install any prompted SDK versions
3. **Build Tools**: Install if prompted
4. **Trust Project**: Click "Trust Project" if asked

**Expected**: Project opens without errors in Android Studio

**Acceptance**: ✅ Android Studio opens project successfully

---

### Step 8: Create Android Emulator

**In Android Studio**:
1. Click **Device Manager** icon (phone icon in toolbar)
2. Click **Create Device** (+)
3. Select device: **Pixel 5** or **Pixel 6**
4. Click **Next**
5. Select system image: **API 33 (Android 13)** or newer
6. Click **Download** if not installed (wait ~1 GB download)
7. Click **Next**
8. Name: `Pixel_5_API_33`
9. Click **Finish**

**Verify**:
- Emulator appears in Device Manager
- Shows "Not Running"

**Acceptance**: ✅ Android emulator created

---

### Step 9: Run App on Emulator

**Option A: Via Android Studio (Recommended)**:
1. Select your emulator from device dropdown (top toolbar)
2. Click **Run** button (green triangle ▶️)
3. Wait for emulator to boot (2-4 minutes first time)
4. Wait for app to install and launch
5. App opens showing your web app

**Option B: Via Command Line**:
```powershell
npx cap run android
```

**Expected Result**:
- Emulator boots
- App installs
- App launches displaying your web content
- You can navigate through features

**Check Logcat** (in Android Studio):
- Bottom toolbar → Logcat
- Should see Capacitor initialization logs
- No red errors

**Acceptance**: ✅ App runs successfully on emulator

---

### Step 10: Verify App Functionality

**Test in Emulator**:
- [ ] App launches without crashes
- [ ] Home page loads correctly
- [ ] Navigation works (tap links)
- [ ] Images load properly
- [ ] Can scroll through content
- [ ] Keyboard works for text inputs
- [ ] Back button functions correctly
- [ ] No errors in Logcat

**Performance Check**:
- App is responsive
- Animations smooth
- No excessive memory usage

**Acceptance**: ✅ App functions correctly on Android

---

### Step 11: Test on Real Device (Optional)

**Prerequisites**:
- Android phone/tablet
- USB cable
- USB debugging enabled on device

**Enable USB Debugging on Device**:
1. Settings → About Phone
2. Tap "Build Number" 7 times (enables Developer Mode)
3. Settings → Developer Options
4. Enable "USB Debugging"
5. Connect device via USB
6. Accept debugging prompt on device

**Run on Device**:
1. Device appears in Android Studio device dropdown
2. Select device
3. Click Run (▶️)
4. App installs and launches on device

**Acceptance**: ✅ App runs on real device (if available)

---

### Step 12: Commit Android Platform

**Terminal Commands**:
```powershell
# Stage Android files
git add .

# Commit
git commit -m "feat: Add Android platform with Gradle project - Story 7.1.3

- Installed @capacitor/android package
- Created native Android project in android/ folder
- Configured application ID: com.syncapp.mobile
- Verified app runs on Android emulator
- Synced web assets to Android project

Epic: 7.1 - Capacitor Setup
Story: 7.1.3 - Android Platform Setup"

# Push to remote
git push origin mobile-app-setup
```

**Acceptance**: ✅ Android platform committed to git

---

## ✅ Verification Checklist

- [ ] Android Studio installed and working
- [ ] ANDROID_HOME environment variable set
- [ ] `adb --version` command works
- [ ] `@capacitor/android` in package.json dependencies
- [ ] `android/` folder exists with Gradle project
- [ ] Android Studio opens project without errors
- [ ] Application ID: `com.syncapp.mobile`
- [ ] App Name: `Sync App`
- [ ] Gradle sync completes successfully
- [ ] Android emulator created
- [ ] App builds without errors
- [ ] App runs on emulator
- [ ] Web content displays correctly
- [ ] Navigation works in Android app
- [ ] No crashes on launch
- [ ] Logcat shows normal Capacitor logs
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.1.3 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: "ANDROID_HOME not set"
**Solution**:
```powershell
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk", "User")
# Restart terminal
```

### Issue: "Gradle sync failed"
**Solution**:
```powershell
# In Android Studio:
# File → Invalidate Caches → Invalidate and Restart
# OR manually:
cd android
.\gradlew clean
cd ..
```

### Issue: "SDK not found"
**Solution**:
1. Android Studio → Tools → SDK Manager
2. Ensure API 33 is installed
3. Install any missing SDK tools
4. Retry Gradle sync

### Issue: Emulator won't start
**Solution**:
1. Check virtualization enabled in BIOS
2. Ensure Hyper-V disabled (Windows)
3. Try creating new emulator
4. Update Intel HAXM or AMD Hypervisor

### Issue: "Execution failed for task ':app:mergeDebugAssets'"
**Solution**:
```powershell
npm run build
npx cap copy android
npx cap sync android
```

### Issue: App shows white screen
**Solution**:
```powershell
# Check dist folder has files
dir dist

# Rebuild and sync
npm run build
npx cap sync android
```

---

## 📚 Additional Notes

### Android vs iOS Development
- ✅ **Windows**: Can develop Android (not iOS)
- ✅ **Mac**: Can develop both
- ✅ **Linux**: Can develop Android (not iOS)

### Emulator Performance
- **Hardware Acceleration**: Ensure enabled for speed
- **RAM**: Allocate 2-4 GB for emulator
- **Disk**: Emulators take 2-8 GB each

### What's Next?
After completing this story:
1. Story 7.1.4: Mobile Build Scripts
2. Story 7.1.5: Platform Detection
3. Both iOS and Android now ready for development

### File Structure After This Story
```
sync_warp/
├── android/                       ← NEW
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/syncapp/mobile/
│   │   │   ├── res/
│   │   │   ├── assets/public/   ← Web assets
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── gradle/
│   ├── build.gradle
│   └── settings.gradle
├── capacitor.config.ts
└── package.json                   ← UPDATED (@capacitor/android added)
```

---

## 🔗 Related Documentation

- [Capacitor Android Setup](https://capacitorjs.com/docs/android)
- [Android Studio Download](https://developer.android.com/studio)
- [Android Development Guide](https://capacitorjs.com/docs/android/configuration)
- [EPIC 7.1 Overview](../epics/EPIC_7.1_Capacitor_Setup.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.1.2_iOS_Platform_Setup.md](./STORY_7.1.2_iOS_Platform_Setup.md)  
**Next Story**: [STORY_7.1.4_Mobile_Build_Scripts.md](./STORY_7.1.4_Mobile_Build_Scripts.md)  
**Epic Progress**: Story 3/6 complete (33% → 50%)
