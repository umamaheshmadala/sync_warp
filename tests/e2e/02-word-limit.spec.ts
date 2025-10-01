import { test, expect } from '@playwright/test';
import {
  TEST_BUSINESSES,
  REVIEW_TEST_DATA,
  SELECTORS,
  WAIT_TIMES,
  countWords,
  getBusinessUrl,
} from './fixtures/test-data';

/**
 * Test Suite 2: 30-Word Text Limit
 * 
 * Tests word count validation, real-time counter, and submission blocking
 */

test.describe('30-Word Text Limit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(getBusinessUrl(TEST_BUSINESSES.testRestaurant.id));
    await page.click('text=Write Review');
    await expect(page.locator(SELECTORS.reviewForm)).toBeVisible();
    
    // Select recommendation (required for submission)
    await page.click(SELECTORS.recommendButton);
  });

  test('TC-2.1: Submit Review Within Limit', async ({ page }) => {
    // Enter 20-word review
    const reviewText = REVIEW_TEST_DATA.validReviews.medium;
    const wordCount = countWords(reviewText);
    
    await page.fill(SELECTORS.reviewTextArea, reviewText);
    
    // Verify word counter shows correct count
    const counter = page.locator(SELECTORS.wordCounter);
    await expect(counter).toContainText(`${wordCount}/30`);
    
    // Verify counter is green (acceptable)
    await expect(counter).toHaveClass(/text-green|green/);
    
    // Submit should be enabled
    const submitButton = page.locator(SELECTORS.submitButton);
    await expect(submitButton).toBeEnabled();
    
    // Submit review
    await submitButton.click();
    
    // Verify success
    await expect(page.locator(SELECTORS.successMessage)).toBeVisible({ timeout: WAIT_TIMES.long });
  });

  test('TC-2.2: Word Count Warning (25-30 words)', async ({ page }) => {
    // Enter 28-word review
    const reviewText = REVIEW_TEST_DATA.validReviews.nearLimit;
    const wordCount = countWords(reviewText);
    
    await page.fill(SELECTORS.reviewTextArea, reviewText);
    
    // Verify word counter shows 28/30
    const counter = page.locator(SELECTORS.wordCounter);
    await expect(counter).toContainText(`${wordCount}/30`);
    
    // Verify counter is yellow/amber (warning)
    await expect(counter).toHaveClass(/text-yellow|text-amber|yellow|amber/);
    
    // Verify submit is still enabled
    await expect(page.locator(SELECTORS.submitButton)).toBeEnabled();
    
    // Add 2 more words to reach exactly 30
    const atLimitText = REVIEW_TEST_DATA.validReviews.atLimit;
    await page.fill(SELECTORS.reviewTextArea, atLimitText);
    
    // Verify counter shows 30/30
    await expect(counter).toContainText('30/30');
    
    // Should still be able to submit
    await page.click(SELECTORS.submitButton);
    await expect(page.locator(SELECTORS.successMessage)).toBeVisible({ timeout: WAIT_TIMES.long });
  });

  test('TC-2.3: Exceed Word Limit (Block Submission)', async ({ page }) => {
    // Enter 31-word review (exceeds limit)
    const reviewText = REVIEW_TEST_DATA.invalidReviews.overLimit;
    const wordCount = countWords(reviewText);
    
    await page.fill(SELECTORS.reviewTextArea, reviewText);
    
    // Verify word counter shows count over 30
    const counter = page.locator(SELECTORS.wordCounter);
    await expect(counter).toContainText(`${wordCount}/30`);
    
    // Verify counter is RED (error)
    await expect(counter).toHaveClass(/text-red|red|error/);
    
    // Verify submit button is DISABLED
    const submitButton = page.locator(SELECTORS.submitButton);
    await expect(submitButton).toBeDisabled();
    
    // Try to click submit anyway (should do nothing)
    await submitButton.click({ force: true }).catch(() => {});
    
    // Verify no success message (submission failed)
    await expect(page.locator(SELECTORS.successMessage)).not.toBeVisible();
    
    // Verify error message about word limit
    await expect(page.locator(SELECTORS.errorMessage)).toContainText(/30 words|word limit/i);
    
    // Remove words to get back to 29
    const validText = REVIEW_TEST_DATA.validReviews.nearLimit;
    await page.fill(SELECTORS.reviewTextArea, validText);
    
    // Verify counter is now green/yellow (acceptable)
    await expect(counter).toHaveClass(/text-green|text-yellow|green|yellow/);
    
    // Verify submit is now enabled
    await expect(submitButton).toBeEnabled();
    
    // Submit successfully
    await submitButton.click();
    await expect(page.locator(SELECTORS.successMessage)).toBeVisible({ timeout: WAIT_TIMES.long });
  });

  test('TC-2.4: Real-time Word Counter', async ({ page }) => {
    const textArea = page.locator(SELECTORS.reviewTextArea);
    const counter = page.locator(SELECTORS.wordCounter);
    
    // Initially should show 0/30
    await expect(counter).toContainText('0/30');
    
    // Type "Great"
    await textArea.fill('Great');
    await expect(counter).toContainText('1/30');
    
    // Type " food and"
    await textArea.fill('Great food and');
    await expect(counter).toContainText('3/30');
    
    // Type " service here"
    await textArea.fill('Great food and service here');
    await expect(counter).toContainText('5/30');
    
    // Delete " here"
    await textArea.fill('Great food and service');
    await expect(counter).toContainText('4/30');
    
    // Verify color is green at low count
    await expect(counter).toHaveClass(/text-green|green/);
    
    // Add text to reach 25 words (warning threshold)
    const warningText = 'Great food and service ' + 'word '.repeat(21);
    await textArea.fill(warningText);
    await expect(counter).toContainText('25/30');
    
    // Verify color changes to yellow/amber
    await expect(counter).toHaveClass(/text-yellow|text-amber|yellow|amber/);
    
    // Add text to exceed 30 words
    const overLimitText = warningText + ' extra words to exceed limit now yes';
    await textArea.fill(overLimitText);
    
    // Verify color changes to red
    await expect(counter).toHaveClass(/text-red|red/);
  });

  test('TC-2.5: Word Count with Special Characters', async ({ page }) => {
    const textArea = page.locator(SELECTORS.reviewTextArea);
    const counter = page.locator(SELECTORS.wordCounter);
    
    // Test with punctuation
    await textArea.fill('Great! Amazing! Perfect!');
    await expect(counter).toContainText('3/30');
    
    // Test with line breaks
    await textArea.fill('First line\nSecond line\nThird line');
    await expect(counter).toContainText('6/30');
    
    // Test with multiple spaces
    await textArea.fill('Word    with    multiple    spaces');
    await expect(counter).toContainText('4/30');
    
    // Test with emojis (should count as words or not)
    await textArea.fill('Great food 🍕 🍔 😋');
    // Depending on implementation, this might be 2-5 words
    const counterText = await counter.textContent();
    expect(counterText).toMatch(/[2-5]\/30/);
  });

  test('TC-2.6: Word Count Persistence on Error', async ({ page }) => {
    // Fill review with valid text
    const reviewText = REVIEW_TEST_DATA.validReviews.medium;
    await page.fill(SELECTORS.reviewTextArea, reviewText);
    
    // Verify word count
    const counter = page.locator(SELECTORS.wordCounter);
    await expect(counter).toContainText('20/30');
    
    // Simulate submission error (e.g., network error)
    // Try to submit (might fail if check-in not set up)
    await page.click(SELECTORS.submitButton);
    
    // If error occurs, verify word counter still shows correct count
    await page.waitForTimeout(WAIT_TIMES.short);
    await expect(counter).toContainText('20/30');
    
    // Verify text is still in textarea (not cleared on error)
    const textAreaValue = await page.locator(SELECTORS.reviewTextArea).inputValue();
    expect(textAreaValue).toBe(reviewText);
  });
});
