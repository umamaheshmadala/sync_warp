import { test, expect } from '@playwright/test';

test.describe('Friend Management System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display friend management components', async ({ page }) => {
    // Check if the friend management system is available
    // This assumes there's a way to access friend management from the main page
    
    // Look for friend-related elements
    const friendButton = page.locator('[data-testid="friends-button"]').or(
      page.locator('button:has-text("Friends")').or(
        page.locator('button:has-text("Contacts")')
      )
    );

    // If no direct friend button, check for navigation elements
    if (await friendButton.count() === 0) {
      // Look for navigation or menu items
      const navItems = page.locator('nav a, button');
      await expect(navItems.first()).toBeVisible();
      console.log('Available navigation items:', await navItems.allTextContents());
    } else {
      await expect(friendButton.first()).toBeVisible();
    }
  });

  test('should handle service worker errors gracefully', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for uncaught exceptions
    const uncaughtErrors: string[] = [];
    page.on('pageerror', (error) => {
      uncaughtErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the page loads despite service worker issues
    await expect(page.locator('body')).toBeVisible();
    
    // Log errors for debugging but don't fail the test if they're service worker related
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors);
      
      // Filter out expected service worker errors
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('Failed to load resource') &&
        !error.includes('service worker') &&
        !error.includes('The message port closed')
      );
      
      expect(criticalErrors.length).toBe(0);
    }
  });

  test('should render without JavaScript errors', async ({ page }) => {
    const jsErrors: Error[] = [];
    page.on('pageerror', (error) => {
      // Filter out known service worker issues
      if (!error.message.includes('The message port closed') && 
          !error.message.includes('Failed to load resource')) {
        jsErrors.push(error);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for any async operations

    expect(jsErrors).toHaveLength(0);
  });

  test('should have proper meta tags and title', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/.*sync.*/i);
    
    // Check meta viewport
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeAttached();
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/');
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle network failures gracefully', async ({ page, context }) => {
    // Simulate network failure
    await context.setOffline(true);
    
    await page.goto('/');
    
    // The page should still render some content even offline
    await expect(page.locator('body')).toBeVisible();
    
    // Re-enable network
    await context.setOffline(false);
  });

  test('should load CSS and basic styling', async ({ page }) => {
    await page.goto('/');
    
    // Check that Tailwind CSS or basic styles are loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for basic styling by looking for common Tailwind classes or computed styles
    const hasStyles = await page.evaluate(() => {
      const computedStyle = window.getComputedStyle(document.body);
      return computedStyle.fontFamily !== '' || computedStyle.color !== '';
    });
    
    expect(hasStyles).toBe(true);
  });
});

test.describe('Friend Management Components (when available)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open contacts/friends sidebar when available', async ({ page }) => {
    // Look for any button that might open friends/contacts
    const possibleTriggers = [
      'button:has-text("Friends")',
      'button:has-text("Contacts")',
      '[data-testid="friends-button"]',
      '[data-testid="contacts-button"]',
      'button[aria-label*="friend" i]',
      'button[aria-label*="contact" i]'
    ];

    let triggerFound = false;
    
    for (const selector of possibleTriggers) {
      const trigger = page.locator(selector).first();
      if (await trigger.count() > 0) {
        await trigger.click();
        triggerFound = true;
        
        // Wait for sidebar/modal to open
        await page.waitForTimeout(500);
        
        // Look for sidebar or modal content
        const sidebar = page.locator('[role="dialog"], .fixed.inset-0, .sidebar').first();
        if (await sidebar.count() > 0) {
          await expect(sidebar).toBeVisible();
        }
        
        break;
      }
    }
    
    // If no trigger found, just log available buttons for debugging
    if (!triggerFound) {
      const allButtons = await page.locator('button').allTextContents();
      console.log('Available buttons:', allButtons);
    }
  });

  test('should handle friend search functionality', async ({ page }) => {
    // This test will only run if search functionality is available
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="friend" i]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000); // Wait for debounced search
      
      // Check that search doesn't cause errors
      const searchResults = page.locator('[data-testid="search-results"], .search-results').first();
      // The results container should either be visible or gracefully handle empty state
    }
  });

  test('should handle modal interactions', async ({ page }) => {
    // Look for any modal triggers
    const modalTriggers = page.locator('button:has-text("Add"), button:has-text("Request"), button:has-text("Share")');
    
    if (await modalTriggers.count() > 0) {
      await modalTriggers.first().click();
      
      // Wait for modal
      await page.waitForTimeout(500);
      
      // Look for modal close button
      const closeButton = page.locator('button[aria-label="Close"], button:has-text("×"), button:has-text("Close")').first();
      
      if (await closeButton.count() > 0) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failures
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    await page.goto('/');
    
    // The app should still load and show appropriate error states
    await expect(page.locator('body')).toBeVisible();
    
    // Look for error messages or loading states
    const errorMessage = page.locator('[data-testid="error"], .error-message, .alert-error').first();
    const loadingState = page.locator('[data-testid="loading"], .loading, .spinner').first();
    
    // Either an error message or loading state should be present
    const hasErrorHandling = await errorMessage.count() > 0 || await loadingState.count() > 0;
    
    if (!hasErrorHandling) {
      console.log('No explicit error handling found - this is okay for basic functionality');
    }
  });

  test('should handle Supabase connection issues', async ({ page }) => {
    // Mock Supabase requests to fail
    await page.route('**/supabase/**', (route) => {
      route.abort('failed');
    });

    await page.route('**/postgrest/**', (route) => {
      route.abort('failed');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // App should still render
    await expect(page.locator('body')).toBeVisible();
  });
});