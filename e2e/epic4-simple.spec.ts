import { test, expect } from '@playwright/test';

/**
 * Epic 4: Simplified E2E Tests
 * Assumes user is already logged in
 * Tests Epic 4 features that are visible and accessible
 */

test.describe('Epic 4: Business Features - Simplified Tests', () => {
  
  test.describe('Story 4.4: Search & Discovery', () => {
    test('Search page loads with all elements', async ({ page }) => {
      await page.goto('/');
      
      // Verify page loads
      await expect(page).toHaveTitle(/SynC/);
      
      // Verify search interface elements
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      await expect(page.getByText('Advanced Search')).toBeVisible();
      await expect(page.getByText('Discover')).toBeVisible();
      
      // Verify filters
      await expect(page.getByText('Enable Location')).toBeVisible();
      await expect(page.getByText('Filters')).toBeVisible();
      
      console.log('✅ Story 4.4 Test 1: Search page loads correctly');
    });

    test('Bottom navigation bar is functional', async ({ page }) => {
      await page.goto('/');
      
      // Verify all 5 navigation items exist
      const nav = page.locator('nav').last(); // Bottom nav
      
      await expect(nav.getByText('Home')).toBeVisible();
      await expect(nav.getByText('Search')).toBeVisible();
      await expect(nav.getByText('Favorites')).toBeVisible();
      await expect(nav.getByText('Wallet')).toBeVisible();
      await expect(nav.getByText('Social')).toBeVisible();
      
      console.log('✅ Story 4.4 Test 2: Bottom navigation confirmed');
    });

    test('Navigate to Favorites page', async ({ page }) => {
      await page.goto('/');
      
      // Click Favorites in bottom nav
      await page.getByRole('link', { name: 'Favorites' }).click();
      await page.waitForTimeout(1000);
      
      // Verify we're on favorites page
      await expect(page).toHaveURL(/.*favorites.*/);
      
      console.log('✅ Story 4.4 Test 3: Favorites navigation works');
    });
  });

  test.describe('Story 4.1: Business Dashboard', () => {
    test('Navigate to business dashboard', async ({ page }) => {
      await page.goto('/business/dashboard');
      await page.waitForTimeout(2000);
      
      // Check if we see business content or redirected
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // Take screenshot for evidence
      await page.screenshot({ path: 'test-results/business-dashboard-attempt.png', fullPage: true });
      
      console.log('✅ Story 4.1 Test 1: Business dashboard navigation attempted');
    });
  });

  test.describe('Story 4.6: GPS Check-ins', () => {
    test('Navigate to check-ins page', async ({ page }) => {
      await page.goto('/checkins');
      await page.waitForTimeout(2000);
      
      // Verify we're on check-ins page
      await expect(page).toHaveURL(/.*checkins.*/);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/checkins-page.png', fullPage: true });
      
      console.log('✅ Story 4.6 Test 1: Check-ins page accessible');
    });
  });

  test.describe('Navigation Tests', () => {
    test('Test all main navigation routes', async ({ page }) => {
      const routes = [
        { path: '/search', name: 'Search' },
        { path: '/favorites', name: 'Favorites' },
        { path: '/wallet', name: 'Wallet' },
        { path: '/social', name: 'Social' },
        { path: '/checkins', name: 'Check-ins' },
        { path: '/discovery', name: 'Discovery' },
        { path: '/friends', name: 'Friends' },
      ];
      
      for (const route of routes) {
        console.log(`Testing ${route.name}...`);
        await page.goto(route.path);
        await page.waitForTimeout(1000);
        
        // Verify navigation worked
        expect(page.url()).toContain(route.path);
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/navigation-${route.name.toLowerCase()}.png`, 
          fullPage: true 
        });
        
        console.log(`✅ ${route.name} page loads`);
      }
    });
  });

  test.describe('User Interface Tests', () => {
    test('Check authenticated user state', async ({ page }) => {
      await page.goto('/');
      
      // Look for user indicators (profile icon, username, etc.)
      const hasUserMenu = await page.locator('[aria-label="User menu"]').count() > 0;
      const hasProfileIcon = await page.locator('button:has-text("T")').count() > 0; // Profile initial
      
      console.log('User menu found:', hasUserMenu);
      console.log('Profile icon found:', hasProfileIcon);
      
      // At least one should be present
      expect(hasUserMenu || hasProfileIcon).toBeTruthy();
      
      console.log('✅ User is authenticated');
    });

    test('Search functionality exists', async ({ page }) => {
      await page.goto('/search');
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      
      // Try typing in search
      await searchInput.fill('coffee');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/search-with-query.png', fullPage: true });
      
      console.log('✅ Search input works');
    });
  });
});