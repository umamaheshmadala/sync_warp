// src/types/follower.types.ts
// TypeScript type definitions for the follower targeting and analytics system

/**
 * Database table types
 */

export interface BusinessFollower {
  id: string;
  business_id: string;
  user_id: string;
  followed_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  title: string;
  description?: string;
  status: CampaignStatus;
  targeting_filters?: TargetingFilters;
  budget?: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface CampaignMetric {
  id: string;
  campaign_id: string;
  user_id?: string;
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  conversions: number;
  demographic?: string;
  is_follower: boolean;
  created_at: string;
}

export interface FollowerReport {
  id: string;
  reporter_id: string;
  reported_user_id?: string;
  business_id?: string;
  report_type: ReportType;
  description?: string;
  status: ReportStatus;
  admin_notes?: string;
  action_taken?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export type ReportType = 'spam' | 'bot' | 'harassment' | 'fake_engagement' | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'action_taken' | 'dismissed';

/**
 * User demographic types
 */

export interface UserDemographics {
  age?: number;
  gender?: Gender;
  city?: string;
  country?: string;
}

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/**
 * Targeting filter types
 */

export interface TargetingFilters {
  targetFollowers: boolean;
  ageRange?: AgeRange;
  gender?: Gender | 'all';
  cities?: string[];
  countries?: string[];
  interests?: string[];
}

export interface AgeRange {
  min: number;
  max: number;
}

export type AgeGroup = '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';

/**
 * Analytics and metrics types
 */

export interface ReachEstimate {
  totalReach: number;
  followerReach: number;
  publicReach: number;
  breakdown: DemographicBreakdown;
}

export interface DemographicBreakdown {
  ageGroups: Record<AgeGroup, number>;
  cities: Record<string, number>;
  genders: Record<Gender | 'other', number>;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  conversions: number;
  clickThroughRate: number;
  engagementRate: number;
  conversionRate: number;
  followerReach: number;
  publicReach: number;
  topPerformingDemographic: {
    segment: string;
    engagementRate: number;
  };
  dailyMetrics: DailyMetric[];
}

export interface DailyMetric {
  date: string;
  impressions: number;
  clicks: number;
  engagement: number;
}

export interface FollowerStats {
  totalFollowers: number;
  newFollowersThisWeek: number;
  unfollowersThisWeek: number;
  growthRate: number;
  demographics: {
    ageGroups: Record<AgeGroup, number>;
    genders: Record<Gender | 'other', number>;
    topCities: Array<{ city: string; count: number }>;
  };
  engagementMetrics: {
    averageEngagementRate: number;
    mostActiveTime: string;
    topEngagingSegment: string;
  };
  retentionRate: number;
}

/**
 * Component prop types
 */

export interface FollowerSegmentSelectorProps {
  businessId: string;
  onFiltersChange?: (filters: Partial<TargetingFilters>) => void;
  className?: string;
}

export interface CampaignTargetingFormProps {
  businessId: string;
  onTargetingChange?: (targeting: TargetingFilters) => void;
  className?: string;
}

export interface CampaignAnalyticsDashboardProps {
  campaignId: string;
  businessId: string;
}

export interface FollowerInsightsDashboardProps {
  businessId: string;
}

export interface SuspiciousActivityReviewerProps {
  // No required props - accesses all reports
}

export interface FollowerActivityMonitorProps {
  // No required props - monitors platform-wide
}

export interface FollowButtonProps {
  businessId: string;
  userId: string;
  variant?: 'default' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

/**
 * Hook return types
 */

export interface UseCampaignTargetingResult {
  filters: TargetingFilters;
  reach: ReachEstimate | null;
  loading: boolean;
  updateFilters: (updates: Partial<TargetingFilters>) => void;
  calculateReach: () => Promise<void>;
  resetFilters: () => void;
}

/**
 * Admin types
 */

export interface ActivityStats {
  totalFollowers: number;
  followsToday: number;
  unfollowsToday: number;
  followsThisWeek: number;
  unfollowsThisWeek: number;
  netGrowth: number;
  averageFollowsPerBusiness: number;
  mostFollowedBusinesses: Array<{
    business_name: string;
    follower_count: number;
  }>;
  suspiciousPatterns: SuspiciousPattern[];
}

export interface SuspiciousPattern {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  userId?: string;
  businessId?: string;
}

export type AdminAction = 'warn' | 'suspend' | 'ban' | 'dismiss';

/**
 * Utility types
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export type TimeRangePreset = '24h' | '7d' | '30d' | '90d' | 'all';

/**
 * API response types
 */

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Event types for tracking
 */

export type CampaignEvent = 'impression' | 'click' | 'like' | 'share' | 'conversion';

export interface TrackEventParams {
  campaignId: string;
  userId: string;
  eventType: CampaignEvent;
  isFollower: boolean;
  demographic?: string;
  metadata?: Record<string, any>;
}

/**
 * Export types
 */

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeMetadata: boolean;
  dateRange?: TimeRange;
}

export interface ExportData {
  campaign: Campaign;
  metrics: CampaignMetrics;
  exportedAt: string;
  exportedBy: string;
}

/**
 * Filter and sort types
 */

export interface FilterOptions {
  status?: CampaignStatus[];
  dateRange?: TimeRange;
  minImpressions?: number;
  minEngagementRate?: number;
}

export type SortField = 'created_at' | 'impressions' | 'clicks' | 'engagement_rate' | 'status';
export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  order: SortOrder;
}

/**
 * Pagination types
 */

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Chart data types
 */

export interface ChartDataPoint {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}

/**
 * Notification types
 */

export interface NotificationPreferences {
  campaignMilestones: boolean;
  suspiciousActivity: boolean;
  followerGrowth: boolean;
  weeklyReports: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface Notification {
  id: string;
  type: 'milestone' | 'alert' | 'report' | 'system';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

/**
 * Real-time subscription types
 */

export interface RealtimeSubscription {
  channel: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void;
}

/**
 * Performance monitoring types
 */

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  queriesExecuted: number;
}
