import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helpers for Epic 4
 * Utilities to simulate real user interactions
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login as a test user
   */
  async login(email: string = 'test@example.com', password: string = 'testpassword123') {
    await this.page.goto('/login');
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  /**
   * Sign up a new test user
   */
  async signup(email: string, password: string, name: string) {
    await this.page.goto('/signup');
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.fill('input[name="name"]', name);
    await this.page.click('button[type="submit"]');
    
    // Wait for successful signup
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  /**
   * Navigate to a specific route
   */
  async goto(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill form field by label or placeholder
   */
  async fillField(labelOrPlaceholder: string, value: string) {
    const input = this.page.locator(`input:has-text("${labelOrPlaceholder}"), input[placeholder="${labelOrPlaceholder}"]`).first();
    await input.fill(value);
  }

  /**
   * Click button by text
   */
  async clickButton(text: string) {
    await this.page.click(`button:has-text("${text}")`);
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string) {
    if (message) {
      await expect(this.page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 });
    } else {
      await this.page.waitForSelector('[role="status"]', { timeout: 5000 });
    }
  }

  /**
   * Upload file
   */
  async uploadFile(inputSelector: string, filePath: string) {
    await this.page.setInputFiles(inputSelector, filePath);
  }

  /**
   * Grant geolocation permissions
   */
  async grantGeolocation() {
    const context = this.page.context();
    await context.grantPermissions(['geolocation']);
  }

  /**
   * Take screenshot with name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 5000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    return (await this.page.locator(selector).count()) > 0;
  }

  /**
   * Get text content of element
   */
  async getText(selector: string): Promise<string> {
    return (await this.page.locator(selector).textContent()) || '';
  }

  /**
   * Scroll to element
   */
  async scrollTo(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp) {
    return await this.page.waitForResponse(urlPattern);
  }

  /**
   * Fill multi-step form
   */
  async fillMultiStepForm(steps: Array<{ [key: string]: string }>) {
    for (const step of steps) {
      for (const [field, value] of Object.entries(step)) {
        await this.fillField(field, value);
      }
      await this.clickButton('Next');
      await this.page.waitForTimeout(500); // Wait for animation
    }
  }

  /**
   * Logout
   */
  async logout() {
    await this.page.click('[aria-label="User menu"], [data-testid="user-menu"]');
    await this.page.click('text=Logout');
    await this.page.waitForURL('**/login', { timeout: 5000 });
  }
}

/**
 * Generate random test data
 */
export class TestDataGenerator {
  static randomEmail(): string {
    return `test-${Date.now()}@example.com`;
  }

  static randomBusinessName(): string {
    const prefixes = ['Sunny', 'Happy', 'Golden', 'Fresh', 'Urban'];
    const suffixes = ['Cafe', 'Shop', 'Store', 'Market', 'Deli'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }

  static randomProduct(): string {
    const products = ['Coffee', 'Sandwich', 'Pizza', 'Burger', 'Salad'];
    return products[Math.floor(Math.random() * products.length)];
  }

  static randomPrice(): string {
    return (Math.random() * 50 + 10).toFixed(2);
  }

  static randomAddress(): { street: string; city: string; state: string; zip: string } {
    return {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zip: '10001',
    };
  }
}

/**
 * Wait utilities
 */
export const wait = {
  short: 500,
  medium: 1000,
  long: 2000,
  animation: 300,
};