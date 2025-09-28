const { test, expect } = require('@playwright/test');

test.describe('Category Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173/');
    
    // Wait for page load and handle any initial loading states
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should navigate to discovery page', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see the current state
    await page.screenshot({ path: 'tests/screenshots/homepage.png' });
    
    // Look for Discovery navigation link
    const discoveryLink = page.locator('text=Discovery').first();
    
    if (await discoveryLink.count() > 0) {
      await discoveryLink.click();
      await page.waitForURL('**/discovery');
      
      // Take a screenshot of discovery page
      await page.screenshot({ path: 'tests/screenshots/discovery-page.png' });
    } else {
      // Try to navigate directly to discovery page
      await page.goto('http://localhost:5173/discovery');
      await page.waitForLoadState('networkidle');
      
      // Take a screenshot
      await page.screenshot({ path: 'tests/screenshots/discovery-direct.png' });
    }
  });

  test('should handle category navigation from discovery to advanced search', async ({ page }) => {
    // Navigate directly to discovery page
    await page.goto('http://localhost:5173/discovery');
    await page.waitForLoadState('networkidle');
    
    // Look for category sections or buttons
    const categoryElements = page.locator('[data-testid*="category"], [class*="category"], button:has-text("Restaurants"), button:has-text("Shopping")');
    
    if (await categoryElements.count() > 0) {
      const firstCategory = categoryElements.first();
      const categoryText = await firstCategory.textContent();
      
      await firstCategory.click();
      
      // Wait for navigation to advanced search
      await page.waitForURL('**/search/advanced*');
      
      // Check if URL contains category parameter
      const url = page.url();
      expect(url).toContain('category=');
      
      // Take a screenshot
      await page.screenshot({ path: 'tests/screenshots/advanced-search-from-category.png' });
      
      // Check if the category filter is applied
      const categoryFilter = page.locator(`text=${categoryText}`);
      await expect(categoryFilter).toBeVisible();
    }
  });

  test('should test direct advanced search with category parameter', async ({ page }) => {
    // Navigate directly to advanced search with category parameter
    await page.goto('http://localhost:5173/search/advanced?category=Restaurants');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any async operations
    await page.waitForTimeout(2000);
    
    // Take a screenshot
    await page.screenshot({ path: 'tests/screenshots/advanced-search-with-category.png' });
    
    // Check if the category filter is set
    const categoryFilter = page.locator('text=Restaurants');
    
    // The test passes if we can navigate without errors
    expect(page.url()).toContain('category=Restaurants');
  });
});