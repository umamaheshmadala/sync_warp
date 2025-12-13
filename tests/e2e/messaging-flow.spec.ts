/**
 * Messaging Flow E2E Tests
 * Story 8.8.4 - E2E Web Testing
 * 
 * Critical user journeys:
 * - Send text message and verify appearance
 * - Send message with emoji
 * - Verify message appears in conversation
 */

import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, WAIT_TIMES } from './fixtures/test-data';

// ====================
// HELPER FUNCTIONS
// ====================

async function loginAndNavigateToMessages(page: Page) {
    await page.goto('/');

    // Check if already logged in
    const isLoggedIn = await page.locator('[data-testid="nav-messages"], text=/messages/i').isVisible().catch(() => false);

    if (!isLoggedIn) {
        // Navigate to login
        await page.goto('/auth/login');
        await page.fill('input[type="email"]', TEST_USERS.regularUser1.email);
        await page.fill('input[type="password"]', TEST_USERS.regularUser1.password);
        await page.click('button[type="submit"], button:has-text("Sign in")');
        await page.waitForURL(/\/(home|dashboard|businesses|messages)?/i, { timeout: 15000 });
    }

    // Navigate to messages
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
}

async function openFirstConversation(page: Page) {
    // Wait for conversation list to load
    await page.waitForSelector('[class*="conversation-item"], [class*="chat-item"], a[href*="/messages/"]', { timeout: 10000 });

    // Click first conversation
    const firstConv = page.locator('[class*="conversation-item"], [class*="chat-item"], a[href*="/messages/"]').first();
    await firstConv.click();

    // Wait for chat to load
    await page.waitForSelector('[data-testid="chat-header"], [class*="chat-header"]', { timeout: 10000 });
}

async function sendTestMessage(page: Page, text: string) {
    // Fill message input
    const input = page.locator('[data-testid="message-input"], textarea[placeholder*="message" i]').first();
    await input.fill(text);

    // Click send button
    await page.click('[data-testid="send-message-btn"], button[type="submit"]');

    // Wait for message to appear
    await page.waitForTimeout(WAIT_TIMES.short);
}

// ====================
// MESSAGING FLOW TESTS
// ====================

test.describe('Messaging Flow (Story 8.8.4)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAndNavigateToMessages(page);
    });

    test('should send a text message and verify it appears', async ({ page }) => {
        await openFirstConversation(page);

        const testMessage = `E2E Test Message ${Date.now()}`;

        // Send message
        await sendTestMessage(page, testMessage);

        // Verify message appears in the conversation
        const messageBubble = page.locator(`text=${testMessage}`).first();
        await expect(messageBubble).toBeVisible({ timeout: 5000 });
    });

    test('should send message with emoji', async ({ page }) => {
        await openFirstConversation(page);

        const testMessage = `Hello! 👋 ${Date.now()}`;

        // Send message with emoji
        await sendTestMessage(page, testMessage);

        // Verify message with emoji appears
        const messageBubble = page.locator(`text=/Hello! 👋/`).first();
        await expect(messageBubble).toBeVisible({ timeout: 5000 });
    });

    test('should show message input and send button', async ({ page }) => {
        await openFirstConversation(page);

        // Verify message input is visible
        const input = page.locator('[data-testid="message-input"], textarea[placeholder*="message" i]').first();
        await expect(input).toBeVisible();

        // Type something to enable send button
        await input.fill('Test');

        // Verify send button is visible and enabled
        const sendBtn = page.locator('[data-testid="send-message-btn"]').first();
        await expect(sendBtn).toBeVisible();
        await expect(sendBtn).toBeEnabled();
    });

    test('should show chat header with participant info', async ({ page }) => {
        await openFirstConversation(page);

        // Verify chat header is visible
        const header = page.locator('[data-testid="chat-header"], [class*="chat-header"]').first();
        await expect(header).toBeVisible();

        // Verify header contains participant name or avatar
        const hasName = await header.locator('h2, [class*="name"]').isVisible().catch(() => false);
        const hasAvatar = await header.locator('[class*="avatar"], img').isVisible().catch(() => false);

        expect(hasName || hasAvatar).toBeTruthy();
    });
});
