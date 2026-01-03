# Epic 7.1: Capacitor Setup & Mobile Platform Integration ⚪ PLANNED

**Goal**: Set up Capacitor framework and create native iOS/Android projects from the existing web app.

**Progress**: 0/6 stories completed (0%)

**Dependencies**: Epic 1-6 must be complete (web app fully functional)

---

## Story 7.1.1: Environment Preparation & Capacitor Installation ⚪ PLANNED
**What you'll see**: Capacitor installed and project initialized with proper configuration.

**User Experience**:
- As a developer, I can verify Node.js and npm versions are compatible
- As a developer, I can run Capacitor CLI commands
- As a developer, I can see capacitor.config.ts created in project root
- As a developer, I can build the web app successfully

**What needs to be built**:
- [ ] Verify Node.js 18+ and npm 8+ installed
- [ ] Install Capacitor CLI globally
- [ ] Create git branch `mobile-app-setup`
- [ ] Install @capacitor/core and @capacitor/cli packages
- [ ] Run `npx cap init` with app configuration
- [ ] Create capacitor.config.ts with proper settings
- [ ] Audit current build to ensure it completes successfully
- [ ] Document any build errors and fix them

**Files to Create/Modify**:
- `capacitor.config.ts` - Capacitor configuration
- `package.json` - Add Capacitor dependencies
- `.gitignore` - Ignore platform-specific files

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ Capacitor CLI installed and working
- ✅ capacitor.config.ts created with correct app ID
- ✅ Web app builds without errors to dist/ folder
- ✅ Git branch created and initial commit made

---

## Story 7.1.2: iOS Platform Setup ⚪ PLANNED
**What you'll see**: Native iOS project created and viewable in Xcode.

**User Experience**:
- As a developer, I can open the iOS project in Xcode
- As a developer, I can see the app structure in ios/ folder
- As a developer, I can run the app on iOS simulator
- As a user, I can see the web app running inside iOS app

**What needs to be built**:
- [ ] Install @capacitor/ios package
- [ ] Run `npx cap add ios`
- [ ] Verify ios/ folder created with Xcode project
- [ ] Configure iOS app settings (bundle ID, display name)
- [ ] Set up iOS splash screen configuration
- [ ] Test build on iOS simulator (Mac only)
- [ ] Document iOS-specific requirements

**Files to Create/Modify**:
- `ios/` folder - Native iOS project
- `capacitor.config.ts` - iOS-specific settings
- `package.json` - Add iOS platform dependency

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ iOS project created successfully
- ✅ Xcode can open the project without errors
- ✅ App runs on iOS simulator showing web content
- ✅ Bundle ID correctly set to com.syncapp.mobile

**Note**: Requires Mac with Xcode installed

---

## Story 7.1.3: Android Platform Setup ⚪ PLANNED
**What you'll see**: Native Android project created and viewable in Android Studio.

**User Experience**:
- As a developer, I can open the Android project in Android Studio
- As a developer, I can see the app structure in android/ folder
- As a developer, I can run the app on Android emulator
- As a user, I can see the web app running inside Android app

**What needs to be built**:
- [ ] Install @capacitor/android package
- [ ] Run `npx cap add android`
- [ ] Verify android/ folder created with Gradle project
- [ ] Configure Android app settings (app ID, display name)
- [ ] Set up Android splash screen configuration
- [ ] Install Android SDK components if needed
- [ ] Test build on Android emulator
- [ ] Document Android-specific requirements

**Files to Create/Modify**:
- `android/` folder - Native Android project
- `capacitor.config.ts` - Android-specific settings
- `package.json` - Add Android platform dependency
- `android/app/build.gradle` - Android build configuration

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ Android project created successfully
- ✅ Android Studio can open project without errors
- ✅ App runs on emulator showing web content
- ✅ Application ID correctly set to com.syncapp.mobile

**Note**: Requires Android Studio and JDK 11+ installed

---

## Story 7.1.4: Mobile Build Scripts & Workflow ⚪ PLANNED
**What you'll see**: Convenient npm scripts for building and syncing mobile apps.

**User Experience**:
- As a developer, I can run one command to build and sync
- As a developer, I can quickly open iOS/Android projects
- As a developer, I can update mobile apps after web changes
- As a developer, I have a documented workflow to follow

**What needs to be built**:
- [ ] Add mobile:sync script to package.json
- [ ] Add mobile:ios script to open Xcode
- [ ] Add mobile:android script to open Android Studio
- [ ] Add mobile:update script for quick syncs
- [ ] Create documentation for mobile workflow
- [ ] Test all scripts work correctly
- [ ] Add mobile:live-reload script for development

**Files to Create/Modify**:
- `package.json` - Add mobile development scripts
- `docs/MOBILE_WORKFLOW.md` - Developer documentation

**Scripts to Add**:
```json
{
  "mobile:sync": "npm run build && npx cap sync",
  "mobile:ios": "npm run mobile:sync && npx cap open ios",
  "mobile:android": "npm run mobile:sync && npx cap open android",
  "mobile:update": "npm run build && npx cap copy",
  "mobile:live-reload": "npx cap run android --livereload --external"
}
```

**Time Estimate**: 1-2 hours

**Acceptance Criteria**:
- ✅ All mobile scripts work correctly
- ✅ Documentation created for mobile workflow
- ✅ Developers can build and test mobile apps easily
- ✅ Live reload works for faster development

---

## Story 7.1.5: Mobile Platform Detection & Hooks ⚪ PLANNED
**What you'll see**: App can detect when running as native mobile vs web browser.

**User Experience**:
- As a developer, I can check if app is running on mobile
- As a developer, I can conditionally show mobile-specific features
- As a user, I see platform-appropriate UI
- As a user, mobile-specific features work correctly

**What needs to be built**:
- [ ] Create usePlatform hook for platform detection
- [ ] Add Capacitor.isNativePlatform() checks
- [ ] Add platform-specific conditional rendering
- [ ] Update index.html with mobile meta tags
- [ ] Test platform detection on web, iOS, Android
- [ ] Document how to use platform detection

**Files to Create/Modify**:
- `src/hooks/usePlatform.ts` - Platform detection hook
- `index.html` - Mobile-optimized meta tags
- Update components that need mobile-specific behavior

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ usePlatform hook created and working
- ✅ App detects iOS, Android, web correctly
- ✅ Mobile meta tags added to index.html
- ✅ Components can conditionally render based on platform
- ✅ No errors when running on any platform

---

## Story 7.1.6: Mobile Supabase Configuration ⚪ PLANNED
**What you'll see**: Supabase authentication and data work correctly on mobile.

**User Experience**:
- As a user, I can log in on mobile apps
- As a user, my session persists after closing the app
- As a user, data loads correctly on mobile
- As a user, I don't see authentication errors

**What needs to be built**:
- [ ] Update Supabase client for mobile compatibility
- [ ] Configure auth storage for native platforms
- [ ] Disable detectSessionInUrl on mobile
- [ ] Test authentication on iOS and Android
- [ ] Test data fetching on mobile
- [ ] Fix any mobile-specific issues
- [ ] Document mobile Supabase configuration

**Files to Create/Modify**:
- `src/lib/supabase.ts` - Mobile-optimized configuration

**Configuration Changes**:
```typescript
const supabaseConfig = {
  auth: {
    storage: Capacitor.isNativePlatform() 
      ? undefined // Use native storage
      : window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform()
  }
};
```

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ Users can log in on iOS and Android
- ✅ Sessions persist across app restarts
- ✅ Data loads correctly on all platforms
- ✅ No authentication errors on mobile
- ✅ Supabase client properly configured

---

## Epic 7.1 Summary

**Total Stories**: 6 stories
**Status**: ⚪ Ready to start after Epic 1-6 complete
**Prerequisites**: 
- Web app fully functional and tested
- Development environment set up (Xcode for iOS, Android Studio for Android)
- Git branch created for mobile work

**Estimated Timeline**: 1.5-2 weeks (12-17 hours)

**Deliverables**:
1. Capacitor installed and configured
2. iOS and Android projects created
3. Mobile build scripts working
4. Platform detection implemented
5. Supabase configured for mobile
6. App running on iOS and Android emulators

**User Impact**: Foundation for mobile apps - users can now install native apps on iOS and Android devices

**Next Epic**: EPIC 7.2 - Supabase Mobile Coordination & Security
