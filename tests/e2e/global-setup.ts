import { chromium, FullConfig } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-data';

/**
 * Global setup for E2E tests
 * Creates authenticated session for test user
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('🔐 Setting up authentication for E2E tests...');

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/auth/login`);

    // Fill in login form
    await page.fill('input[type="email"]', TEST_USERS.regularUser1.email);
    await page.fill('input[type="password"]', TEST_USERS.regularUser1.password);

    // Submit login
    await page.click('button[type="submit"], button:has-text("Sign in")');

    // Wait for navigation to complete
    await page.waitForURL(/^\/(|home|dashboard|businesses)/i, { timeout: 30000 });

    // Save authenticated state
    await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });

    console.log('✅ Authentication state saved successfully');
  } catch (error) {
    console.error('❌ Failed to setup authentication:', error);
    console.log('⚠️  Tests will run without authentication - they may fail if login is required');
  } finally {
    await browser.close();
  }
}

export default globalSetup;
