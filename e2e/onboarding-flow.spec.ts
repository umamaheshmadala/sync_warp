// e2e/onboarding-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('User Onboarding Flow', () => {
  // Test data
  const testUser = {
    fullName: 'John Doe',
    email: `test-onboarding-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phone: '5551234567',
    city: 'New York, NY'
  }

  test.beforeEach(async ({ page }) => {
    // Start from the landing page
    await page.goto('/')
  })

  test('should complete full onboarding flow after signup', async ({ page }) => {
    // 1. Navigate to signup
    await page.click('text=Sign Up')
    await page.waitForSelector('form')

    // 2. Fill signup form
    await page.fill('input[name="fullName"]', testUser.fullName)
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="password"]', testUser.password)
    await page.fill('input[name="confirmPassword"]', testUser.password)

    // 3. Submit signup
    await page.click('button[type="submit"]')
    
    // 4. Should redirect to onboarding
    await page.waitForURL('/onboarding')
    
    // 5. Verify onboarding header and progress
    await expect(page.locator('h1')).toContainText('Welcome to SynC!')
    await expect(page.locator('text=Step 1 of 3')).toBeVisible()

    // STEP 1: Basic Info
    await expect(page.locator('h2')).toContainText('Basic Information')
    
    // Should show user's name in welcome message
    await expect(page.locator('text=' + testUser.fullName)).toBeVisible()
    
    // Fill phone number (optional)
    await page.fill('input[type="tel"]', testUser.phone)
    await expect(page.locator('input[type="tel"]')).toHaveValue('(555) 123-4567') // Formatted
    
    // Continue to step 2
    await page.click('text=Continue')

    // STEP 2: Location
    await page.waitForSelector('h2:has-text("Your Location")')
    await expect(page.locator('text=Step 2 of 3')).toBeVisible()
    
    // Progress indicator should show step 1 as completed
    await expect(page.locator('.bg-indigo-600')).toHaveCount(2) // Current step + completed step
    
    // Fill city
    await page.fill('input[placeholder*="Enter your city"]', 'New York')
    
    // Should show suggestions
    await expect(page.locator('text=New York, NY')).toBeVisible()
    await page.click('text=New York, NY')
    
    // Continue to step 3
    await page.click('button:has-text("Continue")')

    // STEP 3: Interests
    await page.waitForSelector('h2:has-text("Your Interests")')
    await expect(page.locator('text=Step 3 of 3')).toBeVisible()
    
    // Select some interests
    await page.click('text=Food & Dining')
    await page.click('text=Shopping & Retail')
    await page.click('text=Entertainment')
    
    // Should show selection feedback
    await expect(page.locator('text=You\'ve selected 3 categories')).toBeVisible()
    
    // Verify notification preferences are visible and toggleable
    await expect(page.locator('text=Email Notifications')).toBeVisible()
    await expect(page.locator('text=Push Notifications')).toBeVisible()
    
    // Complete onboarding
    await page.click('button:has-text("Complete Setup")')
    
    // 6. Should show completion screen
    await expect(page.locator('h1:has-text("Welcome to SynC!")')).toBeVisible()
    await expect(page.locator('text=Profile Complete!')).toBeVisible()
    
    // Should redirect to dashboard after delay
    await page.waitForURL('/dashboard', { timeout: 5000 })
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('should allow skipping optional steps', async ({ page }) => {
    // Complete signup first (simplified)
    await page.goto('/onboarding') // Assume already signed up
    
    // STEP 1: Skip phone number
    await page.click('text=Skip for now')
    
    // Should go to step 2
    await expect(page.locator('h2:has-text("Your Location")')).toBeVisible()
    
    // Fill required city field
    await page.fill('input[placeholder*="Enter your city"]', 'Chicago, IL')
    await page.click('button:has-text("Continue")')
    
    // STEP 3: Don't select interests, just complete
    await expect(page.locator('h2:has-text("Your Interests")')).toBeVisible()
    await page.click('button:has-text("Complete Setup")')
    
    // Should still complete successfully
    await expect(page.locator('text=Profile Complete!')).toBeVisible()
  })

  test('should allow skipping entire onboarding', async ({ page }) => {
    await page.goto('/onboarding')
    
    // Click skip entire onboarding
    await page.click('text=Skip onboarding for now')
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard')
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/onboarding')
    
    // STEP 1: Try to continue without filling anything
    await page.click('text=Continue')
    
    // Should stay on step 1 (no required fields here)
    
    // Go to step 2
    await page.click('text=Continue')
    await expect(page.locator('h2:has-text("Your Location")')).toBeVisible()
    
    // Try to continue without city
    await page.click('button:has-text("Continue")')
    
    // Should show error
    await expect(page.locator('text=Please enter your city')).toBeVisible()
    
    // Fill city and continue
    await page.fill('input[placeholder*="Enter your city"]', 'Boston, MA')
    await page.click('button:has-text("Continue")')
    
    // Should proceed to step 3
    await expect(page.locator('h2:has-text("Your Interests")')).toBeVisible()
  })

  test('should support navigation between steps', async ({ page }) => {
    await page.goto('/onboarding')
    
    // Go to step 2
    await page.click('text=Continue')
    await expect(page.locator('h2:has-text("Your Location")')).toBeVisible()
    
    // Go back to step 1
    await page.click('button:has-text("Back")')
    await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible()
    
    // Go forward again
    await page.click('text=Continue')
    
    // Fill city and go to step 3
    await page.fill('input[placeholder*="Enter your city"]', 'Seattle, WA')
    await page.click('button:has-text("Continue")')
    await expect(page.locator('h2:has-text("Your Interests")')).toBeVisible()
    
    // Go back to step 2
    await page.click('button:has-text("Back")')
    await expect(page.locator('h2:has-text("Your Location")')).toBeVisible()
    
    // City should be preserved
    await expect(page.locator('input[placeholder*="Enter your city"]')).toHaveValue('Seattle, WA')
  })

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/onboarding')
    
    // Should be responsive
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Step 1 of 3')).toBeVisible()
    
    // Buttons should be stacked on mobile
    await expect(page.locator('button:has-text("Continue")')).toBeVisible()
    await expect(page.locator('button:has-text("Skip for now")')).toBeVisible()
    
    // Progress indicator should be visible
    await expect(page.locator('.rounded-full')).toBeVisible() // Progress circles
  })

  test('should handle phone number formatting', async ({ page }) => {
    await page.goto('/onboarding')
    
    const phoneInput = page.locator('input[type="tel"]')
    
    // Test phone number formatting
    await phoneInput.fill('1234567890')
    await expect(phoneInput).toHaveValue('(123) 456-7890')
    
    // Test partial input
    await phoneInput.clear()
    await phoneInput.fill('123456')
    await expect(phoneInput).toHaveValue('(123) 456')
    
    // Test invalid length
    await phoneInput.clear()
    await phoneInput.fill('123')
    await phoneInput.blur()
    // Should not show error for partial input
    
    // Test complete invalid number
    await phoneInput.clear()
    await phoneInput.fill('12345')
    await phoneInput.blur()
    await expect(page.locator('text=Please enter a valid 10-digit phone number')).toBeVisible()
  })

  test('should show interest selection feedback', async ({ page }) => {
    await page.goto('/onboarding')
    
    // Navigate to step 3
    await page.click('text=Continue')
    await page.fill('input[placeholder*="Enter your city"]', 'Miami, FL')
    await page.click('button:has-text("Continue")')
    
    // Should be on interests step
    await expect(page.locator('h2:has-text("Your Interests")')).toBeVisible()
    
    // Select first interest
    await page.click('text=Food & Dining')
    await expect(page.locator('text=You\'ve selected 1 categories')).toBeVisible()
    
    // Select more interests
    await page.click('text=Shopping & Retail')
    await page.click('text=Coffee & Beverages')
    await expect(page.locator('text=You\'ve selected 3 categories')).toBeVisible()
    
    // Unselect one
    await page.click('text=Food & Dining') // Click again to deselect
    await expect(page.locator('text=You\'ve selected 2 categories')).toBeVisible()
  })

  test('should handle loading states properly', async ({ page }) => {
    await page.goto('/onboarding')
    
    // Navigate to final step
    await page.click('text=Continue') // Step 1
    await page.fill('input[placeholder*="Enter your city"]', 'Portland, OR')
    await page.click('button:has-text("Continue")') // Step 2
    
    // On step 3, click complete setup
    await page.click('button:has-text("Complete Setup")')
    
    // Should show loading state
    await expect(page.locator('text=Completing Setup...')).toBeVisible()
    
    // Loading button should be disabled
    await expect(page.locator('button:has-text("Completing Setup...")').first()).toBeDisabled()
    
    // Eventually should show completion screen
    await expect(page.locator('text=Profile Complete!')).toBeVisible()
  })
})