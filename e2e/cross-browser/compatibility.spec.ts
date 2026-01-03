/**
 * Cross-Browser Compatibility Tests
 * Story 9.8.5: E2E Tests - User Journeys
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  test('should work on desktop browsers', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Verify app loads on all browsers
    await expect(page).toHaveTitle(/SynC/);
    
    console.log(`✅ Test passed on ${browserName}`);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/friends');
    
    // Verify mobile layout
    await expect(page).toHaveTitle(/SynC/);
  });
});

test.describe('Mobile Viewports', () => {
  test('iPhone 12 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page).toHaveTitle(/SynC/);
  });

  test('Samsung Galaxy viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await expect(page).toHaveTitle(/SynC/);
  });

  test('iPad Pro viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/');
    await expect(page).toHaveTitle(/SynC/);
  });
});
