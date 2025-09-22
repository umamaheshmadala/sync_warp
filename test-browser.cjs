const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: false });
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('New page created');
    
    // Set up console and error listeners before navigation
    const consoleMessages = [];
    page.on('console', msg => {
      console.log('Browser console:', msg.type(), msg.text());
      consoleMessages.push(msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
    
    console.log('Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173');
    console.log('Navigation complete');
    
    const title = await page.title();
    console.log('Page title:', title);
    
    const body = await page.locator('body').isVisible();
    console.log('Body visible:', body);
    
    // Wait for page load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('Screenshot saved');
    
    await browser.close();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error running test:', error);
  }
})();