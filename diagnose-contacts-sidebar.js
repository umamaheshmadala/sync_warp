import { chromium } from 'playwright';

async function diagnoseContactsSidebar() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`🔍 [${msg.type()}] ${msg.text()}`);
  });

  // Capture all network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('🧪 DIAGNOSING CONTACTS SIDEBAR IMPLEMENTATION');
    console.log('==============================================');

    // Test 1: Check if we can access the business dashboard
    console.log('\n📍 Step 1: Navigating to business dashboard');
    await page.goto('http://localhost:5173/business/dashboard', { waitUntil: 'networkidle' });
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth/login')) {
      console.log('❌ ISSUE FOUND: Redirected to login - authentication required');
      console.log('💡 SOLUTION: Need to authenticate first OR temporarily disable route protection');
      
      // Let's try to temporarily bypass authentication by checking the regular dashboard
      console.log('\n📍 Testing regular dashboard instead...');
      await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
      
      const dashUrl = page.url();
      console.log(`Dashboard URL: ${dashUrl}`);
      
      if (dashUrl.includes('/auth/login')) {
        console.log('❌ Both dashboards require authentication');
        console.log('💡 Need to implement authentication bypass for testing');
        await browser.close();
        return;
      }
    }

    // Test 2: Check if page renders correctly
    console.log('\n📍 Step 2: Analyzing page structure');
    await page.waitForTimeout(3000); // Wait for any async rendering
    
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Check for main elements
    const hasHeader = await page.$('header') !== null;
    const hasMainContent = await page.$('main, .main, [role="main"]') !== null;
    const hasBusinessText = await page.textContent('body');
    
    console.log(`Has header element: ${hasHeader ? '✅' : '❌'}`);
    console.log(`Has main content: ${hasMainContent ? '✅' : '❌'}`);
    console.log(`Contains business text: ${hasBusinessText && hasBusinessText.includes('Business') ? '✅' : '❌'}`);
    
    // Test 3: Look for ContactsSidebar button specifically
    console.log('\n📍 Step 3: Searching for ContactsSidebar button');
    
    // Try multiple selectors for the Users button
    const buttonSelectors = [
      'button[aria-label*="friend"]',
      'button[aria-label*="contact"]', 
      'button:has-text("Friends")',
      'button:has([data-lucide="users"])',
      'button:has(.lucide-users)',
      'button svg[data-lucide="users"]',
      '[role="button"]:has(svg[data-lucide="users"])',
      'header button',
      'nav button'
    ];

    let friendsButton = null;
    for (const selector of buttonSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Found element with selector: ${selector}`);
          const text = await element.textContent();
          const hasUsersIcon = await element.$('svg[data-lucide="users"], .lucide-users') !== null;
          console.log(`   Text: "${text?.trim()}" | Has Users icon: ${hasUsersIcon}`);
          
          if (hasUsersIcon || selector.includes('users')) {
            friendsButton = element;
            console.log(`🎯 FOUND FRIENDS BUTTON with selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Selector not found, continue
      }
    }

    if (!friendsButton) {
      console.log('❌ ISSUE FOUND: Friends button not found with any selector');
      
      // Let's check what buttons DO exist
      console.log('\n🔍 Analyzing existing buttons:');
      const allButtons = await page.$$('button');
      console.log(`Found ${allButtons.length} total buttons`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const btn = allButtons[i];
        const text = await btn.textContent();
        const innerHTML = await btn.innerHTML();
        console.log(`Button ${i + 1}: "${text?.trim()}" | HTML: ${innerHTML.substring(0, 100)}...`);
      }
      
      // Check header specifically
      const header = await page.$('header');
      if (header) {
        const headerButtons = await header.$$('button');
        console.log(`\nHeader has ${headerButtons.length} buttons`);
        for (let i = 0; i < headerButtons.length; i++) {
          const btn = headerButtons[i];
          const text = await btn.textContent();
          const classes = await btn.getAttribute('class');
          console.log(`Header Button ${i + 1}: "${text?.trim()}" | Classes: ${classes}`);
        }
      }
      
      await browser.close();
      return;
    }

    // Test 4: Try clicking the Friends button
    console.log('\n📍 Step 4: Testing Friends button click');
    await friendsButton.click();
    console.log('👆 Clicked Friends button');
    
    // Wait for sidebar to potentially appear
    await page.waitForTimeout(2000);
    
    // Test 5: Check if ContactsSidebar appears
    console.log('\n📍 Step 5: Checking for ContactsSidebar');
    
    const sidebarSelectors = [
      '[role="dialog"]',
      '.sidebar',
      '[data-testid="contacts-sidebar"]',
      '[class*="sidebar"]',
      '[class*="modal"]',
      '[class*="drawer"]',
      '.fixed.inset-0.z-50',
      'div:has(h2:has-text("Your Friends"))',
      'h2:has-text("Your Friends")',
      '.bg-indigo-600'
    ];

    let sidebar = null;
    for (const selector of sidebarSelectors) {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible();
        console.log(`Found element with ${selector}: visible=${isVisible}`);
        if (isVisible) {
          sidebar = element;
          break;
        }
      }
    }

    if (sidebar) {
      console.log('✅ ContactsSidebar found and visible');
      
      // Check sidebar content
      const sidebarText = await sidebar.textContent();
      console.log(`Sidebar content: ${sidebarText?.substring(0, 200)}...`);
      
      // Look for close button
      const closeButton = await sidebar.$('button[aria-label*="close"], button:has-text("×"), button:has-text("Close")');
      if (closeButton) {
        console.log('✅ Close button found');
        await closeButton.click();
        console.log('👆 Clicked close button');
        
        await page.waitForTimeout(500);
        const stillVisible = await sidebar.isVisible();
        console.log(`Sidebar still visible after close: ${stillVisible ? '❌' : '✅'}`);
      }
      
    } else {
      console.log('❌ ISSUE FOUND: ContactsSidebar did not appear after clicking button');
      
      // Check if there were any JavaScript errors
      if (consoleMessages.length > 0) {
        console.log('\n🔍 Console Messages:');
        consoleMessages.forEach(msg => console.log(`   ${msg}`));
      }
    }

    // Test 6: Take screenshot for visual inspection
    await page.screenshot({ path: 'contacts-sidebar-diagnosis.png', fullPage: true });
    console.log('\n📸 Screenshot saved as contacts-sidebar-diagnosis.png');

    // Final summary
    console.log('\n📋 DIAGNOSIS SUMMARY');
    console.log('==================');
    console.log(`✅ Page loads: ${!currentUrl.includes('/auth/login')}`);
    console.log(`✅ Header exists: ${hasHeader}`);
    console.log(`✅ Friends button found: ${friendsButton !== null}`);
    console.log(`✅ Sidebar appears: ${sidebar !== null}`);
    
    if (friendsButton && !sidebar) {
      console.log('\n❌ CRITICAL ISSUE: Button exists but sidebar doesn\'t appear');
      console.log('💡 Possible causes:');
      console.log('   - ContactsSidebar component not imported correctly');
      console.log('   - State management issue (showContactsSidebar not working)');
      console.log('   - ContactsSidebar component has rendering errors');
      console.log('   - CSS/styling issues hiding the sidebar');
      console.log('   - JavaScript errors preventing sidebar from showing');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  } finally {
    console.log('\n🏁 Diagnosis complete');
    await browser.close();
  }
}

diagnoseContactsSidebar();