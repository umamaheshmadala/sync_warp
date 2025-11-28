# Story 9.8.9: Cross-Platform Testing & Validation

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🤖 Playwright MCP (Medium)  
**Dependencies:** Stories 9.8.1-9.8.8, Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Test the Friends Module across all supported platforms (Web, iOS, Android) to ensure feature parity, UI consistency, and platform-specific features work correctly.

---

## ✅ Acceptance Criteria

### Web Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] All features work identically across browsers

### iOS Testing
- [ ] iOS Simulator (iPhone 12+)
- [ ] Real device testing (iPhone 12+)
- [ ] Contact sync works correctly
- [ ] Push notifications delivered
- [ ] Offline support works
- [ ] UI matches design specs

### Android Testing
- [ ] Android Emulator (Pixel 5+)
- [ ] Real device testing (Pixel 5+)
- [ ] Contact sync works correctly
- [ ] Push notifications delivered
- [ ] Offline support works
- [ ] UI matches design specs

### UI Consistency
- [ ] Verify UI consistency across platforms
- [ ] Test responsive layouts
- [ ] Test dark mode (if applicable)
- [ ] Test accessibility features

---

## 🎨 Implementation

### Test File Structure

```
e2e/cross-platform/
├── web/
│   ├── chrome.spec.ts
│   ├── firefox.spec.ts
│   ├── safari.spec.ts
│   └── edge.spec.ts
├── mobile/
│   ├── ios.spec.ts
│   ├── android.spec.ts
│   └── responsive.spec.ts
└── features/
    ├── contact-sync.spec.ts
    ├── push-notifications.spec.ts
    └── offline-support.spec.ts
```

### Example Test: Web Browsers

```typescript
import { test, devices } from '@playwright/test';

const browsers = ['chromium', 'firefox', 'webkit'];

browsers.forEach(browserName => {
  test.describe(`${browserName} - Friends Module`, () => {
    test.use({ browserName });

    test('friend request flow works', async ({ page }) => {
      await page.goto('http://localhost:5173/friends');
      
      // Test friend request flow
      await page.click('text=Find Friends');
      await page.fill('[placeholder="Search"]', 'John');
      await page.click('button:has-text("Send Request")');
      
      await expect(page.locator('text=Request sent')).toBeVisible();
    });

    test('search works correctly', async ({ page }) => {
      await page.goto('http://localhost:5173/friends/search');
      
      await page.fill('[placeholder="Search"]', 'Jane');
      await page.waitForTimeout(500);
      
      await expect(page.locator('text=Jane Smith')).toBeVisible();
    });

    test('PYMK suggestions display', async ({ page }) => {
      await page.goto('http://localhost:5173/friends');
      
      await expect(page.locator('text=People You May Know')).toBeVisible();
      await expect(page.locator('[data-testid="pymk-card"]')).toHaveCount(5);
    });
  });
});
```

### Example Test: iOS

```typescript
import { test, expect } from '@playwright/test';

test.describe('iOS - Friends Module', () => {
  test.use({
    ...devices['iPhone 12'],
  });

  test('mobile layout renders correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/friends');
    
    // Verify mobile menu
    await expect(page.locator('[aria-label="Menu"]')).toBeVisible();
    
    // Verify responsive grid
    const friendsList = page.locator('[data-testid="friends-list"]');
    await expect(friendsList).toHaveClass(/grid-cols-2/);
  });

  test('swipe gestures work', async ({ page }) => {
    await page.goto('http://localhost:5173/friends');
    
    // Swipe to delete friend request
    const request = page.locator('[data-testid="friend-request"]').first();
    await request.swipe({ direction: 'left' });
    
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  });

  test('contact sync button visible', async ({ page }) => {
    await page.goto('http://localhost:5173/friends');
    
    await expect(page.locator('button:has-text("Sync Contacts")')).toBeVisible();
  });

  test('push notification permission prompt', async ({ page, context }) => {
    await page.goto('http://localhost:5173/friends');
    
    // Mock permission request
    await context.grantPermissions(['notifications']);
    
    await page.click('button:has-text("Enable Notifications")');
    
    // Verify permission granted
    const permission = await page.evaluate(() => 
      Notification.permission
    );
    expect(permission).toBe('granted');
  });
});
```

### Example Test: Android

```typescript
import { test, expect } from '@playwright/test';

test.describe('Android - Friends Module', () => {
  test.use({
    ...devices['Pixel 5'],
  });

  test('mobile layout renders correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/friends');
    
    // Verify Android-specific UI elements
    await expect(page.locator('[aria-label="Navigation drawer"]')).toBeVisible();
  });

  test('back button navigation works', async ({ page }) => {
    await page.goto('http://localhost:5173/friends');
    await page.click('text=John Doe');
    
    // Simulate Android back button
    await page.goBack();
    
    await expect(page).toHaveURL(/\/friends$/);
  });

  test('contact sync works', async ({ page }) => {
    await page.goto('http://localhost:5173/friends');
    
    // Mock contact permission
    await page.evaluate(() => {
      (window as any).Capacitor = {
        Plugins: {
          Contacts: {
            getContacts: async () => ({
              contacts: [
                { name: 'John Doe', phoneNumbers: ['123-456-7890'] }
              ]
            })
          }
        }
      };
    });
    
    await page.click('button:has-text("Sync Contacts")');
    
    await expect(page.locator('text=1 contact synced')).toBeVisible();
  });
});
```

### Example Test: Offline Support

```typescript
import { test, expect } from '@playwright/test';

test.describe('Offline Support', () => {
  test('friends list cached offline', async ({ page, context }) => {
    await page.goto('http://localhost:5173/friends');
    
    // Wait for friends to load
    await expect(page.locator('[data-testid="friend-card"]')).toHaveCount(10);
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    
    // Verify cached friends still visible
    await expect(page.locator('[data-testid="friend-card"]')).toHaveCount(10);
    await expect(page.locator('text=Offline')).toBeVisible();
  });

  test('offline actions queued', async ({ page, context }) => {
    await page.goto('http://localhost:5173/friends');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to send friend request
    await page.click('text=Find Friends');
    await page.fill('[placeholder="Search"]', 'John');
    await page.click('button:has-text("Send Request")');
    
    // Verify queued
    await expect(page.locator('text=Request will be sent when online')).toBeVisible();
    
    // Go online
    await context.setOffline(false);
    
    // Verify request sent
    await expect(page.locator('text=Request sent')).toBeVisible();
  });
});
```

---

## 🎯 MCP Integration

### Playwright MCP Commands

```bash
# Run cross-platform tests
npx playwright test e2e/cross-platform/

# Run on specific browser
npx playwright test --project=webkit

# Run mobile tests
npx playwright test --project="iPhone 12"

# Generate test report
npx playwright show-report
```

---

## 📦 Deliverables

1. **Cross-Platform Test Files:**
   - `e2e/cross-platform/web/chrome.spec.ts`
   - `e2e/cross-platform/web/firefox.spec.ts`
   - `e2e/cross-platform/web/safari.spec.ts`
   - `e2e/cross-platform/web/edge.spec.ts`
   - `e2e/cross-platform/mobile/ios.spec.ts`
   - `e2e/cross-platform/mobile/android.spec.ts`
   - `e2e/cross-platform/features/contact-sync.spec.ts`
   - `e2e/cross-platform/features/push-notifications.spec.ts`
   - `e2e/cross-platform/features/offline-support.spec.ts`

2. **Test Reports:**
   - Cross-platform compatibility matrix
   - Platform-specific issues log
   - UI consistency report

---

## 📈 Success Metrics

- **Browser Coverage:** 4 browsers tested
- **Mobile Platforms:** iOS and Android tested
- **Feature Parity:** 100% across platforms
- **UI Consistency:** No major discrepancies

---

**Next Story:** [STORY 9.8.10: Test Infrastructure & CI/CD Integration](./STORY_9.8.10_CI_CD.md)
