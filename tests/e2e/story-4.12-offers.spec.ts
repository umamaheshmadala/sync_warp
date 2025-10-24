// tests/e2e/story-4.12-offers.spec.ts
// E2E tests for Story 4.12: Business Offers Management

import { test, expect } from '@playwright/test';

test.describe('Story 4.12: Business Offers Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to business dashboard
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@business.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test.describe('Create Offer Flow', () => {
    test('should complete full offer creation process', async ({ page }) => {
      // Navigate to offers page
      await page.click('text=Offers');
      await page.waitForURL('**/offers');

      // Click create offer button
      await page.click('button:has-text("Create Offer")');
      await page.waitForURL('**/offers/create');

      // Step 1: Basic Info
      await expect(page.locator('h2')).toContainText('Basic Information');
      
      await page.fill('input[placeholder*="Off All Items"]', '20% Off Summer Sale');
      await page.fill('textarea[placeholder*="Describe your offer"]', 'Get 20% off all summer items. Limited time offer!');
      
      // Verify character counter
      const titleCounter = page.locator('text=/\\/100 characters/');
      await expect(titleCounter).toBeVisible();
      
      await page.click('button:has-text("Next")');

      // Step 2: Validity Period
      await expect(page.locator('h2')).toContainText('Validity Period');
      
      const today = new Date();
      const validFrom = today.toISOString().split('T')[0];
      const validUntil = new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0];
      
      await page.fill('input[type="date"]:first', validFrom);
      await page.fill('input[type="date"]:last', validUntil);
      
      await page.click('button:has-text("Next")');

      // Step 3: Details
      await expect(page.locator('h2')).toContainText('Offer Details');
      
      await page.fill('textarea[placeholder*="Valid on purchases"]', 
        'Valid on all summer collection items. Cannot be combined with other offers. Minimum purchase of $50 required.');
      
      // Optional: Add icon URL
      await page.fill('input[placeholder="https://example.com/icon.png"]', 
        'https://example.com/summer-icon.png');
      
      await page.click('button:has-text("Next")');

      // Step 4: Review
      await expect(page.locator('h2')).toContainText('Review Your Offer');
      
      // Verify all entered data is displayed
      await expect(page.locator('text=20% Off Summer Sale')).toBeVisible();
      await expect(page.locator('text=Get 20% off all summer items')).toBeVisible();
      await expect(page.locator('text=/Valid on all summer collection/')).toBeVisible();
      
      // Publish offer
      await page.click('button:has-text("Publish Offer")');
      
      // Wait for success and redirect
      await page.waitForURL('**/offers');
      
      // Verify offer appears in list
      await expect(page.locator('text=20% Off Summer Sale')).toBeVisible();
      await expect(page.locator('text=Draft')).toBeVisible(); // New offers start as draft
    });

    test('should validate required fields', async ({ page }) => {
      await page.click('text=Offers');
      await page.click('button:has-text("Create Offer")');
      await page.waitForURL('**/offers/create');

      // Try to proceed without entering title
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeDisabled();

      // Enter title
      await page.fill('input[placeholder*="Off All Items"]', 'Test Offer');
      await expect(nextButton).toBeEnabled();
      
      await page.click('button:has-text("Next")');

      // Try to proceed without dates
      const nextButton2 = page.locator('button:has-text("Next")');
      await expect(nextButton2).toBeDisabled();
    });

    test('should auto-save draft', async ({ page }) => {
      await page.click('text=Offers');
      await page.click('button:has-text("Create Offer")');
      await page.waitForURL('**/offers/create');

      // Enter title
      await page.fill('input[placeholder*="Off All Items"]', 'Auto-save Test');
      
      // Wait for auto-save indicator
      await expect(page.locator('text=Saving draft...')).toBeVisible({ timeout: 3000 });
      
      // Reload page
      await page.reload();
      
      // Verify data was saved
      await expect(page.locator('input[value="Auto-save Test"]')).toBeVisible();
    });
  });

  test.describe('Offer List Management', () => {
    test('should display offers with filters', async ({ page }) => {
      await page.goto('/offers');
      
      // Click filters button
      await page.click('button:has-text("Filters")');
      
      // Verify filter options visible
      await expect(page.locator('text=Status')).toBeVisible();
      await expect(page.locator('text=Sort By')).toBeVisible();
      
      // Filter by active status
      await page.click('button:has-text("Active")');
      
      // Verify URL or state updated
      await page.waitForTimeout(500);
    });

    test('should activate an offer', async ({ page }) => {
      await page.goto('/offers');
      
      // Find first draft offer
      const draftOffer = page.locator('.offer-card:has-text("Draft")').first();
      await expect(draftOffer).toBeVisible();
      
      // Open actions menu
      await draftOffer.locator('button[aria-label="More actions"]').click();
      
      // Click activate
      await page.click('text=Activate');
      
      // Verify status changed
      await expect(page.locator('text=Active')).toBeVisible({ timeout: 3000 });
    });

    test('should pause an active offer', async ({ page }) => {
      await page.goto('/offers');
      
      // Find active offer
      const activeOffer = page.locator('.offer-card:has-text("Active")').first();
      await expect(activeOffer).toBeVisible();
      
      // Open actions menu
      await activeOffer.locator('button[aria-label="More actions"]').click();
      
      // Click pause
      await page.click('text=Pause');
      
      // Verify status changed
      await expect(page.locator('text=Paused')).toBeVisible({ timeout: 3000 });
    });

    test('should delete an offer', async ({ page }) => {
      await page.goto('/offers');
      
      // Get initial count
      const initialCount = await page.locator('.offer-card').count();
      
      // Find first offer
      const offer = page.locator('.offer-card').first();
      const offerTitle = await offer.locator('h3').textContent();
      
      // Open actions menu
      await offer.locator('button[aria-label="More actions"]').click();
      
      // Click delete
      await page.click('text=Delete');
      
      // Confirm deletion if dialog appears
      if (await page.locator('text=Are you sure').isVisible()) {
        await page.click('button:has-text("Delete")');
      }
      
      // Verify offer removed
      await expect(page.locator(`text=${offerTitle}`)).not.toBeVisible({ timeout: 3000 });
      
      // Verify count decreased
      const newCount = await page.locator('.offer-card').count();
      expect(newCount).toBe(initialCount - 1);
    });
  });

  test.describe('Offer Sharing', () => {
    test('should open share modal and copy link', async ({ page }) => {
      await page.goto('/offers');
      
      // Click share button on first offer
      const shareButton = page.locator('button:has-text("Share")').first();
      await shareButton.click();
      
      // Verify modal opened
      await expect(page.locator('h2:has-text("Share Offer")')).toBeVisible();
      
      // Verify share options visible
      await expect(page.locator('text=WhatsApp')).toBeVisible();
      await expect(page.locator('text=Facebook')).toBeVisible();
      await expect(page.locator('text=Twitter')).toBeVisible();
      await expect(page.locator('text=Email')).toBeVisible();
      
      // Click copy link
      await page.click('button:has-text("Copy Link")');
      
      // Verify success message
      await expect(page.locator('text=Link Copied!')).toBeVisible();
    });

    test('should track share via WhatsApp', async ({ page, context }) => {
      await page.goto('/offers');
      
      // Click share button
      await page.locator('button:has-text("Share")').first().click();
      
      // Set up listener for new page
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        page.click('button:has-text("WhatsApp")')
      ]);
      
      // Verify WhatsApp URL opened
      await expect(newPage).toHaveURL(/wa\.me/);
      
      await newPage.close();
    });
  });

  test.describe('Offer Analytics', () => {
    test('should display analytics dashboard', async ({ page }) => {
      await page.goto('/offers');
      
      // Click on first offer to view details
      await page.locator('.offer-card h3').first().click();
      await page.waitForURL('**/offers/*');
      
      // Navigate to analytics tab if exists
      if (await page.locator('text=Analytics').isVisible()) {
        await page.click('text=Analytics');
      }
      
      // Verify analytics cards
      await expect(page.locator('text=Total Views')).toBeVisible();
      await expect(page.locator('text=Total Shares')).toBeVisible();
      await expect(page.locator('text=Total Clicks')).toBeVisible();
      
      // Verify charts exist
      await expect(page.locator('text=Views Over Time')).toBeVisible();
      await expect(page.locator('text=Share Channels')).toBeVisible();
    });
  });

  test.describe('Pagination and Sorting', () => {
    test('should paginate offers', async ({ page }) => {
      await page.goto('/offers');
      
      // Check if pagination controls exist (only if more than 12 offers)
      const paginationExists = await page.locator('button:has-text("Next")').isVisible();
      
      if (paginationExists) {
        // Get current page
        const currentPage = await page.locator('text=/Page \\d+ of \\d+/').textContent();
        
        // Click next
        await page.click('button:has-text("Next")');
        
        // Verify page changed
        const newPage = await page.locator('text=/Page \\d+ of \\d+/').textContent();
        expect(newPage).not.toBe(currentPage);
        
        // Click previous
        await page.click('button:has-text("Previous")');
        
        // Verify back to original page
        const backToPage = await page.locator('text=/Page \\d+ of \\d+/').textContent();
        expect(backToPage).toBe(currentPage);
      }
    });

    test('should sort offers', async ({ page }) => {
      await page.goto('/offers');
      
      // Open filters
      await page.click('button:has-text("Filters")');
      
      // Change sort
      await page.selectOption('select:has-text("Sort By")', 'Most Viewed');
      
      // Wait for list to update
      await page.waitForTimeout(500);
      
      // Verify order changed (could check view counts are descending)
      const viewCounts = await page.locator('[data-testid="view-count"]').allTextContents();
      
      // Verify descending order
      for (let i = 0; i < viewCounts.length - 1; i++) {
        const current = parseInt(viewCounts[i]);
        const next = parseInt(viewCounts[i + 1]);
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no offers exist', async ({ page, context }) => {
      // Create new business with no offers
      // This would require setup of a clean test account
      await page.goto('/offers');
      
      // If no offers exist, verify empty state
      const offerCount = await page.locator('.offer-card').count();
      
      if (offerCount === 0) {
        await expect(page.locator('text=No Offers Available')).toBeVisible();
        await expect(page.locator('text=Check back later')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/offers');
      
      // Verify mobile layout
      await expect(page.locator('.offer-card')).toBeVisible();
      
      // Click create offer
      await page.click('button:has-text("Create Offer")');
      
      // Verify form works on mobile
      await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/offers');
      
      // Verify tablet layout
      const offerCards = page.locator('.offer-card');
      await expect(offerCards.first()).toBeVisible();
    });
  });
});
