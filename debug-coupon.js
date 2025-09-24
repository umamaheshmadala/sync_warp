// debug-coupon.js
// Manual debugging script to analyze coupon creation issues

const puppeteer = require('puppeteer');

async function debugCouponCreation() {
  console.log('🚀 Starting coupon creation debug...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser window
    devtools: true,  // Open devtools
    slowMo: 1000     // Slow down actions
  });
  
  const page = await browser.newPage();
  
  // Enable verbose logging
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  
  page.on('requestfailed', request => {
    console.log(`[NETWORK ERROR] ${request.method()} ${request.url()} - ${request.failure().errorText}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });
  
  try {
    // Navigate to the application
    console.log('📍 Navigating to http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    console.log('✅ Page loaded successfully');
    
    // Navigate to coupon page
    const businessId = 'ac269130-cfb0-4c36-b5ad-34931cd19b50';
    const couponsUrl = `http://localhost:5174/business/${businessId}/coupons`;
    
    console.log(`🏢 Navigating to: ${couponsUrl}`);
    await page.goto(couponsUrl, { waitUntil: 'networkidle0' });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Look for buttons
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent?.trim(),
        visible: btn.offsetParent !== null,
        disabled: btn.disabled
      })).filter(btn => btn.text && btn.text.length > 0)
    );
    
    console.log('🔍 Found buttons:');
    buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" (visible: ${btn.visible}, disabled: ${btn.disabled})`);
    });
    
    // Look for "Add Coupon" or similar buttons
    const addCouponSelectors = [
      'button:contains("Add Coupon")',
      'button:contains("Create")',
      'button:contains("New")',
      'button[aria-label*="Add"]',
      'button[aria-label*="Create"]'
    ];
    
    let addButtonFound = false;
    
    for (const selector of addCouponSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          const isVisible = await button.isIntersectingViewport();
          console.log(`➕ Found button with selector "${selector}" (visible: ${isVisible})`);
          
          if (isVisible) {
            console.log('🎯 Clicking Add Coupon button...');
            await button.click();
            addButtonFound = true;
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!addButtonFound) {
      // Try a more general approach
      const allButtons = await page.$$('button');
      console.log(`📊 Total buttons found: ${allButtons.length}`);
      
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        const text = await button.evaluate(el => el.textContent?.trim());
        
        if (text && (text.toLowerCase().includes('add') || 
                     text.toLowerCase().includes('create') || 
                     text.toLowerCase().includes('new') ||
                     text === '+')) {
          console.log(`🎯 Found potential add button: "${text}"`);
          const isVisible = await button.isIntersectingViewport();
          
          if (isVisible) {
            console.log('🖱️ Clicking button...');
            await button.click();
            addButtonFound = true;
            break;
          }
        }
      }
    }
    
    if (addButtonFound) {
      // Wait for modal or form to appear
      console.log('⏳ Waiting for form/modal to appear...');
      await page.waitForTimeout(2000);
      
      // Look for form fields
      const titleInput = await page.$('input[name="title"], input[placeholder*="title"]');
      if (titleInput) {
        console.log('📝 Found title input, filling it...');
        await titleInput.type('Debug Test Coupon', { delay: 100 });
        
        const descInput = await page.$('textarea[name="description"], textarea[placeholder*="description"]');
        if (descInput) {
          console.log('📝 Found description input, filling it...');
          await descInput.type('This is a debug test coupon to identify creation issues.', { delay: 50 });
        }
        
        // Try to submit
        const submitButton = await page.$('button[type="submit"], button:contains("Create"), button:contains("Submit")');
        if (submitButton) {
          const buttonText = await submitButton.evaluate(el => el.textContent?.trim());
          const isEnabled = await submitButton.evaluate(el => !el.disabled);
          
          console.log(`🎯 Found submit button: "${buttonText}" (enabled: ${isEnabled})`);
          
          if (isEnabled) {
            console.log('🚀 Attempting to submit...');
            
            // Listen for network activity
            const responses = [];
            page.on('response', response => {
              if (response.url().includes('supabase') || response.url().includes('api')) {
                responses.push({
                  url: response.url(),
                  status: response.status(),
                  statusText: response.statusText()
                });
              }
            });
            
            await submitButton.click();
            
            // Wait for response
            await page.waitForTimeout(5000);
            
            console.log('📡 Network responses:', responses);
            
            // Check for success/error messages
            const errorElements = await page.$$('[class*="error"], [class*="alert"], .toast');
            
            for (const element of errorElements) {
              const text = await element.evaluate(el => el.textContent?.trim());
              if (text) {
                console.log(`❌ Error/Alert found: "${text}"`);
              }
            }
          }
        } else {
          console.log('❌ No submit button found');
        }
      } else {
        console.log('❌ No title input found');
      }
    } else {
      console.log('❌ No "Add Coupon" button found');
    }
    
    // Execute debug function if available
    console.log('🧪 Trying to execute window debug function...');
    const debugResult = await page.evaluate(() => {
      if (typeof window.runCouponTest === 'function') {
        return window.runCouponTest();
      }
      return 'Debug function not available';
    });
    
    console.log('🔬 Debug function result:', debugResult);
    
    console.log('✅ Debug completed. Check the browser for visual inspection.');
    console.log('Press Ctrl+C to close when done examining.');
    
    // Keep browser open for manual inspection
    await new Promise(() => {}); // This will keep the script running
    
  } catch (error) {
    console.error('💥 Debug error:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug function
if (require.main === module) {
  debugCouponCreation().catch(console.error);
}

module.exports = { debugCouponCreation };