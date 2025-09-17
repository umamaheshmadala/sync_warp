// e2e/landing-to-dashboard.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Landing to Dashboard User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the landing page
    await page.goto('/');
  });

  test('should display landing page correctly', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: /discover local businesses/i })).toBeVisible();
    
    // Check CTA buttons
    await expect(page.getByRole('link', { name: /browse businesses/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /join community/i })).toBeVisible();
    
    // Check feature cards
    await expect(page.getByText('Local Discovery')).toBeVisible();
    await expect(page.getByText('Exclusive Deals')).toBeVisible();
    await expect(page.getByText('Social Sharing')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.getByRole('link', { name: /login/i }).click();
    
    // Should be on login page
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();
    
    // Should be on signup page
    await expect(page).toHaveURL('/auth/signup');
  });

  test('should allow browsing without authentication', async ({ page }) => {
    await page.getByRole('link', { name: /browse businesses/i }).click();
    
    // Should navigate to browse page (or show public businesses)
    await expect(page).toHaveURL(/\/browse/);
  });

  test('should complete login flow', async ({ page }) => {
    // Navigate to login
    await page.getByRole('link', { name: /login/i }).click();
    
    // Fill login form
    await page.getByPlaceholder('Enter your email').fill('test@example.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard (assuming successful login)
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display validation errors for invalid login', async ({ page }) => {
    // Navigate to login
    await page.getByRole('link', { name: /login/i }).click();
    
    // Try to submit with invalid email
    await page.getByPlaceholder('Enter your email').fill('invalid-email');
    await page.getByPlaceholder('Enter your password').fill('short');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/please enter a valid email/i)).toBeVisible();
    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();
  });
});

test.describe('Dashboard Features', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.goto('/dashboard');
    // In a real test, you'd set up authentication state
  });

  test('should display dashboard components', async ({ page }) => {
    // Check welcome message
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    
    // Check main sections
    await expect(page.getByText('Businesses in Spotlight')).toBeVisible();
    await expect(page.getByText('Hot Offers')).toBeVisible();
    await expect(page.getByText('Trending Products')).toBeVisible();
  });

  test('should open contacts sidebar', async ({ page }) => {
    // Click contacts button
    await page.getByRole('button', { name: /contacts/i }).first().click();
    
    // Should open sidebar
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Your Friends')).toBeVisible();
  });

  test('should navigate via bottom navigation', async ({ page }) => {
    // Test search navigation
    await page.getByRole('button', { name: /search/i }).click();
    await expect(page).toHaveURL('/search');
    
    // Test wallet navigation
    await page.getByRole('button', { name: /wallet/i }).click();
    await expect(page).toHaveURL('/wallet');
    
    // Test social navigation
    await page.getByRole('button', { name: /social/i }).click();
    await expect(page).toHaveURL('/social');
    
    // Test profile navigation
    await page.getByRole('button', { name: /profile/i }).click();
    await expect(page).toHaveURL('/profile');
  });

  test('should open notification hub', async ({ page }) => {
    // Click notifications button
    await page.getByRole('button').filter({ hasText: /bell/i }).click();
    
    // Should open notification panel
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    // Click search bar
    await page.getByPlaceholder(/search businesses/i).click();
    
    // Should navigate to search page
    await expect(page).toHaveURL('/search');
  });
});

test.describe('Mobile Responsive Design', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display mobile layout correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check mobile-specific elements
    await expect(page.getByRole('heading')).toBeVisible();
    
    // Check responsive navigation
    const navButtons = page.getByRole('link');
    await expect(navButtons.first()).toBeVisible();
  });

  test('should handle touch interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test swipe-like interactions
    const businessCard = page.locator('.overflow-x-auto').first();
    await expect(businessCard).toBeVisible();
  });
});

test.describe('Performance & Accessibility', () => {
  test('should meet performance benchmarks', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    const loadTime = Date.now() - startTime;
    
    // Should load within 2 seconds (as per requirements)
    expect(loadTime).toBeLessThan(2000);
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate with keyboard
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper accessibility attributes
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});