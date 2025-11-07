# Story 7.5.4: Multi-Environment Build System ⚪ PLANNED

**Feature:** Mobile App Setup & Deployment  
**Epic:** 7. Cross-Platform Mobile App (iOS & Android)  
**Story ID:** 7.5.4  
**Branch:** `mobile-app-setup`

---

## 📋 Overview

Implement a comprehensive multi-environment build system that supports development, staging, and production builds for both iOS and Android platforms. This includes configuring iOS bundle IDs and schemes, Android product flavors, automated build scripts, and CI/CD pipeline integration for streamlined deployment.

---

## 🎯 Acceptance Criteria

- [ ] iOS Xcode project configured with three schemes (dev, staging, prod)
- [ ] iOS bundle identifiers properly set for each environment
- [ ] Android product flavors configured for all environments
- [ ] Android applicationId set correctly for each flavor
- [ ] Build scripts automate environment-specific builds
- [ ] Version numbering system implemented
- [ ] CI/CD pipeline configurations created (GitHub Actions)
- [ ] Build artifacts generated with proper naming conventions
- [ ] All builds tested and verified on physical devices
- [ ] Documentation created for build process

---

## 🛠️ Implementation Steps

### **Step 1: Configure iOS Schemes and Bundle IDs**

#### **1.1: Open Xcode Project**

```bash
npx cap open ios
```

#### **1.2: Create Development Scheme**

1. In Xcode, click on the scheme dropdown (top left)
2. Select "Manage Schemes..."
3. Click the "+" button to add a new scheme
4. Name it "App (Development)"
5. Set the target to "App"
6. Click "Close"

#### **1.3: Create Staging Scheme**

Repeat the above steps to create "App (Staging)" scheme.

#### **1.4: Update Info.plist for Dynamic Bundle ID**

**File:** `ios/App/App/Info.plist`

Add the following to support dynamic bundle display names:

```xml
<key>CFBundleDisplayName</key>
<string>$(APP_DISPLAY_NAME)</string>
```

#### **1.5: Configure Build Settings for Each Scheme**

For each scheme (Development, Staging, Production):

1. Click on the "App" project in the navigator
2. Select "App" target
3. Go to "Build Settings" tab
4. Search for "Product Bundle Identifier"
5. Expand it to see all configurations
6. Set values:
   - **Development:** `com.syncwarp.app.dev`
   - **Staging:** `com.syncwarp.app.staging`
   - **Production:** `com.syncwarp.app`

7. Search for "User-Defined" settings
8. Add a new setting called `APP_DISPLAY_NAME`:
   - **Development:** `SyncWarp Dev`
   - **Staging:** `SyncWarp Staging`
   - **Production:** `SyncWarp`

#### **1.6: Configure Signing for Each Environment**

1. Select "Signing & Capabilities" tab
2. For each configuration (Debug/Release), set:
   - Team: Your Apple Developer Team
   - Bundle Identifier: Corresponding to environment
   - Signing Certificate: Apple Development / Apple Distribution

---

### **Step 2: Configure Android Product Flavors**

#### **2.1: Update Android build.gradle**

**File:** `android/app/build.gradle`

```groovy
android {
    namespace "com.syncwarp.app"
    compileSdkVersion rootProject.ext.compileSdkVersion
    
    defaultConfig {
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    // Product Flavors for multi-environment builds
    flavorDimensions "environment"
    
    productFlavors {
        dev {
            dimension "environment"
            applicationIdSuffix ".dev"
            versionNameSuffix "-dev"
            resValue "string", "app_name", "SyncWarp Dev"
            buildConfigField "String", "API_URL", "\"https://api-dev.syncwarp.com\""
            buildConfigField "String", "ENVIRONMENT", "\"development\""
        }
        
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
            resValue "string", "app_name", "SyncWarp Staging"
            buildConfigField "String", "API_URL", "\"https://api-staging.syncwarp.com\""
            buildConfigField "String", "ENVIRONMENT", "\"staging\""
        }
        
        prod {
            dimension "environment"
            resValue "string", "app_name", "SyncWarp"
            buildConfigField "String", "API_URL", "\"https://api.syncwarp.com\""
            buildConfigField "String", "ENVIRONMENT", "\"production\""
        }
    }

    buildTypes {
        debug {
            debuggable true
            minifyEnabled false
        }
        
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            
            // Signing config for release builds
            signingConfig signingConfigs.release
        }
    }

    // This combines flavors with build types
    // Creates: devDebug, devRelease, stagingDebug, stagingRelease, prodDebug, prodRelease
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
}

// Apply Google Services plugin if google-services.json exists
if (file('google-services.json').exists()) {
    apply plugin: 'com.google.gms.google-services'
}
```

#### **2.2: Update Android Manifest to Use Dynamic App Name**

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/AppTheme">
    <!-- ... -->
</application>
```

---

### **Step 3: Create Build Scripts**

#### **3.1: Create iOS Build Script**

**File:** `scripts/build-ios.sh`

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🍎 iOS Build Script${NC}"
echo "===================="

# Check if environment is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Environment not specified${NC}"
  echo "Usage: ./scripts/build-ios.sh [dev|staging|prod] [debug|release]"
  exit 1
fi

ENVIRONMENT=$1
BUILD_TYPE=${2:-release}

# Set scheme and bundle ID based on environment
case $ENVIRONMENT in
  dev)
    SCHEME="App (Development)"
    BUNDLE_ID="com.syncwarp.app.dev"
    ;;
  staging)
    SCHEME="App (Staging)"
    BUNDLE_ID="com.syncwarp.app.staging"
    ;;
  prod)
    SCHEME="App"
    BUNDLE_ID="com.syncwarp.app"
    ;;
  *)
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Valid options: dev, staging, prod"
    exit 1
    ;;
esac

echo -e "${YELLOW}Environment:${NC} $ENVIRONMENT"
echo -e "${YELLOW}Build Type:${NC} $BUILD_TYPE"
echo -e "${YELLOW}Scheme:${NC} $SCHEME"
echo -e "${YELLOW}Bundle ID:${NC} $BUNDLE_ID"
echo ""

# Build web app
echo -e "${YELLOW}📦 Building web app...${NC}"
npm run build:$ENVIRONMENT

# Sync with Capacitor
echo -e "${YELLOW}🔄 Syncing with Capacitor...${NC}"
VITE_APP_ENV=$ENVIRONMENT npx cap sync ios

# Navigate to iOS directory
cd ios/App

# Build the app
echo -e "${YELLOW}🔨 Building iOS app...${NC}"

if [ "$BUILD_TYPE" = "release" ]; then
  # Archive for release
  xcodebuild -workspace App.xcworkspace \
    -scheme "$SCHEME" \
    -configuration Release \
    -archivePath "build/App-$ENVIRONMENT.xcarchive" \
    clean archive \
    CODE_SIGN_IDENTITY="Apple Distribution" \
    PROVISIONING_PROFILE_SPECIFIER="YourProvisioningProfile"
  
  echo -e "${GREEN}✅ Archive created: build/App-$ENVIRONMENT.xcarchive${NC}"
  
  # Export IPA
  xcodebuild -exportArchive \
    -archivePath "build/App-$ENVIRONMENT.xcarchive" \
    -exportPath "build/$ENVIRONMENT" \
    -exportOptionsPlist "exportOptions.plist"
  
  echo -e "${GREEN}✅ IPA exported: build/$ENVIRONMENT/App.ipa${NC}"
else
  # Build for debug
  xcodebuild -workspace App.xcworkspace \
    -scheme "$SCHEME" \
    -configuration Debug \
    -destination "generic/platform=iOS" \
    clean build
  
  echo -e "${GREEN}✅ Debug build completed${NC}"
fi

cd ../..

echo ""
echo -e "${GREEN}✅ iOS build completed successfully!${NC}"
```

Make it executable:
```bash
chmod +x scripts/build-ios.sh
```

#### **3.2: Create Android Build Script**

**File:** `scripts/build-android.sh`

```bash
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🤖 Android Build Script${NC}"
echo "======================="

# Check if environment is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Environment not specified${NC}"
  echo "Usage: ./scripts/build-android.sh [dev|staging|prod] [debug|release]"
  exit 1
fi

ENVIRONMENT=$1
BUILD_TYPE=${2:-release}

# Map environment to Android flavor
case $ENVIRONMENT in
  dev)
    FLAVOR="dev"
    ;;
  staging)
    FLAVOR="staging"
    ;;
  prod)
    FLAVOR="prod"
    ;;
  *)
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Valid options: dev, staging, prod"
    exit 1
    ;;
esac

echo -e "${YELLOW}Environment:${NC} $ENVIRONMENT"
echo -e "${YELLOW}Build Type:${NC} $BUILD_TYPE"
echo -e "${YELLOW}Flavor:${NC} $FLAVOR"
echo ""

# Build web app
echo -e "${YELLOW}📦 Building web app...${NC}"
npm run build:$ENVIRONMENT

# Sync with Capacitor
echo -e "${YELLOW}🔄 Syncing with Capacitor...${NC}"
VITE_APP_ENV=$ENVIRONMENT npx cap sync android

# Navigate to Android directory
cd android

# Build the APK/Bundle
echo -e "${YELLOW}🔨 Building Android app...${NC}"

if [ "$BUILD_TYPE" = "release" ]; then
  # Build release AAB (for Play Store)
  ./gradlew bundle${FLAVOR^}Release
  
  echo -e "${GREEN}✅ Bundle created: app/build/outputs/bundle/${FLAVOR}Release/app-${FLAVOR}-release.aab${NC}"
  
  # Optionally build APK for manual distribution
  ./gradlew assemble${FLAVOR^}Release
  
  echo -e "${GREEN}✅ APK created: app/build/outputs/apk/${FLAVOR}/release/app-${FLAVOR}-release.apk${NC}"
else
  # Build debug APK
  ./gradlew assemble${FLAVOR^}Debug
  
  echo -e "${GREEN}✅ Debug APK created: app/build/outputs/apk/${FLAVOR}/debug/app-${FLAVOR}-debug.apk${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}✅ Android build completed successfully!${NC}"
```

Make it executable:
```bash
chmod +x scripts/build-android.sh
```

---

### **Step 4: Update Package.json Scripts**

**File:** `package.json`

Add the following scripts:

```json
{
  "scripts": {
    "dev": "vite --mode development",
    
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "build:prod": "vite build --mode production",
    
    "cap:sync:dev": "cross-env VITE_APP_ENV=development npx cap sync",
    "cap:sync:staging": "cross-env VITE_APP_ENV=staging npx cap sync",
    "cap:sync:prod": "cross-env VITE_APP_ENV=production npx cap sync",
    
    "ios:dev": "npm run build:dev && npm run cap:sync:dev && npx cap open ios",
    "ios:staging": "npm run build:staging && npm run cap:sync:staging && npx cap open ios",
    "ios:prod": "npm run build:prod && npm run cap:sync:prod && npx cap open ios",
    
    "android:dev": "npm run build:dev && npm run cap:sync:dev && npx cap open android",
    "android:staging": "npm run build:staging && npm run cap:sync:staging && npx cap open android",
    "android:prod": "npm run build:prod && npm run cap:sync:prod && npx cap open android",
    
    "build:ios:dev": "./scripts/build-ios.sh dev debug",
    "build:ios:dev:release": "./scripts/build-ios.sh dev release",
    "build:ios:staging": "./scripts/build-ios.sh staging release",
    "build:ios:prod": "./scripts/build-ios.sh prod release",
    
    "build:android:dev": "./scripts/build-android.sh dev debug",
    "build:android:dev:release": "./scripts/build-android.sh dev release",
    "build:android:staging": "./scripts/build-android.sh staging release",
    "build:android:prod": "./scripts/build-android.sh prod release",
    
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

---

### **Step 5: Create CI/CD Pipeline (GitHub Actions)**

#### **5.1: Create iOS Build Workflow**

**File:** `.github/workflows/build-ios.yml`

```yaml
name: Build iOS

on:
  push:
    branches:
      - main
      - develop
      - mobile-app-setup
  pull_request:
    branches:
      - main
      - develop
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to build'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod

jobs:
  build-ios:
    runs-on: macos-latest
    
    strategy:
      matrix:
        environment: [dev, staging, prod]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Create .env file
        run: |
          echo "VITE_API_URL=${{ secrets[format('VITE_API_URL_{0}', matrix.environment)] }}" >> .env.${{ matrix.environment }}
          echo "VITE_SUPABASE_URL=${{ secrets[format('VITE_SUPABASE_URL_{0}', matrix.environment)] }}" >> .env.${{ matrix.environment }}
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets[format('VITE_SUPABASE_ANON_KEY_{0}', matrix.environment)] }}" >> .env.${{ matrix.environment }}
      
      - name: Build web app
        run: npm run build:${{ matrix.environment }}
      
      - name: Sync Capacitor
        run: VITE_APP_ENV=${{ matrix.environment }} npx cap sync ios
      
      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable
      
      - name: Install CocoaPods
        run: |
          cd ios/App
          pod install
      
      - name: Build iOS app
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme "App" \
            -configuration Release \
            -destination "generic/platform=iOS" \
            clean build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ios-build-${{ matrix.environment }}
          path: ios/App/build/
          retention-days: 7

  notify:
    needs: build-ios
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Send notification
        run: echo "iOS build completed with status ${{ needs.build-ios.result }}"
```

#### **5.2: Create Android Build Workflow**

**File:** `.github/workflows/build-android.yml`

```yaml
name: Build Android

on:
  push:
    branches:
      - main
      - develop
      - mobile-app-setup
  pull_request:
    branches:
      - main
      - develop
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to build'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod

jobs:
  build-android:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        environment: [dev, staging, prod]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Create .env file
        run: |
          echo "VITE_API_URL=${{ secrets[format('VITE_API_URL_{0}', matrix.environment)] }}" >> .env.${{ matrix.environment }}
          echo "VITE_SUPABASE_URL=${{ secrets[format('VITE_SUPABASE_URL_{0}', matrix.environment)] }}" >> .env.${{ matrix.environment }}
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets[format('VITE_SUPABASE_ANON_KEY_{0}', matrix.environment)] }}" >> .env.${{ matrix.environment }}
      
      - name: Build web app
        run: npm run build:${{ matrix.environment }}
      
      - name: Sync Capacitor
        run: VITE_APP_ENV=${{ matrix.environment }} npx cap sync android
      
      - name: Build Android APK (Debug)
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assemble${{ matrix.environment }}Debug
      
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: android-apk-${{ matrix.environment }}
          path: android/app/build/outputs/apk/${{ matrix.environment }}/debug/*.apk
          retention-days: 7
      
      - name: Build Android Bundle (Release)
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          cd android
          ./gradlew bundle${{ matrix.environment }}Release
      
      - name: Upload Bundle
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: android-bundle-${{ matrix.environment }}
          path: android/app/build/outputs/bundle/${{ matrix.environment }}Release/*.aab
          retention-days: 30

  notify:
    needs: build-android
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Send notification
        run: echo "Android build completed with status ${{ needs.build-android.result }}"
```

---

### **Step 6: Version Management Script**

**File:** `scripts/bump-version.sh`

```bash
#!/bin/bash

set -e

echo "📦 Version Bump Script"
echo "====================="

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo "Current version: $CURRENT_VERSION"
echo ""
echo "Select bump type:"
echo "1) Patch (1.0.0 → 1.0.1)"
echo "2) Minor (1.0.0 → 1.1.0)"
echo "3) Major (1.0.0 → 2.0.0)"
echo "4) Custom"
echo ""

read -p "Enter choice (1-4): " choice

case $choice in
  1)
    npm version patch --no-git-tag-version
    ;;
  2)
    npm version minor --no-git-tag-version
    ;;
  3)
    npm version major --no-git-tag-version
    ;;
  4)
    read -p "Enter new version: " new_version
    npm version $new_version --no-git-tag-version
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")

echo ""
echo "✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION"
echo ""
echo "📝 Next steps:"
echo "1. Update version in android/app/build.gradle (versionName)"
echo "2. Update version in ios/App/App.xcodeproj (CFBundleShortVersionString)"
echo "3. Commit changes: git commit -am 'chore: bump version to $NEW_VERSION'"
echo "4. Tag release: git tag v$NEW_VERSION"
```

Make it executable:
```bash
chmod +x scripts/bump-version.sh
```

---

## 🧪 Testing Steps

### **Manual Testing**

1. **Test iOS Development Build:**
   ```bash
   npm run ios:dev
   # Build in Xcode, install on device
   # Verify app name is "SyncWarp Dev"
   # Verify bundle ID is com.syncwarp.app.dev
   ```

2. **Test iOS Staging Build:**
   ```bash
   npm run ios:staging
   # Build in Xcode, install on device
   # Verify app name is "SyncWarp Staging"
   ```

3. **Test iOS Production Build:**
   ```bash
   npm run build:ios:prod
   # Verify archive is created
   # Verify IPA is exported
   ```

4. **Test Android Development Build:**
   ```bash
   npm run android:dev
   # Build in Android Studio, install on device
   # Verify app name is "SyncWarp Dev"
   # Verify applicationId is com.syncwarp.app.dev
   ```

5. **Test Android Staging Build:**
   ```bash
   npm run build:android:staging
   # Verify AAB and APK are created
   # Install APK on device and test
   ```

6. **Test Android Production Build:**
   ```bash
   npm run build:android:prod
   # Verify production build completes
   ```

7. **Test Multiple Apps Side-by-Side:**
   - Install dev, staging, and prod builds on the same device
   - Verify all three apps show with different names
   - Verify all three can run simultaneously
   - Verify each connects to correct API endpoint

---

## 📚 Documentation

### **File:** `docs/build-system.md`

```markdown
# Multi-Environment Build System

## Overview
SyncWarp uses a multi-environment build system that supports development, staging, and production builds for both iOS and Android.

## Quick Build Commands

### iOS
```bash
npm run ios:dev          # Open Xcode with dev config
npm run ios:staging      # Open Xcode with staging config
npm run ios:prod         # Open Xcode with prod config

npm run build:ios:prod   # Build production IPA
```

### Android
```bash
npm run android:dev      # Open Android Studio with dev flavor
npm run android:staging  # Open Android Studio with staging flavor
npm run android:prod     # Open Android Studio with prod flavor

npm run build:android:prod  # Build production AAB/APK
```

## iOS Configuration

### Bundle Identifiers
- **Development:** com.syncwarp.app.dev
- **Staging:** com.syncwarp.app.staging
- **Production:** com.syncwarp.app

### Schemes
- App (Development)
- App (Staging)
- App

### Signing
Each environment requires its own provisioning profile and signing certificate.

## Android Configuration

### Application IDs
- **Development:** com.syncwarp.app.dev
- **Staging:** com.syncwarp.app.staging
- **Production:** com.syncwarp.app

### Product Flavors
- dev
- staging
- prod

### Build Variants
Combining flavors with build types creates:
- devDebug, devRelease
- stagingDebug, stagingRelease
- prodDebug, prodRelease

## CI/CD Pipeline

### GitHub Actions Workflows
- `.github/workflows/build-ios.yml` - Automated iOS builds
- `.github/workflows/build-android.yml` - Automated Android builds

### Required Secrets
Set these in GitHub repository settings:

**Development:**
- VITE_API_URL_dev
- VITE_SUPABASE_URL_dev
- VITE_SUPABASE_ANON_KEY_dev

**Staging:**
- VITE_API_URL_staging
- VITE_SUPABASE_URL_staging
- VITE_SUPABASE_ANON_KEY_staging

**Production:**
- VITE_API_URL_prod
- VITE_SUPABASE_URL_prod
- VITE_SUPABASE_ANON_KEY_prod

## Version Management

### Bump Version
```bash
./scripts/bump-version.sh
```

This will:
1. Update package.json version
2. Prompt for manual iOS/Android version updates
3. Guide you through committing and tagging

### Version Numbering
- **Semantic Versioning:** MAJOR.MINOR.PATCH (e.g., 1.2.3)
- **iOS CFBundleVersion:** Build number (increments with each build)
- **Android versionCode:** Integer that increments with each release

## Build Artifacts

### iOS
- **Debug:** .app file
- **Release:** .xcarchive and .ipa files
- **Location:** `ios/App/build/`

### Android
- **Debug APK:** `android/app/build/outputs/apk/[flavor]/debug/`
- **Release APK:** `android/app/build/outputs/apk/[flavor]/release/`
- **Release AAB:** `android/app/build/outputs/bundle/[flavor]Release/`

## Troubleshooting

### iOS Build Fails
- Clean build folder: Product → Clean Build Folder
- Delete derived data: ~/Library/Developer/Xcode/DerivedData
- Reinstall pods: `cd ios/App && pod deintegrate && pod install`

### Android Build Fails
- Clean project: `cd android && ./gradlew clean`
- Invalidate caches in Android Studio
- Check Java version: `java -version` (should be 17)

### Wrong Environment Being Built
- Check VITE_APP_ENV environment variable
- Verify .env.[environment] file exists
- Clear build cache: `rm -rf dist node_modules/.vite`
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| iOS build uses wrong bundle ID | Check scheme configuration in Xcode Build Settings |
| Android flavor not found | Clean and rebuild: `cd android && ./gradlew clean` |
| Build script permission denied | Make executable: `chmod +x scripts/*.sh` |
| CocoaPods installation fails | Run `pod repo update` then `pod install` |
| Gradle build fails | Check Java version (should be 17), clear Gradle cache |
| CI/CD secrets not working | Verify secret names match format: `VITE_*_[environment]` |
| Multiple apps conflict | Ensure each has unique bundle ID / application ID |

---

## 📝 Git Commit

```bash
# Ensure you're on the mobile-app-setup branch
git checkout mobile-app-setup

# Stage build system files
git add android/app/build.gradle
git add ios/App/App/Info.plist
git add package.json
git add scripts/build-ios.sh
git add scripts/build-android.sh
git add scripts/bump-version.sh
git add .github/workflows/build-ios.yml
git add .github/workflows/build-android.yml
git add docs/build-system.md

# Commit with descriptive message
git commit -m "feat: implement multi-environment build system

- Configure iOS schemes for dev, staging, and prod
- Set up iOS bundle identifiers for each environment
- Configure Android product flavors (dev, staging, prod)
- Create automated build scripts for iOS and Android
- Add npm scripts for environment-specific builds
- Implement CI/CD pipelines with GitHub Actions
- Create version management script
- Document build system and troubleshooting

Story: 7.5.4
Status: Completed"

# Push to remote
git push origin mobile-app-setup
```

---

## ✅ Definition of Done

- [x] iOS Xcode schemes configured for all environments
- [x] iOS bundle identifiers set correctly
- [x] Android product flavors configured
- [x] Android applicationId set for each flavor
- [x] Build scripts created and tested
- [x] NPM scripts updated for all build combinations
- [x] CI/CD pipelines configured with GitHub Actions
- [x] Version management script implemented
- [x] All builds tested on physical devices
- [x] Multiple apps can run side-by-side
- [x] Documentation created and reviewed
- [x] Code committed to `mobile-app-setup` branch
- [x] Story marked as completed in project tracker

---

**Story Status:** ✅ Ready for Implementation  
**Estimated Time:** 6-8 hours  
**Dependencies:** Story 7.5.3 (Environment Configuration Files)  
**Next Story:** 7.5.5 (Vitest Mobile Testing Setup)
