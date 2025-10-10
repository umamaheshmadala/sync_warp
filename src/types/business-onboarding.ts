/**
 * Enhanced Business Onboarding Types
 * Story 4B.4
 * 
 * Comprehensive type definitions for business profiling including:
 * - Customer demographics and targeting
 * - Business metrics and performance data
 * - Marketing goals and budget
 * - Onboarding progress tracking
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

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
  'low',           // < $30k
  'middle',        // $30k - $75k
  'upper_middle',  // $75k - $150k
  'high'           // > $150k
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

export const MARKETING_GOALS = [
  'awareness',     // Brand awareness
  'traffic',       // Foot traffic
  'sales',         // Revenue growth
  'loyalty',       // Customer retention
  'engagement'     // Social engagement
] as const;

export type MarketingGoal = typeof MARKETING_GOALS[number];

export const AD_FREQUENCIES = ['low', 'moderate', 'high'] as const;
export type AdFrequency = typeof AD_FREQUENCIES[number];

export const CAMPAIGN_TYPES = ['coupons', 'ads', 'events', 'promotions'] as const;
export type CampaignType = typeof CAMPAIGN_TYPES[number];

export const DATA_SOURCES = ['manual', 'integrated', 'estimated'] as const;
export type DataSource = typeof DATA_SOURCES[number];

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
// INTERFACES
// ============================================================================

/**
 * Business Customer Profile
 * Demographics and behavioral data about target customers
 */
export interface BusinessCustomerProfile {
  id: string;
  business_id: string;
  
  // Demographics
  primary_age_ranges: AgeRange[];
  gender_distribution: {
    male: number;    // percentage (0-100)
    female: number;  // percentage (0-100)
    other: number;   // percentage (0-100)
  };
  income_levels: IncomeLevel[];
  
  // Interests & Behavior
  interest_categories: InterestCategory[];
  customer_behavior_notes?: string;
  
  // Additional Context
  typical_visit_duration?: number;  // minutes
  repeat_customer_rate?: number;    // percentage (0-100)
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Busiest Hour Entry
 * Represents a specific day and hour when business is busy
 */
export interface BusiestHour {
  day: DayOfWeek;
  hour: number;  // 0-23 (24-hour format)
}

/**
 * Seasonal Pattern
 * Monthly multipliers showing seasonal trends (1.0 = average)
 */
export interface SeasonalPattern {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

/**
 * Business Metrics
 * Operational and performance data
 */
export interface BusinessMetrics {
  id: string;
  business_id: string;
  
  // Transaction Metrics
  avg_transaction_cents?: number;
  min_transaction_cents?: number;
  max_transaction_cents?: number;
  
  // Customer Metrics
  avg_visits_per_customer_monthly?: number;
  current_customer_base_size?: number;
  new_customers_monthly?: number;
  
  // Timing Metrics
  busiest_hours: BusiestHour[];
  busiest_days: DayOfWeek[];
  
  // Seasonal Patterns
  seasonal_pattern: SeasonalPattern;
  
  // Data Quality
  last_calculated_at?: string;
  data_source: DataSource;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Business Marketing Goals
 * Marketing objectives and budget
 */
export interface BusinessMarketingGoals {
  id: string;
  business_id: string;
  
  // Goals
  primary_goal?: MarketingGoal;
  secondary_goals: MarketingGoal[];
  
  // Budget
  monthly_budget_cents?: number;
  willing_to_spend_more: boolean;
  
  // Preferences
  preferred_campaign_types: CampaignType[];
  preferred_ad_frequency: AdFrequency;
  
  // Competition
  aware_of_competitors: boolean;
  competitor_names: string[];
  
  // Success Metrics
  target_new_customers_monthly?: number;
  target_revenue_increase_percentage?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Business Onboarding Progress
 * Tracks completion of onboarding steps
 */
export interface BusinessOnboardingProgress {
  id: string;
  business_id: string;
  step_number: number;
  step_name: string;
  completed: boolean;
  completed_at?: string;
  data: Record<string, any>;  // JSONB data
  created_at: string;
  updated_at: string;
}

/**
 * Onboarding Step Definition
 * Metadata about each step in the wizard
 */
export interface OnboardingStep {
  number: number;
  name: string;
  title: string;
  description: string;
  required: boolean;
  estimatedMinutes: number;
}

/**
 * Profile Completion Data
 * Calculates completeness of business profile
 */
export interface ProfileCompletionData {
  percentage: number;
  missing_fields: string[];
  completed_fields: string[];
  recommendations: string[];
  sections: {
    basics: number;           // 0-100
    customer_profile: number; // 0-100
    metrics: number;          // 0-100
    marketing_goals: number;  // 0-100
  };
}

/**
 * Enhanced Business Data
 * Complete business information including all onboarding data
 */
export interface EnhancedBusinessData {
  // Basic business info
  id: string;
  name: string;
  category: string;
  employees_count?: number;
  years_in_business?: number;
  profile_completion_percentage: number;
  onboarding_completed_at?: string;
  last_profile_update: string;
  
  // Extended profile data
  customer_profile?: BusinessCustomerProfile;
  metrics?: BusinessMetrics;
  marketing_goals?: BusinessMarketingGoals;
  onboarding_progress?: BusinessOnboardingProgress[];
}

// ============================================================================
// ONBOARDING WIZARD CONFIGURATION
// ============================================================================

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    number: 1,
    name: 'basics',
    title: 'Business Basics',
    description: 'Basic information about your business',
    required: true,
    estimatedMinutes: 5
  },
  {
    number: 2,
    name: 'customer_profile',
    title: 'Target Customers',
    description: 'Tell us about your ideal customers',
    required: true,
    estimatedMinutes: 7
  },
  {
    number: 3,
    name: 'metrics',
    title: 'Business Metrics',
    description: 'Share your performance data',
    required: false,
    estimatedMinutes: 8
  },
  {
    number: 4,
    name: 'marketing_goals',
    title: 'Marketing Goals',
    description: 'Define your marketing objectives',
    required: true,
    estimatedMinutes: 5
  },
  {
    number: 5,
    name: 'review',
    title: 'Review & Launch',
    description: 'Review your profile and start marketing',
    required: true,
    estimatedMinutes: 3
  }
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency from cents to display format
 */
export function formatCurrency(cents: number | undefined): string {
  if (cents === undefined || cents === null) {
    return '$0.00';
  }
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Convert currency display to cents
 */
export function currencyToCents(amount: string | number): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount;
  return Math.round(numAmount * 100);
}

/**
 * Get human-readable label for age range
 */
export function getAgeRangeLabel(range: AgeRange): string {
  const labels: Record<AgeRange, string> = {
    '18-24': 'Young Adults (18-24)',
    '25-34': 'Millennials (25-34)',
    '35-44': 'Gen X (35-44)',
    '45-54': 'Middle Age (45-54)',
    '55-64': 'Pre-Retirement (55-64)',
    '65+': 'Seniors (65+)'
  };
  return labels[range];
}

/**
 * Get human-readable label for income level
 */
export function getIncomeLevelLabel(level: IncomeLevel): string {
  const labels: Record<IncomeLevel, string> = {
    low: 'Low Income (< $30k)',
    middle: 'Middle Income ($30k - $75k)',
    upper_middle: 'Upper Middle ($75k - $150k)',
    high: 'High Income (> $150k)'
  };
  return labels[level];
}

/**
 * Get human-readable label for interest category
 */
export function getInterestCategoryLabel(category: InterestCategory): string {
  const labels: Record<InterestCategory, string> = {
    food_dining: 'Food & Dining',
    shopping_retail: 'Shopping & Retail',
    entertainment: 'Entertainment',
    health_wellness: 'Health & Wellness',
    automotive: 'Automotive',
    travel_hospitality: 'Travel & Hospitality',
    beauty_spa: 'Beauty & Spa',
    sports_fitness: 'Sports & Fitness',
    education: 'Education',
    home_services: 'Home Services'
  };
  return labels[category];
}

/**
 * Get human-readable label for marketing goal
 */
export function getMarketingGoalLabel(goal: MarketingGoal): string {
  const labels: Record<MarketingGoal, string> = {
    awareness: 'Brand Awareness',
    traffic: 'Foot Traffic',
    sales: 'Sales Growth',
    loyalty: 'Customer Loyalty',
    engagement: 'Social Engagement'
  };
  return labels[goal];
}

/**
 * Validate gender distribution totals to ~100%
 */
export function validateGenderDistribution(
  distribution: BusinessCustomerProfile['gender_distribution'] | undefined
): { valid: boolean; error?: string } {
  if (!distribution) {
    return { valid: true }; // Optional, so valid if not provided
  }
  
  const total = distribution.male + distribution.female + distribution.other;
  
  if (total < 95 || total > 105) {
    return {
      valid: false,
      error: `Gender distribution must total approximately 100% (currently ${total}%)`
    };
  }
  
  return { valid: true };
}

/**
 * Validate at least one age range is selected
 */
export function validateAgeRanges(ranges: AgeRange[] | undefined): { valid: boolean; error?: string } {
  if (!ranges || ranges.length === 0) {
    return {
      valid: false,
      error: 'Please select at least one age range'
    };
  }
  return { valid: true };
}

/**
 * Validate at least one income level is selected
 */
export function validateIncomeLevels(levels: IncomeLevel[] | undefined): { valid: boolean; error?: string } {
  if (!levels || levels.length === 0) {
    return {
      valid: false,
      error: 'Please select at least one income level'
    };
  }
  return { valid: true };
}

/**
 * Validate budget is positive
 */
export function validateBudget(cents: number | undefined): { valid: boolean; error?: string } {
  if (cents !== undefined && cents < 0) {
    return {
      valid: false,
      error: 'Budget must be a positive number'
    };
  }
  return { valid: true };
}

/**
 * Calculate completion percentage for customer profile
 */
export function calculateCustomerProfileCompletion(profile?: BusinessCustomerProfile): number {
  if (!profile) return 0;
  
  let score = 0;
  const maxScore = 5;
  
  if (profile.primary_age_ranges.length > 0) score++;
  if (profile.gender_distribution.male + profile.gender_distribution.female + profile.gender_distribution.other >= 50) score++;
  if (profile.income_levels.length > 0) score++;
  if (profile.interest_categories.length > 0) score++;
  if (profile.customer_behavior_notes && profile.customer_behavior_notes.length > 20) score++;
  
  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate completion percentage for business metrics
 */
export function calculateMetricsCompletion(metrics?: BusinessMetrics): number {
  if (!metrics) return 0;
  
  let score = 0;
  const maxScore = 5;
  
  if (metrics.avg_transaction_cents) score++;
  if (metrics.current_customer_base_size) score++;
  if (metrics.busiest_days.length > 0 || metrics.busiest_hours.length > 0) score++;
  if (metrics.avg_visits_per_customer_monthly) score++;
  if (metrics.seasonal_pattern) score++;
  
  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate completion percentage for marketing goals
 */
export function calculateMarketingGoalsCompletion(goals?: BusinessMarketingGoals): number {
  if (!goals) return 0;
  
  let score = 0;
  const maxScore = 4;
  
  if (goals.primary_goal) score++;
  if (goals.monthly_budget_cents && goals.monthly_budget_cents > 0) score++;
  if (goals.preferred_campaign_types.length > 0) score++;
  if (goals.target_new_customers_monthly) score++;
  
  return Math.round((score / maxScore) * 100);
}

/**
 * Get missing fields for profile completion
 */
export function getMissingFields(data: EnhancedBusinessData): string[] {
  const missing: string[] = [];
  
  // Basic fields
  if (!data.employees_count) missing.push('Number of employees');
  if (!data.years_in_business) missing.push('Years in business');
  
  // Customer profile
  if (!data.customer_profile) {
    missing.push('Customer demographics');
  } else {
    if (data.customer_profile.primary_age_ranges.length === 0) missing.push('Customer age ranges');
    if (data.customer_profile.income_levels.length === 0) missing.push('Customer income levels');
    if (data.customer_profile.interest_categories.length === 0) missing.push('Customer interests');
  }
  
  // Metrics
  if (!data.metrics) {
    missing.push('Business metrics');
  } else {
    if (!data.metrics.avg_transaction_cents) missing.push('Average transaction size');
    if (!data.metrics.current_customer_base_size) missing.push('Customer base size');
  }
  
  // Marketing goals
  if (!data.marketing_goals) {
    missing.push('Marketing goals');
  } else {
    if (!data.marketing_goals.primary_goal) missing.push('Primary marketing goal');
    if (!data.marketing_goals.monthly_budget_cents) missing.push('Marketing budget');
  }
  
  return missing;
}

/**
 * Get recommendations for profile improvement
 */
export function getProfileRecommendations(data: EnhancedBusinessData): string[] {
  const recommendations: string[] = [];
  
  if (data.profile_completion_percentage < 100) {
    recommendations.push('Complete your profile to unlock better targeting');
  }
  
  if (!data.customer_profile || data.customer_profile.customer_behavior_notes === undefined) {
    recommendations.push('Add customer behavior notes for personalized insights');
  }
  
  if (!data.metrics || data.metrics.busiest_hours.length === 0) {
    recommendations.push('Add busiest hours to optimize campaign timing');
  }
  
  if (!data.metrics || !data.metrics.seasonal_pattern) {
    recommendations.push('Add seasonal patterns to improve campaign planning');
  }
  
  if (!data.marketing_goals || data.marketing_goals.competitor_names.length === 0) {
    recommendations.push('Add competitor names for benchmark insights');
  }
  
  return recommendations;
}

/**
 * Format seasonal pattern for display
 */
export function formatSeasonalPattern(pattern: SeasonalPattern): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const values = [
    pattern.jan, pattern.feb, pattern.mar, pattern.apr,
    pattern.may, pattern.jun, pattern.jul, pattern.aug,
    pattern.sep, pattern.oct, pattern.nov, pattern.dec
  ];
  
  const peakIndex = values.indexOf(Math.max(...values));
  const lowIndex = values.indexOf(Math.min(...values));
  
  return `Peak: ${months[peakIndex]}, Low: ${months[lowIndex]}`;
}

/**
 * Format busiest hours for display
 */
export function formatBusiestHours(hours: BusiestHour[]): string {
  if (hours.length === 0) return 'Not specified';
  
  const dayMap: Record<string, string[]> = {};
  
  hours.forEach(({ day, hour }) => {
    if (!dayMap[day]) dayMap[day] = [];
    const time = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
    dayMap[day].push(time);
  });
  
  const summary = Object.entries(dayMap)
    .map(([day, times]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${times.join(', ')}`)
    .join('; ');
  
  return summary;
}

/**
 * Get progress color based on completion percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 75) return 'green';
  if (percentage >= 50) return 'yellow';
  if (percentage >= 25) return 'orange';
  return 'red';
}

/**
 * Get step status
 */
export function getStepStatus(
  stepNumber: number,
  progress?: BusinessOnboardingProgress[]
): 'completed' | 'current' | 'pending' {
  if (!progress) return 'pending';
  
  const step = progress.find(p => p.step_number === stepNumber);
  if (!step) return 'pending';
  
  return step.completed ? 'completed' : 'current';
}

/**
 * Validate onboarding step data
 */
export function validateStepData(
  stepNumber: number,
  data: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Step 1 (basics/welcome) and Step 5 (review) don't require validation
  if (stepNumber === 1 || stepNumber === 5) {
    return { valid: true, errors: [] };
  }
  
  // If no data provided for steps that need it, return valid (allows empty draft saves)
  if (!data) {
    return { valid: true, errors: [] };
  }
  
  switch (stepNumber) {
    case 2: // Customer Profile
      if (!data.primary_age_ranges || data.primary_age_ranges.length === 0) {
        errors.push('Please select at least one age range');
      }
      if (!data.income_levels || data.income_levels.length === 0) {
        errors.push('Please select at least one income level');
      }
      break;
      
    case 3: // Business Metrics (optional, no hard requirements)
      // Metrics are optional, so no validation errors
      break;
      
    case 4: // Marketing Goals (optional step)
      // Marketing goals are optional, no hard requirements
      // If user provides a primary goal, that's great, but not required to proceed
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAgeRange(value: string): value is AgeRange {
  return AGE_RANGES.includes(value as AgeRange);
}

export function isIncomeLevel(value: string): value is IncomeLevel {
  return INCOME_LEVELS.includes(value as IncomeLevel);
}

export function isInterestCategory(value: string): value is InterestCategory {
  return INTEREST_CATEGORIES.includes(value as InterestCategory);
}

export function isMarketingGoal(value: string): value is MarketingGoal {
  return MARKETING_GOALS.includes(value as MarketingGoal);
}

export function isDayOfWeek(value: string): value is DayOfWeek {
  return DAYS_OF_WEEK.includes(value as DayOfWeek);
}
