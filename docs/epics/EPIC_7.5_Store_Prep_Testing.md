# Epic 7.5: App Store Preparation, Testing & Environment Management ⚪ PLANNED

**Goal**: Prepare professional app store assets, configure multi-environment builds, and implement comprehensive testing before app store submission.

**Progress**: 0/8 stories completed (0%)

**Dependencies**: EPIC 7.1-7.4 substantially complete

---

## Story 7.5.1: App Icons & Splash Screens ⚪ PLANNED
**What you'll see**: Professional app icons and splash screens for iOS and Android.

**What needs to be built**:
- [ ] Design 1024x1024 app icon
- [ ] Generate all iOS icon sizes (using icon.kitchen)
- [ ] Generate all Android icon sizes
- [ ] Create 2732x2732 splash screen
- [ ] Configure splash screen plugin
- [ ] Test icons appear correctly

**Time Estimate**: 4-5 hours

---

## Story 7.5.2: App Permissions Configuration ⚪ PLANNED
**What you'll see**: Proper permissions declared for iOS and Android.

**What needs to be built**:
- [ ] Add Android permissions to AndroidManifest.xml
- [ ] Add iOS permission descriptions to Info.plist
- [ ] Document why each permission is needed
- [ ] Test permission requests
- [ ] Handle permission denial gracefully

**Time Estimate**: 2-3 hours

---

## Story 7.5.3: Environment Configuration Files ⚪ PLANNED
**What you'll see**: Separate configs for development, staging, and production.

**What needs to be built**:
- [ ] Create .env.development
- [ ] Create .env.staging
- [ ] Create .env.production
- [ ] Update capacitor.config.ts for dynamic environments
- [ ] Add environment to .gitignore
- [ ] Document environment setup

**Time Estimate**: 2-3 hours

---

## Story 7.5.4: Multi-Environment Build Scripts ⚪ PLANNED
**What you'll see**: One-command builds for dev/staging/prod environments.

**What needs to be built**:
- [ ] Add build:dev, build:staging, build:prod scripts
- [ ] Add mobile:sync:dev/staging/prod scripts
- [ ] Configure iOS build configurations
- [ ] Configure Android build flavors
- [ ] Create PowerShell build script (Windows)
- [ ] Test all build variants

**Time Estimate**: 3-4 hours

---

## Story 7.5.5: Vitest Mobile Testing Setup ⚪ PLANNED
**What you'll see**: Unit tests configured for mobile platform simulation.

**What needs to be built**:
- [ ] Configure vitest.config.ts for mobile
- [ ] Create test/setup.ts with Capacitor mocks
- [ ] Mock Capacitor plugins (Preferences, PushNotifications)
- [ ] Add mobile viewport tests
- [ ] Add test:mobile:unit script
- [ ] Document testing approach

**Time Estimate**: 3-4 hours

---

## Story 7.5.6: Playwright Mobile Device Testing ⚪ PLANNED
**What you'll see**: E2E tests running on simulated mobile devices.

**What needs to be built**:
- [ ] Update playwright.config.ts with mobile devices
- [ ] Add Pixel 5 configuration
- [ ] Add iPhone 12 configuration
- [ ] Add iPad Pro configuration
- [ ] Create mobile-specific E2E tests
- [ ] Test offline mode with Playwright

**Time Estimate**: 4-5 hours

---

## Story 7.5.7: Pre-Flight Check Automation ⚪ PLANNED
**What you'll see**: Automated script that validates app before submission.

**What needs to be built**:
- [ ] Create preflight-check.sh script
- [ ] Check unit tests pass
- [ ] Check TypeScript compiles
- [ ] Check linting passes
- [ ] Check production build succeeds
- [ ] Verify required files exist
- [ ] Document pre-flight checks

**Time Estimate**: 2-3 hours

---

## Story 7.5.8: Privacy Policy & Terms of Service ⚪ PLANNED
**What you'll see**: Legal documents required for app store submission.

**What needs to be built**:
- [ ] Create privacy-policy.html
- [ ] Create terms-of-service.html
- [ ] Host on public URL
- [ ] Add URLs to app store listings
- [ ] Document data collection practices

**Time Estimate**: 3-4 hours

---

## Epic 7.5 Summary

**Total Stories**: 8 stories
**Estimated Timeline**: 3-3.5 weeks (23-31 hours)

**Deliverables**:
1. Professional app icons and splash screens
2. Proper permissions configured
3. Multi-environment build system
4. Vitest mobile unit testing
5. Playwright mobile E2E testing
6. Automated pre-flight checks
7. Privacy policy and terms
8. Complete app store preparation

**User Impact**: Professional, tested mobile apps ready for App Store and Google Play submission

**Next Epic**: EPIC 7.6 - App Store Deployment & Release
