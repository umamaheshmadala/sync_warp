import { test, expect } from '@playwright/test';

test('basic navigation test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  console.log('Page title:', await page.title());
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-screenshot.png' });
});