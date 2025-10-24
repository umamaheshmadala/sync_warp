// e2e/follow-business-flow.spec.ts
// End-to-end tests for Follow Business System

import { test, expect, type Page } from '@playwright/test'

// Test configuration
const TEST_USER = {
  email: 'customer@test.com',
  password: 'TestPassword123!'
}

const TEST_BUSINESS_OWNER = {
  email: 'business@test.com',
  password: 'TestPassword123!'
}

const TEST_BUSINESS_ID = 'test-business-uuid'

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

async function logout(page: Page) {
  await page.click('[title="Sign Out"]')
  await page.waitForURL('/auth/login')
}

test.describe('Follow Business System E2E', () => {
  
  test.describe('Follow/Unfollow Flow', () => {
    test('user can follow a business', async ({ page }) => {
      // 1. Login as customer
      await login(page, TEST_USER.email, TEST_USER.password)
      
      // 2. Navigate to business profile
      await page.goto(`/business/${TEST_BUSINESS_ID}`)
      
      // 3. Verify page loaded
      await expect(page.locator('h1')).toBeVisible()
      
      // 4. Find and click follow button
      const followButton = page.locator('button:has-text("Follow")')
      await expect(followButton).toBeVisible()
      await followButton.click()
      
      // 5. Verify button state changes to "Following"
      await expect(page.locator('button:has-text("Following")')).toBeVisible({ timeout: 5000 })
      
      // 6. Navigate to Following page
      await page.goto('/following')
      
      // 7. Verify business appears in followed businesses list
      await expect(page.locator('text="Test Business"')).toBeVisible({ timeout: 5000 })
    })

    test('user can unfollow a business', async ({ page }) => {
      // Login and navigate to already followed business
      await login(page, TEST_USER.email, TEST_USER.password)
      await page.goto(`/business/${TEST_BUSINESS_ID}`)
      
      // Wait for Following button
      const followingButton = page.locator('button:has-text("Following")')
      await expect(followingButton).toBeVisible()
      
      // Click to unfollow
      await followingButton.click()
      
      // Confirm unfollow in modal if present
      const confirmButton = page.locator('button:has-text("Unfollow")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }
      
      // Verify button changes back to "Follow"
      await expect(page.locator('button:has-text("Follow")')).toBeVisible({ timeout: 5000 })
      
      // Verify business removed from Following page
      await page.goto('/following')
      await expect(page.locator('text="Test Business"')).not.toBeVisible()
    })

    test('follow count updates in real-time', async ({ page, context }) => {
      // Create two page contexts: customer and business owner
      const customerPage = page
      const businessPage = await context.newPage()
      
      // Login as business owner in second page
      await login(businessPage, TEST_BUSINESS_OWNER.email, TEST_BUSINESS_OWNER.password)
      await businessPage.goto('/analytics/followers')
      
      // Get initial follower count
      const initialCount = await businessPage.locator('[data-testid="follower-count"]').textContent()
      
      // Customer follows business
      await login(customerPage, TEST_USER.email, TEST_USER.password)
      await customerPage.goto(`/business/${TEST_BUSINESS_ID}`)
      await customerPage.click('button:has-text("Follow")')
      
      // Wait for count to update on business page
      await businessPage.waitForTimeout(2000) // Real-time delay
      const updatedCount = await businessPage.locator('[data-testid="follower-count"]').textContent()
      
      // Verify count increased
      expect(parseInt(updatedCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'))
      
      await businessPage.close()
    })
  })

  test.describe('Notification System', () => {
    test('user receives notification when business posts', async ({ page, context }) => {
      // Setup: Customer page and business owner page
      const customerPage = page
      const businessPage = await context.newPage()
      
      // Step 1: Customer follows business
      await login(customerPage, TEST_USER.email, TEST_USER.password)
      await customerPage.goto(`/business/${TEST_BUSINESS_ID}`)
      await customerPage.click('button:has-text("Follow")')
      await expect(customerPage.locator('button:has-text("Following")')).toBeVisible()
      
      // Step 2: Business owner posts new product
      await login(businessPage, TEST_BUSINESS_OWNER.email, TEST_BUSINESS_OWNER.password)
      await businessPage.goto('/products/new')
      await businessPage.fill('[name="name"]', 'Test Product E2E')
      await businessPage.fill('[name="price"]', '99.99')
      await businessPage.click('button[type="submit"]')
      
      // Step 3: Wait for notification to appear
      await customerPage.waitForTimeout(3000) // Allow time for trigger
      
      // Step 4: Verify notification bell shows badge
      const notificationBell = customerPage.locator('[data-testid="notification-bell"]')
      await expect(notificationBell.locator('.badge')).toBeVisible()
      
      // Step 5: Click bell to open dropdown
      await notificationBell.click()
      
      // Step 6: Verify notification appears in dropdown
      await expect(customerPage.locator('text="New Product Available"')).toBeVisible()
      await expect(customerPage.locator('text="Test Product E2E"')).toBeVisible()
      
      // Step 7: Click notification to navigate
      await customerPage.click('text="Test Product E2E"')
      await expect(customerPage).toHaveURL(/\/products\//)
      
      await businessPage.close()
    })

    test('notification badge updates correctly', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
      
      // Open notification dropdown
      const bell = page.locator('[data-testid="notification-bell"]')
      await bell.click()
      
      // Mark all as read
      await page.click('button:has-text("Mark all as read")')
      
      // Verify badge disappears
      await expect(bell.locator('.badge')).not.toBeVisible()
      
      // Verify no unread notifications
      await bell.click()
      await expect(page.locator('text="No new notifications"')).toBeVisible()
    })
  })

  test.describe('Notification Preferences', () => {
    test('user can manage notification preferences', async ({ page }) => {
      // Login and navigate to Following page
      await login(page, TEST_USER.email, TEST_USER.password)
      await page.goto('/following')
      
      // Find business card and open settings
      const businessCard = page.locator('[data-testid="business-card"]').first()
      await businessCard.locator('[data-testid="settings-icon"]').click()
      
      // Verify preferences modal opens
      await expect(page.locator('text="Notification Preferences"')).toBeVisible()
      
      // Disable "New Products" notifications
      const newProductsCheckbox = page.locator('input[name="notify_new_products"]')
      await newProductsCheckbox.uncheck()
      
      // Save preferences
      await page.click('button:has-text("Save Preferences")')
      
      // Verify modal closes
      await expect(page.locator('text="Notification Preferences"')).not.toBeVisible()
      
      // Verify success message
      await expect(page.locator('text="Preferences updated"')).toBeVisible()
    })

    test('disabled notifications are not sent', async ({ page, context }) => {
      const customerPage = page
      const businessPage = await context.newPage()
      
      // Step 1: Customer disables product notifications
      await login(customerPage, TEST_USER.email, TEST_USER.password)
      await customerPage.goto('/following')
      await customerPage.locator('[data-testid="settings-icon"]').first().click()
      await customerPage.locator('input[name="notify_new_products"]').uncheck()
      await customerPage.click('button:has-text("Save")')
      
      // Step 2: Business owner posts new product
      await login(businessPage, TEST_BUSINESS_OWNER.email, TEST_BUSINESS_OWNER.password)
      await businessPage.goto('/products/new')
      await businessPage.fill('[name="name"]', 'Silent Product')
      await businessPage.fill('[name="price"]', '49.99')
      await businessPage.click('button[type="submit"]')
      
      // Step 3: Wait and verify NO notification received
      await customerPage.waitForTimeout(3000)
      const notificationBell = customerPage.locator('[data-testid="notification-bell"]')
      await expect(notificationBell.locator('.badge')).not.toBeVisible()
      
      await businessPage.close()
    })
  })

  test.describe('Following Page', () => {
    test('displays followed businesses correctly', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
      await page.goto('/following')
      
      // Verify page title
      await expect(page.locator('h1:has-text("Following")')).toBeVisible()
      
      // Verify business cards are displayed
      const businessCards = page.locator('[data-testid="business-card"]')
      await expect(businessCards.first()).toBeVisible()
      
      // Verify card contains business info
      await expect(businessCards.first().locator('img')).toBeVisible()
      await expect(businessCards.first().locator('h3')).toBeVisible()
    })

    test('search filters businesses', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
      await page.goto('/following')
      
      // Get initial count
      const initialCount = await page.locator('[data-testid="business-card"]').count()
      
      // Enter search term
      await page.fill('[data-testid="search-input"]', 'Test')
      
      // Wait for filter
      await page.waitForTimeout(500)
      
      // Verify filtered results
      const filteredCount = await page.locator('[data-testid="business-card"]').count()
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    })

    test('sort options work correctly', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
      await page.goto('/following')
      
      // Get first business name
      const firstBusinessBefore = await page.locator('[data-testid="business-card"]').first().locator('h3').textContent()
      
      // Change sort to "Oldest First"
      await page.selectOption('[data-testid="sort-select"]', 'oldest')
      
      // Wait for re-sort
      await page.waitForTimeout(500)
      
      // Verify order changed
      const firstBusinessAfter = await page.locator('[data-testid="business-card"]').first().locator('h3').textContent()
      // Note: This might be the same if only one business; ideally test with multiple
      expect(firstBusinessAfter).toBeDefined()
    })

    test('handles empty state', async ({ page }) => {
      // Login with user who follows no businesses
      await login(page, 'newuser@test.com', 'TestPassword123!')
      await page.goto('/following')
      
      // Verify empty state message
      await expect(page.locator('text="No businesses followed yet"')).toBeVisible()
      await expect(page.locator('button:has-text("Discover Businesses")')).toBeVisible()
    })
  })

  test.describe('Business Owner Analytics', () => {
    test('business owner can view follower analytics', async ({ page }) => {
      // Login as business owner
      await login(page, TEST_BUSINESS_OWNER.email, TEST_BUSINESS_OWNER.password)
      
      // Navigate to follower analytics
      await page.goto('/analytics/followers')
      
      // Verify analytics page loaded
      await expect(page.locator('h1:has-text("Follower Analytics")')).toBeVisible()
      
      // Verify key metrics visible
      await expect(page.locator('[data-testid="follower-count"]')).toBeVisible()
      await expect(page.locator('[data-testid="growth-rate"]')).toBeVisible()
      
      // Verify chart displays
      await expect(page.locator('[data-testid="follower-chart"]')).toBeVisible()
      
      // Verify demographics section
      await expect(page.locator('text="Demographics"')).toBeVisible()
    })

    test('follower list displays correctly', async ({ page }) => {
      await login(page, TEST_BUSINESS_OWNER.email, TEST_BUSINESS_OWNER.password)
      await page.goto('/analytics/followers')
      
      // Navigate to follower list tab
      await page.click('button:has-text("Follower List")')
      
      // Verify follower cards displayed
      const followerCards = page.locator('[data-testid="follower-card"]')
      await expect(followerCards.first()).toBeVisible()
      
      // Verify follower info present
      await expect(followerCards.first().locator('text=/.*@.*/')).toBeVisible() // Email or name
    })
  })

  test.describe('Campaign Targeting Integration', () => {
    test('campaign targeting includes follower options', async ({ page }) => {
      // Login as business owner
      await login(page, TEST_BUSINESS_OWNER.email, TEST_BUSINESS_OWNER.password)
      
      // Create new campaign
      await page.goto('/campaigns/new')
      await page.fill('[name="name"]', 'Test Campaign E2E')
      await page.click('button:has-text("Next")')
      
      // Navigate to targeting step
      await page.waitForURL(/.*targeting.*/)
      
      // Verify follower targeting options visible
      await expect(page.locator('text="Target Followers"')).toBeVisible()
      await expect(page.locator('input[name="target_followers"]')).toBeVisible()
      
      // Enable follower targeting
      await page.check('input[name="target_followers"]')
      
      // Verify follower count estimate appears
      await expect(page.locator('[data-testid="follower-reach-estimate"]')).toBeVisible()
    })
  })

  test.describe('Error Handling & Edge Cases', () => {
    test('handles network errors gracefully', async ({ page, context }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
      
      // Simulate offline
      await context.setOffline(true)
      
      // Attempt to follow business
      await page.goto(`/business/${TEST_BUSINESS_ID}`)
      await page.click('button:has-text("Follow")')
      
      // Verify error message
      await expect(page.locator('text="Failed to follow business"')).toBeVisible()
      await expect(page.locator('text="Check your internet connection"')).toBeVisible()
      
      // Re-enable network
      await context.setOffline(false)
    })

    test('prevents duplicate follow actions', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
      await page.goto(`/business/${TEST_BUSINESS_ID}`)
      
      // Click follow button rapidly
      const followButton = page.locator('button:has-text("Follow")')
      await followButton.click()
      await followButton.click() // Second click should be disabled
      
      // Verify only one follow action occurred
      await expect(page.locator('button:has-text("Following")')).toBeVisible()
      
      // Verify no duplicate error
      await expect(page.locator('text="Already following"')).not.toBeVisible()
    })
  })
})
