// tests/loading-state-fix.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Loading State Fix', () => {
  test('login button should not be stuck in loading state', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173')
    
    // Navigate to login page
    await page.click('text=Sign In')
    
    // Wait for login page to load
    await page.waitForSelector('button[type="submit"]')
    
    // Check that the login button shows proper text and is not in loading state
    const loginButton = page.locator('button[type="submit"]')
    
    // The button should show "Sign in" text, not be stuck in loading
    await expect(loginButton).toContainText('Sign in')
    
    // The button should be enabled (not disabled due to loading state)
    await expect(loginButton).toBeEnabled()
    
    // Should not contain loading spinner
    await expect(loginButton.locator('.animate-spin')).toHaveCount(0)
  })
  
  test('signup button should not be stuck in loading state', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173')
    
    // Navigate to signup page
    await page.click('text=Sign Up')
    
    // Wait for signup page to load
    await page.waitForSelector('button[type="submit"]')
    
    // Check that the signup button shows proper text and is not in loading state
    const signupButton = page.locator('button[type="submit"]')
    
    // The button should show "Create account" text, not be stuck in loading
    await expect(signupButton).toContainText('Create account')
    
    // The button should be enabled (not disabled due to loading state)
    await expect(signupButton).toBeEnabled()
    
    // Should not contain loading spinner initially
    await expect(signupButton.locator('.animate-spin')).toHaveCount(0)
  })
  
  test('signup form should handle submission properly', async ({ page }) => {
    // Navigate to signup page
    await page.goto('http://localhost:5173/auth/signup')
    
    // Wait for form to be ready
    await page.waitForSelector('form')
    
    // Fill out the form with test data
    await page.fill('input[name="fullName"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    
    // Get initial button state
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toContainText('Create account')
    await expect(submitButton).toBeEnabled()
    
    // Submit the form
    await submitButton.click()
    
    // During submission, button should show loading state
    await expect(submitButton).toContainText('Creating account...')
    
    // Wait for either success or error (max 30 seconds)
    await page.waitForTimeout(5000) // Give it time to process
    
    // Button should eventually return to normal state (not stuck)
    // This is the key test - ensuring the button doesn't stay in loading forever
    const finalButtonState = await submitButton.textContent()
    const isButtonEnabled = await submitButton.isEnabled()
    
    // The button should either be back to normal or show an error state,
    // but NOT be stuck with "Creating account..." forever
    expect(finalButtonState).not.toBe('Creating account...')
    
    console.log(`Final button state: "${finalButtonState}"`)
    console.log(`Button enabled: ${isButtonEnabled}`)
  })
  
  test('auth store should initialize properly', async ({ page }) => {
    // Navigate to the debug page to check store state
    await page.goto('http://localhost:5173/debug/auth')
    
    // Wait for the debug component to load
    await page.waitForSelector('text=AuthStore Test')
    
    // Check the initial state display
    const loadingState = page.locator('text=Loading:')
    await expect(loadingState).toBeVisible()
    
    // The loading state should be false (not stuck at true)
    await expect(page.locator('text=Loading:').locator('..').locator('.text-green-600')).toContainText('false')
    
    // The test button should be enabled
    const testButton = page.locator('text=Run Signup Test')
    await expect(testButton).toBeEnabled()
  })
})