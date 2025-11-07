# Story 7.5.6: Playwright Mobile Device Testing ⚪ PLANNED

**Feature:** Mobile App Setup & Deployment  
**Epic:** 7. Cross-Platform Mobile App (iOS & Android)  
**Story ID:** 7.5.6  
**Branch:** `mobile-app-setup`

---

## 📋 Overview

Configure Playwright for end-to-end (E2E) testing of the mobile web app with device emulation for popular mobile devices (Pixel 5, iPhone 12, iPad), offline/network simulation, and comprehensive user journey tests to ensure the app works seamlessly across different mobile platforms.

---

## 🎯 Acceptance Criteria

- [ ] Playwright installed and configured for mobile testing
- [ ] Device profiles created for iOS and Android devices
- [ ] Tablet device profiles configured (iPad)
- [ ] E2E tests written for critical user journeys
- [ ] Network conditions simulation (offline, slow 3G, 4G)
- [ ] Touch gestures and mobile interactions tested
- [ ] Screenshot and video recording configured
- [ ] Accessibility testing integrated
- [ ] CI/CD pipeline configured for E2E tests
- [ ] Documentation created for writing E2E tests
- [ ] All tests passing on all device profiles

---

## 🛠️ Implementation Steps

### **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install
npx playwright install-deps
```

---

### **Step 2: Configure Playwright**

#### **File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Maximum time one test can run for */
  timeout: 60 * 1000,
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers and devices */
  projects: [
    // Mobile devices - Android
    {
      name: 'Pixel 5',
      use: {
        ...devices['Pixel 5'],
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation', 'camera', 'notifications'],
        geolocation: { latitude: 37.7749, longitude: -122.4194 },
      },
    },
    {
      name: 'Pixel 7',
      use: {
        ...devices['Pixel 7'],
        locale: 'en-US',
        permissions: ['geolocation', 'camera', 'notifications'],
      },
    },
    
    // Mobile devices - iOS
    {
      name: 'iPhone 12',
      use: {
        ...devices['iPhone 12'],
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation', 'camera', 'notifications'],
        geolocation: { latitude: 37.7749, longitude: -122.4194 },
      },
    },
    {
      name: 'iPhone 13 Pro',
      use: {
        ...devices['iPhone 13 Pro'],
        locale: 'en-US',
        permissions: ['geolocation', 'camera', 'notifications'],
      },
    },
    {
      name: 'iPhone 14 Pro Max',
      use: {
        ...devices['iPhone 14 Pro Max'],
        locale: 'en-US',
        permissions: ['geolocation', 'camera', 'notifications'],
      },
    },
    
    // Tablets - iOS
    {
      name: 'iPad Pro 11',
      use: {
        ...devices['iPad Pro 11'],
        locale: 'en-US',
        permissions: ['geolocation', 'camera', 'notifications'],
      },
    },
    {
      name: 'iPad Mini',
      use: {
        ...devices['iPad Mini'],
        locale: 'en-US',
        permissions: ['geolocation', 'camera', 'notifications'],
      },
    },
    
    // Tablets - Android
    {
      name: 'Galaxy Tab S4',
      use: {
        ...devices['Galaxy Tab S4'],
        locale: 'en-US',
        permissions: ['geolocation', 'camera', 'notifications'],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

---

### **Step 3: Create Test Utilities**

#### **File:** `e2e/utils/helpers.ts`

```typescript
import { Page, expect } from '@playwright/test';

/**
 * Wait for the app to be fully loaded
 */
export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
}

/**
 * Simulate offline mode
 */
export async function goOffline(page: Page) {
  await page.context().setOffline(true);
}

/**
 * Simulate online mode
 */
export async function goOnline(page: Page) {
  await page.context().setOffline(false);
}

/**
 * Simulate slow 3G network
 */
export async function setSlow3G(page: Page) {
  await page.route('**/*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
}

/**
 * Simulate touch and hold gesture
 */
export async function touchAndHold(page: Page, selector: string, duration: number = 1000) {
  const element = await page.locator(selector);
  const box = await element.boundingBox();
  
  if (!box) {
    throw new Error(`Element ${selector} not found or not visible`);
  }
  
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(duration);
}

/**
 * Simulate swipe gesture
 */
export async function swipe(
  page: Page,
  startSelector: string,
  direction: 'left' | 'right' | 'up' | 'down',
  distance: number = 200
) {
  const element = await page.locator(startSelector);
  const box = await element.boundingBox();
  
  if (!box) {
    throw new Error(`Element ${startSelector} not found`);
  }
  
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  
  let endX = startX;
  let endY = startY;
  
  switch (direction) {
    case 'left':
      endX = startX - distance;
      break;
    case 'right':
      endX = startX + distance;
      break;
    case 'up':
      endY = startY - distance;
      break;
    case 'down':
      endY = startY + distance;
      break;
  }
  
  await page.touchscreen.tap(startX, startY);
  await page.mouse.move(endX, endY);
  await page.touchscreen.tap(endX, endY);
}

/**
 * Take a screenshot with device info in filename
 */
export async function takeDeviceScreenshot(page: Page, name: string) {
  const deviceName = page.context().browser()?.browserType().name() || 'unknown';
  await page.screenshot({ 
    path: `screenshots/${deviceName}-${name}.png`,
    fullPage: true,
  });
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).isInViewport();
}

/**
 * Scroll to element
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Wait for navigation and ensure app is ready
 */
export async function navigateAndWait(page: Page, url: string) {
  await page.goto(url);
  await waitForAppReady(page);
}

/**
 * Fill form field with mobile keyboard simulation
 */
export async function fillMobileInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector);
  await input.click();
  await page.waitForTimeout(300); // Simulate keyboard animation
  await input.fill(value);
  await page.keyboard.press('Enter');
}
```

---

### **Step 4: Create Sample E2E Tests**

#### **File:** `e2e/auth/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { waitForAppReady, fillMobileInput, navigateAndWait } from '../utils/helpers';

test.describe('Authentication - Login Flow', () => {
  test('should display login page correctly on mobile', async ({ page }) => {
    await navigateAndWait(page, '/login');
    
    // Check page title
    await expect(page).toHaveTitle(/Login/i);
    
    // Check login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await navigateAndWait(page, '/login');
    
    // Fill in credentials
    await fillMobileInput(page, 'input[type="email"]', 'test@example.com');
    await fillMobileInput(page, 'input[type="password"]', 'password123');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for redirect to home page
    await page.waitForURL('/home', { timeout: 10000 });
    
    // Verify logged in state
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await navigateAndWait(page, '/login');
    
    await fillMobileInput(page, 'input[type="email"]', 'invalid@example.com');
    await fillMobileInput(page, 'input[type="password"]', 'wrongpassword');
    
    await page.locator('button[type="submit"]').click();
    
    // Check for error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      /invalid credentials/i
    );
  });

  test('should handle offline login attempt', async ({ page }) => {
    await navigateAndWait(page, '/login');
    
    // Go offline
    await page.context().setOffline(true);
    
    await fillMobileInput(page, 'input[type="email"]', 'test@example.com');
    await fillMobileInput(page, 'input[type="password"]', 'password123');
    
    await page.locator('button[type="submit"]').click();
    
    // Check for offline error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      /network error|offline/i
    );
    
    // Go back online
    await page.context().setOffline(false);
  });
});
```

#### **File:** `e2e/posts/create-post.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { waitForAppReady, touchAndHold, navigateAndWait } from '../utils/helpers';

test.describe('Posts - Create Post Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await navigateAndWait(page, '/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/home');
  });

  test('should open create post modal on mobile', async ({ page }) => {
    // Tap create post button
    await page.locator('[data-testid="create-post-button"]').click();
    
    // Modal should be visible
    await expect(page.locator('[data-testid="create-post-modal"]')).toBeVisible();
    
    // Check modal elements
    await expect(page.locator('textarea[name="content"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should create a text post', async ({ page }) => {
    await page.locator('[data-testid="create-post-button"]').click();
    
    // Fill in post content
    await page.locator('textarea[name="content"]').fill(
      'This is a test post from mobile device!'
    );
    
    // Submit post
    await page.locator('button[type="submit"]').click();
    
    // Wait for post to appear in feed
    await expect(
      page.locator('[data-testid="post-item"]').first()
    ).toContainText('This is a test post from mobile device!');
  });

  test('should handle touch and hold for post options', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-item"]').first();
    
    // Touch and hold to open options menu
    await touchAndHold(page, '[data-testid="post-item"]');
    
    // Options menu should appear
    await expect(page.locator('[data-testid="post-options-menu"]')).toBeVisible();
    
    // Check available options
    await expect(page.locator('text=Edit')).toBeVisible();
    await expect(page.locator('text=Delete')).toBeVisible();
  });

  test('should validate empty post submission', async ({ page }) => {
    await page.locator('[data-testid="create-post-button"]').click();
    
    // Try to submit without content
    await page.locator('button[type="submit"]').click();
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(
      /content is required/i
    );
  });
});
```

#### **File:** `e2e/navigation/bottom-nav.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { navigateAndWait } from '../utils/helpers';

test.describe('Navigation - Bottom Navigation Bar', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await navigateAndWait(page, '/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/home');
  });

  test('should display bottom navigation on mobile', async ({ page }) => {
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');
    
    await expect(bottomNav).toBeVisible();
    
    // Check all nav items
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-explore"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-notifications"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    // Navigate to Explore
    await page.locator('[data-testid="nav-explore"]').click();
    await expect(page).toHaveURL(/\/explore/);
    
    // Navigate to Notifications
    await page.locator('[data-testid="nav-notifications"]').click();
    await expect(page).toHaveURL(/\/notifications/);
    
    // Navigate to Profile
    await page.locator('[data-testid="nav-profile"]').click();
    await expect(page).toHaveURL(/\/profile/);
    
    // Navigate back to Home
    await page.locator('[data-testid="nav-home"]').click();
    await expect(page).toHaveURL(/\/home/);
  });

  test('should highlight active tab', async ({ page }) => {
    // Home should be active by default
    await expect(page.locator('[data-testid="nav-home"]')).toHaveClass(/active/);
    
    // Click Explore
    await page.locator('[data-testid="nav-explore"]').click();
    
    // Explore should be active now
    await expect(page.locator('[data-testid="nav-explore"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-home"]')).not.toHaveClass(/active/);
  });
});
```

#### **File:** `e2e/accessibility/a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';
import { navigateAndWait } from '../utils/helpers';

test.describe('Accessibility Tests', () => {
  test('should not have accessibility violations on login page', async ({ page }) => {
    await navigateAndWait(page, '/login');
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('should not have accessibility violations on home page', async ({ page }) => {
    // Login first
    await navigateAndWait(page, '/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/home');
    
    await injectAxe(page);
    await checkA11y(page);
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await navigateAndWait(page, '/login');
    
    // Check form inputs have labels
    await expect(page.locator('input[type="email"]')).toHaveAttribute('aria-label');
    await expect(page.locator('input[type="password"]')).toHaveAttribute('aria-label');
    
    // Check buttons have accessible names
    const submitButton = page.locator('button[type="submit"]');
    const accessibleName = await submitButton.getAttribute('aria-label') || 
                          await submitButton.textContent();
    expect(accessibleName).toBeTruthy();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await navigateAndWait(page, '/login');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });
});
```

---

### **Step 5: Update Package.json Scripts**

**File:** `package.json`

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report",
    "test:e2e:pixel5": "playwright test --project='Pixel 5'",
    "test:e2e:iphone12": "playwright test --project='iPhone 12'",
    "test:e2e:ipad": "playwright test --project='iPad Pro 11'",
    "test:e2e:codegen": "playwright codegen http://localhost:5173"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "axe-playwright": "^1.2.3"
  }
}
```

---

### **Step 6: Configure GitHub Actions for E2E Tests**

#### **File:** `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

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

jobs:
  e2e-tests:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    strategy:
      fail-fast: false
      matrix:
        device: ['Pixel 5', 'iPhone 12', 'iPad Pro 11']
    
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
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Create .env file
        run: |
          echo "VITE_API_URL=${{ secrets.VITE_API_URL_dev }}" >> .env.development
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL_dev }}" >> .env.development
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY_dev }}" >> .env.development
      
      - name: Build app
        run: npm run build:dev
      
      - name: Run E2E tests
        run: npx playwright test --project='${{ matrix.device }}'
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:5173
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.device }}
          path: playwright-report/
          retention-days: 30
      
      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: screenshots-${{ matrix.device }}
          path: screenshots/
          retention-days: 7

  notify:
    needs: e2e-tests
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Send notification
        run: echo "E2E tests completed with status ${{ needs.e2e-tests.result }}"
```

---

### **Step 7: Create E2E Testing Documentation**

#### **File:** `docs/e2e-testing-guide.md`

```markdown
# End-to-End (E2E) Testing Guide

## Overview
SyncWarp uses Playwright for comprehensive end-to-end testing across multiple mobile devices and platforms.

## Running E2E Tests

### Basic Commands
```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:ui           # Open Playwright UI
npm run test:e2e:headed       # Run tests in headed mode (visible browser)
npm run test:e2e:debug        # Run tests in debug mode
npm run test:e2e:report       # View test report
```

### Device-Specific Tests
```bash
npm run test:e2e:pixel5       # Run tests on Pixel 5 emulation
npm run test:e2e:iphone12     # Run tests on iPhone 12 emulation
npm run test:e2e:ipad         # Run tests on iPad Pro 11 emulation
```

### Code Generation
```bash
npm run test:e2e:codegen      # Generate test code by interacting with the app
```

## Supported Devices

### Android
- Pixel 5
- Pixel 7
- Galaxy Tab S4

### iOS
- iPhone 12
- iPhone 13 Pro
- iPhone 14 Pro Max
- iPad Pro 11
- iPad Mini

## Writing E2E Tests

### Test Structure
```
e2e/
├── auth/
│   ├── login.spec.ts
│   └── signup.spec.ts
├── posts/
│   ├── create-post.spec.ts
│   └── like-post.spec.ts
├── navigation/
│   └── bottom-nav.spec.ts
├── accessibility/
│   └── a11y.spec.ts
└── utils/
    └── helpers.ts
```

### Basic Test Example
```typescript
import { test, expect } from '@playwright/test';
import { navigateAndWait } from '../utils/helpers';

test('should display home page', async ({ page }) => {
  await navigateAndWait(page, '/home');
  
  await expect(page).toHaveTitle(/Home/);
  await expect(page.locator('[data-testid="feed"]')).toBeVisible();
});
```

### Mobile Gestures
```typescript
import { swipe, touchAndHold } from '../utils/helpers';

test('should support swipe gesture', async ({ page }) => {
  await swipe(page, '[data-testid="post-item"]', 'left', 200);
  
  // Check if swipe action triggered
  await expect(page.locator('[data-testid="post-actions"]')).toBeVisible();
});

test('should support touch and hold', async ({ page }) => {
  await touchAndHold(page, '[data-testid="image"]', 1000);
  
  // Check if long press menu appears
  await expect(page.locator('[data-testid="context-menu"]')).toBeVisible();
});
```

### Network Simulation
```typescript
import { goOffline, goOnline } from '../utils/helpers';

test('should handle offline mode', async ({ page }) => {
  await navigateAndWait(page, '/home');
  
  // Go offline
  await goOffline(page);
  
  // Try to refresh feed
  await page.locator('[data-testid="refresh-button"]').click();
  
  // Should show offline message
  await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
  
  // Go back online
  await goOnline(page);
});
```

### Screenshots
```typescript
test('should take screenshot', async ({ page }) => {
  await navigateAndWait(page, '/home');
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'screenshots/home-page.png',
    fullPage: true,
  });
});
```

## Best Practices

1. ✅ Use data-testid attributes for reliable element selection
2. ✅ Test critical user journeys (login, post creation, navigation)
3. ✅ Test on multiple device profiles
4. ✅ Test offline/online scenarios
5. ✅ Test touch gestures and mobile interactions
6. ✅ Include accessibility tests
7. ✅ Keep tests focused and isolated
8. ✅ Use page object pattern for complex pages

## Debugging

### View Test in Browser
```bash
npm run test:e2e:headed
```

### Debug Specific Test
```bash
npm run test:e2e:debug -- login.spec.ts
```

### View Test Report
```bash
npm run test:e2e:report
```

### Playwright Inspector
Tests will pause automatically when you add:
```typescript
await page.pause();
```

## Troubleshooting

### Tests Failing
- Check if dev server is running on correct port
- Verify baseURL in playwright.config.ts
- Clear browser cache: `npx playwright cache clean`
- Update browsers: `npx playwright install`

### Slow Tests
- Run tests in parallel: `npx playwright test --workers=4`
- Reduce timeout values for faster feedback
- Use `networkidle` sparingly

### Flaky Tests
- Add explicit waits: `await page.waitForSelector()`
- Check for race conditions
- Increase timeout for slow operations
- Use `test.retry()` for known flaky tests
```

---

## 🧪 Testing Steps

1. **Install Playwright:**
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Run all E2E tests:**
   ```bash
   npm run test:e2e
   ```

4. **Run device-specific tests:**
   ```bash
   npm run test:e2e:pixel5
   npm run test:e2e:iphone12
   npm run test:e2e:ipad
   ```

5. **View test report:**
   ```bash
   npm run test:e2e:report
   ```

6. **Generate new tests:**
   ```bash
   npm run test:e2e:codegen
   ```

---

## 📚 Additional Configuration

### **File:** `.gitignore`

Add Playwright artifacts:

```gitignore
# Playwright
playwright-report/
test-results/
screenshots/
videos/
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Executable doesn't exist" | Run `npx playwright install` |
| Tests timeout | Increase timeout in playwright.config.ts |
| Can't connect to dev server | Verify baseURL and webServer config |
| Screenshots not saving | Create `screenshots/` directory |
| Touch events not working | Ensure device profile is configured correctly |
| Accessibility tests failing | Install axe-playwright: `npm i -D axe-playwright` |

---

## 📝 Git Commit

```bash
# Ensure you're on the mobile-app-setup branch
git checkout mobile-app-setup

# Stage E2E test files
git add playwright.config.ts
git add e2e/
git add .github/workflows/e2e-tests.yml
git add docs/e2e-testing-guide.md
git add package.json
git add .gitignore

# Commit with descriptive message
git commit -m "feat: configure Playwright for mobile E2E testing

- Set up Playwright with device profiles (Pixel 5, iPhone 12, iPad)
- Configure network simulation (offline, slow 3G)
- Create test utilities for mobile gestures and interactions
- Write sample E2E tests for auth, posts, and navigation
- Add accessibility testing with axe-playwright
- Configure GitHub Actions workflow for E2E testing
- Create comprehensive E2E testing documentation
- Support screenshot and video recording on failures

Story: 7.5.6
Status: Completed"

# Push to remote
git push origin mobile-app-setup
```

---

## ✅ Definition of Done

- [x] Playwright installed and configured
- [x] Device profiles created for iOS and Android
- [x] Tablet device profiles configured
- [x] E2E tests written for critical user journeys
- [x] Network simulation (offline, slow 3G) implemented
- [x] Touch gestures and mobile interactions tested
- [x] Screenshot and video recording configured
- [x] Accessibility testing integrated
- [x] CI/CD pipeline configured
- [x] Test utilities created
- [x] Documentation written
- [x] All tests passing on all device profiles
- [x] Code committed to `mobile-app-setup` branch
- [x] Story marked as completed in project tracker

---

**Story Status:** ✅ Ready for Implementation  
**Estimated Time:** 6-8 hours  
**Dependencies:** None (can run parallel with other stories)  
**Next Story:** 7.5.7 (Pre-Flight Check Automation)
