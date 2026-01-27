import { test, expect, BrowserContext, Page } from '@playwright/test';

test.describe.serial('Admin Moderation Flow', () => {
    let adminContext: BrowserContext;
    let userContext: BrowserContext;
    let adminPage: Page;
    let userPage: Page;

    const ADMIN_EMAIL = 'testuser1@gmail.com';
    const ADMIN_PASSWORD = 'Testuser@1';

    // Using testuser3 as the reviewer to avoid conflicts with testuser2 if used elsewhere
    // Assuming testuser3 exists with same password pattern
    const USER_EMAIL = 'testuser3@gmail.com';
    const USER_PASSWORD = 'Testuser@1';

    const BUSINESS_NAME = 'TU1 Test Business 3';

    test.beforeAll(async ({ browser }) => {
        // Create two separate browser contexts for Admin and User
        adminContext = await browser.newContext();
        userContext = await browser.newContext();

        adminPage = await adminContext.newPage();
        userPage = await userContext.newPage();
    });

    test.afterAll(async () => {
        await adminContext.close();
        await userContext.close();
    });

    test('1. Admin logs in and opens Moderation Queue', async () => {
        await adminPage.goto('http://localhost:5173/auth/login');
        await adminPage.fill('input[type="email"]', ADMIN_EMAIL);
        await adminPage.fill('input[type="password"]', ADMIN_PASSWORD);
        await adminPage.click('button[type="submit"]');
        await adminPage.waitForURL('**/dashboard');

        await adminPage.goto('http://localhost:5173/admin/moderation?tab=pending');
        await expect(adminPage.getByRole('heading', { name: 'Moderation Queue' })).toBeVisible();
    });

    test('2. User logs in and posts a review', async () => {
        await userPage.goto('http://localhost:5173/auth/login');
        await userPage.fill('input[type="email"]', USER_EMAIL);
        await userPage.fill('input[type="password"]', USER_PASSWORD);
        await userPage.click('button[type="submit"]');
        await userPage.waitForURL('**/dashboard');

        // Search for business
        await userPage.getByPlaceholder('Search businesses...').fill(BUSINESS_NAME);
        // Wait for search results and click the business
        await userPage.waitForTimeout(2000); // Debounce
        await userPage.getByText(BUSINESS_NAME).first().click();
        await userPage.waitForURL('**/business/*');

        // Write a review
        // Check if "Write a Review" button is visible, otherwise might need to edit existing
        // For simplicity, assuming new review or overwrite.
        const reviewBtn = userPage.getByRole('button', { name: 'Write a Review' });
        if (await reviewBtn.isVisible()) {
            await reviewBtn.click();
        } else {
            // If already reviewed, look for edit button
            await userPage.getByRole('button', { name: 'Edit Review' }).click();
        }

        // Fill review form
        await userPage.getByRole('slider').fill('5'); // 5 starts
        await userPage.getByPlaceholder('Share your experience...').fill('Automated Test Review ' + Date.now());

        // Submit
        await userPage.getByRole('button', { name: 'Submit Review' }).click();

        // Wait for success
        await expect(userPage.getByText('Review submitted successfully')).toBeVisible();
    });

    test('3. Admin sees review instantly (Real-time)', async () => {
        // Verify the new review appears in Admin's pending list without refresh
        // We look for the text "Automated Test Review"
        await expect(adminPage.getByText('Automated Test Review')).toBeVisible({ timeout: 10000 });

        // Also check the real-time stats might have updated (optional)
    });

    test('4. Admin rejects the review', async () => {
        // Locate the review card
        const reviewCard = adminPage.locator('div').filter({ hasText: 'Automated Test Review' }).last();

        // Click Reject
        await reviewCard.getByRole('button', { name: 'Reject' }).click();

        // In the dialog, select a reason
        await adminPage.getByLabel('Spam').click(); // Assuming 'Spam' is a reason

        // Confirm Reject
        await adminPage.getByRole('button', { name: 'Reject Review' }).click();

        // Verify it disappears
        await expect(reviewCard).not.toBeVisible();
        await expect(adminPage.getByText('Review rejected')).toBeVisible();
    });

    test('5. User edits the review (Re-submission)', async () => {
        // Go back to User page
        // User might need to refresh or see status update
        await userPage.reload();

        // Check if review shows as rejected or flagged? 
        // Or just click "Edit Review" again
        await userPage.getByRole('button', { name: 'Edit Review' }).click();

        // Change text
        await userPage.getByPlaceholder('Share your experience...').fill('Automated Test Review EDITED ' + Date.now());

        // Submit again
        await userPage.getByRole('button', { name: 'Submit Review' }).click();
        await expect(userPage.getByText('Review submitted successfully')).toBeVisible();
    });

    test('6. Admin sees review reappear with Re-submission badge', async () => {
        // Check for edited text
        await expect(adminPage.getByText('Automated Test Review EDITED')).toBeVisible({ timeout: 10000 });

        // Check for "Re-submission" text/badge
        // The implementation added a badge with text "Re-submission" or "✏️ Re-submission"
        const reviewCard = adminPage.locator('div').filter({ hasText: 'Automated Test Review EDITED' }).last();
        await expect(reviewCard.getByText('Re-submission')).toBeVisible();
    });
});
