// coupon-creation.spec.ts
// Automated test for coupon creation functionality using Playwright

import { test, expect, Page, Browser } from '@playwright/test';

test.describe('Coupon Creation Flow', () => {
  let page: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    
    // Log network errors
    page.on('requestfailed', request => {
      console.log(`[NETWORK ERROR] ${request.method()} ${request.url()} - ${request.failure().errorText}`);
    });
    
    // Log unhandled exceptions
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });
  });

  test('should navigate to coupon management page', async () => {
    console.log('🔗 Navigating to the application...');
    
    // Navigate to the application
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: true });
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    console.log('📸 Initial page screenshot taken');
  });

  test('should handle authentication if required', async () => {
    console.log('🔐 Checking authentication status...');
    
    // Check if we need to log in
    const loginButton = await page.locator('text=Login, text=Sign In').first().isVisible().catch(() => false);
    const loginForm = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);
    
    if (loginButton || loginForm) {
      console.log('❌ User not authenticated - need to handle login');
      await page.screenshot({ path: 'test-results/02-login-required.png', fullPage: true });
      
      // Try to find and fill login form
      if (loginForm) {
        await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
        await page.fill('input[type="password"], input[name="password"]', 'password123');
        
        // Click login button
        await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('✅ User appears to be authenticated');
    }
    
    await page.screenshot({ path: 'test-results/03-after-auth-check.png', fullPage: true });
  });

  test('should navigate to business coupon management', async () => {
    console.log('🏢 Navigating to business coupon management...');
    
    // Try different navigation paths to reach coupon management
    const businessId = 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
    const couponsUrl = `http://localhost:5174/business/${businessId}/coupons`;
    
    console.log(`📍 Navigating to: ${couponsUrl}`);
    await page.goto(couponsUrl, { waitUntil: 'networkidle' });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/04-coupon-management-page.png', fullPage: true });
    
    // Check if we're on the right page
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Look for coupon-related elements
    const addCouponButton = await page.locator('button:has-text("Add Coupon"), button:has-text("Create Coupon"), button:has-text("New Coupon")').first().isVisible().catch(() => false);
    
    if (addCouponButton) {
      console.log('✅ Found coupon creation button');
    } else {
      console.log('❌ Could not find coupon creation button');
      
      // Log all visible buttons for debugging
      const buttons = await page.locator('button').all();
      console.log('🔍 Available buttons:');
      for (const button of buttons) {
        const text = await button.textContent().catch(() => '');
        if (text.trim()) {
          console.log(`  - "${text.trim()}"`);
        }
      }
    }
  });

  test('should open coupon creation modal', async () => {
    console.log('➕ Attempting to open coupon creation modal...');
    
    // Try to find and click the "Add Coupon" or similar button
    const addCouponSelectors = [
      'button:has-text("Add Coupon")',
      'button:has-text("Create Coupon")',
      'button:has-text("New Coupon")',
      'button:has-text("+")',
      '[data-testid="add-coupon-button"]',
      '.add-coupon-btn',
      'button[aria-label*="Add"], button[aria-label*="Create"]'
    ];
    
    let buttonFound = false;
    
    for (const selector of addCouponSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          console.log(`✅ Found button with selector: ${selector}`);
          await button.click();
          buttonFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!buttonFound) {
      console.log('❌ Could not find add coupon button');
      await page.screenshot({ path: 'test-results/05-no-add-button.png', fullPage: true });
      return;
    }
    
    // Wait for modal to open
    await page.waitForTimeout(1000);
    
    // Take a screenshot of the modal
    await page.screenshot({ path: 'test-results/06-coupon-modal-opened.png', fullPage: true });
    
    // Check if modal is visible
    const modal = await page.locator('[role="dialog"], .modal, [data-testid*="modal"]').first().isVisible().catch(() => false);
    
    if (modal) {
      console.log('✅ Coupon creation modal opened successfully');
    } else {
      console.log('❌ Modal did not open or is not visible');
    }
  });

  test('should fill coupon creation form', async () => {
    console.log('📝 Filling coupon creation form...');
    
    // Test data for the coupon
    const testCouponData = {
      title: 'Test Automated Coupon',
      description: 'This is a test coupon created by automated testing to verify the coupon creation functionality works properly.',
      discountType: 'percentage',
      discountValue: '20',
      termsConditions: 'This is a test coupon. Valid for testing purposes only. Cannot be combined with other offers.',
      validFrom: '2024-01-01T00:00',
      validUntil: '2024-12-31T23:59',
      targetAudience: 'all_users',
      perUserLimit: '1'
    };
    
    try {
      // Fill title field
      console.log('📝 Filling title field...');
      const titleSelectors = ['input[name="title"]', 'input[placeholder*="title"]', 'input[placeholder*="name"]'];
      for (const selector of titleSelectors) {
        try {
          if (await page.locator(selector).isVisible()) {
            await page.fill(selector, testCouponData.title);
            console.log('✅ Title field filled');
            break;
          }
        } catch (e) {}
      }
      
      // Fill description field
      console.log('📝 Filling description field...');
      const descSelectors = ['textarea[name="description"]', 'textarea[placeholder*="description"]', 'textarea'];
      for (const selector of descSelectors) {
        try {
          if (await page.locator(selector).isVisible()) {
            await page.fill(selector, testCouponData.description);
            console.log('✅ Description field filled');
            break;
          }
        } catch (e) {}
      }
      
      // Take a screenshot after filling basic fields
      await page.screenshot({ path: 'test-results/07-basic-fields-filled.png', fullPage: true });
      
      // Try to proceed to next step if it's a multi-step form
      const nextButtons = ['button:has-text("Next")', 'button:has-text("Continue")', '[data-testid="next-step"]'];
      for (const selector of nextButtons) {
        try {
          if (await page.locator(selector).isVisible()) {
            console.log('➡️ Clicking Next button...');
            await page.click(selector);
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {}
      }
      
      // Fill discount fields
      console.log('💰 Setting discount information...');
      
      // Select discount type if available
      const discountTypeSelectors = ['select[name="type"]', 'select[name="discount_type"]', '[data-testid="discount-type"]'];
      for (const selector of discountTypeSelectors) {
        try {
          if (await page.locator(selector).isVisible()) {
            await page.selectOption(selector, testCouponData.discountType);
            console.log('✅ Discount type selected');
            break;
          }
        } catch (e) {}
      }
      
      // Fill discount value
      const discountValueSelectors = ['input[name="discount_value"]', 'input[name="value"]', 'input[type="number"]'];
      for (const selector of discountValueSelectors) {
        try {
          if (await page.locator(selector).isVisible()) {
            await page.fill(selector, testCouponData.discountValue);
            console.log('✅ Discount value filled');
            break;
          }
        } catch (e) {}
      }
      
      await page.screenshot({ path: 'test-results/08-discount-fields-filled.png', fullPage: true });
      
      console.log('✅ Form filling completed');
      
    } catch (error) {
      console.error('❌ Error filling form:', error.message);
      await page.screenshot({ path: 'test-results/08-form-fill-error.png', fullPage: true });
    }
  });

  test('should attempt coupon creation', async () => {
    console.log('🎯 Attempting to create coupon...');
    
    // Look for create/save/submit buttons
    const submitSelectors = [
      'button:has-text("Create Coupon")',
      'button:has-text("Save Coupon")',
      'button:has-text("Create")',
      'button:has-text("Save")',
      'button[type="submit"]',
      '[data-testid="create-coupon"]',
      '[data-testid="submit-coupon"]'
    ];
    
    let submitFound = false;
    
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          console.log(`✅ Found submit button: ${selector}`);
          
          // Check if button is enabled
          const isEnabled = await button.isEnabled();
          console.log(`🔘 Button enabled: ${isEnabled}`);
          
          if (isEnabled) {
            // Listen for network requests to see what happens
            const responsePromise = page.waitForResponse(response => 
              response.url().includes('/api/') || response.url().includes('supabase')
            ).catch(() => null);
            
            // Click the submit button
            await button.click();
            console.log('🖱️ Clicked submit button');
            
            // Wait for potential network response
            const response = await responsePromise;
            if (response) {
              console.log(`📡 Network response: ${response.status()} ${response.url()}`);
              const responseBody = await response.text().catch(() => '');
              console.log(`📄 Response body: ${responseBody.substring(0, 200)}...`);
            }
            
            submitFound = true;
            break;
          } else {
            console.log('⚠️ Submit button is disabled');
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!submitFound) {
      console.log('❌ Could not find enabled submit button');
      
      // Log all visible buttons for debugging
      const buttons = await page.locator('button').all();
      console.log('🔍 Available buttons:');
      for (const button of buttons) {
        const text = await button.textContent().catch(() => '');
        const isEnabled = await button.isEnabled().catch(() => false);
        if (text.trim()) {
          console.log(`  - "${text.trim()}" (enabled: ${isEnabled})`);
        }
      }
    }
    
    // Wait for potential response
    await page.waitForTimeout(3000);
    
    // Take a screenshot of the result
    await page.screenshot({ path: 'test-results/09-after-submit-attempt.png', fullPage: true });
    
    // Check for success/error messages
    const successMessages = await page.locator('text=success, text=created, [data-testid*="success"]').all();
    const errorMessages = await page.locator('text=error, text=failed, [data-testid*="error"], .error, .alert-error').all();
    
    if (successMessages.length > 0) {
      console.log('✅ Success message detected');
      for (const msg of successMessages) {
        const text = await msg.textContent().catch(() => '');
        console.log(`  📝 Success: ${text}`);
      }
    }
    
    if (errorMessages.length > 0) {
      console.log('❌ Error message detected');
      for (const msg of errorMessages) {
        const text = await msg.textContent().catch(() => '');
        console.log(`  📝 Error: ${text}`);
      }
    }
  });

  test('should capture console logs and errors', async () => {
    console.log('📊 Capturing final console logs and network activity...');
    
    // Execute the debug test function if available
    try {
      const result = await page.evaluate(() => {
        if (typeof window.runCouponTest === 'function') {
          return window.runCouponTest();
        }
        return 'runCouponTest function not available';
      });
      
      console.log('🧪 Debug test result:', result);
    } catch (error) {
      console.log('⚠️ Could not run debug test:', error.message);
    }
    
    // Get any console errors
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/10-final-state.png', fullPage: true });
    
    console.log('📋 Test completed. Check test-results/ folder for screenshots and logs.');
  });
});
