// =====================================================
// Story 5.2: Binary Review System - TypeScript Types
// =====================================================

export interface BusinessReview {
  id: string;
  business_id: string;
  user_id: string;
  recommendation: boolean; // true = Recommend, false = Don't Recommend
  review_text: string | null;
  photo_urls: string[];
  tags: string[];
  helpful_count: number;
  checkin_id: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  edit_count: number;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
}

export interface BusinessReviewWithDetails extends BusinessReview {
  business_name: string | null;
  user_name: string;
  user_avatar: string | null;
  user_city: string | null;
  is_helpful_by_user?: boolean; // Optimized single-query fetch
  response_id: string | null;
  response_text: string | null;
  response_created_at: string | null;
  response_updated_at: string | null;
}

export interface BusinessReviewResponse {
  id: string;
  review_id: string;
  business_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  total_reviews: number;
  recommend_count: number;
  not_recommend_count: number;
  recommend_percentage: number;
  reviews_with_text: number;
  reviews_with_photos: number;
  average_tags_per_review: number;
}

export interface UserReviewActivity {
  user_id: string;
  total_reviews: number;
  positive_reviews: number;
  negative_reviews: number;
  reviews_with_text: number;
  reviews_with_photos: number;
  last_review_date: string | null;
}

export interface CreateReviewInput {
  business_id: string;
  recommendation: boolean;
  review_text?: string;
  photo_urls?: string[];
  tags?: string[];
  checkin_id: string;
}

export interface UpdateReviewInput {
  recommendation?: boolean; // Allow changing recommendation within 24 hours
  review_text?: string;
  photo_urls?: string[];
  tags?: string[];
}

export interface CreateResponseInput {
  review_id: string;
  business_id: string;
  response_text: string;
}

export interface UpdateResponseInput {
  response_text: string;
}

export interface ReviewFilters {
  recommendation?: boolean; // Filter by recommend/not recommend
  has_text?: boolean; // Filter reviews with text
  has_photo?: boolean; // Filter reviews with photos
  tags?: string[]; // Filter by tags
  user_id?: string; // Filter by specific user
  sort_by?: 'newest' | 'oldest' | 'most-helpful'; // Sort options
}

export interface ReviewFormData {
  recommendation: boolean | null;
  review_text: string;
  photo_urls: string[];
  tags: string[];
  wordCount: number;
}

// Common review tags/categories
export const REVIEW_TAGS = [
  'Food Quality',
  'Service',
  'Atmosphere',
  'Value',
  'Cleanliness',
  'Speed',
  'Presentation',
  'Portion Size',
  'Location',
  'Parking',
  'Wait Time',
  'Staff Friendly',
  'Menu Variety',
  'Fresh Ingredients',
  'Worth It',
  'Not Worth It',
  'Overpriced',
  'Great Deal',
  'Would Return',
  'Never Again'
] as const;

export type ReviewTag = typeof REVIEW_TAGS[number];

// Word count limits
export const REVIEW_TEXT_WORD_LIMIT = 150;
export const REVIEW_TEXT_MIN_WORDS = 1;
export const RESPONSE_TEXT_WORD_LIMIT = 150;

// Edit time limit (24 hours)
export const REVIEW_EDIT_TIME_LIMIT_HOURS = 24;
