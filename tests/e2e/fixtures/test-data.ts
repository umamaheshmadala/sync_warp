/**
 * Test Data Fixtures for Story 5.2: Binary Review System E2E Tests
 * 
 * This file contains test data, helper functions, and fixtures for E2E tests
 */

export const TEST_USERS = {
  regularUser1: {
    email: 'test1@syncwarp.test',
    password: 'TestPassword123!',
    name: 'Test User One',
  },
  regularUser2: {
    email: 'test2@syncwarp.test',
    password: 'TestPassword123!',
    name: 'Test User Two',
  },
  businessOwner: {
    email: 'owner@syncwarp.test',
    password: 'OwnerPassword123!',
    name: 'Business Owner',
  },
} as const;

export const TEST_BUSINESSES = {
  testRestaurant: {
    id: 'test-restaurant-uuid',
    name: 'Test Restaurant E2E',
    address: '123 Test Street, New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    category: 'restaurant',
  },
  testCafe: {
    id: 'test-cafe-uuid',
    name: 'Test Cafe E2E',
    address: '456 Test Avenue, New York, NY',
    latitude: 40.758,
    longitude: -73.9855,
    category: 'cafe',
  },
} as const;

export const REVIEW_TEST_DATA = {
  validReviews: {
    short: 'Great food and service!', // 4 words
    medium: 'The ambiance was perfect for a romantic dinner. Staff were attentive and the food was absolutely delicious. Will definitely return soon!', // 20 words
    atLimit: 'Excellent restaurant with amazing food quality and presentation. The service was outstanding and the atmosphere was cozy and welcoming. Prices were reasonable for the quality. Highly recommended for special occasions.', // 30 words exactly
    nearLimit: 'Absolutely fantastic experience from start to finish. The menu offered creative dishes that were expertly prepared and beautifully plated. Service was exceptional and attentive without being intrusive. Highly recommended.', // 28 words
  },
  invalidReviews: {
    overLimit: 'This restaurant exceeded all my expectations with its incredible food, impeccable service, and wonderful atmosphere. Every dish was perfectly prepared and beautifully presented. I will absolutely return and recommend to everyone I know.', // 31 words
    empty: '',
  },
  tags: [
    'Food Quality',
    'Service',
    'Atmosphere',
    'Value',
    'Cleanliness',
  ],
  responses: {
    valid: 'Thank you for your feedback! We\'re glad you enjoyed your visit. We hope to see you again soon!', // 17 words
    atLimit: 'Thank you so much for taking the time to share your experience with us. We truly appreciate your kind words about our service and food quality. Your feedback helps us continue improving. We look forward to welcoming you back soon!', // 41 words
    overLimit: 'Thank you so much for taking the time to share your wonderful experience with us today. We truly appreciate your kind words about our service, food quality, and atmosphere. Your feedback means the world to our team and helps us continue improving. We look forward to welcoming you back very soon!', // 52 words
  },
};

export const TEST_IMAGES = {
  validJpg: {
    name: 'test-food.jpg',
    size: 2 * 1024 * 1024, // 2MB
    mimeType: 'image/jpeg',
  },
  validPng: {
    name: 'test-food.png',
    size: 3 * 1024 * 1024, // 3MB
    mimeType: 'image/png',
  },
  oversized: {
    name: 'large-photo.jpg',
    size: 10 * 1024 * 1024, // 10MB (over 5MB limit)
    mimeType: 'image/jpeg',
  },
  invalidType: {
    name: 'document.pdf',
    size: 1 * 1024 * 1024, // 1MB
    mimeType: 'application/pdf',
  },
};

/**
 * Helper: Count words in a string
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Helper: Generate test photo file
 */
export async function generateTestImage(
  width: number = 800,
  height: number = 600,
  format: 'png' | 'jpeg' = 'jpeg'
): Promise<Buffer> {
  // Create a simple colored canvas image as Buffer
  // In real tests, you'd use a library like 'canvas' or load actual test images
  const canvas = {
    width,
    height,
    format,
  };
  
  // Placeholder: Return empty buffer (replace with actual image generation)
  // For real E2E tests, use test-images folder with actual photos
  return Buffer.from('');
}

/**
 * Helper: Wait for real-time update
 */
export async function waitForRealtimeUpdate(ms: number = 3000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: Format test review data
 */
export function createReviewData(options: {
  recommendation: boolean;
  text: string;
  tags?: string[];
  photoUrl?: string;
}) {
  return {
    recommendation: options.recommendation,
    review_text: options.text,
    tags: options.tags || [],
    photo_url: options.photoUrl,
  };
}

/**
 * Helper: Generate unique test data
 */
export function generateUniqueTestData() {
  const timestamp = Date.now();
  return {
    reviewText: `Test review ${timestamp} with unique identifier`,
    userName: `TestUser_${timestamp}`,
    businessName: `TestBusiness_${timestamp}`,
  };
}

/**
 * Helper: Clean test data from database
 * Note: This should be implemented based on your Supabase setup
 */
export async function cleanupTestData(testIdentifier: string): Promise<void> {
  // TODO: Implement database cleanup
  // Example:
  // await supabase.from('business_reviews').delete().ilike('review_text', `%${testIdentifier}%`);
  console.log(`Cleanup test data: ${testIdentifier}`);
}

/**
 * Test selectors (data-testid attributes)
 */
export const SELECTORS = {
  // Review Form
  reviewForm: '[data-testid="review-form"]',
  recommendButton: '[data-testid="recommend-button"]',
  notRecommendButton: '[data-testid="not-recommend-button"]',
  reviewTextArea: '[data-testid="review-textarea"]',
  wordCounter: '[data-testid="word-counter"]',
  submitButton: '[data-testid="submit-review-button"]',
  cancelButton: '[data-testid="cancel-review-button"]',
  
  // Photo Upload
  photoUploadZone: '[data-testid="photo-upload-zone"]',
  photoPreview: '[data-testid="photo-preview"]',
  removePhotoButton: '[data-testid="remove-photo-button"]',
  
  // Tags
  tagSection: '[data-testid="tag-section"]',
  tagButton: (tagName: string) => `[data-testid="tag-${tagName.toLowerCase().replace(/\s+/g, '-')}"]`,
  selectedTagsCounter: '[data-testid="selected-tags-counter"]',
  
  // Review Card
  reviewCard: '[data-testid="review-card"]',
  reviewRecommendationBadge: '[data-testid="recommendation-badge"]',
  reviewText: '[data-testid="review-text"]',
  reviewPhoto: '[data-testid="review-photo"]',
  reviewTags: '[data-testid="review-tags"]',
  editReviewButton: '[data-testid="edit-review-button"]',
  deleteReviewButton: '[data-testid="delete-review-button"]',
  
  // Owner Response
  respondButton: '[data-testid="respond-button"]',
  responseForm: '[data-testid="response-form"]',
  responseTextArea: '[data-testid="response-textarea"]',
  submitResponseButton: '[data-testid="submit-response-button"]',
  ownerBadge: '[data-testid="owner-badge"]',
  
  // My Reviews Page
  myReviewsPage: '[data-testid="my-reviews-page"]',
  reviewsStats: '[data-testid="reviews-stats"]',
  searchInput: '[data-testid="search-reviews-input"]',
  filterButtons: '[data-testid="filter-buttons"]',
  
  // Common
  errorMessage: '[data-testid="error-message"]',
  successMessage: '[data-testid="success-message"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
  confirmDialog: '[data-testid="confirm-dialog"]',
  confirmButton: '[data-testid="confirm-button"]',
  modal: '[data-testid="modal"]',
} as const;

/**
 * Wait times for various operations
 */
export const WAIT_TIMES = {
  short: 1000,      // 1 second
  medium: 3000,     // 3 seconds (realtime updates)
  long: 5000,       // 5 seconds (API operations)
  upload: 10000,    // 10 seconds (photo upload)
} as const;

/**
 * Expected error messages
 */
export const ERROR_MESSAGES = {
  noRecommendation: 'Please select recommend or don\'t recommend',
  wordLimitExceeded: 'Review must be 30 words or less',
  noCheckin: 'Must check-in first to review',
  fileTooLarge: 'File too large (max 5MB)',
  invalidFileType: 'Only images allowed',
  editWindowExpired: 'Can only edit within 24 hours',
  responseWordLimit: 'Response must be 50 words or less',
  maxTagsExceeded: 'Max 5 tags allowed',
} as const;

/**
 * Helper: Create data-testid selector
 */
export function testId(id: string): string {
  return `[data-testid="${id}"]`;
}

/**
 * Helper: Get business URL
 */
export function getBusinessUrl(businessId: string): string {
  return `/business/${businessId}`;
}

/**
 * Helper: Get my reviews URL
 */
export function getMyReviewsUrl(): string {
  return `/my-reviews`;
}

/**
 * Export all test data
 */
export default {
  TEST_USERS,
  TEST_BUSINESSES,
  REVIEW_TEST_DATA,
  TEST_IMAGES,
  SELECTORS,
  WAIT_TIMES,
  ERROR_MESSAGES,
  countWords,
  generateTestImage,
  waitForRealtimeUpdate,
  createReviewData,
  generateUniqueTestData,
  cleanupTestData,
  testId,
  getBusinessUrl,
  getMyReviewsUrl,
};
