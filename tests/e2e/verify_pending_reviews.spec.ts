import { test, expect } from '@playwright/test';

// Reset storage state to ensure we start fresh and don't rely on global setup's flakiness
test.use({ storageState: { cookies: [], origins: [] } });

test('verify pending reviews are visible to admin', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // 1. Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'testuser1@gmail.com');
    await page.fill('input[type="password"]', 'Testuser@1');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');

    // 2. Go to Admin Moderation (Pending Tab)
    await page.goto('/admin/moderation?tab=pending');

    // 3. Verify Pending Count Badge
    const pendingTab = page.locator('button[value="pending"]');
    await expect(pendingTab).toBeVisible();
    await expect(pendingTab).toContainText(/[1-9]/);

    // 4. Verify List Items
    // Wait for loading to finish
    await expect(page.getByText('Loading pending reviews...')).not.toBeVisible();

    // Check that we see reviews (either normal or unknown business)
    // We can look for the check icon button which appears for every row
    const approveButtons = page.locator('button[title="Approve"]');
    const count = await approveButtons.count();

    console.log(`Found ${count} Approve buttons.`);

    // Also check for text content to be sure
    const cards = page.locator('.space-y-4 .divide-y > div');
    const cardCount = await cards.count();
    console.log(`Found ${cardCount} review cards.`);

    expect(cardCount).toBeGreaterThan(0);
});
