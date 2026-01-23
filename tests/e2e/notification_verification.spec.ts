
import { test, expect } from '@playwright/test';

test.describe('Notification E2E Verification', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Full Review Response Notification Cycle (With Registration)', async ({ page }) => {
        test.setTimeout(120000); // 2 minute timeout
        const timestamp = Date.now();
        const businessName = `E2E Test Business ${timestamp}`;
        let businessId = '';

        // ----------------------------------------------------------------
        // 1. Log in to TestUser1 (Owner) & Register Business
        // ----------------------------------------------------------------
        console.log('Logging in as TestUser1...');
        await page.goto('http://localhost:5173/auth/login');
        await page.fill('input[type="email"]', 'testuser1@gmail.com');
        await page.fill('input[type="password"]', 'Testuser@1');
        await page.click('button:has-text("Sign in"), button:has-text("Login")');
        await page.waitForURL('**/dashboard');

        console.log('Navigating to Business Registration...');
        await page.goto('http://localhost:5173/business/register');

        // Step 0: Smart Search Bypass
        await page.getByText(/Enter details manually/i).click();

        // Step 1: Phone Verify Skip
        await page.getByText(/Skip verification for now/i).click();
        // Handle Modal
        const skipAnywayBtn = page.getByRole('button', { name: "Skip Anyway" });
        await skipAnywayBtn.waitFor();
        await skipAnywayBtn.click();

        // Step 2: Basic Details
        console.log('Filling Basic Details...');
        await expect(page.locator('input[placeholder*="business name"]')).toBeVisible();
        await page.fill('input[placeholder*="business name"]', businessName);
        await page.selectOption('select', { index: 1 }); // Business Type
        await page.locator('select').nth(1).selectOption({ index: 1 }); // Category
        await page.fill('textarea', `Description for ${businessName}`);
        await page.fill('input[type="email"]', `biz${timestamp}@test.com`);
        await page.fill('input[type="tel"]', '9876543210');

        await page.click('button:has-text("Next")');

        // Step 3: Location
        console.log('Filling Location...');
        await page.waitForTimeout(1000);
        await expect(page.getByText('Address *')).toBeVisible();

        await page.locator('textarea').fill('123 Test Street');
        await page.locator('input[placeholder="City"]').fill('Mumbai');
        await page.locator('input[placeholder="State"]').fill('Maharashtra');
        await page.locator('input[placeholder*="123456"]').fill('400001');

        await page.click('button:has-text("Get Location")');
        await page.waitForTimeout(2000);
        await page.click('button:has-text("Next")');

        // Step 4: Hours
        console.log('Confirming Hours...');
        await page.waitForTimeout(500);
        await page.click('button:has-text("Next")');

        // Step 5: Final
        console.log('Submitting Registration...');
        await page.waitForTimeout(500);
        await page.click('button:has-text("Submit"), button:has-text("Register")');

        // Wait for completion screen
        await expect(page.getByText('Registration Successful!')).toBeVisible({ timeout: 30000 });

        console.log('Registration Successful! Navigating to Dashboard...');
        await page.goto('http://localhost:5173/business/dashboard');

        // Find business card and get ID
        console.log(`Searching for business card: ${businessName}`);
        await page.waitForTimeout(2000);

        // Click the heading of the card
        const cardH3 = page.getByRole('heading', { level: 3, name: businessName });
        await expect(cardH3).toBeVisible({ timeout: 10000 });
        await cardH3.click();

        await page.waitForURL(/\/business\/dashboard\/.+/);

        const url = page.url();
        console.log('Dashboard URL:', url);

        // Now capture ID
        const parts = page.url().split('/business/dashboard/');
        businessId = parts[1].split('/')[0].split('?')[0];
        console.log('Registered Business ID:', businessId);

        // Logout
        console.log('Logging out TestUser1...');
        await page.locator('.lucide-user, .avatar').click();
        await page.getByText(/logout|sign out/i).click();
        await page.waitForURL('**/auth/login');

        // ----------------------------------------------------------------
        // 2. Log in to TestUser4 to Leave Review
        // ----------------------------------------------------------------
        console.log('Logging in as TestUser4...');
        await page.fill('input[type="email"]', 'testuser4@gmail.com');
        await page.fill('input[type="password"]', 'Testuser@1');
        await page.click('button:has-text("Sign in"), button:has-text("Login")');
        await page.waitForURL('**/dashboard');

        console.log(`Navigating to Business: ${businessId}`);
        await page.goto(`http://localhost:5173/business/${businessId}`);

        // Leave Review
        console.log('Leaving a review...');
        const uniqueReviewText = `E2E Review ${timestamp}`;

        await page.waitForTimeout(2000);

        const writeReviewBtn = page.getByRole('button', { name: /Write a Review/i });
        if (await writeReviewBtn.isVisible()) await writeReviewBtn.click();

        const fiveStar = page.locator('button[aria-label="5 stars"], .lucide-star').nth(4);
        if (await fiveStar.isVisible()) await fiveStar.click();

        await page.fill('textarea', uniqueReviewText);
        await page.click('button:has-text("Submit Review")');
        await expect(page.getByText(uniqueReviewText)).toBeVisible({ timeout: 10000 });

        // Logout TestUser4
        await page.locator('.lucide-user, .avatar').click();
        await page.getByText(/logout|sign out/i).click();
        await page.waitForURL('**/auth/login');

        // ----------------------------------------------------------------
        // 3. Log in to TestUser1 (Owner) to Reply
        // ----------------------------------------------------------------
        console.log('Logging in as TestUser1...');
        await page.fill('input[type="email"]', 'testuser1@gmail.com');
        await page.fill('input[type="password"]', 'Testuser@1');
        await page.click('button:has-text("Sign in"), button:has-text("Login")');
        await page.waitForURL('**/dashboard');

        await page.goto(`http://localhost:5173/business/dashboard/${businessId}`);

        const reviewsTab = page.getByRole('tab', { name: 'Reviews' });
        if (await reviewsTab.isVisible()) {
            await reviewsTab.click();
        }

        const reviewCard = page.locator('div').filter({ hasText: uniqueReviewText });
        await reviewCard.waitFor({ timeout: 10000 });
        await reviewCard.getByRole('button', { name: 'Reply' }).click();

        const replyText = `Thanks ${timestamp}`;
        await page.fill('textarea[placeholder*="Reply"]', replyText);
        await page.click('button:has-text("Post Reply"), button:has-text("Submit")');
        await expect(page.getByText(replyText)).toBeVisible();

        // Logout TestUser1
        await page.locator('.lucide-user, .avatar').click();
        await page.getByText(/logout|sign out/i).click();
        await page.waitForURL('**/auth/login');

        // ----------------------------------------------------------------
        // 4. Log in to TestUser4 to Verify Notification
        // ----------------------------------------------------------------
        console.log('Logging in as TestUser4...');
        await page.fill('input[type="email"]', 'testuser4@gmail.com');
        await page.fill('input[type="password"]', 'Testuser@1');
        await page.click('button:has-text("Sign in"), button:has-text("Login")');
        await page.waitForURL('**/dashboard');

        console.log('Checking Notifications...');
        const bellIcon = page.locator('.lucide-bell');
        // Ensure bell is visible
        await expect(bellIcon).toBeVisible();
        await bellIcon.click();

        const notification = page.getByText(businessName).first();
        await expect(notification).toBeVisible({ timeout: 20000 });
        console.log('SUCCESS: Notification Found!');

        // ----------------------------------------------------------------
        // 5. Verify Delete Response (New Feature)
        // ----------------------------------------------------------------
        console.log('Logging in as TestUser1 to Delete Response...');
        // Logout TestUser4
        await page.locator('.lucide-user, .avatar').click();
        await page.getByText(/logout|sign out/i).click();
        await page.waitForURL('**/auth/login');

        // Login Admin
        await page.fill('input[type="email"]', 'testuser1@gmail.com');
        await page.fill('input[type="password"]', 'Testuser@1');
        await page.click('button:has-text("Sign in"), button:has-text("Login")');
        await page.waitForURL('**/dashboard');

        // Go to reviews
        await page.goto(`http://localhost:5173/business/dashboard/${businessId}`);
        const reviewsTabRef = page.getByRole('tab', { name: 'Reviews' });
        if (await reviewsTabRef.isVisible()) await reviewsTabRef.click();

        // Find review
        const ownerReviewCard = page.locator('div').filter({ hasText: uniqueReviewText }).first();
        await ownerReviewCard.scrollIntoViewIfNeeded();

        // Check for Delete button
        const deleteRespBtn = ownerReviewCard.getByRole('button', { name: 'Delete' });
        await expect(deleteRespBtn).toBeVisible();
        await deleteRespBtn.click();

        // Confirm Dialog
        await expect(page.getByText('Delete Response?')).toBeVisible();
        await page.getByRole('button', { name: 'Delete Response' }).click();

        // Verify Deletion
        await expect(ownerReviewCard.getByText(replyText)).not.toBeVisible();
        await expect(page.getByText('Response deleted')).toBeVisible();
        console.log('SUCCESS: Response Deleted!');
    });
});
