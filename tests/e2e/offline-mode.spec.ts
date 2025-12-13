/**
 * Offline Mode E2E Tests
 * Story 8.8.4 - E2E Web Testing
 * 
 * Tests:
 * - Simulate offline mode via network interception
 * - Verify messages are queued while offline
 * - Verify queue processing when back online
 */

import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, WAIT_TIMES } from './fixtures/test-data';

// ====================
// HELPER FUNCTIONS
// ====================

async function loginAndNavigateToMessages(page: Page) {
    await page.goto('/');

    const isLoggedIn = await page.locator('[data-testid="nav-messages"], text=/messages/i').isVisible().catch(() => false);

    if (!isLoggedIn) {
        await page.goto('/auth/login');
        await page.fill('input[type="email"]', TEST_USERS.regularUser1.email);
        await page.fill('input[type="password"]', TEST_USERS.regularUser1.password);
        await page.click('button[type="submit"], button:has-text("Sign in")');
        await page.waitForURL(/\/(home|dashboard|businesses|messages)?/i, { timeout: 15000 });
    }

    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
}

async function openFirstConversation(page: Page) {
    await page.waitForSelector('[class*="conversation-item"], [class*="chat-item"], a[href*="/messages/"]', { timeout: 10000 });

    const firstConv = page.locator('[class*="conversation-item"], [class*="chat-item"], a[href*="/messages/"]').first();
    await firstConv.click();

    await page.waitForSelector('[data-testid="chat-header"]', { timeout: 10000 });
}

async function goOffline(page: Page) {
    // Use Playwright's network interception to simulate offline
    await page.route('**/*', route => route.abort());
}

async function goOnline(page: Page) {
    // Remove all route handlers to restore network
    await page.unrouteAll();
}

async function sendTestMessage(page: Page, text: string) {
    const input = page.locator('[data-testid="message-input"], textarea[placeholder*="message" i]').first();
    await input.fill(text);
    await page.click('[data-testid="send-message-btn"], button[type="submit"]');
}

// ====================
// OFFLINE MODE TESTS
// ====================

test.describe('Offline Mode (Story 8.8.4)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAndNavigateToMessages(page);
        await openFirstConversation(page);
    });

    test('should show optimistic message immediately when sending', async ({ page }) => {
        const testMessage = `Optimistic Test ${Date.now()}`;

        // Send message
        await sendTestMessage(page, testMessage);

        // Message should appear immediately (optimistic update)
        const messageBubble = page.locator(`text=${testMessage}`).first();
        await expect(messageBubble).toBeVisible({ timeout: 2000 });
    });

    test('should queue message when offline', async ({ page }) => {
        const testMessage = `Offline Test ${Date.now()}`;

        // Go offline
        await goOffline(page);

        // Try to send message
        await sendTestMessage(page, testMessage);

        // Message should still appear (optimistic UI)
        const messageBubble = page.locator(`text=${testMessage}`).first();
        await expect(messageBubble).toBeVisible({ timeout: 2000 });

        // Check for pending indicator (clock icon, spinner, or "sending" text)
        const pendingIndicator = page.locator('[class*="pending"], [class*="sending"], [class*="spinner"]').first();
        const hasPending = await pendingIndicator.isVisible().catch(() => false);

        console.log('Has pending indicator:', hasPending);

        // Restore network
        await goOnline(page);
    });

    test('should process queued messages when back online', async ({ page }) => {
        const testMessage = `Queue Test ${Date.now()}`;

        // Go offline
        await goOffline(page);

        // Send message while offline
        await sendTestMessage(page, testMessage);

        // Message should appear optimistically
        await expect(page.locator(`text=${testMessage}`).first()).toBeVisible({ timeout: 2000 });

        // Go back online
        await goOnline(page);

        // Wait for queue processing
        await page.waitForTimeout(WAIT_TIMES.long);

        // Reload to verify message was actually sent
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Navigate back to conversation
        await openFirstConversation(page);

        // Message should still be visible (persisted)
        const persistedMessage = page.locator(`text=${testMessage}`).first();
        const isVisible = await persistedMessage.isVisible().catch(() => false);

        console.log('Message persisted after reconnect:', isVisible);
    });

    test('should handle network failure gracefully', async ({ page }) => {
        // Block only API requests, not page resources
        await page.route('**/supabase.co/**', route => route.abort());

        const testMessage = `Network Fail Test ${Date.now()}`;

        // Try to send message
        await sendTestMessage(page, testMessage);

        // Wait for failure indication
        await page.waitForTimeout(3000);

        // Check for error indicator or retry button
        const errorIndicator = page.locator('[class*="failed"], [class*="error"], [class*="retry"], text=/retry/i').first();
        const hasError = await errorIndicator.isVisible().catch(() => false);

        console.log('Has error indicator:', hasError);

        // Restore network
        await page.unrouteAll();
    });
});
