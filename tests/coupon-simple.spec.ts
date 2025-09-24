import { test, expect } from '@playwright/test';

test.describe('Coupon Creation Debug', () => {
  test('should navigate to coupon page and identify issues', async ({ page }) => {
    console.log('🔗 Starting coupon creation test...');
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
    });
    
    // Log network errors
    page.on('requestfailed', request => {
      console.log(`[NETWORK ERROR] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    // Log page errors
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    try {
      // Navigate to the application
      console.log('📍 Navigating to application...');
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
      
      // Take screenshot of initial state
      await page.screenshot({ path: 'test-results/coupon-debug-01-initial.png', fullPage: true });
      
      // Check page title
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
      
      // Navigate to specific coupon page
      const businessId = 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
      const couponsUrl = `http://localhost:5174/business/${businessId}/coupons`;
      
      console.log(`🏢 Navigating to: ${couponsUrl}`);
      await page.goto(couponsUrl, { waitUntil: 'networkidle' });
      
      // Wait a bit for everything to load
      await page.waitForTimeout(3000);
      
      // Take screenshot of coupon page
      await page.screenshot({ path: 'test-results/coupon-debug-02-coupon-page.png', fullPage: true });
      
      // Look for any "Add Coupon" or similar buttons
      console.log('🔍 Looking for coupon creation buttons...');
      
      const buttons = await page.locator('button').all();
      console.log(`📊 Found ${buttons.length} buttons on page`);
      
      for (let i = 0; i < buttons.length && i < 10; i++) {
        const button = buttons[i];
        const text = await button.textContent().catch(() => '');
        const isVisible = await button.isVisible().catch(() => false);
        const isEnabled = await button.isEnabled().catch(() => false);
        
        if (text?.trim()) {
          console.log(`  Button ${i + 1}: "${text.trim()}" (visible: ${isVisible}, enabled: ${isEnabled})`);
        }
      }
      
      // Look specifically for "Add Coupon" button
      const addCouponButton = page.locator('button:has-text("Add Coupon"), button:has-text("Create"), button:has-text("+")').first();
      const addButtonVisible = await addCouponButton.isVisible().catch(() => false);
      
      console.log(`➕ Add coupon button visible: ${addButtonVisible}`);
      
      if (addButtonVisible) {
        console.log('🎯 Attempting to click Add Coupon button...');
        await addCouponButton.click();
        
        // Wait for modal or form to appear
        await page.waitForTimeout(2000);
        
        // Take screenshot of modal/form
        await page.screenshot({ path: 'test-results/coupon-debug-03-modal-opened.png', fullPage: true });
        
        // Look for form fields
        const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
        const titleVisible = await titleInput.isVisible().catch(() => false);
        
        console.log(`📝 Title input visible: ${titleVisible}`);
        
        if (titleVisible) {
          console.log('📝 Filling form fields...');
          await titleInput.fill('Test Coupon Debug');
          
          // Look for description field
          const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description"]').first();
          const descVisible = await descInput.isVisible().catch(() => false);
          
          if (descVisible) {
            await descInput.fill('This is a test coupon for debugging purposes to identify why coupon creation is failing.');
          }
          
          // Take screenshot after filling
          await page.screenshot({ path: 'test-results/coupon-debug-04-form-filled.png', fullPage: true });
          
          // Look for submit/create button
          const submitButton = page.locator('button:has-text("Create"), button:has-text("Submit"), button[type="submit"]').first();
          const submitVisible = await submitButton.isVisible().catch(() => false);
          const submitEnabled = await submitVisible ? await submitButton.isEnabled() : false;
          
          console.log(`🎯 Submit button visible: ${submitVisible}, enabled: ${submitEnabled}`);
          
          if (submitVisible && submitEnabled) {
            console.log('🚀 Attempting to create coupon...');
            
            // Listen for any network requests
            let networkResponses: any[] = [];
            page.on('response', response => {
              if (response.url().includes('supabase') || response.url().includes('api')) {
                networkResponses.push({
                  url: response.url(),
                  status: response.status(),
                  statusText: response.statusText()
                });
              }
            });
            
            await submitButton.click();
            
            // Wait for potential response
            await page.waitForTimeout(5000);
            
            // Log network responses
            console.log('📡 Network responses:', networkResponses);
            
            // Take final screenshot
            await page.screenshot({ path: 'test-results/coupon-debug-05-after-submit.png', fullPage: true });
            
            // Check for success or error messages
            const successMsg = await page.locator('text=success, text=created').first().isVisible().catch(() => false);
            const errorMsg = await page.locator('text=error, text=failed').first().isVisible().catch(() => false);
            
            console.log(`✅ Success message visible: ${successMsg}`);
            console.log(`❌ Error message visible: ${errorMsg}`);
            
            if (errorMsg) {
              const errorText = await page.locator('text=error, text=failed').first().textContent().catch(() => '');
              console.log(`❌ Error message: "${errorText}"`);
            }
          }
        }
      } else {
        console.log('❌ No "Add Coupon" button found on page');
      }
      
      // Execute debug function if available
      console.log('🧪 Trying to run debug function...');
      const debugResult = await page.evaluate(() => {
        if (typeof (window as any).runCouponTest === 'function') {
          return (window as any).runCouponTest();
        }
        return 'Debug function not available';
      }).catch(error => `Error: ${error.message}`);
      
      console.log('🔬 Debug function result:', debugResult);
      
    } catch (error) {
      console.error('💥 Test error:', error);
      await page.screenshot({ path: 'test-results/coupon-debug-error.png', fullPage: true });
      throw error;
    }
  });
});