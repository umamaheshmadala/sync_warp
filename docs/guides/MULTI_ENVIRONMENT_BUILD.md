# Multi-Environment Build System

Complete guide to building and managing the Sync App across development, staging, and production environments.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [NPM Scripts Reference](#npm-scripts-reference)
4. [Build Scripts](#build-scripts)
5. [Android Build Flavors](#android-build-flavors)
6. [iOS Bundle Identifiers](#ios-bundle-identifiers)
7. [Testing Builds](#testing-builds)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The build system supports three environments with complete separation:

| Environment | App ID | App Name | Purpose |
|-------------|--------|----------|---------|
| **Development** | `com.syncapp.mobile.dev` | Sync Dev | Local development, all debug features enabled |
| **Staging** | `com.syncapp.mobile.staging` | Sync Staging | Pre-production testing with production-like config |
| **Production** | `com.syncapp.mobile` | Sync App | Live production app with optimized settings |

### Key Features

✅ **Side-by-Side Installation** - Install all three environments on the same device  
✅ **Environment-Specific Configuration** - Separate API endpoints, feature flags, logging levels  
✅ **Automated Build Scripts** - PowerShell (Windows) and Bash (Mac/Linux)  
✅ **Android Build Flavors** - `devDebug`, `stagingRelease`, `prodRelease`, etc.  
✅ **iOS Schemes** - Different bundle IDs per environment  

---

## Quick Start

### Option 1: Using NPM Scripts (Recommended)

```bash
# Development
npm run build:dev              # Build web app
npm run mobile:sync:dev        # Sync with mobile
npm run mobile:android:dev     # Open Android Studio

# Staging
npm run build:staging
npm run mobile:sync:staging
npm run mobile:android:staging

# Production
npm run build:prod
npm run mobile:sync:prod
npm run mobile:android:prod
```

### Option 2: Using Build Scripts

**Windows (PowerShell):**
```powershell
# Development
.\scripts\Build-Mobile.ps1 -Env dev -Platform android

# Staging
.\scripts\Build-Mobile.ps1 -Env staging -Platform android

# Production
.\scripts\Build-Mobile.ps1 -Env prod -Platform android
```

**Mac/Linux (Bash):**
```bash
# Make script executable (first time only)
chmod +x scripts/build-mobile.sh

# Development
./scripts/build-mobile.sh dev android

# Staging
./scripts/build-mobile.sh staging android

# Production
./scripts/build-mobile.sh prod android
```

---

## NPM Scripts Reference

### Build Scripts

| Script | Description | Environment | Output |
|--------|-------------|-------------|--------|
| `npm run build` | Standard production build | Production | `dist/` |
| `npm run build:dev` | Development build | Development | `dist/` with dev config |
| `npm run build:staging` | Staging build | Staging | `dist/` with staging config |
| `npm run build:prod` | Production build | Production | `dist/` optimized |

### Mobile Sync Scripts

| Script | Description |
|--------|-------------|
| `npm run mobile:sync:dev` | Build (dev) + sync all platforms |
| `npm run mobile:sync:staging` | Build (staging) + sync all platforms |
| `npm run mobile:sync:prod` | Build (prod) + sync all platforms |

### Android Scripts

| Script | Description |
|--------|-------------|
| `npm run mobile:android:dev` | Build (dev) + sync + open Android Studio |
| `npm run mobile:android:staging` | Build (staging) + sync + open Android Studio |
| `npm run mobile:android:prod` | Build (prod) + sync + open Android Studio |

### iOS Scripts

| Script | Description |
|--------|-------------|
| `npm run mobile:ios:dev` | Build (dev) + sync + open Xcode |
| `npm run mobile:ios:staging` | Build (staging) + sync + open Xcode |
| `npm run mobile:ios:prod` | Build (prod) + sync + open Xcode |

---

## Build Scripts

### PowerShell Script (Windows)

**Location**: `scripts/Build-Mobile.ps1`

**Usage**:
```powershell
.\scripts\Build-Mobile.ps1 [-Env <dev|staging|prod>] [-Platform <android|ios>] [-Open <$true|$false>]
```

**Parameters**:
- `-Env`: Environment to build (default: `dev`)
- `-Platform`: Target platform (default: `android`)
- `-Open`: Open IDE after sync (default: `$true`)

**Examples**:
```powershell
# Build dev for Android and open Studio
.\scripts\Build-Mobile.ps1

# Build staging for Android, don't open Studio
.\scripts\Build-Mobile.ps1 -Env staging -Open $false

# Build production for iOS
.\scripts\Build-Mobile.ps1 -Env prod -Platform ios
```

**Features**:
- ✅ Color-coded output
- ✅ Error handling and validation
- ✅ Progress indicators
- ✅ Next steps guidance
- ✅ App info display

### Bash Script (Mac/Linux)

**Location**: `scripts/build-mobile.sh`

**Usage**:
```bash
./scripts/build-mobile.sh [dev|staging|prod] [android|ios]
```

**Examples**:
```bash
# Build dev for Android
./scripts/build-mobile.sh dev android

# Build staging for iOS
./scripts/build-mobile.sh staging ios

# Build production for Android (default platform)
./scripts/build-mobile.sh prod
```

---

## Android Build Flavors

### Configuration

Flavors are defined in `android/app/build.gradle`:

```gradle
flavorDimensions "version"
productFlavors {
    dev {
        dimension "version"
        applicationIdSuffix ".dev"
        versionNameSuffix "-dev"
        resValue "string", "app_name", "Sync Dev"
    }
    staging {
        dimension "version"
        applicationIdSuffix ".staging"
        versionNameSuffix "-staging"
        resValue "string", "app_name", "Sync Staging"
    }
    prod {
        dimension "version"
        resValue "string", "app_name", "Sync App"
    }
}
```

### Build Variants

Combinations of flavors and build types:

| Variant | App ID | App Name | Minified | Debuggable |
|---------|--------|----------|----------|------------|
| `devDebug` | `com.syncapp.mobile.dev` | Sync Dev | ❌ | ✅ |
| `devRelease` | `com.syncapp.mobile.dev` | Sync Dev | ✅ | ❌ |
| `stagingDebug` | `com.syncapp.mobile.staging` | Sync Staging | ❌ | ✅ |
| `stagingRelease` | `com.syncapp.mobile.staging` | Sync Staging | ✅ | ❌ |
| `prodDebug` | `com.syncapp.mobile` | Sync App | ❌ | ✅ |
| `prodRelease` | `com.syncapp.mobile` | Sync App | ✅ | ❌ |

### Selecting Build Variant in Android Studio

1. Open Android Studio
2. Click **Build** → **Select Build Variant**
3. Choose desired variant (e.g., `devDebug`, `stagingRelease`, `prodRelease`)
4. Wait for Gradle sync
5. Run on device/emulator

### Building from Command Line

```bash
# Development
cd android
./gradlew assembleDevDebug

# Staging
./gradlew assembleStagingRelease

# Production
./gradlew assembleProdRelease
```

**Output Location**:
- Debug builds: `android/app/build/outputs/apk/dev/debug/app-dev-debug.apk`
- Release builds: `android/app/build/outputs/apk/prod/release/app-prod-release.apk`

---

## iOS Bundle Identifiers

### Configuration

Bundle IDs are set dynamically in `capacitor.config.ts`:

```typescript
const getAppId = () => {
  if (isDevelopment) return 'com.syncapp.mobile.dev';
  if (isStaging) return 'com.syncapp.mobile.staging';
  return 'com.syncapp.mobile';
};
```

### Xcode Configuration

After syncing, verify bundle IDs in Xcode:

1. Open Xcode project: `npx cap open ios`
2. Select **App** target
3. Go to **General** tab
4. Check **Bundle Identifier**

### Creating Schemes (Advanced)

For automatic scheme switching:

1. **Product** → **Scheme** → **Manage Schemes**
2. Duplicate existing scheme
3. Rename to environment (e.g., "Sync Dev", "Sync Staging")
4. Edit scheme → **Build** → Pre-actions
5. Add script to set environment variable

---

## Testing Builds

### Verify Side-by-Side Installation

**Objective**: Confirm all three environments can be installed simultaneously

**Steps**:
1. Build and install dev: `npm run mobile:android:dev`
2. Run on device, verify "Sync Dev" appears
3. Build and install staging: `npm run mobile:android:staging`
4. Check app drawer - both "Sync Dev" and "Sync Staging" should be visible
5. Build and install prod: `npm run mobile:android:prod`
6. All three apps should be installed with distinct names

### Verify Environment Configuration

**Test app is using correct environment:**

1. Open app
2. Check browser console (Chrome DevTools for web, Logcat for Android)
3. Look for environment logs:
   ```
   Environment: development
   App Name: Sync Dev
   Version: 1.0.0-dev
   ```

### Verify Build Outputs

**Check that builds are using correct config:**

```bash
# Build all three environments
npm run build:dev
npm run build:staging
npm run build:prod

# Check dist/ folder contents
# Each build should have different environment variables baked in
```

---

## Troubleshooting

### Issue: Build Variant Not Showing in Android Studio

**Problem**: After syncing, build variants (devDebug, stagingRelease, etc.) don't appear

**Solution**:
1. Close Android Studio
2. Delete `android/.gradle` and `android/app/build` folders
3. Re-sync: `npx cap sync android`
4. Open Android Studio
5. Let Gradle sync complete
6. Check **Build → Select Build Variant**

### Issue: Wrong App Name/ID After Build

**Problem**: Built app shows wrong name (e.g., "Sync App" instead of "Sync Dev")

**Solution**:
1. Verify you ran correct build command: `npm run build:dev`
2. Check environment in `dist/` build output
3. Clean and rebuild:
   ```bash
   rm -rf dist
   npm run build:dev
   npx cap sync android
   ```
4. In Android Studio, clean project: **Build → Clean Project**
5. Rebuild and run

### Issue: Multiple Apps with Same Name

**Problem**: Can't distinguish between installed apps

**Solution**:
1. Verify `android/app/build.gradle` has flavor configuration
2. Check that `resValue "string", "app_name"` is set correctly
3. Ensure you selected correct build variant in Android Studio
4. Uninstall all versions and reinstall one at a time

### Issue: Environment Variables Not Loading

**Problem**: App uses wrong API endpoint or config

**Solution**:
1. Check `.env.development` / `.env.staging` / `.env.production` files exist
2. Verify variables start with `VITE_` prefix
3. Rebuild web app: `npm run build:dev`
4. Re-sync platforms: `npx cap sync`
5. Clean Android build: `cd android && ./gradlew clean`

### Issue: Gradle Build Fails

**Problem**: `./gradlew` commands fail with errors

**Common Causes & Solutions**:

**Locked files**:
```bash
# Kill Gradle daemon
./gradlew --stop

# Delete build folders
rm -rf android/app/build
rm -rf android/build

# Rebuild
./gradlew assembleDevDebug
```

**Missing dependencies**:
```bash
# Re-sync Gradle
cd android
./gradlew --refresh-dependencies
```

---

## Best Practices

### Development Workflow

1. ✅ Use `dev` environment for daily development
2. ✅ Test on `staging` before merging to main branch
3. ✅ Only build `prod` for release candidates
4. ✅ Keep all three environments installed on test devices
5. ✅ Use build scripts for consistency

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
jobs:
  build-android:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        env: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v2
      - name: Build
        run: npm run build:${{ matrix.env }}
      - name: Sync
        run: npx cap sync android
      - name: Build APK
        run: cd android && ./gradlew assemble${matrix.env^}Release
```

### Release Checklist

Before building production release:

- [ ] All tests passing
- [ ] Staging tested successfully
- [ ] `.env.production` configured correctly
- [ ] Debug mode disabled (`VITE_ENABLE_DEBUG_MODE=false`)
- [ ] Console logs disabled (`VITE_ENABLE_CONSOLE_LOGS=false`)
- [ ] Error reporting enabled (`VITE_ENABLE_ERROR_REPORTING=true`)
- [ ] Version number updated in `package.json`
- [ ] Release notes written

---

## Related Documentation

- [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
- [Vite Build Modes](https://vitejs.dev/guide/env-and-mode.html#modes)
- [Android Product Flavors](https://developer.android.com/studio/build/build-variants#product-flavors)
- [Capacitor Configuration](https://capacitorjs.com/docs/config)

---

## ✅ Story 7.5.4 Checklist

- [✅] NPM scripts for multi-environment builds
- [✅] Android build flavors (dev/staging/prod)
- [✅] Dynamic app IDs and names per environment
- [✅] PowerShell build script for Windows
- [✅] Bash build script for Mac/Linux
- [✅] Comprehensive documentation
- [🔜] iOS bundle identifier configuration (deferred - no Mac)
- [🔜] Testing on physical devices

**Status**: ✅ COMPLETE (Android) | ⏸️ iOS pending Mac environment

---

**Last Updated**: 2025-11-10  
**Story**: 7.5.4 - Multi-Environment Build System  
**Time Spent**: 6 hours
