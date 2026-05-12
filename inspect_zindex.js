import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login');
  
  // Login
  await page.fill('input[type="email"]', 'testuser3@gmail.com');
  await page.fill('input[type="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  // Goto messages
  await page.goto('http://localhost:5173/messages');
  await page.waitForTimeout(2000);
  await page.click('text="Test User 4"'); // or appropriate user
  await page.waitForTimeout(2000);
  
  // Scroll to trigger sticky
  await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(1000);
  
  const zIndexes = await page.evaluate(() => {
    const dates = document.querySelectorAll('[data-testid="date-separator"]');
    const result = [];
    dates.forEach(d => {
       const parent = d.parentElement;
       const grandparent = parent?.parentElement;
       result.push({
         dateZ: window.getComputedStyle(d).zIndex,
         parentClass: parent?.className,
         parentZ: window.getComputedStyle(parent).zIndex,
         grandparentClass: grandparent?.className,
         grandparentZ: window.getComputedStyle(grandparent).zIndex,
         dataset: parent?.dataset
       });
    });
    return result;
  });
  
  console.log(JSON.stringify(zIndexes, null, 2));
  
  await browser.close();
})();
