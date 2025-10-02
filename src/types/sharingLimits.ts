// =====================================================
// Story 5.5: Enhanced Sharing Limits - Type Definitions
// =====================================================

/**
 * Configuration for a single sharing limit
 */
export interface SharingLimitConfig {
  id: string;
  limit_type: 'per_friend_daily' | 'total_daily' | 'driver_per_friend_daily' | 'driver_total_daily';
  limit_value: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Sharing limits for a user (regular or Driver)
 */
export interface SharingLimits {
  per_friend_daily: number;
  total_daily: number;
  is_driver: boolean;
}

/**
 * Result of checking if user can share to a friend
 */
export interface CanShareResult {
  can_share: boolean;
  reason: string;
  shares_to_friend_today: number;
  per_friend_limit: number;
  total_shares_today: number;
  total_daily_limit: number;
  remaining_to_friend: number;
  remaining_total: number;
}

/**
 * Sharing statistics for a user for today
 */
export interface SharingStatsToday {
  total_shared_today: number;
  total_daily_limit: number;
  remaining_today: number;
  per_friend_limit: number;
  friends_shared_with: FriendShareCount[];
  is_driver: boolean;
}

/**
 * Count of shares to a specific friend
 */
export interface FriendShareCount {
  recipient_id: string;
  count: number;
}

/**
 * Entry in the coupon sharing log
 */
export interface CouponSharingLogEntry {
  id: string;
  sender_id: string;
  recipient_id: string;
  coupon_id: string | null;
  shared_at: string;
  sharing_day: string; // Date string (YYYY-MM-DD)
  is_driver: boolean;
  created_at: string;
}

/**
 * Input for logging a coupon share
 */
export interface LogCouponShareInput {
  sender_id: string;
  recipient_id: string;
  coupon_id: string;
  is_driver?: boolean;
}

/**
 * Sharing analytics for admin dashboard
 */
export interface SharingAnalytics {
  sender_id: string;
  sharing_day: string;
  total_shares: number;
  unique_recipients: number;
  was_driver: boolean;
}

/**
 * Props for limit exceeded modal
 */
export interface LimitExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'per_friend' | 'total_daily';
  currentCount: number;
  limitValue: number;
  friendName?: string;
  isDriver: boolean;
}

/**
 * Props for sharing stats card
 */
export interface SharingStatsCardProps {
  userId?: string;
  onRefresh?: () => void;
  showDetails?: boolean;
}

// Export all types
export type {
  SharingLimitConfig,
  SharingLimits,
  CanShareResult,
  SharingStatsToday,
  FriendShareCount,
  CouponSharingLogEntry,
  LogCouponShareInput,
  SharingAnalytics,
  LimitExceededModalProps,
  SharingStatsCardProps,
};

// Default export for convenience
export default {
  // Type guards
  isCanShareResult: (obj: any): obj is CanShareResult => {
    return obj && typeof obj.can_share === 'boolean' && typeof obj.reason === 'string';
  },
  
  isSharingStatsToday: (obj: any): obj is SharingStatsToday => {
    return obj && typeof obj.total_shared_today === 'number' && Array.isArray(obj.friends_shared_with);
  },
};
