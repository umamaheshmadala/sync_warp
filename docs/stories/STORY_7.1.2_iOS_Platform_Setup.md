# Story 7.1.2: iOS Platform Setup ⚪ PLANNED

**Epic**: EPIC 7.1 - Capacitor Setup & Mobile Platform Integration  
**Story Points**: 5  
**Estimated Time**: 2-3 hours  
**Dependencies**: Story 7.1.1 complete (Capacitor installed)

---

## 📋 Overview

**What**: Create native iOS project and configure for development.

**Why**: iOS platform needs its own native project structure (Xcode workspace) to build and run on iPhone/iPad devices.

**User Value**: Enables iOS app development and testing on Apple devices.

---

## 🎯 Acceptance Criteria

- [x] `@capacitor/ios` package installed
- [x] iOS project created in `ios/` folder
- [x] Xcode can open project without errors
- [x] Bundle ID set to `com.syncapp.mobile`
- [x] App runs on iOS simulator
- [x] Web content displays correctly in iOS app
- [x] Changes committed to git

---

## ⚠️ Prerequisites

**Required**:
- Mac computer with macOS 11 (Big Sur) or higher
- Xcode 13 or higher installed from App Store
- Command Line Tools for Xcode installed

**If on Windows**:
- ⚠️ Cannot develop iOS locally
- Options: Use Mac, cloud Mac service (MacStadium), or skip iOS for now
- Android development works fine on Windows

---

## 📝 Implementation Steps

### Step 1: Verify Xcode Installation (Mac only)

**Terminal Command**:
```bash
xcode-select --version
```

**Expected Output**:
```
xcode-select version 2395 or higher
```

**If Not Installed**:
```bash
# Install Xcode from App Store (5+ GB, takes time)
# Then install Command Line Tools:
xcode-select --install
```

**Acceptance**: ✅ Xcode and CLI tools installed

---

### Step 2: Install iOS Platform Package

**Terminal Command**:
```powershell
npm install @capacitor/ios
```

**Verify Installation**:
```powershell
cat package.json | Select-String -Pattern "@capacitor/ios"
```

**Expected in package.json**:
```json
{
  "dependencies": {
    "@capacitor/ios": "^5.x.x"
  }
}
```

**Acceptance**: ✅ iOS package installed

---

### Step 3: Add iOS Platform

**Terminal Command**:
```bash
npx cap add ios
```

**Expected Output**:
```
✔ Creating ios directory in 5-10 seconds...
✔ Adding native Xcode project in ios/App...
✔ add in 12.45s
✔ Copying web assets from dist to ios/App/App/public in 1.23s
✔ Creating capacitor.config.json in ios/App/App in 25.30ms
✔ copy ios in 1.26s
✔ Updating iOS plugins in 2.12ms
✔ update ios in 14.71ms
```

**What This Creates**:
```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   ├── Info.plist
│   │   ├── Assets.xcassets/
│   │   └── ...
│   ├── App.xcodeproj/
│   ├── App.xcworkspace/  ← Open this in Xcode
│   └── Podfile
└── ...
```

**Acceptance**: ✅ `ios/` folder created with Xcode project

---

### Step 4: Configure iOS App Settings

**File to Edit**: `ios/App/App/Info.plist`

**Verify/Update Display Name**:
```xml
<key>CFBundleDisplayName</key>
<string>Sync App</string>
```

**Set Bundle Identifier** (via Xcode):
1. Open Xcode: `npx cap open ios`
2. Select "App" project in left sidebar
3. Select "App" target
4. Go to "General" tab
5. Set **Bundle Identifier**: `com.syncapp.mobile`
6. Set **Display Name**: `Sync App`
7. Set **Version**: `1.0.0`
8. Set **Build**: `1`

**Acceptance**: ✅ Bundle ID and display name configured

---

### Step 5: Configure iOS Capabilities

**In Xcode General Tab**:
- **Deployment Info**:
  - Deployment Target: iOS 13.0 or higher
  - Device Orientation: Portrait, Landscape Left, Landscape Right
  - Status Bar Style: Default

**Save Changes**: Cmd+S

**Acceptance**: ✅ Basic capabilities configured

---

### Step 6: Build and Sync Web Assets

**Terminal Command**:
```bash
# Build web app
npm run build

# Sync to iOS
npx cap sync ios
```

**Expected Output**:
```
✔ Copying web assets from dist to ios/App/App/public in 1.50s
✔ Creating capacitor.config.json in ios/App/App in 19.45ms
✔ copy ios in 1.53s
✔ Updating iOS plugins
✔ Updating iOS native dependencies with "pod install"
✔ update ios in 45.23s
```

**Acceptance**: ✅ Web assets synced to iOS project

---

### Step 7: Run App on iOS Simulator

**Option A: Via Xcode (Recommended)**:
1. Open Xcode: `npx cap open ios`
2. Select simulator from top bar (e.g., "iPhone 14 Pro")
3. Click Run button (▶️) or press Cmd+R
4. Wait for simulator to boot (2-3 minutes first time)
5. App launches in simulator

**Option B: Via Command Line**:
```bash
npx cap run ios
```

**Expected Result**:
- Simulator opens
- App installs
- App launches showing your web app
- You can navigate through features

**Acceptance**: ✅ App runs successfully on simulator

---

### Step 8: Verify App Functionality

**Test in Simulator**:
- [ ] App launches without crashes
- [ ] Home page loads correctly
- [ ] Navigation works (tap links)
- [ ] Images load properly
- [ ] Can scroll through content
- [ ] No JavaScript console errors

**Check Xcode Console**:
- Should see Capacitor logs
- No red error messages
- Normal startup sequence

**Acceptance**: ✅ App functions correctly on iOS

---

### Step 9: Test on Real Device (Optional)

**Prerequisites**:
- iPhone/iPad with USB cable
- Apple ID configured in Xcode

**Steps**:
1. Connect device via USB
2. Trust computer on device
3. In Xcode, select your device from dropdown
4. Select "App" target → "Signing & Capabilities"
5. Select your Team (Apple ID)
6. Enable "Automatically manage signing"
7. Click Run (▶️)
8. On device: Settings → General → Device Management → Trust developer

**Acceptance**: ✅ App runs on real device (if available)

---

### Step 10: Commit iOS Platform

**Terminal Commands**:
```bash
# Stage iOS files
git add .

# Commit
git commit -m "feat: Add iOS platform with Xcode project - Story 7.1.2

- Installed @capacitor/ios package
- Created native iOS project in ios/ folder
- Configured bundle ID: com.syncapp.mobile
- Verified app runs on iOS simulator
- Synced web assets to iOS project

Epic: 7.1 - Capacitor Setup
Story: 7.1.2 - iOS Platform Setup"

# Push to remote
git push origin mobile-app-setup
```

**Acceptance**: ✅ iOS platform committed to git

---

## ✅ Verification Checklist

- [ ] Mac with Xcode installed (or Windows user acknowledged limitation)
- [ ] `@capacitor/ios` in package.json dependencies
- [ ] `ios/` folder exists with Xcode project
- [ ] `ios/App/App.xcworkspace` can be opened in Xcode
- [ ] Bundle Identifier: `com.syncapp.mobile`
- [ ] Display Name: `Sync App`
- [ ] App builds without errors in Xcode
- [ ] App runs on iOS simulator
- [ ] Web content displays correctly
- [ ] Navigation works in iOS app
- [ ] No crash on launch
- [ ] Xcode console shows normal Capacitor logs
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.1.2 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: "xcode-select: command not found"
**Solution**: Install Xcode from App Store, then: `xcode-select --install`

### Issue: "CocoaPods not installed"
**Solution**:
```bash
sudo gem install cocoapods
pod setup
# Retry: npx cap sync ios
```

### Issue: Simulator won't boot
**Solution**:
1. Quit simulator
2. Xcode → Window → Devices and Simulators
3. Right-click simulator → Delete
4. Add new simulator (+ button)
5. Retry

### Issue: "Signing requires a development team"
**Solution**:
1. Xcode → Preferences → Accounts
2. Add Apple ID (+)
3. Select team in project settings
4. Enable automatic signing

### Issue: Build fails with "module not found"
**Solution**:
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### Issue: "Public/index.html not found"
**Solution**:
```bash
npm run build        # Build web app first
npx cap copy ios     # Copy to iOS
```

---

## 📚 Additional Notes

### iOS Simulator vs Real Device
- **Simulator**: Free, fast testing, but not 100% accurate
- **Real Device**: Requires Apple Developer Account (free tier OK), more accurate

### Xcode File Sizes
- Xcode: 5-15 GB
- Simulators: 1-2 GB each
- Ensure enough disk space

### What's Next?
After completing this story:
1. Story 7.1.3: Android Platform Setup
2. Story 7.1.4: Build Scripts & Workflow
3. Both iOS and Android will be ready

### File Structure After This Story
```
sync_warp/
├── ios/                      ← NEW
│   └── App/
│       ├── App.xcworkspace   ← Open in Xcode
│       ├── App.xcodeproj/
│       ├── App/
│       │   ├── AppDelegate.swift
│       │   ├── Info.plist
│       │   └── public/       ← Web assets copied here
│       └── Podfile
├── capacitor.config.ts
└── package.json              ← UPDATED (@capacitor/ios added)
```

---

## 🔗 Related Documentation

- [Capacitor iOS Setup](https://capacitorjs.com/docs/ios)
- [Xcode Download](https://developer.apple.com/xcode/)
- [iOS Development Guide](https://capacitorjs.com/docs/ios/configuration)
- [EPIC 7.1 Overview](../epics/EPIC_7.1_Capacitor_Setup.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.1.1_Environment_Capacitor_Setup.md](./STORY_7.1.1_Environment_Capacitor_Setup.md)  
**Next Story**: [STORY_7.1.3_Android_Platform_Setup.md](./STORY_7.1.3_Android_Platform_Setup.md)  
**Epic Progress**: Story 2/6 complete (17% → 33%)
