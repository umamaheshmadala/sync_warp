# Story 7.1.4: Mobile Build Scripts & Workflow ⚪ PLANNED

**Epic**: EPIC 7.1 - Capacitor Setup & Mobile Platform Integration  
**Story Points**: 3  
**Estimated Time**: 1-2 hours  
**Dependencies**: Stories 7.1.2 and 7.1.3 complete (iOS and Android platforms added)

---

## 📋 Overview

**What**: Add convenient npm scripts for common mobile development tasks.

**Why**: Streamline the mobile development workflow by reducing repetitive commands to single scripts.

**User Value**: Faster development cycles, less typing, fewer errors.

---

## 🎯 Acceptance Criteria

- [x] `mobile:sync` script builds and syncs to all platforms
- [x] `mobile:ios` script opens iOS project in Xcode
- [x] `mobile:android` script opens Android project in Android Studio
- [x] `mobile:update` script for quick web asset updates
- [x] `mobile:live-reload` script for hot reloading during development
- [x] Documentation created for mobile workflow
- [x] All scripts tested and working
- [x] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Update package.json with Mobile Scripts

**File to Edit**: `package.json`

**Add to the `"scripts"` section**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    
    "mobile:sync": "npm run build && npx cap sync",
    "mobile:sync:force": "npm run build && npx cap sync --inline",
    "mobile:copy": "npm run build && npx cap copy",
    "mobile:update": "npx cap copy && npx cap update",
    
    "mobile:ios": "npm run mobile:sync && npx cap open ios",
    "mobile:android": "npm run mobile:sync && npx cap open android",
    
    "mobile:run:ios": "npm run mobile:sync && npx cap run ios",
    "mobile:run:android": "npm run mobile:sync && npx cap run android",
    
    "mobile:live-reload": "npx cap run android --livereload --external --host=0.0.0.0",
    "mobile:live-reload:ios": "npx cap run ios --livereload --external"
  }
}
```

**Save the file.**

**Acceptance**: ✅ Scripts added to package.json

---

### Step 2: Test mobile:sync Script

**Terminal Command**:
```powershell
npm run mobile:sync
```

**Expected Behavior**:
1. Runs `vite build` (builds web app)
2. Runs `npx cap sync` (syncs to iOS and Android)
3. Updates both platforms with latest web assets
4. Completes without errors

**Verify**:
```powershell
# Check iOS assets updated
dir ios\App\App\public

# Check Android assets updated
dir android\app\src\main\assets\public
```

**Acceptance**: ✅ `mobile:sync` works correctly

---

### Step 3: Test mobile:ios Script (Mac Only)

**Terminal Command** (Mac):
```bash
npm run mobile:ios
```

**Expected Behavior**:
1. Builds web app
2. Syncs to iOS
3. Opens Xcode with iOS project

**Windows Alternative**:
```powershell
# On Windows, manually open Xcode on Mac or use cloud Mac
# For now, just verify script exists in package.json
```

**Acceptance**: ✅ `mobile:ios` configured (tested on Mac if available)

---

### Step 4: Test mobile:android Script

**Terminal Command**:
```powershell
npm run mobile:android
```

**Expected Behavior**:
1. Builds web app
2. Syncs to Android
3. Opens Android Studio with project

**Verify in Android Studio**:
- Project opens successfully
- Latest web assets in `app/src/main/assets/public/`
- Gradle sync completes

**Acceptance**: ✅ `mobile:android` works correctly

---

### Step 5: Test mobile:copy Script

**What it does**: Copies web assets without rebuilding native code (faster)

**When to use**: Quick UI/content changes that don't affect native code

**Terminal Command**:
```powershell
# Make a small change to your app (e.g., edit a text in Home.tsx)
# Then run:
npm run mobile:copy
```

**Expected Behavior**:
- Only copies dist/ to native projects
- Much faster than full sync
- Skips native dependency updates

**Acceptance**: ✅ `mobile:copy` works and is faster

---

### Step 6: Test mobile:update Script

**What it does**: Updates Capacitor and plugins to latest versions

**When to use**: After updating Capacitor packages

**Terminal Command**:
```powershell
npm run mobile:update
```

**Expected Behavior**:
- Updates native dependencies
- Syncs plugin versions
- Shows update summary

**Acceptance**: ✅ `mobile:update` works

---

### Step 7: Test Live Reload (Android)

**What it does**: Enables hot-reloading during development

**Setup**:
1. Ensure emulator is running
2. Note your computer's IP address:
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

**Terminal Command**:
```powershell
npm run mobile:live-reload
```

**Expected Behavior**:
1. Starts Vite dev server
2. Launches app on emulator
3. App connects to dev server
4. Changes hot-reload automatically

**Test**:
1. Make a change in `src/App.tsx`
2. Save file
3. Watch app update automatically on emulator

**Acceptance**: ✅ Live reload works on Android

---

### Step 8: Create Mobile Workflow Documentation

**Create new file**: `docs/MOBILE_WORKFLOW.md`

```markdown
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
```

**Save as**: `docs/MOBILE_WORKFLOW.md`

**Acceptance**: ✅ Workflow documentation created

---

### Step 9: Create Quick Reference Cheat Sheet

**Create new file**: `docs/MOBILE_COMMANDS.md`

```markdown
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
# Sync only iOS
npx cap sync ios

# Sync only Android
npx cap sync android

# Open iOS in Xcode
npx cap open ios

# Open Android Studio
npx cap open android

# Run on iOS simulator
npx cap run ios

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
```

**Save as**: `docs/MOBILE_COMMANDS.md`

**Acceptance**: ✅ Cheat sheet created

---

### Step 10: Commit Mobile Scripts and Documentation

**Terminal Commands**:
```powershell
# Stage all changes
git add package.json docs/MOBILE_WORKFLOW.md docs/MOBILE_COMMANDS.md

# Commit
git commit -m "feat: Add mobile build scripts and workflow docs - Story 7.1.4

- Added npm scripts: mobile:sync, mobile:ios, mobile:android
- Added mobile:copy for quick web asset updates
- Added mobile:live-reload for hot-reloading
- Created MOBILE_WORKFLOW.md with detailed workflows
- Created MOBILE_COMMANDS.md as quick reference
- All scripts tested and working

Epic: 7.1 - Capacitor Setup
Story: 7.1.4 - Mobile Build Scripts"

# Push to remote
git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] `mobile:sync` script added to package.json
- [ ] `mobile:ios` script added
- [ ] `mobile:android` script added
- [ ] `mobile:copy` script added
- [ ] `mobile:update` script added
- [ ] `mobile:live-reload` script added
- [ ] All scripts tested successfully
- [ ] `docs/MOBILE_WORKFLOW.md` created
- [ ] `docs/MOBILE_COMMANDS.md` created
- [ ] Documentation is clear and helpful
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.1.4 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: "mobile:sync" fails on build
**Solution**:
```powershell
npm run type-check  # Fix TypeScript errors
npm run lint        # Fix linting errors
npm run build       # Verify build works
```

### Issue: Live reload not connecting
**Solution**:
1. Check firewall allows port 5173
2. Verify computer and emulator on same network
3. Use correct IP address
4. Restart dev server and app

### Issue: "cap: command not found"
**Solution**:
```powershell
npm install -g @capacitor/cli
# Or use npx: npx cap sync
```

---

## 📚 Additional Notes

### Script Naming Convention
- `mobile:*` - General mobile commands
- `mobile:*:ios` - iOS-specific
- `mobile:*:android` - Android-specific

### When to Use Each Script

**mobile:sync** (Most common):
- After any code changes
- Before testing on device/emulator
- Standard workflow command

**mobile:copy** (Faster):
- UI/CSS changes only
- No new plugins or native changes
- Quick iterations

**mobile:update**:
- After `npm install @capacitor/*`
- Updating Capacitor version
- Adding/removing native plugins

**mobile:live-reload**:
- Active development
- Frequent changes
- UI/UX work

### What's Next?
After completing this story:
1. Story 7.1.5: Platform Detection Hooks
2. Story 7.1.6: Supabase Mobile Config
3. Mobile workflow now streamlined!

---

## 🔗 Related Documentation

- [Capacitor CLI Commands](https://capacitorjs.com/docs/cli)
- [Capacitor Workflow](https://capacitorjs.com/docs/basics/workflow)
- [EPIC 7.1 Overview](../epics/EPIC_7.1_Capacitor_Setup.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.1.3_Android_Platform_Setup.md](./STORY_7.1.3_Android_Platform_Setup.md)  
**Next Story**: [STORY_7.1.5_Platform_Detection_Hooks.md](./STORY_7.1.5_Platform_Detection_Hooks.md)  
**Epic Progress**: Story 4/6 complete (50% → 67%)
