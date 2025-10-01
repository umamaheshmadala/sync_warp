import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  TEST_BUSINESSES,
  REVIEW_TEST_DATA,
  SELECTORS,
  WAIT_TIMES,
  ERROR_MESSAGES,
  getBusinessUrl,
} from './fixtures/test-data';

/**
 * Test Suite 1: Binary Recommendation System
 * 
 * Tests the core binary (thumbs up/down) recommendation feature
 */

test.describe('Binary Recommendation System', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // TODO: Implement actual login flow
    // For now, assume user is logged in via storage state
    await page.goto('/');
    await page.waitForTimeout(WAIT_TIMES.short);
  });

  test('TC-1.1: Submit Positive Review', async ({ page }) => {
    // Navigate to business page
    await page.goto(getBusinessUrl(TEST_BUSINESSES.testRestaurant.id));
    await expect(page).toHaveURL(new RegExp(TEST_BUSINESSES.testRestaurant.id));

    // Click "Write Review" button
    await page.click('text=Write Review');
    
    // Wait for form to appear
    await expect(page.locator(SELECTORS.reviewForm)).toBeVisible();

    // Click "👍 Recommend" button
    await page.click(SELECTORS.recommendButton);
    
    // Verify button is highlighted/selected
    await expect(page.locator(SELECTORS.recommendButton)).toHaveClass(/selected|active|bg-green/);

    // Enter review text
    const reviewText = REVIEW_TEST_DATA.validReviews.short;
    await page.fill(SELECTORS.reviewTextArea, reviewText);
    
    // Verify word count
    const wordCounter = page.locator(SELECTORS.wordCounter);
    await expect(wordCounter).toContainText('4/30');

    // Click Submit
    await page.click(SELECTORS.submitButton);

    // Wait for success message
    await expect(page.locator(SELECTORS.successMessage)).toBeVisible({ timeout: WAIT_TIMES.long });

    // Verify review appears on business page
    await page.waitForTimeout(WAIT_TIMES.medium);
    const reviewCard = page.locator(SELECTORS.reviewCard).filter({ hasText: reviewText });
    await expect(reviewCard).toBeVisible();
    
    // Verify thumbs up badge is shown
    await expect(reviewCard.locator(SELECTORS.reviewRecommendationBadge)).toContainText('👍');
  });

  test('TC-1.2: Submit Negative Review', async ({ page }) => {
    // Navigate to business page
    await page.goto(getBusinessUrl(TEST_BUSINESSES.testCafe.id));

    // Click "Write Review" button
    await page.click('text=Write Review');
    await expect(page.locator(SELECTORS.reviewForm)).toBeVisible();

    // Click "👎 Don't Recommend" button
    await page.click(SELECTORS.notRecommendButton);
    
    // Verify button is highlighted
    await expect(page.locator(SELECTORS.notRecommendButton)).toHaveClass(/selected|active|bg-red/);

    // Enter negative review text
    const reviewText = 'Poor service and overpriced'; // 4 words
    await page.fill(SELECTORS.reviewTextArea, reviewText);
    
    // Verify word count
    await expect(page.locator(SELECTORS.wordCounter)).toContainText('4/30');

    // Submit review
    await page.click(SELECTORS.submitButton);
    await expect(page.locator(SELECTORS.successMessage)).toBeVisible({ timeout: WAIT_TIMES.long });

    // Verify review appears with thumbs down
    await page.waitForTimeout(WAIT_TIMES.medium);
    const reviewCard = page.locator(SELECTORS.reviewCard).filter({ hasText: reviewText });
    await expect(reviewCard).toBeVisible();
    await expect(reviewCard.locator(SELECTORS.reviewRecommendationBadge)).toContainText('👎');
  });

  test('TC-1.3: Attempt Submit Without Recommendation', async ({ page }) => {
    // Navigate to business page
    await page.goto(getBusinessUrl(TEST_BUSINESSES.testRestaurant.id));

    // Open review form
    await page.click('text=Write Review');
    await expect(page.locator(SELECTORS.reviewForm)).toBeVisible();

    // Enter text WITHOUT selecting recommendation
    await page.fill(SELECTORS.reviewTextArea, 'This is a test review');

    // Attempt to submit
    await page.click(SELECTORS.submitButton);

    // Verify error message appears
    await expect(page.locator(SELECTORS.errorMessage)).toContainText(
      /Please select|recommendation required/i
    );

    // Verify review form is still open (not submitted)
    await expect(page.locator(SELECTORS.reviewForm)).toBeVisible();

    // Navigate to business page and verify no new review
    await page.click(SELECTORS.cancelButton);
    await page.waitForTimeout(WAIT_TIMES.short);
    
    // Verify review with this text doesn't exist
    const reviewCard = page.locator(SELECTORS.reviewCard).filter({ hasText: 'This is a test review' });
    await expect(reviewCard).not.toBeVisible();
  });

  test('TC-1.4: Toggle Between Positive and Negative', async ({ page }) => {
    // Navigate to business
    await page.goto(getBusinessUrl(TEST_BUSINESSES.testRestaurant.id));
    await page.click('text=Write Review');
    await expect(page.locator(SELECTORS.reviewForm)).toBeVisible();

    // Click Recommend
    await page.click(SELECTORS.recommendButton);
    await expect(page.locator(SELECTORS.recommendButton)).toHaveClass(/selected|active/);

    // Switch to Don't Recommend
    await page.click(SELECTORS.notRecommendButton);
    
    // Verify Don't Recommend is now selected
    await expect(page.locator(SELECTORS.notRecommendButton)).toHaveClass(/selected|active/);
    
    // Verify Recommend is no longer selected
    await expect(page.locator(SELECTORS.recommendButton)).not.toHaveClass(/selected|active/);

    // Switch back to Recommend
    await page.click(SELECTORS.recommendButton);
    await expect(page.locator(SELECTORS.recommendButton)).toHaveClass(/selected|active/);
    await expect(page.locator(SELECTORS.notRecommendButton)).not.toHaveClass(/selected|active/);
  });
});
