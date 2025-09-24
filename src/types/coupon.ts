// Coupon-related TypeScript interfaces and types
// Following the established patterns from product.ts and business systems

export interface Coupon {
  id: string;
  business_id: string;
  
  // Basic Coupon Information
  title: string;
  description: string;
  
  // Coupon Type and Value
  type: CouponType;
  discount_type: DiscountType;
  discount_value: number; // Amount or percentage
  min_purchase_amount?: number;
  max_discount_amount?: number; // For percentage discounts
  
  // Terms and Conditions
  terms_conditions: string;
  
  // Usage Limits
  total_limit?: number; // Total number of coupons available
  per_user_limit?: number; // How many times one user can use it
  
  // Time Validity
  valid_from: string;
  valid_until: string;
  
  // Targeting and Distribution
  target_audience: TargetAudience;
  is_public: boolean; // Can be found by all users vs targeted
  
  // Coupon Code and QR
  coupon_code: string; // Unique alphanumeric code
  qr_code_url?: string; // Generated QR code image URL
  
  // Status and Tracking
  status: CouponStatus;
  usage_count: number; // How many times it's been used
  collection_count: number; // How many users have collected it
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string; // Business user ID
}

export interface CouponFormData {
  title: string;
  description: string;
  type: CouponType;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  terms_conditions: string;
  total_limit?: number;
  per_user_limit?: number;
  valid_from: string;
  valid_until: string;
  target_audience: TargetAudience;
  is_public: boolean;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string;
  business_id: string;
  
  // Redemption Details
  redemption_code: string; // The specific code used
  redemption_amount: number; // Actual discount applied
  original_amount: number; // Original purchase amount
  
  // Location and Verification
  redeemed_at_location?: {
    latitude: number;
    longitude: number;
  };
  
  // Status and Tracking
  status: RedemptionStatus;
  redeemed_at: string;
  redeemed_by?: string; // Staff member who processed it
  
  // Optional receipt or transaction reference
  transaction_reference?: string;
  notes?: string;
}

export interface UserCouponCollection {
  id: string;
  user_id: string;
  coupon_id: string;
  
  // Collection Details
  collected_at: string;
  collected_from: CollectionSource;
  
  // Usage Tracking
  times_used: number;
  last_used_at?: string;
  
  // Status
  status: CollectionStatus;
  
  // Metadata
  expires_at: string; // Copy of coupon expiry for quick access
}

export interface CouponAnalytics {
  coupon_id: string;
  
  // Collection Stats
  total_collections: number;
  unique_collectors: number;
  collection_rate: number; // collections / views
  
  // Redemption Stats
  total_redemptions: number;
  unique_redeemers: number;
  redemption_rate: number; // redemptions / collections
  
  // Financial Impact
  total_discount_given: number;
  average_discount_per_redemption: number;
  estimated_revenue_generated: number;
  
  // Time-based Analytics
  daily_stats: DailyAnalytics[];
  
  // Demographics (if available)
  top_user_segments: UserSegment[];
  top_collection_sources: CollectionSourceStats[];
  
  // Performance Metrics
  conversion_funnel: ConversionFunnel;
  
  updated_at: string;
}

// Supporting Types and Enums

export type CouponType = 
  | 'percentage' // 20% off
  | 'fixed_amount' // ₹100 off
  | 'buy_x_get_y' // Buy 2 Get 1 Free
  | 'free_item' // Free coffee with purchase
  | 'free_shipping' // Free delivery
  | 'bundle_deal'; // Special combo pricing

export type DiscountType = 
  | 'percentage' // 20%
  | 'fixed_amount' // ₹100
  | 'free_item' // No charge for specific item
  | 'buy_x_get_y'; // BXGY logic

export type CouponStatus = 
  | 'draft' // Being created
  | 'active' // Live and available
  | 'paused' // Temporarily disabled
  | 'expired' // Past validity date
  | 'exhausted' // All uses consumed
  | 'cancelled'; // Manually stopped

export type TargetAudience = 
  | 'all_users'
  | 'new_users' // First-time visitors
  | 'returning_users' // Previous customers
  | 'frequent_users' // Regular customers
  | 'drivers' // Top 10% active users
  | 'location_based' // Users in specific area
  | 'friends_of_users'; // Social sharing based

export type RedemptionStatus = 
  | 'pending' // Code entered, awaiting confirmation
  | 'completed' // Successfully redeemed
  | 'cancelled' // Cancelled by merchant
  | 'failed'; // Technical failure

export type CollectionStatus = 
  | 'active' // Available to use
  | 'used' // Fully consumed
  | 'expired' // Past expiry date
  | 'removed'; // User removed it

export type CollectionSource = 
  | 'direct_search' // Found by searching
  | 'business_profile' // From business page
  | 'social_share' // Shared by friend
  | 'push_notification' // From notification
  | 'qr_scan' // Scanned QR code
  | 'admin_push'; // Admin distributed

// Analytics Supporting Types

export interface DailyAnalytics {
  date: string;
  collections: number;
  redemptions: number;
  discount_given: number;
  unique_users: number;
}

export interface UserSegment {
  segment: string;
  count: number;
  percentage: number;
  avg_redemption_value: number;
}

export interface CollectionSourceStats {
  source: CollectionSource;
  count: number;
  percentage: number;
  conversion_rate: number;
}

export interface ConversionFunnel {
  views: number;
  collections: number;
  redemptions: number;
  view_to_collection_rate: number;
  collection_to_redemption_rate: number;
  overall_conversion_rate: number;
}

// Filters and Search Types

export interface CouponFilters {
  status?: CouponStatus[];
  type?: CouponType[];
  date_range?: {
    start: string;
    end: string;
  };
  search_query?: string;
  sort_by?: CouponSortBy;
  sort_order?: 'asc' | 'desc';
}

export type CouponSortBy = 
  | 'created_at'
  | 'valid_until'
  | 'usage_count'
  | 'collection_count'
  | 'title';

// Constants and Limits

export const COUPON_LIMITS = {
  MAX_COUPONS_PER_BUSINESS: 50, // Free tier limit
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TERMS_LENGTH: 1000,
  MIN_VALIDITY_HOURS: 1,
  MAX_VALIDITY_DAYS: 365,
  CODE_LENGTH: 8, // Generated coupon codes
  MAX_DISCOUNT_PERCENTAGE: 100,
  MAX_FIXED_DISCOUNT_AMOUNT: 10000, // ₹10,000
} as const;

export const COUPON_CODE_PREFIX = {
  PERCENTAGE: 'PCT',
  FIXED: 'FIX',
  BXGY: 'BGY',
  FREE: 'FRE',
  BUNDLE: 'BND',
} as const;

// Validation Schemas (for use with zod or similar)

export interface CouponValidationRules {
  title: {
    required: true;
    min_length: 5;
    max_length: 100;
  };
  description: {
    required: true;
    min_length: 10;
    max_length: 500;
  };
  discount_value: {
    required: true;
    min: 0.01;
    max_percentage: 100;
    max_fixed: 10000;
  };
  validity_period: {
    min_duration_hours: 1;
    max_duration_days: 365;
    must_be_future: true;
  };
  usage_limits: {
    total_limit_max: 10000;
    per_user_limit_max: 100;
  };
}

// Helper Types for UI Components

export interface CouponCardProps {
  coupon: Coupon;
  analytics?: CouponAnalytics;
  viewMode: 'grid' | 'list';
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  onViewAnalytics?: () => void;
}

export interface CouponFormState {
  step: number;
  data: Partial<CouponFormData>;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

// QR Code and Redemption Types

export interface QRCodeData {
  coupon_id: string;
  coupon_code: string;
  business_id: string;
  generated_at: string;
  expires_at: string;
}

export interface RedemptionRequest {
  coupon_code: string;
  user_id?: string; // Optional if scanned by merchant
  redemption_amount?: number;
  original_amount?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  staff_notes?: string;
}

export interface RedemptionResponse {
  success: boolean;
  redemption?: CouponRedemption;
  coupon?: Coupon;
  discount_applied: number;
  final_amount: number;
  error_message?: string;
  error_code?: string;
}