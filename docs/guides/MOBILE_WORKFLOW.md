# Mobile Development Workflow 📱

## Quick Start

### Build and Sync
```powershell
npm run mobile:sync
```
Builds web app and syncs to iOS + Android.

### Open in IDE
```powershell
# Open iOS in Xcode (Mac only)
npm run mobile:ios

# Open Android in Android Studio
npm run mobile:android
```

### Quick Updates (No Native Changes)
```powershell
npm run mobile:copy
```
Faster - only copies web assets, skips native sync.

### Live Reload Development
```powershell
npm run mobile:live-reload
```
Hot-reloading on Android emulator.

---

## Common Workflows

### After Web Code Changes
```powershell
npm run mobile:copy
# Then refresh app in emulator/simulator
```

### After Installing New Capacitor Plugin
```powershell
npm install @capacitor/plugin-name
npm run mobile:sync
# Rebuild in Xcode/Android Studio
```

### After Updating Capacitor Version
```powershell
npm install @capacitor/core@latest @capacitor/cli@latest
npm run mobile:update
```

### Running on Device
```powershell
# Build and sync first
npm run mobile:sync

# Then run in IDE (select device in IDE)
npm run mobile:android  # Opens Android Studio
npm run mobile:ios      # Opens Xcode (Mac)
```

---

## Script Reference

| Script | What It Does | When To Use |
|--------|--------------|-------------|
| `mobile:sync` | Build + sync both platforms | After any code change |
| `mobile:copy` | Copy assets only (fast) | Quick UI updates |
| `mobile:update` | Update native deps | After Capacitor updates |
| `mobile:ios` | Build + sync + open Xcode | iOS development |
| `mobile:android` | Build + sync + open Android Studio | Android development |
| `mobile:live-reload` | Dev server with hot-reload | Active development |

---

## Tips

✅ **Faster Builds**: Use `mobile:copy` for web-only changes  
✅ **Clean Builds**: Delete `dist/`, rebuild, then sync  
✅ **Check Logs**: Xcode console (iOS) or Logcat (Android)  
✅ **Reset**: Delete native folders, run `npx cap add ios/android` again  

---

## Troubleshooting

**Issue**: Changes not appearing?
```powershell
npm run build
npx cap copy
# Force refresh in IDE
```

**Issue**: "Gradle sync failed"?
```powershell
cd android
.\gradlew clean
cd ..
npm run mobile:sync
```

**Issue**: "Pod install failed"? (iOS)
```bash
cd ios/App
pod install
cd ../..
npm run mobile:sync
```

---

**Last Updated**: Story 7.1.4  
**For**: Sync App Mobile Development
