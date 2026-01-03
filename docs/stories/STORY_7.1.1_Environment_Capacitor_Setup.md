# Story 7.1.1: Environment Preparation & Capacitor Installation ⚪ PLANNED

**Epic**: EPIC 7.1 - Capacitor Setup & Mobile Platform Integration  
**Story Points**: 5  
**Estimated Time**: 2-3 hours  
**Dependencies**: Epic 1-6 complete (web app functional)

---

## 📋 Overview

**What**: Install and configure Capacitor framework to prepare for mobile app development.

**Why**: Capacitor is the bridge that converts your React web app into native iOS and Android apps. This foundational step must be completed correctly before any mobile development can begin.

**User Value**: Enables the development of native mobile apps from existing web codebase.

---

## 🎯 Acceptance Criteria

- [x] Node.js 18+ and npm 8+ verified
- [x] Capacitor CLI installed globally
- [x] Git branch `mobile-app-setup` created
- [x] `@capacitor/core` and `@capacitor/cli` installed in project
- [x] `capacitor.config.ts` created with correct configuration
- [x] Web app builds successfully to `dist/` folder
- [x] All changes committed to git

---

## 📝 Implementation Steps

### Step 1: Verify Development Environment

**Terminal Commands**:
```powershell
# Check Node.js version (must be 18 or higher)
node --version

# Check npm version (must be 8 or higher)
npm --version
```

**Expected Output**:
```
v18.x.x or v20.x.x
8.x.x or higher
```

**If Versions Too Old**:
- Download and install latest Node.js LTS from https://nodejs.org/
- Restart terminal after installation
- Re-verify versions

**Acceptance**: ✅ Both versions meet minimum requirements

---

### Step 2: Install Capacitor CLI Globally

**Terminal Command**:
```powershell
npm install -g @capacitor/cli
```

**Verify Installation**:
```powershell
npx cap --version
```

**Expected Output**:
```
@capacitor/cli 5.x.x
```

**Acceptance**: ✅ Capacitor CLI installed and accessible

---

### Step 3: Create Git Branch for Mobile Work

**Terminal Commands**:
```powershell
# Ensure you're on main branch and up to date
git checkout main
git pull origin main

# Create new branch for mobile development
git checkout -b mobile-app-setup

# Verify you're on the new branch
git branch
```

**Expected Output**:
```
* mobile-app-setup
  main
```

**Acceptance**: ✅ New branch created and checked out

---

### Step 4: Commit Current State (Backup)

**Terminal Commands**:
```powershell
# Stage all current changes
git add .

# Commit as backup before Capacitor changes
git commit -m "chore: Backup before Capacitor setup - Epic 7.1 Story 7.1.1"

# Push branch to remote
git push origin mobile-app-setup
```

**Acceptance**: ✅ Current state backed up in git

---

### Step 5: Install Capacitor Core Packages

**Terminal Command**:
```powershell
npm install @capacitor/core @capacitor/cli
```

**Verify Installation**:
```powershell
# Check package.json dependencies
cat package.json | Select-String -Pattern "capacitor"
```

**Expected in package.json**:
```json
{
  "dependencies": {
    "@capacitor/core": "^5.x.x"
  },
  "devDependencies": {
    "@capacitor/cli": "^5.x.x"
  }
}
```

**Acceptance**: ✅ Capacitor packages installed

---

### Step 6: Initialize Capacitor

**Terminal Command**:
```powershell
npx cap init
```

**Prompted Questions & Answers**:
```
? App name: Sync App
? App package ID: com.syncapp.mobile
? Web asset directory (where your built app lives): dist
```

**What This Creates**:
- `capacitor.config.ts` file in project root
- Updates to project structure

**Acceptance**: ✅ `capacitor.config.ts` exists

---

### Step 7: Configure Capacitor Settings

**File to Create/Edit**: `capacitor.config.ts`

**Replace entire file with**:
```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.syncapp.mobile',
  appName: 'Sync App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.syncapp.com',
    // Allow cleartext in development (remove in production)
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1', // Indigo-600 from your theme
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

**Configuration Explanation**:
- `appId`: Unique identifier (reverse domain format)
- `appName`: Display name of your app
- `webDir`: Where Vite builds your web app
- `server.androidScheme/iosScheme`: Use HTTPS for security
- `server.hostname`: Your app's domain
- `SplashScreen`: Loading screen configuration
- `PushNotifications`: Notification settings (for later)

**Acceptance**: ✅ Configuration file properly set up

---

### Step 8: Update .gitignore

**File to Edit**: `.gitignore`

**Add these lines** (if not already present):
```
# Capacitor
ios/App/Pods
ios/App/public
ios/App/Podfile.lock
android/.idea
android/.gradle
android/build
android/gradle
android/app/build
.DS_Store
```

**Why**: Prevents large native build files from being committed to git

**Acceptance**: ✅ `.gitignore` updated

---

### Step 9: Audit Current Build

**Terminal Command**:
```powershell
# Build the web app
npm run build
```

**Expected Behavior**:
- No errors
- `dist/` folder created
- Contains `index.html`, `assets/`, etc.

**Verify Build**:
```powershell
# Check dist folder exists and contains files
dir dist
```

**If Build Fails**:
1. Check console for errors
2. Fix TypeScript errors: `npm run type-check`
3. Fix linting errors: `npm run lint`
4. Retry build

**Acceptance**: ✅ Web app builds successfully without errors

---

### Step 10: Commit Capacitor Setup

**Terminal Commands**:
```powershell
# Stage changes
git add .

# Commit
git commit -m "feat: Install and configure Capacitor - Story 7.1.1

- Installed @capacitor/core and @capacitor/cli
- Created capacitor.config.ts with proper settings
- Updated .gitignore for native platforms
- Verified web app builds successfully

Epic: 7.1 - Capacitor Setup
Story: 7.1.1 - Environment Preparation"

# Push to remote
git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed and pushed

---

## ✅ Verification Checklist

Run through this checklist to confirm story completion:

- [ ] Node.js version is 18 or higher
- [ ] npm version is 8 or higher
- [ ] Capacitor CLI installed globally (`npx cap --version` works)
- [ ] Git branch `mobile-app-setup` exists and is current branch
- [ ] `@capacitor/core` in `package.json` dependencies
- [ ] `@capacitor/cli` in `package.json` devDependencies
- [ ] `capacitor.config.ts` exists with correct app ID: `com.syncapp.mobile`
- [ ] `capacitor.config.ts` has webDir: `dist`
- [ ] `.gitignore` updated with Capacitor excludes
- [ ] `npm run build` completes without errors
- [ ] `dist/` folder contains built web app
- [ ] All changes committed to git
- [ ] Branch pushed to remote repository

**All items checked?** ✅ Story 7.1.1 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Node.js version too old
**Solution**: Download from https://nodejs.org/, choose LTS version, restart terminal

### Issue: Capacitor CLI not found
**Solution**: 
```powershell
npm install -g @capacitor/cli --force
# Restart terminal
npx cap --version
```

### Issue: Build fails with TypeScript errors
**Solution**:
```powershell
npm run type-check  # See specific errors
# Fix errors in reported files
npm run build       # Retry
```

### Issue: "dist folder not found" during cap init
**Solution**: Run `npm run build` first, then retry `npx cap init`

### Issue: Git merge conflicts
**Solution**: 
```powershell
git status                    # See conflicts
# Manually resolve in VS Code
git add .
git commit -m "resolve: Fix merge conflicts"
```

---

## 📚 Additional Notes

### Why Capacitor vs React Native?
- ✅ Reuses 100% of existing web code
- ✅ No learning curve for React Native
- ✅ Faster to market (weeks vs months)
- ✅ Easier to maintain for small teams
- ⚠️ Tradeoff: Web-based performance (acceptable for most apps)

### What's Next?
After completing this story:
1. Story 7.1.2: iOS Platform Setup
2. Story 7.1.3: Android Platform Setup
3. Both platforms will use this Capacitor foundation

### File Structure After This Story
```
sync_warp/
├── capacitor.config.ts    ← NEW
├── package.json           ← UPDATED (Capacitor deps)
├── .gitignore             ← UPDATED (platform excludes)
├── dist/                  ← BUILD OUTPUT
│   ├── index.html
│   └── assets/
└── src/
    └── ... (unchanged)
```

---

## 🔗 Related Documentation

- [Capacitor Getting Started](https://capacitorjs.com/docs/getting-started)
- [Capacitor Config Schema](https://capacitorjs.com/docs/config)
- [EPIC 7.1 Overview](../epics/EPIC_7.1_Capacitor_Setup.md)

---

**Story Status**: ⚪ PLANNED  
**Next Story**: [STORY_7.1.2_iOS_Platform_Setup.md](./STORY_7.1.2_iOS_Platform_Setup.md)  
**Epic Progress**: Story 1/6 complete (0% → 17%)
