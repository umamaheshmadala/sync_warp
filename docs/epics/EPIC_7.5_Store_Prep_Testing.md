# Epic 7.5: App Store Preparation, Testing & Environment Management 🟢 IN PROGRESS

**Goal**: Prepare professional app store assets, configure multi-environment builds, and implement comprehensive testing before app store submission.

**Progress**: 4/8 stories completed (50%)

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

## Story 7.5.2: App Permissions Configuration ✅ COMPLETE
**What you'll see**: Proper permissions declared for iOS and Android.

**What needs to be built**:
- [x] Add Android permissions to AndroidManifest.xml
- [x] Add iOS permission descriptions to Info.plist
- [x] Document why each permission is needed
- [x] Test permission requests
- [x] Handle permission denial gracefully

**Time Estimate**: 2-3 hours

---

## Story 7.5.3: Environment Configuration Files ✅ COMPLETE
**What you'll see**: Separate configs for development, staging, and production.

**What needs to be built**:
- [x] Create .env.development
- [x] Create .env.staging
- [x] Create .env.production
- [x] Update capacitor.config.ts for dynamic environments
- [x] Add environment to .gitignore
- [x] Document environment setup

**Time Estimate**: 2-3 hours

---

## Story 7.5.4: Multi-Environment Build System ✅ COMPLETE
**What you'll see**: Fully separated dev/staging/prod builds for iOS and Android with one-command automation.

**What needs to be built**:
- [x] NPM scripts
  - Add `build:dev`, `build:staging`, `build:prod`
  - Add `mobile:sync:dev`, `mobile:sync:staging`, `mobile:sync:prod`
  - Add convenience open commands for Android/iOS per env
- [x] iOS bundle identifiers per environment (Xcode)
  - Debug: `com.syncapp.mobile.dev`
  - Staging: `com.syncapp.mobile.staging`
  - Release: `com.syncapp.mobile`
  - Verify all 3 can be installed side-by-side
- [x] Android build flavors in `android/app/build.gradle`
  - Add flavor dimension and product flavors (dev/staging/prod)
  - Different app names via `resValue`
  - Verify Gradle tasks build each flavor
- [x] CI/CD build scripts
  - Bash script for Mac/Linux: `scripts/build-mobile.sh`
  - PowerShell script for Windows: `scripts/Build-Mobile.ps1`
  - Make bash script executable and document usage
- [x] Test all build variants on device/emulator

**Android flavors snippet (build.gradle)**:
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

**Mac/Linux CI script (create `scripts/build-mobile.sh`)**:
```bash
#!/bin/bash
# Usage: ./scripts/build-mobile.sh [dev|staging|prod] [ios|android]
set -e
ENV=${1:-dev}
PLATFORM=${2:-android}
npm run build:$ENV
npx cap sync $PLATFORM
if [ "$PLATFORM" = "android" ]; then
  (cd android && \
    [ "$ENV" = "prod" ] && ./gradlew assembleProdRelease || \
    [ "$ENV" = "staging" ] && ./gradlew assembleStagingRelease || \
    ./gradlew assembleDevDebug)
else
  npx cap open ios
fi
```

**Windows CI script (create `scripts/Build-Mobile.ps1`)**:
```powershell
param([ValidateSet('dev','staging','prod')]$Env='dev', [ValidateSet('android','ios')]$Platform='android')
npm run "build:$Env"
npx cap sync $Platform
if ($Platform -eq 'android') { npx cap open android } else { npx cap open ios }
```

**Time Estimate**: 6-8 hours

---

## Story 7.5.5: Vitest Mobile Testing Setup ✅ COMPLETE
**What you'll see**: Unit tests configured for mobile platform simulation with Capacitor mocks.

**What needs to be built**:
- [x] Update `vitest.config.ts` to use jsdom and `setupFiles`
- [x] Create `src/test/setup.ts` with Capacitor mocks
- [x] Mock `@capacitor/core`, `@capacitor/preferences`, `@capacitor/push-notifications`
- [x] Simulate mobile viewport via `window.matchMedia`
- [x] Add scripts: `test:mobile:unit`, `test:mobile:watch`, `test:mobile:pre-build`
- [x] Create at least one sample test for a mobile hook/component

**Setup file example (`src/test/setup.ts`)**:
```typescript
import { vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
    isPluginAvailable: () => false
  }
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: vi.fn(), set: vi.fn(), remove: vi.fn() }
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn()
  }
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(q => ({
    matches: q === '(max-width: 768px)',
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});
```

**Time Estimate**: 5-7 hours

---

## Story 7.5.6: Playwright Mobile Device Testing ⚪ PLANNED
**What you'll see**: E2E tests on realistic mobile device profiles with offline simulation.

**What needs to be built**:
- [ ] Update `playwright.config.ts` with devices: Pixel 5, iPhone 12, iPad Pro
- [ ] Configure `webServer` to reuse local dev server
- [ ] Create `e2e/mobile-flow.spec.ts` covering menu, login tap, offline banner
- [ ] Add scripts: `test:e2e:mobile`, `test:e2e:all-mobile`
- [ ] Run tests on all mobile projects in CI

**Devices config (`playwright.config.ts`)**:
```typescript
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
    { name: 'iPad', use: { ...devices['iPad Pro'] } }
  ]
});
```

**Sample test (`e2e/mobile-flow.spec.ts`)**:
```typescript
import { test, expect } from '@playwright/test';

test('mobile basic flow + offline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Mobile menu')).toBeVisible();
  await page.tap('[aria-label="Login"]');
  await page.context().setOffline(true);
  await expect(page.locator('.offline-banner')).toBeVisible();
  await page.context().setOffline(false);
});
```

**Time Estimate**: 6-8 hours

---

## Story 7.5.7: Pre-Flight Check Automation ⚪ PLANNED
**What you'll see**: Automated script that validates quality gates before store submission.

**What needs to be built**:
- [ ] Create `scripts/preflight-check.sh` (Linux/Mac) with:
  - Unit tests (Vitest), TypeScript, Lint, Prod build, Required files checks
  - Color-coded output and non-zero exit on failure
- [ ] Add `preflight` npm script to run the checker
- [ ] Document when to run (before any store submission)

**Script example (`scripts/preflight-check.sh`)**:
```bash
#!/bin/bash
set -e
FAILED=0
npm run test:mobile:unit || FAILED=1
npm run type-check || FAILED=1
npm run lint || FAILED=1
npm run build:prod || FAILED=1
for f in dist/index.html public/privacy-policy.html public/terms-of-service.html; do
  [ -f "$f" ] || FAILED=1
done
exit $FAILED
```

**Time Estimate**: 3-5 hours

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
**Estimated Timeline**: 3-3.5 weeks (27-38 hours)

**Deliverables**:
1. Professional app icons and splash screens
2. Proper permissions configured
3. Multi-environment build system (with iOS bundle IDs, Android flavors)
4. Vitest mobile unit testing (with Capacitor mocks)
5. Playwright mobile E2E testing (mobile device configs)
6. Automated pre-flight checks (scripted)
7. Privacy policy and terms
8. Complete app store preparation

**User Impact**: Professional, tested mobile apps ready for App Store and Google Play submission

**Next Epic**: EPIC 7.6 - App Store Deployment & Release
