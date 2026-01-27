import { test, expect } from '@playwright/test';

test('verify pending reviews are visible to admin', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:5173/auth/login');
    await page.fill('input[type="email"]', 'testuser1@gmail.com');
    await page.fill('input[type="password"]', 'Testuser@1');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');

    // 2. Go to Admin Moderation (Pending Tab)
    await page.goto('http://localhost:5173/admin/moderation?tab=pending');

    // 3. Verify Pending Count Badge
    // The badge inside tabs trigger: "Pending [2]"
    const pendingTab = page.locator('button[value="pending"]');
    await expect(pendingTab).toBeVisible();

    // Check if we see the badge with count > 0
    await expect(pendingTab).toContainText(/[1-9]/); // Expect at least 1

    // 4. Verify List Items
    // The list items are rendered in ModerationQueue
    // They are divs with "Review" text in header, but actual items have checkboxes.
    // We look for a specific class or structure. 
    // Based on code: "flex items-start gap-4 p-4 hover:bg-gray-50/50"

    // Or better, look for text that we know exists in the reviews (e.g. from debug script "TU1 Test Business 3")
    // Or simply count the checkboxes (excluding the header one)

    // Wait for potential loading state
    await expect(page.getByText('Loading pending reviews...')).not.toBeVisible();

    // Check for "No reviews found" - we expect this NOT to be there
    const noReviews = page.getByText('No reviews found');
    if (await noReviews.isVisible()) {
        console.log('Detected "No reviews found" state.');
        // Fail explicitly if we expect reviews
        throw new Error('Expected pending reviews to be visible, but got "No reviews found"');
    }

    // Count review items
    // We can select by the container check
    // The header checkbox is in a div with "pl-2". Item checkboxes are also in "pl-2".
    // Let's count elements that contain "Recommends" or "Downvote" badges
    const reviewItems = page.locator('text=Recommends').or(page.locator('text=Downvote'));
    const count = await reviewItems.count();

    console.log(`Found ${count} review items in the list.`);

    expect(count).toBeGreaterThan(0);
});
