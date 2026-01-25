import { test, expect } from '@playwright/test';
import { TestHelpers, TestDataGenerator } from '../../e2e/helpers/testHelpers';

test.describe('Review Deletion', () => {
    let helpers: TestHelpers;
    let testEmail: string;
    let userName: string;

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        testEmail = TestDataGenerator.randomEmail();
        userName = 'Review Test User';

        // Sign up a user
        await helpers.signup(testEmail, 'testpassword123', userName);

        // Navigate to dashboard
        await page.goto('/business/dashboard');
    });

    test('should delete review from Profile page immediately', async ({ page }) => {
        // 1. Find a business to review
        await page.goto('/search');
        await page.waitForTimeout(1000);

        const businessCard = page.locator('[data-testid="business-card"]').first();
        if (await businessCard.count() === 0) {
            console.log('No businesses found. Skipping test.');
            return;
        }
        await businessCard.click();

        // 2. Leave a review
        await page.click('button:has-text("Write a Review")');
        await page.fill('textarea', 'This is a test review for deletion.');
        await page.click('button:has-text("Recommend")');
        await page.click('button:has-text("Submit Review")');

        await helpers.waitForToast('Review submitted');

        // 3. Go to Profile -> My Reviews
        await page.goto('/profile?tab=reviews');

        // Locate the review
        const reviewCard = page.locator('text=This is a test review for deletion');
        await expect(reviewCard).toBeVisible();

        // 4. Delete the review
        // Find the menu button (MoreVertical icon)
        // We target the button containing the lucide-more-vertical class or svg
        await page.locator('button:has(.lucide-more-vertical)').first().click();

        // Click delete from dropdown
        await page.click('text=Delete');

        // Confirm dialog
        await page.click('button:has-text("Delete Review")');

        // 5. Verify immediate disappearance
        await expect(reviewCard).not.toBeVisible({ timeout: 5000 });

        console.log('✅ Profile deletion test passed');
    });

    test('should delete review from Storefront immediately', async ({ page }) => {
        // 1. Find a business
        await page.goto('/search');
        await page.waitForTimeout(1000);
        const businessCard = page.locator('[data-testid="business-card"]').first();
        await businessCard.click();

        // 2. Leave review
        await page.click('button:has-text("Write a Review")');
        await page.fill('textarea', 'Storefront deletion test review.');
        await page.click('button:has-text("Recommend")');
        await page.click('button:has-text("Submit Review")');
        await helpers.waitForToast('Review submitted');

        // 3. Verify review is visible on storefront
        const reviewText = page.locator('text=Storefront deletion test review.');
        await expect(reviewText).toBeVisible();

        // 4. Delete review (from storefront)
        await page.locator('button:has(.lucide-more-vertical)').first().click();

        await page.click('text=Delete');
        await page.click('button:has-text("Delete Review")');

        // 5. Verify immediate disappearance
        await expect(reviewText).not.toBeVisible({ timeout: 5000 });

        console.log('✅ Storefront deletion test passed');
    });
});
