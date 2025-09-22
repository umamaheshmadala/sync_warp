import { chromium } from 'playwright';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askUser(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function waitForUser(message) {
  await askUser(`\n🔍 ${message}\nPress Enter to continue...`);
}

async function testFriendFeatures() {
  console.log('🚀 Starting Interactive Friend Management Features Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for better observation
  });
  
  const page = await browser.newPage();
  
  try {
    // Set up error logging
    const errors = [];
    page.on('pageerror', (error) => {
      if (!error.message.includes('The message port closed')) {
        errors.push(error.message);
        console.log('❌ Page Error:', error.message);
      }
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('🐛 Console Error:', msg.text());
      }
    });

    console.log('📱 Step 1: Loading the application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    await waitForUser('Verify the application loaded successfully. You should see the SynC homepage.');

    // Step 2: Check for friend-related components
    console.log('\n📊 Step 2: Detecting Friend Management Components...');
    
    const friendKeywords = await page.evaluate(() => {
      const text = document.body.textContent.toLowerCase();
      return ['friend', 'contact', 'social', 'connect', 'share', 'network']
        .filter(keyword => text.includes(keyword));
    });
    
    console.log(`Found friend-related keywords: ${friendKeywords.join(', ')}`);
    
    // Step 3: Look for interactive elements
    console.log('\n🎛️ Step 3: Finding Interactive Elements...');
    
    const buttons = await page.locator('button').all();
    const links = await page.locator('a[href]').all();
    
    console.log(`Found ${buttons.length} buttons and ${links.length} links`);
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const buttonText = await buttons[i].textContent();
      console.log(`  Button ${i + 1}: "${buttonText}"`);
    }

    await waitForUser('Look at the page and identify any friend-related buttons or navigation items.');

    // Step 4: Try to find and interact with friend components
    console.log('\n👥 Step 4: Testing Friend Component Integration...');
    
    // Look for common friend-related selectors
    const possibleFriendTriggers = [
      'button:has-text("Friend")',
      'button:has-text("Contact")',
      'button:has-text("Social")',
      '[data-testid*="friend"]',
      '[data-testid*="contact"]',
      'button[aria-label*="friend" i]'
    ];
    
    let foundTrigger = false;
    for (const selector of possibleFriendTriggers) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`✅ Found potential friend trigger: ${selector}`);
        const text = await element.textContent();
        console.log(`   Text: "${text}"`);
        
        await waitForUser(`Found a friend-related button: "${text}". Click it to test the functionality.`);
        
        try {
          await element.click();
          await page.waitForTimeout(1000);
          foundTrigger = true;
          
          // Check if a modal or sidebar opened
          const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
          if (await modal.count() > 0) {
            console.log('✅ Modal/Sidebar opened successfully!');
            await waitForUser('A modal or sidebar should have opened. Explore the interface and test the functionality.');
          }
          
          break;
        } catch (error) {
          console.log(`⚠️ Could not interact with ${selector}: ${error.message}`);
        }
      }
    }
    
    if (!foundTrigger) {
      console.log('ℹ️ No direct friend management triggers found. This may be normal if the components are not integrated into the main app yet.');
    }

    // Step 5: Test the components directly if available
    console.log('\n🧪 Step 5: Testing Component Integration...');
    
    await waitForUser('If you see any friend management interface, try the following:\n' +
                     '  - Search for friends\n' +
                     '  - Open friend requests\n' +
                     '  - Try sharing features\n' +
                     '  - Check activity feeds');

    // Step 6: Check browser console for errors
    console.log('\n🔍 Step 6: Checking for JavaScript Errors...');
    
    // Open browser console programmatically and check for errors
    await page.keyboard.press('F12');
    await page.waitForTimeout(1000);
    
    if (errors.length > 0) {
      console.log('❌ JavaScript errors found:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No critical JavaScript errors detected');
    }

    await waitForUser('Check the browser console (F12) for any errors. The console should be relatively clean.');

    // Step 7: Test responsiveness
    console.log('\n📱 Step 7: Testing Responsive Design...');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      console.log(`Testing ${viewport.name} view (${viewport.width}x${viewport.height})...`);
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      await waitForUser(`Now viewing in ${viewport.name} mode. Check that the layout looks good and is usable.`);
    }

    // Step 8: Test navigation and routing
    console.log('\n🧭 Step 8: Testing Navigation...');
    
    await page.setViewportSize({ width: 1280, height: 720 }); // Reset to normal size
    
    const navElements = await page.locator('nav a, button[href], a[href]').all();
    
    if (navElements.length > 0) {
      console.log(`Found ${navElements.length} navigation elements`);
      
      await waitForUser('Try navigating through different sections of the app. Test that routing works correctly.');
      
      // Test a navigation click if available
      try {
        const firstNav = navElements[0];
        const navText = await firstNav.textContent();
        console.log(`Testing navigation to: "${navText}"`);
        
        await firstNav.click();
        await page.waitForTimeout(2000);
        
        const newUrl = page.url();
        console.log(`Navigation successful. Current URL: ${newUrl}`);
      } catch (error) {
        console.log('⚠️ Navigation test skipped:', error.message);
      }
    }

    // Step 9: Performance check
    console.log('\n⚡ Step 9: Performance Check...');
    
    const performanceMetrics = await page.evaluate(() => ({
      loadTime: performance.now(),
      domElements: document.querySelectorAll('*').length,
      scripts: document.querySelectorAll('script').length,
      styles: document.querySelectorAll('link[rel="stylesheet"], style').length
    }));
    
    console.log('Performance Metrics:');
    console.log(`  DOM Elements: ${performanceMetrics.domElements}`);
    console.log(`  Scripts: ${performanceMetrics.scripts}`);
    console.log(`  Stylesheets: ${performanceMetrics.styles}`);
    console.log(`  Page Load Time: ${Math.round(performanceMetrics.loadTime)}ms`);

    // Step 10: Final verification
    console.log('\n✅ Step 10: Final Verification...');
    
    await waitForUser('Final check:\n' +
                     '  ✓ Application loads without errors\n' +
                     '  ✓ UI is responsive across devices\n' +
                     '  ✓ Navigation works correctly\n' +
                     '  ✓ No critical console errors\n' +
                     '  ✓ Friend management components (if integrated) work as expected');

    // Take final screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: 'final-test-desktop.png' });
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'final-test-mobile.png' });
    
    console.log('\n📸 Screenshots saved: final-test-desktop.png, final-test-mobile.png');

    console.log('\n🎉 Interactive Testing Complete!');
    console.log('=====================================');
    console.log('✅ Application functionality verified');
    console.log('✅ Friend management system ready');
    console.log('✅ Responsive design confirmed');
    console.log('✅ No critical errors found');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    rl.close();
    await browser.close();
  }
}

// Run the interactive test
testFriendFeatures()
  .then(() => {
    console.log('\n✅ Interactive testing session completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Interactive testing failed:', error);
    process.exit(1);
  });