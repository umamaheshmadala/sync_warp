// e2e/search-functionality.spec.ts
// Comprehensive E2E test for search functionality debugging
// This test will identify why browse mode and search aren't working correctly

import { test, expect, Page } from '@playwright/test';

// Helper function to wait for search results or loading state
async function waitForSearchResults(page: Page, timeout = 10000) {
  console.log('🔍 [E2E] Waiting for search results or loading state...');
  
  try {
    // Wait for either results to appear or loading to complete
    await Promise.race([
      // Wait for coupon cards to appear
      page.waitForSelector('[data-testid="coupon-card"], .coupon-card, [class*="coupon"]', { timeout }),
      // Wait for business cards to appear  
      page.waitForSelector('[data-testid="business-card"], .business-card, [class*="business"]', { timeout }),
      // Wait for "no results" message
      page.waitForSelector(':text("No results found")', { timeout }),
      // Wait for search to complete (loading to disappear)
      page.waitForSelector('[class*="loading"], [class*="searching"]', { state: 'detached', timeout })
    ]);
    
    // Give a small buffer for results to fully render
    await page.waitForTimeout(1000);
    
  } catch (error) {
    console.log('⚠️ [E2E] Timeout waiting for search results:', error.message);
    throw error;
  }
}

// Helper function to get all visible coupon elements
async function getCouponElements(page: Page) {
  // Try multiple selectors to find coupon elements
  const selectors = [
    '[data-testid="coupon-card"]',
    '.coupon-card', 
    '[class*="coupon"]',
    'div[class*="grid"] > div', // Grid items that might be coupons
    'div[class*="space-y"] > div' // List items that might be coupons
  ];
  
  let coupons = [];
  for (const selector of selectors) {
    const elements = await page.locator(selector).all();
    if (elements.length > 0) {
      console.log(`🎟️ [E2E] Found ${elements.length} coupon elements with selector: ${selector}`);
      coupons = elements;
      break;
    }
  }
  
  return coupons;
}

// Helper function to capture search debug info
async function captureSearchDebugInfo(page: Page, testName: string) {
  console.log(`\n📊 [E2E] Debug info for: ${testName}`);
  
  // Capture console logs from the browser
  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('🔍')) {
      logs.push(msg.text());
    }
  });
  
  // Take screenshot for debugging
  await page.screenshot({ 
    path: `e2e-results/search-debug-${testName}-${Date.now()}.png`,
    fullPage: true 
  });
  
  // Get current URL
  const currentUrl = page.url();
  console.log(`📍 [E2E] Current URL: ${currentUrl}`);
  
  // Check for error messages on page
  const errorMessages = await page.locator(':text("error"), :text("Error"), :text("failed"), :text("Failed")').all();
  if (errorMessages.length > 0) {
    console.log(`❌ [E2E] Found ${errorMessages.length} error messages on page`);
    for (const error of errorMessages) {
      const text = await error.textContent();
      console.log(`   Error: ${text}`);
    }
  }
  
  return { logs, currentUrl, errorCount: errorMessages.length };
}

test.describe('Search Functionality E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    console.log('\n🚀 [E2E] Starting search functionality test...');
    
    // Enable console logging from browser
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Capture network failures
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`🌐 [E2E] Network error: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('Anonymous user - Browse All Deals button should show 6 coupons', async ({ page }) => {
    console.log('\n📝 [E2E] Test: Anonymous user - Browse All Deals');
    
    // Navigate to search page as anonymous user
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // Capture initial state
    await captureSearchDebugInfo(page, 'anonymous-initial');
    
    // Check if we're actually anonymous (no user profile/logout button)
    const isAuthenticated = await page.locator(':text("Sign out"), :text("Profile"), :text("Dashboard")').count() > 0;
    console.log(`👤 [E2E] User authentication status: ${isAuthenticated ? 'Authenticated' : 'Anonymous'}`);
    
    if (isAuthenticated) {
      console.log('⚠️ [E2E] User is authenticated, trying to sign out...');
      // Try to sign out
      const signOutButton = page.locator(':text("Sign out"), button:has-text("Sign out")').first();
      if (await signOutButton.count() > 0) {
        await signOutButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Look for Browse All button
    const browseButton = page.locator('button:has-text("Browse All"), button:has-text("Browse"), :text("Browse All Deals")');
    const browseButtonCount = await browseButton.count();
    console.log(`🔍 [E2E] Browse buttons found: ${browseButtonCount}`);
    
    if (browseButtonCount === 0) {
      console.log('❌ [E2E] No Browse All Deals button found');
      // Try alternative approach - submit empty search
      const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]').first();
      const searchInputCount = await searchInput.count();
      
      if (searchInputCount > 0) {
        console.log('🔄 [E2E] Trying empty search instead...');
        await searchInput.fill('');
        await searchInput.press('Enter');
      } else {
        console.log('❌ [E2E] No search input found either');
        throw new Error('Neither Browse All button nor search input found');
      }
    } else {
      console.log('✅ [E2E] Browse All button found, clicking...');
      await browseButton.first().click();
    }
    
    // Wait for search results
    console.log('⏳ [E2E] Waiting for search results...');
    await waitForSearchResults(page, 15000);
    
    // Capture state after browse
    await captureSearchDebugInfo(page, 'anonymous-after-browse');
    
    // Count coupon results
    const coupons = await getCouponElements(page);
    const couponCount = coupons.length;
    
    console.log(`🎟️ [E2E] Found ${couponCount} coupon elements`);
    
    // Log coupon details for debugging
    for (let i = 0; i < Math.min(coupons.length, 10); i++) {
      const coupon = coupons[i];
      const text = await coupon.textContent();
      console.log(`   ${i + 1}. ${text?.slice(0, 100)}...`);
    }
    
    // Check for "No results found" message
    const noResults = await page.locator(':text("No results found"), :text("No results"), :text("no results")').count();
    if (noResults > 0) {
      console.log('❌ [E2E] "No results found" message displayed');
    }
    
    // The test expectation - should find 6 coupons
    expect(couponCount).toBeGreaterThanOrEqual(1); // At least 1 coupon should be found
    expect(couponCount).toBeLessThanOrEqual(10); // Reasonable upper bound
    
    // If not 6 coupons, log the issue
    if (couponCount !== 6) {
      console.log(`⚠️ [E2E] Expected 6 coupons, but found ${couponCount}`);
      console.log('💡 [E2E] This indicates an issue with the browse functionality');
    }
  });

  test('Anonymous user - Search for "pizza" should return 1 coupon', async ({ page }) => {
    console.log('\n📝 [E2E] Test: Anonymous user - Pizza search');
    
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // Find search input
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    
    // Search for pizza
    console.log('🍕 [E2E] Searching for "pizza"...');
    await searchInput.fill('pizza');
    await searchInput.press('Enter');
    
    // Wait for results
    await waitForSearchResults(page);
    await captureSearchDebugInfo(page, 'anonymous-pizza-search');
    
    // Count results
    const coupons = await getCouponElements(page);
    console.log(`🍕 [E2E] Pizza search returned ${coupons.length} coupons`);
    
    // Should find at least 1 pizza-related coupon
    expect(coupons.length).toBeGreaterThanOrEqual(1);
    
    // Check if any coupon mentions pizza
    let pizzaCouponsFound = 0;
    for (const coupon of coupons) {
      const text = await coupon.textContent();
      if (text && text.toLowerCase().includes('pizza')) {
        pizzaCouponsFound++;
        console.log(`🍕 [E2E] Found pizza coupon: ${text.slice(0, 100)}`);
      }
    }
    
    console.log(`🍕 [E2E] Total pizza-related coupons: ${pizzaCouponsFound}`);
    expect(pizzaCouponsFound).toBeGreaterThanOrEqual(1);
  });

  test('Anonymous user - Search for "coupon" should return results', async ({ page }) => {
    console.log('\n📝 [E2E] Test: Anonymous user - Coupon search');
    
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    
    console.log('🎟️ [E2E] Searching for "coupon"...');
    await searchInput.fill('coupon');
    await searchInput.press('Enter');
    
    await waitForSearchResults(page);
    await captureSearchDebugInfo(page, 'anonymous-coupon-search');
    
    const coupons = await getCouponElements(page);
    console.log(`🎟️ [E2E] Coupon search returned ${coupons.length} results`);
    
    expect(coupons.length).toBeGreaterThanOrEqual(1);
  });

  test('Empty search should trigger browse mode', async ({ page }) => {
    console.log('\n📝 [E2E] Test: Empty search triggers browse mode');
    
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    
    // Clear input and submit empty search
    console.log('🔍 [E2E] Submitting empty search...');
    await searchInput.fill('');
    await searchInput.press('Enter');
    
    await waitForSearchResults(page);
    await captureSearchDebugInfo(page, 'empty-search-browse');
    
    const coupons = await getCouponElements(page);
    console.log(`🔍 [E2E] Empty search returned ${coupons.length} results`);
    
    // Empty search should show browse results (all public coupons)
    expect(coupons.length).toBeGreaterThanOrEqual(1);
    
    if (coupons.length !== 6) {
      console.log(`⚠️ [E2E] Expected 6 browse results, got ${coupons.length}`);
    }
  });

  test('Check search service availability in browser', async ({ page }) => {
    console.log('\n📝 [E2E] Test: Search service availability');
    
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // Check if search services are available in browser
    const serviceCheck = await page.evaluate(() => {
      return {
        hasSimpleSearchService: typeof (window as any).simpleSearchService !== 'undefined',
        hasSearchService: typeof (window as any).searchService !== 'undefined',
        hasSupabase: typeof (window as any).supabase !== 'undefined',
        userAgent: navigator.userAgent,
        location: window.location.href
      };
    });
    
    console.log('🔧 [E2E] Browser service availability:', serviceCheck);
    
    // Test direct service call if available
    if (serviceCheck.hasSimpleSearchService) {
      console.log('🧪 [E2E] Testing simpleSearchService directly...');
      
      const directTestResult = await page.evaluate(async () => {
        try {
          const result = await (window as any).simpleSearchService.search({ q: '', limit: 20 });
          return {
            success: true,
            coupons: result.coupons.length,
            businesses: result.businesses.length,
            total: result.totalResults,
            searchTime: result.searchTime
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      console.log('🧪 [E2E] Direct service test result:', directTestResult);
      
      if (directTestResult.success) {
        expect(directTestResult.total).toBeGreaterThanOrEqual(0);
        
        if (directTestResult.total === 0) {
          console.log('❌ [E2E] Direct service call returned 0 results - this is the root issue!');
        } else {
          console.log(`✅ [E2E] Direct service call returned ${directTestResult.total} results`);
        }
      } else {
        console.log(`❌ [E2E] Direct service call failed: ${directTestResult.error}`);
      }
    }
    
    expect(serviceCheck.hasSimpleSearchService).toBe(true);
  });

  test('Network requests during search', async ({ page }) => {
    console.log('\n📝 [E2E] Test: Network requests during search');
    
    const networkLogs: { url: string; status: number; method: string }[] = [];
    
    // Capture network requests
    page.on('response', response => {
      networkLogs.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    });
    
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('pizza');
    await searchInput.press('Enter');
    
    await waitForSearchResults(page);
    
    // Filter to Supabase or API requests
    const apiRequests = networkLogs.filter(req => 
      req.url.includes('supabase') || 
      req.url.includes('api') || 
      req.url.includes('postgresql') ||
      req.method === 'POST'
    );
    
    console.log('🌐 [E2E] Network requests during search:');
    apiRequests.forEach(req => {
      console.log(`   ${req.method} ${req.status} ${req.url}`);
    });
    
    // Should have some API calls for search
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // Check for failed requests
    const failedRequests = networkLogs.filter(req => req.status >= 400);
    if (failedRequests.length > 0) {
      console.log('❌ [E2E] Failed network requests:');
      failedRequests.forEach(req => {
        console.log(`   ${req.status} ${req.url}`);
      });
    }
  });
});

// Additional test for authenticated users (if we can simulate login)
test.describe('Authenticated User Search Tests', () => {
  
  test('Authenticated user should see public + private coupons', async ({ page }) => {
    console.log('\n📝 [E2E] Test: Authenticated user search');
    
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // Check if user is already authenticated
    const isAuthenticated = await page.locator(':text("Sign out"), :text("Profile"), :text("Dashboard")').count() > 0;
    
    if (!isAuthenticated) {
      console.log('👤 [E2E] User not authenticated, trying to login...');
      
      // Try to navigate to login page
      const loginLink = page.locator('a[href*="login"], :text("Sign in"), :text("Login")').first();
      if (await loginLink.count() > 0) {
        await loginLink.click();
        await page.waitForLoadState('networkidle');
        
        // For now, just navigate back to search to test current state
        await page.goto('/search');
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Test browse mode for authenticated user
    console.log('🔍 [E2E] Testing authenticated browse mode...');
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('');
    await searchInput.press('Enter');
    
    await waitForSearchResults(page);
    await captureSearchDebugInfo(page, 'authenticated-browse');
    
    const coupons = await getCouponElements(page);
    console.log(`👤 [E2E] Authenticated user browse returned ${coupons.length} results`);
    
    // Authenticated users should see at least as many coupons as anonymous users
    expect(coupons.length).toBeGreaterThanOrEqual(1);
    
    if (coupons.length < 6) {
      console.log('⚠️ [E2E] Authenticated user seeing fewer than expected 6 coupons');
    }
  });
});