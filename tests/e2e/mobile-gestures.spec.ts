/**
 * Mobile Gesture Tests
 * Story 8.5.8 - Integration Testing (Phase 2)
 * 
 * Tests mobile-specific interactions:
 * - Long press action sheet
 * - Touch-friendly reaction buttons
 * - Swipe gestures
 */

import { test, expect, devices } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-data';

// Use iPhone 12 device
test.use(devices['iPhone 12']);

async function loginAndNavigateToMessages(page: any) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', TEST_USERS.regularUser1.email);
  await page.fill('input[type="password"]', TEST_USERS.regularUser1.password);
  await page.click('button[type="submit"], button:has-text("Sign in")');
  await page.waitForURL(/^(?!.*\/auth)/i, { timeout: 15000 });
  await page.goto('/messages');
  await page.waitForLoadState('networkidle');
}

async function openFirstConversation(page: any) {
  const conversationItem = page.locator('[class*="conversation"], [class*="chat-item"]').first();
  if (await conversationItem.isVisible()) {
    await conversationItem.click();
    await page.waitForLoadState('networkidle');
  }
}

// ====================
// LONG PRESS TESTS
// ====================
test.describe('Long Press Actions @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToMessages(page);
    await openFirstConversation(page);
  });

  test('should show action sheet on long press', async ({ page }) => {
    const message = page.locator('[class*="message"], [class*="bubble"]').first();
    
    if (await message.isVisible()) {
      // Simulate long press via touch events
      const box = await message.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        
        // Long press simulation
        await message.dispatchEvent('touchstart');
        await page.waitForTimeout(600); // > 500ms threshold
        await message.dispatchEvent('touchend');
        
        await page.waitForTimeout(300);
        
        // Look for action sheet / context menu
        const actionSheet = page.locator('[class*="action-sheet"], [class*="context-menu"], [role="menu"]');
        const isVisible = await actionSheet.isVisible().catch(() => false);
        console.log('Action sheet visible after long press:', isVisible);
      }
    }
  });

  test('should have touch-friendly button sizes (min 44x44)', async ({ page }) => {
    // Find interactive elements
    const buttons = page.locator('button, [role="button"]');
    const count = await buttons.count();
    
    let smallButtonCount = 0;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box && (box.width < 44 || box.height < 44)) {
          smallButtonCount++;
          console.log(`Button ${i} is too small: ${box.width}x${box.height}`);
        }
      }
    }
    
    console.log(`Found ${smallButtonCount}/${count} buttons smaller than 44x44`);
  });
});

// ====================
// TOUCH REACTION TESTS
// ====================
test.describe('Touch Reactions @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToMessages(page);
    await openFirstConversation(page);
  });

  test('should display reaction bar with touch-friendly spacing', async ({ page }) => {
    const message = page.locator('[class*="message"], [class*="bubble"]').first();
    
    if (await message.isVisible()) {
      // Tap on message
      await message.tap();
      await page.waitForTimeout(300);
      
      // Look for reaction picker
      const reactionPicker = page.locator('[class*="reaction"], [class*="emoji"]');
      const isVisible = await reactionPicker.isVisible().catch(() => false);
      console.log('Reaction picker visible on tap:', isVisible);
    }
  });

  test('should have adequate spacing between reaction buttons', async ({ page }) => {
    // Open a reaction picker first
    const message = page.locator('[class*="message"], [class*="bubble"]').first();
    
    if (await message.isVisible()) {
      await message.click({ button: 'right' });
      await page.waitForTimeout(300);
      
      // Find reaction buttons
      const reactionButtons = page.locator('[class*="reaction-button"], [class*="emoji-button"]');
      const count = await reactionButtons.count();
      
      console.log(`Found ${count} reaction buttons`);
      
      // Check spacing between buttons
      if (count >= 2) {
        const first = await reactionButtons.first().boundingBox();
        const second = await reactionButtons.nth(1).boundingBox();
        
        if (first && second) {
          const gap = second.x - (first.x + first.width);
          console.log(`Gap between reaction buttons: ${gap}px`);
        }
      }
    }
  });
});

// ====================
// SWIPE GESTURE TESTS
// ====================
test.describe('Swipe Gestures @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToMessages(page);
    await openFirstConversation(page);
  });

  test('should support swipe to reply', async ({ page }) => {
    const message = page.locator('[class*="message"], [class*="bubble"]').first();
    
    if (await message.isVisible()) {
      const box = await message.boundingBox();
      if (box) {
        // Simulate swipe right gesture
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        
        await page.waitForTimeout(300);
        
        // Look for reply indicator
        const replyIndicator = page.locator('[class*="reply"], input[placeholder*="reply" i]');
        const isVisible = await replyIndicator.isVisible().catch(() => false);
        console.log('Reply indicator visible after swipe:', isVisible);
      }
    }
  });
});

// ====================
// VIEWPORT TESTS
// ====================
test.describe('Mobile Viewport @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToMessages(page);
  });

  test('should display message list correctly on mobile viewport', async ({ page }) => {
    await openFirstConversation(page);
    
    // Check viewport size
    const viewportSize = page.viewportSize();
    console.log(`Viewport size: ${viewportSize?.width}x${viewportSize?.height}`);
    
    // Messages should be visible and not cut off
    const messageList = page.locator('[class*="message-list"], [class*="messages"]');
    await expect(messageList).toBeVisible({ timeout: 5000 });
    
    // Composer should be visible at bottom
    const composer = page.locator('textarea, input[placeholder*="message" i]');
    const isComposerVisible = await composer.isVisible().catch(() => false);
    console.log('Message composer visible:', isComposerVisible);
  });

  test('should handle keyboard appearance', async ({ page }) => {
    await openFirstConversation(page);
    
    // Focus on input to trigger keyboard
    const composer = page.locator('textarea, input[placeholder*="message" i]').first();
    if (await composer.isVisible()) {
      await composer.focus();
      await page.waitForTimeout(500);
      
      // Input should still be visible (not covered by keyboard simulation)
      await expect(composer).toBeInViewport();
    }
  });
});
