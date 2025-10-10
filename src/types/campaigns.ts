/**
 * Targeted Campaigns Type Definitions
 * Week 7-8 Implementation - Phase 1
 * 
 * Comprehensive type definitions for the Targeted Campaigns system including:
 * - Campaign definitions and metadata
 * - Driver profiles and scoring
 * - Campaign analytics and performance tracking
 * - Targeting rules and audience estimation
 * - Request/response types for API
 * - Utility functions and type guards
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const CAMPAIGN_TYPES = [
  'coupons',
  'ads', 
  'events',
  'promotions'
] as const;

export type CampaignType = typeof CAMPAIGN_TYPES[number];

export const CAMPAIGN_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'paused',
  'completed',
  'rejected'
] as const;

export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];

export const TIME_BUCKETS = ['hour', 'day', 'week', 'month'] as const;
export type TimeBucket = typeof TIME_BUCKETS[number];

export const AGE_RANGES = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+'
] as const;

export type AgeRange = typeof AGE_RANGES[number];

export const INCOME_LEVELS = [
  'low',           // < ₹30k/month
  'middle',        // ₹30k - ₹75k/month
  'upper_middle',  // ₹75k - ₹150k/month
  'high'           // > ₹150k/month
] as const;

export type IncomeLevel = typeof INCOME_LEVELS[number];

export const INTEREST_CATEGORIES = [
  'food_dining',
  'shopping_retail',
  'entertainment',
  'health_wellness',
  'automotive',
  'travel_hospitality',
  'beauty_spa',
  'sports_fitness',
  'education',
  'home_services'
] as const;

export type InterestCategory = typeof INTEREST_CATEGORIES[number];

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Campaign
 * Main campaign entity with targeting, budget, and performance metrics
 */
export interface Campaign {
  id: string;
  business_id: string;
  
  // Basic Info
  name: string;
  description?: string;
  campaign_type: CampaignType;
  
  // Targeting
  targeting_rules: TargetingRules;
  target_drivers_only: boolean;
  estimated_reach?: number;
  
  // Budget & Pricing
  total_budget_cents: number;
  spent_budget_cents: number;
  cost_per_impression_cents?: number;
  cost_per_click_cents?: number;
  
  // Schedule
  start_date: string;
  end_date?: string;
  schedule_config?: ScheduleConfig;
  
  // Status
  status: CampaignStatus;
  
  // Performance (cached)
  impressions: number;
  clicks: number;
  conversions: number;
  last_metrics_update?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * TargetingRules
 * Defines who should see the campaign
 */
export interface TargetingRules {
  // Demographics
  age_ranges?: AgeRange[];
  gender?: string[];
  income_levels?: IncomeLevel[];
  
  // Location
  cities?: string[];
  radius_km?: number;
  
  // Interests
  interests?: InterestCategory[];
  
  // Behavior
  min_activity_score?: number;
  drivers_only?: boolean;
  
  // Advanced
  exclude_existing_customers?: boolean;
  exclude_recent_visitors?: boolean;
  include_friends_of_customers?: boolean;
}

/**
 * ScheduleConfig
 * When the campaign should be displayed
 */
export interface ScheduleConfig {
  days_of_week?: DayOfWeek[];
  hours_of_day?: number[]; // 0-23
  timezone?: string;
}

/**
 * DriverProfile
 * User activity scoring and Driver (top 10%) status
 */
export interface DriverProfile {
  id: string;
  user_id: string;
  city_id: string;
  
  // Scores
  total_activity_score: number;
  coupons_collected_score: number;
  coupons_shared_score: number;
  coupons_redeemed_score: number;
  checkins_score: number;
  reviews_score: number;
  social_interactions_score: number;
  
  // Rankings
  city_rank?: number;
  percentile?: number;
  is_driver: boolean;
  
  // Activity Counts
  total_coupons_collected: number;
  total_coupons_shared: number;
  total_coupons_redeemed: number;
  total_checkins: number;
  total_reviews: number;
  
  // Time Windows
  score_30d?: number;
  score_90d?: number;
  
  // Metadata
  first_activity_at?: string;
  last_activity_at?: string;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * DriverAlgorithmConfig
 * Configurable parameters for Driver scoring
 */
export interface DriverAlgorithmConfig {
  id: string;
  
  // Weights (must sum to 100)
  coupons_collected_weight: number;
  coupons_shared_weight: number;
  coupons_redeemed_weight: number;
  checkins_weight: number;
  reviews_weight: number;
  social_interactions_weight: number;
  
  // Parameters
  recency_decay_factor: number;
  min_activities_threshold: number;
  calculation_window_days: number;
  driver_percentile_threshold: number;
  
  // Metadata
  is_active: boolean;
  effective_from: string;
  created_at: string;
  created_by?: string;
  notes?: string;
}

/**
 * CampaignAnalytics
 * Time-series performance metrics
 */
export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  
  // Time
  recorded_at: string;
  time_bucket: TimeBucket;
  
  // Metrics
  impressions: number;
  clicks: number;
  conversions: number;
  spent_cents: number;
  
  // Engagement
  avg_engagement_seconds?: number;
  bounce_rate?: number;
  
  // Breakdown
  demographics_breakdown?: DemographicsBreakdown;
  
  created_at: string;
}

/**
 * DemographicsBreakdown
 * Viewer demographics distribution
 */
export interface DemographicsBreakdown {
  age_ranges: Record<string, number>;
  gender: Record<string, number>;
  income_levels: Record<string, number>;
}

/**
 * CampaignTarget
 * Tracks which users see which campaigns
 */
export interface CampaignTarget {
  id: string;
  campaign_id: string;
  user_id: string;
  
  matched_criteria: Record<string, any>;
  is_driver: boolean;
  
  impressions_count: number;
  clicks_count: number;
  converted: boolean;
  conversion_value_cents?: number;
  
  created_at: string;
  last_interaction_at?: string;
}

// ============================================================================
// COMPUTED TYPES
// ============================================================================

/**
 * CampaignPerformance
 * Calculated campaign metrics and KPIs
 */
export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  
  // Totals
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spent_cents: number;
  
  // Rates
  ctr: number; // Click-through rate (%)
  cvr: number; // Conversion rate (%)
  cpc_cents: number; // Cost per click
  cpa_cents: number; // Cost per acquisition
  roi: number; // Return on investment (%)
  
  // Budget
  budget_utilization: number; // Percentage
  budget_remaining_cents: number;
  
  // Time
  days_active: number;
  days_remaining?: number;
}

/**
 * AudienceEstimate
 * Estimated campaign reach
 */
export interface AudienceEstimate {
  total_reach: number;
  drivers_count?: number;
  breakdown_by_age?: Record<string, number>;
  breakdown_by_city?: Record<string, number>;
  breakdown_by_gender?: Record<string, number>;
  confidence_level: 'low' | 'medium' | 'high';
}

/**
 * DriverBadge
 * Driver status indicator
 */
export interface DriverBadge {
  is_driver: boolean;
  percentile: number;
  city_rank: number;
  badge_color: string;
  badge_label: string;
}

/**
 * CampaignSummary
 * Lightweight campaign info for lists
 */
export interface CampaignSummary {
  id: string;
  name: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  start_date: string;
  end_date?: string;
  total_budget_cents: number;
  spent_budget_cents: number;
  impressions: number;
  clicks: number;
  ctr: number;
  is_active: boolean;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * CreateCampaignRequest
 * Payload for creating a new campaign
 */
export interface CreateCampaignRequest {
  business_id: string;
  name: string;
  description?: string;
  campaign_type: CampaignType;
  targeting_rules: TargetingRules;
  total_budget_cents: number;
  start_date: string;
  end_date?: string;
  schedule_config?: ScheduleConfig;
  cost_per_impression_cents?: number;
  cost_per_click_cents?: number;
}

/**
 * UpdateCampaignRequest
 * Payload for updating an existing campaign
 */
export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  targeting_rules?: TargetingRules;
  total_budget_cents?: number;
  start_date?: string;
  end_date?: string;
  schedule_config?: ScheduleConfig;
  status?: CampaignStatus;
}

/**
 * EstimateAudienceRequest
 * Request for audience size estimation
 */
export interface EstimateAudienceRequest {
  targeting_rules: TargetingRules;
  city_id?: string;
}

/**
 * DriverListRequest
 * Request for fetching drivers
 */
export interface DriverListRequest {
  city_id?: string;
  min_percentile?: number;
  limit?: number;
  offset?: number;
}

/**
 * CampaignFilters
 * Filters for campaign list queries
 */
export interface CampaignFilters {
  status?: CampaignStatus[];
  campaign_type?: CampaignType[];
  start_date_from?: string;
  start_date_to?: string;
  search?: string;
  sort_by?: 'created_at' | 'start_date' | 'budget' | 'performance';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

/**
 * CampaignListResponse
 * Paginated campaign list
 */
export interface CampaignListResponse {
  campaigns: CampaignSummary[];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

/**
 * DriverListResponse
 * Paginated driver list
 */
export interface DriverListResponse {
  drivers: DriverProfile[];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format budget amount in rupees
 */
export const formatBudget = (cents: number): string => {
  return `₹${(cents / 100).toFixed(2)}`;
};

/**
 * Format budget amount in compact format (e.g., ₹1.5K, ₹2.3M)
 */
export const formatBudgetCompact = (cents: number): string => {
  const rupees = cents / 100;
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${rupees.toFixed(0)}`;
};

/**
 * Calculate Click-Through Rate
 */
export const calculateCTR = (clicks: number, impressions: number): number => {
  return impressions > 0 ? (clicks / impressions) * 100 : 0;
};

/**
 * Calculate Conversion Rate
 */
export const calculateCVR = (conversions: number, clicks: number): number => {
  return clicks > 0 ? (conversions / clicks) * 100 : 0;
};

/**
 * Calculate Cost Per Click
 */
export const calculateCPC = (spent_cents: number, clicks: number): number => {
  return clicks > 0 ? spent_cents / clicks : 0;
};

/**
 * Calculate Cost Per Acquisition
 */
export const calculateCPA = (spent_cents: number, conversions: number): number => {
  return conversions > 0 ? spent_cents / conversions : 0;
};

/**
 * Calculate Return on Investment
 */
export const calculateROI = (
  revenue_cents: number,
  spent_cents: number
): number => {
  return spent_cents > 0 
    ? ((revenue_cents - spent_cents) / spent_cents) * 100 
    : 0;
};

/**
 * Calculate budget utilization percentage
 */
export const calculateBudgetUtilization = (
  spent_cents: number,
  total_budget_cents: number
): number => {
  return total_budget_cents > 0 
    ? (spent_cents / total_budget_cents) * 100 
    : 0;
};

/**
 * Calculate days remaining until campaign end
 */
export const calculateDaysRemaining = (end_date?: string): number | null => {
  if (!end_date) return null;
  const now = new Date();
  const end = new Date(end_date);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Calculate days since campaign started
 */
export const calculateDaysActive = (start_date: string): number => {
  const now = new Date();
  const start = new Date(start_date);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Get campaign status color for UI
 */
export const getCampaignStatusColor = (status: CampaignStatus): string => {
  const colors: Record<CampaignStatus, string> = {
    draft: 'gray',
    pending_approval: 'yellow',
    approved: 'blue',
    active: 'green',
    paused: 'orange',
    completed: 'purple',
    rejected: 'red'
  };
  return colors[status];
};

/**
 * Get campaign status label
 */
export const getCampaignStatusLabel = (status: CampaignStatus): string => {
  const labels: Record<CampaignStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    rejected: 'Rejected'
  };
  return labels[status];
};

/**
 * Get driver badge configuration
 */
export const getDriverBadge = (profile: DriverProfile): DriverBadge => {
  const percentile = profile.percentile || 0;
  
  return {
    is_driver: profile.is_driver,
    percentile,
    city_rank: profile.city_rank || 0,
    badge_color: profile.is_driver ? 'gold' : 'gray',
    badge_label: profile.is_driver 
      ? `Top ${(100 - percentile).toFixed(0)}%` 
      : 'Active User'
  };
};

/**
 * Check if campaign is editable
 */
export const isCampaignEditable = (status: CampaignStatus): boolean => {
  return ['draft', 'paused'].includes(status);
};

/**
 * Check if campaign can be paused
 */
export const canPauseCampaign = (status: CampaignStatus): boolean => {
  return status === 'active';
};

/**
 * Check if campaign can be resumed
 */
export const canResumeCampaign = (status: CampaignStatus): boolean => {
  return status === 'paused';
};

/**
 * Check if campaign can be deleted
 */
export const canDeleteCampaign = (status: CampaignStatus): boolean => {
  return status === 'draft';
};

/**
 * Check if campaign is currently running
 */
export const isCampaignActive = (campaign: Campaign): boolean => {
  if (campaign.status !== 'active') return false;
  
  const now = new Date();
  const start = new Date(campaign.start_date);
  const end = campaign.end_date ? new Date(campaign.end_date) : null;
  
  return now >= start && (end === null || now <= end);
};

/**
 * Format targeting rules summary for display
 */
export const formatTargetingRulesSummary = (rules: TargetingRules): string => {
  const parts: string[] = [];
  
  if (rules.age_ranges && rules.age_ranges.length > 0) {
    parts.push(`Ages: ${rules.age_ranges.join(', ')}`);
  }
  
  if (rules.gender && rules.gender.length > 0) {
    parts.push(`Gender: ${rules.gender.join(', ')}`);
  }
  
  if (rules.cities && rules.cities.length > 0) {
    parts.push(`${rules.cities.length} cities`);
  }
  
  if (rules.interests && rules.interests.length > 0) {
    parts.push(`${rules.interests.length} interests`);
  }
  
  if (rules.drivers_only) {
    parts.push('Drivers only');
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'No targeting';
};

/**
 * Validate targeting rules
 */
export const validateTargetingRules = (rules: TargetingRules): string[] => {
  const errors: string[] = [];
  
  if (rules.age_ranges && rules.age_ranges.length === 0) {
    errors.push('Select at least one age range');
  }
  
  if (rules.radius_km && (rules.radius_km < 1 || rules.radius_km > 100)) {
    errors.push('Radius must be between 1 and 100 km');
  }
  
  if (rules.min_activity_score && rules.min_activity_score < 0) {
    errors.push('Minimum activity score must be positive');
  }
  
  return errors;
};

/**
 * Validate campaign data
 */
export const validateCampaign = (campaign: Partial<CreateCampaignRequest>): string[] => {
  const errors: string[] = [];
  
  if (!campaign.name || campaign.name.trim().length === 0) {
    errors.push('Campaign name is required');
  }
  
  if (campaign.name && campaign.name.length > 100) {
    errors.push('Campaign name must be 100 characters or less');
  }
  
  if (!campaign.campaign_type) {
    errors.push('Campaign type is required');
  }
  
  if (!campaign.total_budget_cents || campaign.total_budget_cents <= 0) {
    errors.push('Budget must be greater than zero');
  }
  
  if (!campaign.start_date) {
    errors.push('Start date is required');
  }
  
  if (campaign.start_date && campaign.end_date) {
    if (new Date(campaign.end_date) <= new Date(campaign.start_date)) {
      errors.push('End date must be after start date');
    }
  }
  
  if (campaign.targeting_rules) {
    errors.push(...validateTargetingRules(campaign.targeting_rules));
  }
  
  return errors;
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if object is a Campaign
 */
export const isCampaign = (obj: any): obj is Campaign => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.business_id === 'string' &&
    typeof obj.name === 'string' &&
    CAMPAIGN_TYPES.includes(obj.campaign_type) &&
    CAMPAIGN_STATUSES.includes(obj.status)
  );
};

/**
 * Check if object is a DriverProfile
 */
export const isDriverProfile = (obj: any): obj is DriverProfile => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.total_activity_score === 'number' &&
    typeof obj.is_driver === 'boolean'
  );
};

/**
 * Check if object is a CampaignAnalytics
 */
export const isCampaignAnalytics = (obj: any): obj is CampaignAnalytics => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.campaign_id === 'string' &&
    TIME_BUCKETS.includes(obj.time_bucket)
  );
};

/**
 * Check if campaign status is terminal (completed or rejected)
 */
export const isTerminalStatus = (status: CampaignStatus): boolean => {
  return ['completed', 'rejected'].includes(status);
};

/**
 * Check if targeting rules target drivers
 */
export const targetsDrivers = (rules: TargetingRules): boolean => {
  return rules.drivers_only === true || rules.min_activity_score !== undefined;
};
