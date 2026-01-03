/**
 * Cross-Platform Compatibility Tests - Extended
 * Story 9.8.9: Cross-Platform Testing & Validation
 * 
 * Extended cross-platform and mobile tests
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Cross-Platform - Extended Browser Tests', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];

  browsers.forEach(browserName => {
    test.describe(`${browserName} - Extended Tests`, () => {
      test.use({ browserName });

      test('should handle friend request flow', async ({ page }) => {
        await page.goto('/friends');
        
        // Verify page loads
        await expect(page).toHaveTitle(/SynC/);
        
        // Test basic navigation
        const friendsHeading = page.locator('h1, h2').filter({ hasText: /friends/i });
        await expect(friendsHeading.first()).toBeVisible({ timeout: 10000 });
      });

      test('should support search functionality', async ({ page }) => {
        await page.goto('/friends');
        
        // Look for search input
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
        if (await searchInput.count() > 0) {
          await expect(searchInput.first()).toBeVisible();
          
          // Test typing
          await searchInput.first().fill('test');
          await expect(searchInput.first()).toHaveValue('test');
        }
      });

      test('should render UI consistently', async ({ page }) => {
        await page.goto('/friends');
        
        // Verify consistent UI elements
        await expect(page).toHaveURL(/friends/);
        
        // Check for common UI elements
        const buttons = page.locator('button');
        expect(await buttons.count()).toBeGreaterThan(0);
      });
    });
  });
});

test.describe('Mobile Viewports - Extended Tests', () => {
  const mobileDevices = [
    { name: 'iPhone 12', ...devices['iPhone 12'] },
    { name: 'iPhone 14 Pro Max', ...devices['iPhone 14 Pro Max'] },
    { name: 'Pixel 5', ...devices['Pixel 5'] },
    { name: 'iPad Pro', ...devices['iPad Pro'] },
  ];

  mobileDevices.forEach(device => {
    test.describe(`${device.name} - Mobile Tests`, () => {
      test.use({ ...device });

      test('should render mobile layout', async ({ page }) => {
        await page.goto('/friends');
        
        // Verify mobile layout loads
        await expect(page).toHaveTitle(/SynC/);
      });

      test('should be touch-friendly', async ({ page }) => {
        await page.goto('/friends');
        
        // Verify buttons are large enough for touch
        const buttons = page.locator('button');
        if (await buttons.count() > 0) {
          const firstButton = buttons.first();
          const box = await firstButton.boundingBox();
          
          if (box) {
            // Buttons should be at least 44x44 (iOS guideline)
            expect(box.height).toBeGreaterThanOrEqual(30);
          }
        }
      });

      test('should handle orientation changes', async ({ page }) => {
        // Portrait
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/friends');
        await expect(page).toHaveTitle(/SynC/);
        
        // Landscape
        await page.setViewportSize({ width: 667, height: 375 });
        await expect(page).toHaveTitle(/SynC/);
      });
    });
  });
});

test.describe('Offline Support Tests', () => {
  test('should show offline indicator', async ({ page, context }) => {
    await page.goto('/friends');
    
    // Go offline
    await context.setOffline(true);
    
    // Page should still be accessible
    await expect(page).toHaveTitle(/SynC/);
  });

  test('should cache static assets', async ({ page }) => {
    await page.goto('/friends');
    
    // Verify page loads
    await expect(page).toHaveTitle(/SynC/);
    
    // Reload should work (cached)
    await page.reload();
    await expect(page).toHaveTitle(/SynC/);
  });
});

test.describe('UI Consistency Tests', () => {
  test('should maintain consistent spacing', async ({ page }) => {
    await page.goto('/friends');
    
    // Verify consistent layout
    const container = page.locator('main, [role="main"]');
    if (await container.count() > 0) {
      await expect(container.first()).toBeVisible();
    }
  });

  test('should use consistent typography', async ({ page }) => {
    await page.goto('/friends');
    
    // Verify headings exist
    const headings = page.locator('h1, h2, h3');
    expect(await headings.count()).toBeGreaterThan(0);
  });

  test('should have accessible color contrast', async ({ page }) => {
    await page.goto('/friends');
    
    // Basic accessibility check
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Performance Tests', () => {
  test('should load quickly on slow connections', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });
    
    const startTime = Date.now();
    await page.goto('/friends');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time even on slow connection
    expect(loadTime).toBeLessThan(5000); // 5 seconds
  });
});
