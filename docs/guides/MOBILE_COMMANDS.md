# Mobile Commands Cheat Sheet 🚀

## Daily Development

```powershell
# Start development
npm run dev

# Build and sync to mobile
npm run mobile:sync

# Open Android Studio
npm run mobile:android

# Open Xcode (Mac)
npm run mobile:ios
```

## Quick Commands

```powershell
# Just copy web files (fast)
npm run mobile:copy

# Live reload on Android
npm run mobile:live-reload

# Update native dependencies
npm run mobile:update

# Check if app builds
npm run build
```

## Platform-Specific

```powershell
# Sync only Android
npx cap sync android

# Open Android Studio
npx cap open android

# Run on Android emulator
npx cap run android
```

## Debugging

```powershell
# Check Capacitor version
npx cap --version

# List installed plugins
npx cap ls

# Check native project status
npx cap doctor

# View Android logs
adb logcat
```

## Git

```powershell
# Commit mobile changes
git add .
git commit -m "feat: Mobile app updates"
git push origin mobile-app-setup
```

---

**Last Updated**: Story 7.1.4  
**Platform**: Windows + Android
