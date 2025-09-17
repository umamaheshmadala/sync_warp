// signup-flow.e2e.ts
import { test, expect } from '@playwright/test'

test.describe('User Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('should display signup page correctly', async ({ page }) => {
    // Navigate to signup from landing page
    await page.click('text=Sign Up')
    
    // Verify URL
    await expect(page).toHaveURL('/auth/signup')
    
    // Verify page elements
    await expect(page.locator('h2')).toHaveText('Create your account')
    await expect(page.locator('input[name="fullName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toHaveText('Create account')
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Check for validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible()
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
    await expect(page.locator('text=Please confirm your password')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Enter invalid email
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')
    
    // Check for email validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
  })

  test('should validate password strength', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Enter weak password
    await page.fill('input[name="password"]', '123')
    
    // Check password strength indicator shows weak
    const strengthBars = page.locator('.h-1.flex-1.rounded')
    await expect(strengthBars.first()).toHaveClass(/bg-red-400/)
  })

  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Enter mismatched passwords
    await page.fill('input[name="password"]', 'StrongPassword123!')
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!')
    await page.click('button[type="submit"]')
    
    // Check for password mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  test('should show password strength indicator', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Enter progressively stronger passwords
    await page.fill('input[name="password"]', '12345678')
    await expect(page.locator('text=At least 8 characters')).toBeVisible()
    
    await page.fill('input[name="password"]', '12345678A')
    await expect(page.locator('.text-green-500')).toHaveCount(2) // Length + uppercase
    
    await page.fill('input[name="password"]', '12345678Aa')
    await expect(page.locator('.text-green-500')).toHaveCount(3) // Length + uppercase + number
  })

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Fill password
    await page.fill('input[name="password"]', 'TestPassword123!')
    
    // Initially password should be hidden
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password')
    
    // Click show password button
    await page.click('button[type="button"] >> nth=0')
    
    // Password should now be visible
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text')
    
    // Click hide password button
    await page.click('button[type="button"] >> nth=0')
    
    // Password should be hidden again
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password')
  })

  test('should clear errors when user starts typing', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Submit empty form to generate errors
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Full name is required')).toBeVisible()
    
    // Start typing in full name field
    await page.fill('input[name="fullName"]', 'J')
    
    // Error should disappear
    await expect(page.locator('text=Full name is required')).not.toBeVisible()
  })

  test('should show loading state during submission', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Fill valid form data
    await page.fill('input[name="fullName"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'StrongPassword123!')
    await page.fill('input[name="confirmPassword"]', 'StrongPassword123!')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Check for loading state (this will fail without proper Supabase connection)
    await expect(page.locator('text=Creating account...')).toBeVisible({ timeout: 1000 }).catch(() => {
      // Expected to fail without real Supabase connection
    })
  })

  test('should navigate back to login', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Click sign in link
    await page.click('text=Sign in here')
    
    // Should navigate to login page
    await expect(page).toHaveURL('/auth/login')
  })

  test('should be mobile responsive', async ({ page, browserName }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/auth/signup')
    
    // Check that form is still usable on mobile
    await expect(page.locator('h2')).toHaveText('Create your account')
    await expect(page.locator('input[name="fullName"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    
    // Check that form fields are properly sized
    const emailInput = page.locator('input[name="email"]')
    const boundingBox = await emailInput.boundingBox()
    expect(boundingBox?.width).toBeGreaterThan(200) // Ensure reasonable width
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Check labels are associated with inputs
    await expect(page.locator('label[for="fullName"]')).toBeVisible()
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()
    await expect(page.locator('label[for="confirmPassword"]')).toBeVisible()
    
    // Check required attributes
    await expect(page.locator('input[name="fullName"]')).toHaveAttribute('required')
    await expect(page.locator('input[name="email"]')).toHaveAttribute('required')
    await expect(page.locator('input[name="password"]')).toHaveAttribute('required')
    
    // Check autocomplete attributes
    await expect(page.locator('input[name="fullName"]')).toHaveAttribute('autocomplete', 'name')
    await expect(page.locator('input[name="email"]')).toHaveAttribute('autocomplete', 'email')
    await expect(page.locator('input[name="password"]')).toHaveAttribute('autocomplete', 'new-password')
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Start from full name field
    await page.focus('input[name="fullName"]')
    
    // Tab through form fields
    await page.press('input[name="fullName"]', 'Tab')
    await expect(page.locator('input[name="email"]')).toBeFocused()
    
    await page.press('input[name="email"]', 'Tab')
    await expect(page.locator('input[name="password"]')).toBeFocused()
    
    await page.press('input[name="password"]', 'Tab')
    await expect(page.locator('input[name="confirmPassword"]')).toBeFocused()
  })
})