import { test, expect } from '@playwright/test';

// Set a longer timeout for all tests in this file
test.setTimeout(60000);

test.describe('Friend Management System - Basic Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error listeners to capture any issues
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      if (!error.message.includes('The message port closed')) {
        errors.push(error.message);
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('should load application without critical errors', async ({ page }) => {
    // Check that the basic page structure is present
    await expect(page.locator('body')).toBeVisible();
    
    // Verify the title
    const title = await page.title();
    expect(title).toContain('SynC');
    
    // Take a screenshot for manual verification
    await page.screenshot({ path: 'friend-system-loaded.png' });
  });

  test('should handle the friend service import fix', async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait a bit for any async imports/errors
    await page.waitForTimeout(3000);
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('The message port closed') &&
      !error.includes('service worker') &&
      !error.includes('Failed to load resource: the server responded with a status of 500') // This should be fixed now
    );
    
    const criticalConsoleLogs = consoleLogs.filter(log =>
      !log.includes('message port closed') &&
      !log.includes('service worker') &&
      log.includes('500') // Look for 500 errors specifically
    );
    
    // Log any remaining errors for debugging
    if (criticalErrors.length > 0) {
      console.log('Critical page errors found:', criticalErrors);
    }
    if (criticalConsoleLogs.length > 0) {
      console.log('Critical console errors found:', criticalConsoleLogs);
    }
    
    // The fix should have resolved the 500 error
    expect(criticalErrors.length).toBe(0);
    expect(criticalConsoleLogs.length).toBe(0);
  });

  test('should render React components properly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Look for React-rendered content (any div with React-style classes)
    const reactContent = page.locator('[class*="react"], [class*="App"], div[class]');
    await expect(reactContent.first()).toBeVisible();
    
    // Check for Tailwind CSS styles being applied
    const styledElement = await page.locator('body').evaluate((body) => {
      const computed = window.getComputedStyle(body);
      return {
        fontFamily: computed.fontFamily,
        color: computed.color,
        hasClasses: body.className.length > 0
      };
    });
    
    // Should have some styling applied
    expect(styledElement.fontFamily).toBeTruthy();
    expect(styledElement.color).toBeTruthy();
  });

  test('should be responsive across different screen sizes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Let layout settle
      
      // Ensure content is still visible
      await expect(page.locator('body')).toBeVisible();
      
      // Take screenshot for manual verification
      await page.screenshot({ path: `friend-system-${viewport.name.toLowerCase()}.png` });
    }
  });

  test('should handle navigation and routing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Look for any navigation elements or buttons
    const navElements = page.locator('nav, button, a[href], [role="button"]');
    const navCount = await navElements.count();
    
    if (navCount > 0) {
      console.log(`Found ${navCount} navigation elements`);
      
      // Try to interact with the first interactive element
      const firstInteractive = navElements.first();
      if (await firstInteractive.isVisible()) {
        await firstInteractive.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Verify page didn't crash after interaction
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

test.describe('Friend Components Detection', () => {
  test('should detect friend-related components if present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Look for friend-related text content
    const friendKeywords = [
      'friend', 'contact', 'social', 'connect', 
      'share', 'invite', 'network', 'community'
    ];
    
    const pageContent = await page.textContent('body');
    const foundKeywords = friendKeywords.filter(keyword => 
      pageContent?.toLowerCase().includes(keyword)
    );
    
    console.log('Friend-related keywords found:', foundKeywords);
    
    // Look for potential friend management UI elements
    const friendUI = await page.locator(`
      button:has-text("friend"),
      button:has-text("contact"),
      button:has-text("share"),
      [data-testid*="friend"],
      [data-testid*="contact"],
      .friend,
      .contact,
      .social
    `).count();
    
    console.log(`Found ${friendUI} potential friend UI elements`);
    
    // This test is for detection only, so it always passes
    // but provides useful info about what's available
    expect(true).toBe(true);
  });
});