# 📱 Quick Android APK Build Guide

**Goal**: Install your app on your Android phone for testing

---

## ⚡ Quick Start (After Android Studio is Installed)

### 1. Build APK
```powershell
# Make sure you're in project folder
cd C:\Users\umama\Documents\GitHub\sync_warp

# Build web app
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 2. In Android Studio
1. Wait for Gradle sync to complete (2-5 minutes first time)
2. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for build (~2-3 minutes)
4. Click **locate** link in notification
5. APK file will open in File Explorer

### 3. Install on Phone

**Option A: USB Cable (Easiest)**
1. Connect phone via USB
2. Enable USB Debugging on phone:
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
3. In Android Studio: Click green **Run** button (▶️)
4. Select your phone from list
5. App installs automatically

**Option B: Transfer APK File**
1. Copy APK to phone (email, cloud, USB)
2. On phone: Tap APK file
3. Allow "Install from Unknown Sources" if prompted
4. Tap "Install"

---

## 🔄 Update App After Code Changes

```powershell
# 1. Rebuild web app
npm run build

# 2. Sync changes to Android
npx cap sync android

# 3. Rebuild APK in Android Studio
# Build → Build Bundle(s) / APK(s) → Build APK(s)

# 4. Reinstall on phone
# Run button or transfer new APK
```

---

## 🛠️ Android Studio Installation (One-Time)

### Download & Install
1. Visit: https://developer.android.com/studio
2. Download Android Studio for Windows (~1 GB)
3. Run installer
4. Choose **"Standard"** installation
5. Wait for SDK components to download (~10-15 minutes)
6. Restart computer after installation

### Verify Installation
```powershell
# Check if Android Studio is installed
Test-Path "C:\Program Files\Android\Android Studio"
# Should return: True

# Check SDK location
Test-Path "$env:LOCALAPPDATA\Android\Sdk"
# Should return: True
```

---

## 📂 APK Location

After building, APK is located at:
```
C:\Users\umama\Documents\GitHub\sync_warp\android\app\build\outputs\apk\debug\app-debug.apk
```

**File size**: ~50-100 MB

---

## 🧪 Testing Checklist

After installing APK on phone:

- [ ] App icon appears in app drawer
- [ ] App launches without crash
- [ ] Home screen loads correctly
- [ ] Can navigate between pages
- [ ] Images load properly
- [ ] Search works
- [ ] Login works (if implemented)
- [ ] Notifications work (if implemented)

---

## 🚨 Troubleshooting

### Issue: "Gradle sync failed"
**Solution:**
```powershell
cd android
.\gradlew clean
cd ..
npx cap sync android
```

### Issue: "SDK not found"
**Solution:**
1. Open Android Studio
2. Tools → SDK Manager
3. Install Android 13 (API 33) or newer
4. Click Apply

### Issue: "Can't find APK after build"
**Solution:**
Navigate to:
```powershell
cd android\app\build\outputs\apk\debug
dir
# Look for: app-debug.apk
```

### Issue: Phone not detected
**Solution:**
1. Enable USB Debugging on phone
2. Change USB mode to "File Transfer" (not just charging)
3. Check cable is data cable (not just power)
4. Run: `adb devices` to list connected devices

---

## 💡 Pro Tips

1. **Keep Android Studio Open**: Easier for quick rebuilds
2. **Use USB Debugging**: Faster than transferring APK files
3. **Build Release APK for Production**:
   ```
   Build → Generate Signed Bundle / APK → APK → Release
   ```
4. **Check Logcat**: View app logs in Android Studio (bottom toolbar)
5. **Hot Reload on Device**: Use `npm run dev` and access via browser on phone for quick UI testing

---

## 📊 Build Time Estimates

| Task | First Time | Subsequent |
|------|-----------|-----------|
| Android Studio Install | 30-45 min | N/A |
| Gradle Sync | 5-10 min | 1-2 min |
| Build APK | 3-5 min | 1-2 min |
| Install on Phone | 1-2 min | 30 sec |
| **Total** | **40-60 min** | **3-5 min** |

---

## 🔗 Helpful Commands

```powershell
# Check project status
npx cap ls

# Sync without building
npx cap copy android

# Full rebuild
npm run build && npx cap sync android

# Check Android devices
adb devices

# Install APK via command line
adb install android\app\build\outputs\apk\debug\app-debug.apk

# Uninstall app
adb uninstall com.syncapp.mobile

# View logs
adb logcat
```

---

## 🎯 Next Steps

After successful APK installation:
1. ✅ Test all features on real device
2. ⏭️ Implement Story 7.2.1: Secure Storage Setup
3. ⏭️ Implement Story 7.2.2: PKCE Auth Flow
4. ⏭️ Implement Story 7.2.3-7.2.5: Push Notifications

---

**Last Updated**: Story 7.1.3  
**Platform**: Android  
**Build Type**: Debug APK (for testing)
