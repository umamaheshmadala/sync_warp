# Story 9.8.5: E2E Tests - User Journeys (Playwright)

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 3 days  
**MCP Usage:** 🤖 Playwright MCP (Heavy)  
**Dependencies:** Stories 9.8.1-9.8.4, Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Create end-to-end tests using Playwright to test complete user journeys across different browsers and devices. Test critical flows, cross-browser compatibility, mobile viewports, and visual regression.

---

## ✅ Acceptance Criteria

### User Journeys
- [ ] Complete journey: Signup → Search friends → Send request → Accept → Message
- [ ] Deal sharing flow: Browse deal → Share with friends → Friend receives notification
- [ ] PYMK flow: View suggestions → Dismiss → Send request
- [ ] Block/Unblock flow: Block user → Verify invisibility → Unblock → Verify visibility
- [ ] Privacy settings flow: Change settings → Verify enforcement

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, macOS only)
- [ ] Edge (latest)

### Mobile Viewports
- [ ] iPhone 12 (390x844)
- [ ] iPhone 14 Pro Max (430x932)
- [ ] Samsung Galaxy S21 (360x800)
- [ ] iPad Pro (1024x1366)

### Visual Regression
- [ ] Screenshot comparison for key pages
- [ ] Visual diff detection
- [ ] Responsive layout verification

---

## 🎨 Implementation

### Test File Structure

```
e2e/
├── friends/
│   ├── friend-request.spec.ts
│   ├── friend-search.spec.ts
│   ├── friend-privacy.spec.ts
│   └── blocking.spec.ts
├── sharing/
│   ├── deal-sharing.spec.ts
│   └── friend-picker.spec.ts
├── pymk/
│   └── recommendations.spec.ts
└── visual/
    └── regression.spec.ts

playwright.config.ts
```

### Example Test: friend-request.spec.ts

```typescript
import { test, expect } from '@playwright/test';

test.describe('Friend Request Flow', () => {
  test('complete friend request journey', async ({ page, context }) => {
    // User A: Sign up and login
    await page.goto('http://localhost:5173/signup');
    await page.fill('[name="email"]', 'usera@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.fill('[name="full_name"]', 'User A');
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await expect(page).toHaveURL(/\/home/);

    // Navigate to friend search
    await page.click('text=Friends');
    await page.click('text=Find Friends');

    // Search for User B
    await page.fill('[placeholder="Search friends"]', 'User B');
    await page.waitForTimeout(500); // Debounce

    // Send friend request
    await page.click('button:has-text("Send Request")');
    await expect(page.locator('text=Request sent')).toBeVisible();

    // User B: Open new tab and login
    const page2 = await context.newPage();
    await page2.goto('http://localhost:5173/login');
    await page2.fill('[name="email"]', 'userb@test.com');
    await page2.fill('[name="password"]', 'password123');
    await page2.click('button[type="submit"]');

    // Check notifications
    await page2.click('[aria-label="Notifications"]');
    await expect(page2.locator('text=User A sent you a friend request')).toBeVisible();

    // Navigate to friend requests
    await page2.click('text=Friends');
    await page2.click('text=Requests');

    // Accept request
    await page2.click('button:has-text("Accept")');
    await expect(page2.locator('text=You are now friends')).toBeVisible();

    // Verify bidirectional friendship
    await page2.click('text=All Friends');
    await expect(page2.locator('text=User A')).toBeVisible();

    // Switch back to User A
    await page.bringToFront();
    await page.reload();
    await page.click('text=All Friends');
    await expect(page.locator('text=User B')).toBeVisible();

    // Test messaging integration
    await page.click('text=User B');
    await page.click('button:has-text("Message")');
    await expect(page).toHaveURL(/\/messages/);
  });

  test('reject friend request', async ({ page }) => {
    // Similar setup...
    await page.click('button:has-text("Reject")');
    await expect(page.locator('text=Request rejected')).toBeVisible();

    // Verify request removed from list
    await expect(page.locator('text=User A')).not.toBeVisible();
  });
});
```

### Example Test: deal-sharing.spec.ts

```typescript
import { test, expect } from '@playwright/test';

test.describe('Deal Sharing', () => {
  test('share deal with friends', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('[name="email"]', 'user@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Browse to a deal
    await page.goto('http://localhost:5173/deals/test-deal-123');

    // Click share button
    await page.click('button:has-text("Share")');

    // Select Friends tab
    await page.click('text=Friends');

    // Search and select friends
    await page.fill('[placeholder="Search friends"]', 'John');
    await page.click('text=John Doe');
    await page.click('text=Jane Smith');

    // Add custom message
    await page.click('text=Add a message');
    await page.fill('textarea', 'Check out this amazing deal!');

    // Share
    await page.click('button:has-text("Share with 2 friends")');

    // Verify success
    await expect(page.locator('text=Successfully shared')).toBeVisible();

    // Verify recently shared with
    await page.click('button:has-text("Share")');
    await expect(page.locator('text=Recently Shared With')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
  });
});
```

### Example Test: Cross-Browser

```typescript
import { test, devices } from '@playwright/test';

const browsers = ['chromium', 'firefox', 'webkit'];
const mobileDevices = [
  devices['iPhone 12'],
  devices['Pixel 5'],
  devices['iPad Pro'],
];

browsers.forEach(browserName => {
  test.describe(`${browserName} - Friend Search`, () => {
    test.use({ browserName });

    test('should search and display friends', async ({ page }) => {
      await page.goto('http://localhost:5173/friends/search');
      await page.fill('[placeholder="Search"]', 'John');
      await expect(page.locator('text=John Doe')).toBeVisible();
    });
  });
});

mobileDevices.forEach(device => {
  test.describe(`${device.name} - Mobile Layout`, () => {
    test.use({ ...device });

    test('should display mobile-friendly layout', async ({ page }) => {
      await page.goto('http://localhost:5173/friends');
      
      // Verify mobile menu
      await expect(page.locator('[aria-label="Menu"]')).toBeVisible();
      
      // Verify responsive grid
      const friendsList = page.locator('[data-testid="friends-list"]');
      await expect(friendsList).toHaveClass(/grid-cols-1/);
    });
  });
});
```

### Example Test: Visual Regression

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('friends list page', async ({ page }) => {
    await page.goto('http://localhost:5173/friends');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('friends-list.png');
  });

  test('friend profile modal', async ({ page }) => {
    await page.goto('http://localhost:5173/friends');
    await page.click('text=John Doe');
    await page.waitForSelector('[role="dialog"]');
    
    await expect(page).toHaveScreenshot('friend-profile-modal.png');
  });

  test('responsive layouts', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173/friends');
    await expect(page).toHaveScreenshot('friends-desktop.png');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('friends-tablet.png');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('friends-mobile.png');
  });
});
```

---

## 🎯 MCP Integration

### Playwright MCP Commands

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/friends/friend-request.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run on specific browser
npx playwright test --project=chromium

# Generate test report
npx playwright show-report

# Update screenshots
npx playwright test --update-snapshots
```

---

## 📦 Deliverables

1. **E2E Test Files:**
   - `e2e/friends/friend-request.spec.ts`
   - `e2e/friends/friend-search.spec.ts`
   - `e2e/friends/friend-privacy.spec.ts`
   - `e2e/friends/blocking.spec.ts`
   - `e2e/sharing/deal-sharing.spec.ts`
   - `e2e/sharing/friend-picker.spec.ts`
   - `e2e/pymk/recommendations.spec.ts`
   - `e2e/visual/regression.spec.ts`

2. **Configuration:**
   - `playwright.config.ts`
   - `.github/workflows/e2e-tests.yml`

3. **Screenshots:**
   - Baseline screenshots for visual regression
   - Test failure screenshots

---

## 📈 Success Metrics

- **Test Count:** > 30 E2E tests
- **Browser Coverage:** 4 browsers (Chrome, Firefox, Safari, Edge)
- **Mobile Coverage:** 4 devices
- **Test Pass Rate:** 100%
- **Test Execution Time:** < 10 minutes

---

**Next Story:** [STORY 9.8.6: Performance Benchmarks & Optimization](./STORY_9.8.6_Performance.md)
