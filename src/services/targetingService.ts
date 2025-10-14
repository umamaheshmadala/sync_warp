/**
 * Targeting Service
 * Phase 2: Campaign Targeting Engine
 * 
 * Handles audience estimation, targeting validation, and reach calculation
 * Wraps database functions and provides targeting intelligence
 */

import { supabase } from '../lib/supabase';
import type {
  TargetingRules,
  AudienceEstimate,
  EstimateAudienceRequest
} from '../types/campaigns';
import { validateTargetingRules, targetsDrivers } from '../types/campaigns';

// ============================================================================
// ERROR TYPES
// ============================================================================

export class TargetingServiceError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'TargetingServiceError';
  }
}

// ============================================================================
// AUDIENCE ESTIMATION
// ============================================================================

/**
 * Transform flat targeting rules to nested structure for database function
 */
function transformTargetingRules(rules: TargetingRules): any {
  const transformed: any = {};

  // Demographics
  const demographics: any = {};
  if (rules.age_ranges && rules.age_ranges.length > 0) {
    demographics.ageRanges = rules.age_ranges;
  }
  if (rules.gender && rules.gender.length > 0) {
    demographics.gender = rules.gender;
  }
  if (rules.income_levels && rules.income_levels.length > 0) {
    demographics.incomeRanges = rules.income_levels;
  }
  if (Object.keys(demographics).length > 0) {
    transformed.demographics = demographics;
  }

  // Location
  const location: any = {};
  if (rules.center_lat !== undefined && rules.center_lng !== undefined) {
    location.lat = rules.center_lat;
    location.lng = rules.center_lng;
    location.radiusKm = rules.radius_km || 3;
  }
  if (Object.keys(location).length > 0) {
    transformed.location = location;
  }

  // Behavior
  const behavior: any = {};
  if (rules.interests && rules.interests.length > 0) {
    behavior.interests = rules.interests;
  }
  if (rules.customer_segments && rules.customer_segments.length > 0) {
    behavior.customerSegments = rules.customer_segments;
  }
  if (rules.min_purchases !== undefined) {
    behavior.minPurchases = rules.min_purchases;
  }
  if (rules.drivers_only === true) {
    behavior.isDriver = true;
  }
  if (Object.keys(behavior).length > 0) {
    transformed.behavior = behavior;
  }

  return transformed;
}

/**
 * Estimate campaign reach based on targeting rules
 * This calls the new database function calculate_campaign_reach()
 */
export async function estimateAudienceReach(
  request: EstimateAudienceRequest
): Promise<AudienceEstimate> {
  try {
    const { targeting_rules, city_id } = request;

    // Validate targeting rules first
    const errors = validateTargetingRules(targeting_rules);
    if (errors.length > 0) {
      throw new TargetingServiceError(
        `Invalid targeting rules: ${errors.join(', ')}`,
        'INVALID_TARGETING'
      );
    }

    // Transform rules to match database function format
    const transformedRules = transformTargetingRules(targeting_rules);

    // Debug: log the transformation
    console.log('🎯 Original targeting rules:', targeting_rules);
    console.log('🔄 Transformed rules for database:', transformedRules);

    // Call NEW database function for accurate reach calculation
    const { data, error } = await supabase.rpc('calculate_campaign_reach', {
      p_targeting_rules: transformedRules,
      p_debug: true  // Enable debug to see what's being sent
    });

    if (error) {
      throw new TargetingServiceError(
        'Failed to estimate audience reach',
        error.code,
        error
      );
    }

    // Extract results from the new function
    const result = (data && data.length > 0) ? data[0] : null;
    
    // Debug: log the response
    console.log('📊 Database response:', result);
    if (result?.debug_info) {
      console.log('🐛 Debug info:', result.debug_info);
    }
    
    if (!result) {
      throw new TargetingServiceError(
        'No data returned from reach calculation',
        'NO_DATA'
      );
    }

    const total_reach = result.total_reach || 0;
    const demographics_count = result.demographics_count || 0;
    const location_count = result.location_count || 0;
    const behavior_count = result.behavior_count || 0;
    const breakdown = result.breakdown || {};

    // Determine confidence level based on sample size
    const confidence_level = getConfidenceLevel(total_reach);

    // Get driver count if targeting drivers
    let drivers_count: number | undefined;
    if (targetsDrivers(targeting_rules)) {
      drivers_count = behavior_count;
    }

    return {
      total_reach,
      drivers_count,
      demographics_count,
      location_count,
      behavior_count,
      breakdown_by_age: breakdown.by_age,
      breakdown_by_gender: breakdown.by_gender,
      breakdown_by_city: {},
      confidence_level
    };
  } catch (error) {
    if (error instanceof TargetingServiceError) throw error;
    throw new TargetingServiceError(
      'Unexpected error estimating audience',
      'UNKNOWN',
      error
    );
  }
}

/**
 * Get number of drivers in the targeted audience
 */
async function getDriversInAudience(
  rules: TargetingRules,
  cityId?: string
): Promise<number> {
  try {
    let query = supabase
      .from('driver_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_driver', true);

    // Apply city filter
    if (cityId) {
      query = query.eq('city_id', cityId);
    } else if (rules.cities && rules.cities.length > 0) {
      query = query.in('city_id', rules.cities);
    }

    // Apply minimum activity score filter
    if (rules.min_activity_score) {
      query = query.gte('total_activity_score', rules.min_activity_score);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting drivers:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting drivers in audience:', error);
    return 0;
  }
}

/**
 * Get demographic breakdowns for the audience
 */
async function getAudienceBreakdowns(
  rules: TargetingRules,
  cityId?: string
): Promise<{
  breakdown_by_age?: Record<string, number>;
  breakdown_by_city?: Record<string, number>;
  breakdown_by_gender?: Record<string, number>;
}> {
  try {
    let query = supabase
      .from('profiles')
      .select('age_range, city_id, gender');

    // Apply filters from targeting rules
    if (cityId) {
      query = query.eq('city_id', cityId);
    } else if (rules.cities && rules.cities.length > 0) {
      query = query.in('city_id', rules.cities);
    }

    if (rules.age_ranges && rules.age_ranges.length > 0) {
      query = query.in('age_range', rules.age_ranges);
    }

    if (rules.gender && rules.gender.length > 0) {
      query = query.in('gender', rules.gender);
    }

    if (rules.interests && rules.interests.length > 0) {
      query = query.overlaps('interests', rules.interests);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audience breakdowns:', error);
      return {};
    }

    const profiles = data || [];

    // Calculate breakdowns
    const breakdown_by_age: Record<string, number> = {};
    const breakdown_by_city: Record<string, number> = {};
    const breakdown_by_gender: Record<string, number> = {};

    profiles.forEach((profile: any) => {
      // Age breakdown
      if (profile.age_range) {
        breakdown_by_age[profile.age_range] = 
          (breakdown_by_age[profile.age_range] || 0) + 1;
      }

      // City breakdown
      if (profile.city_id) {
        breakdown_by_city[profile.city_id] = 
          (breakdown_by_city[profile.city_id] || 0) + 1;
      }

      // Gender breakdown
      if (profile.gender) {
        breakdown_by_gender[profile.gender] = 
          (breakdown_by_gender[profile.gender] || 0) + 1;
      }
    });

    return {
      breakdown_by_age: Object.keys(breakdown_by_age).length > 0 
        ? breakdown_by_age 
        : undefined,
      breakdown_by_city: Object.keys(breakdown_by_city).length > 0 
        ? breakdown_by_city 
        : undefined,
      breakdown_by_gender: Object.keys(breakdown_by_gender).length > 0 
        ? breakdown_by_gender 
        : undefined
    };
  } catch (error) {
    console.error('Error calculating breakdowns:', error);
    return {};
  }
}

/**
 * Determine confidence level based on sample size
 */
function getConfidenceLevel(reach: number): 'low' | 'medium' | 'high' {
  if (reach >= 1000) return 'high';
  if (reach >= 100) return 'medium';
  return 'low';
}

// ============================================================================
// TARGETING VALIDATION
// ============================================================================

/**
 * Validate targeting rules and provide suggestions
 */
export function validateTargeting(rules: TargetingRules): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors = validateTargetingRules(rules);
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check if targeting is too broad
  const hasAnyFilter = 
    (rules.age_ranges && rules.age_ranges.length > 0) ||
    (rules.gender && rules.gender.length > 0) ||
    (rules.income_levels && rules.income_levels.length > 0) ||
    (rules.cities && rules.cities.length > 0) ||
    (rules.interests && rules.interests.length > 0) ||
    rules.drivers_only ||
    rules.min_activity_score !== undefined;

  if (!hasAnyFilter) {
    warnings.push('No targeting filters applied - campaign will target all users');
    suggestions.push('Consider adding demographic or interest filters to improve relevance');
  }

  // Check if targeting is too narrow
  const filterCount = [
    rules.age_ranges?.length,
    rules.gender?.length,
    rules.income_levels?.length,
    rules.interests?.length,
    rules.cities?.length
  ].filter(count => count && count > 0).length;

  if (filterCount > 3) {
    warnings.push('Many filters applied - audience might be very small');
    suggestions.push('Consider relaxing some filters to increase reach');
  }

  // Check driver targeting
  if (rules.drivers_only) {
    suggestions.push('Driver-only campaigns typically have 10% of total reach');
  }

  // Check radius targeting
  if (rules.radius_km && rules.radius_km > 50) {
    warnings.push('Large radius might include users too far from your business');
  }

  // Check exclude filters
  if (rules.exclude_existing_customers && rules.exclude_recent_visitors) {
    warnings.push('Excluding both customers and recent visitors might significantly reduce reach');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Get targeting recommendations based on business profile
 */
export async function getTargetingRecommendations(
  businessId: string
): Promise<Partial<TargetingRules>> {
  try {
    // Fetch business profile with customer demographics
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*, business_customer_profiles(*)')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      throw new TargetingServiceError(
        'Failed to fetch business profile',
        businessError?.code,
        businessError
      );
    }

    const recommendations: Partial<TargetingRules> = {};

    // Get customer profile if it exists
    const customerProfile = business.business_customer_profiles?.[0];

    if (customerProfile) {
      // Recommend based on primary age ranges
      if (customerProfile.primary_age_ranges?.length > 0) {
        recommendations.age_ranges = customerProfile.primary_age_ranges;
      }

      // Recommend based on income levels
      if (customerProfile.income_levels?.length > 0) {
        recommendations.income_levels = customerProfile.income_levels;
      }

      // Recommend based on interest categories
      if (customerProfile.interest_categories?.length > 0) {
        recommendations.interests = customerProfile.interest_categories;
      }
    }

    // Recommend city targeting based on business location
    if (business.city_id) {
      recommendations.cities = [business.city_id];
    }

    return recommendations;
  } catch (error) {
    if (error instanceof TargetingServiceError) throw error;
    throw new TargetingServiceError(
      'Unexpected error getting recommendations',
      'UNKNOWN',
      error
    );
  }
}

// ============================================================================
// TARGETING COMPARISON
// ============================================================================

/**
 * Compare two targeting configurations
 */
export async function compareTargeting(
  rulesA: TargetingRules,
  rulesB: TargetingRules,
  cityId?: string
): Promise<{
  reach_a: number;
  reach_b: number;
  reach_difference: number;
  reach_difference_percent: number;
  overlap: number;
  overlap_percent: number;
}> {
  try {
    // Estimate reach for both
    const [estimateA, estimateB] = await Promise.all([
      estimateAudienceReach({ targeting_rules: rulesA, city_id: cityId }),
      estimateAudienceReach({ targeting_rules: rulesB, city_id: cityId })
    ]);

    const reach_a = estimateA.total_reach;
    const reach_b = estimateB.total_reach;
    const reach_difference = reach_b - reach_a;
    const reach_difference_percent = reach_a > 0 
      ? (reach_difference / reach_a) * 100 
      : 0;

    // Estimate overlap (simplified - would need more complex query for exact overlap)
    const overlap = Math.min(reach_a, reach_b);
    const overlap_percent = reach_a > 0 
      ? (overlap / reach_a) * 100 
      : 0;

    return {
      reach_a,
      reach_b,
      reach_difference,
      reach_difference_percent,
      overlap,
      overlap_percent
    };
  } catch (error) {
    if (error instanceof TargetingServiceError) throw error;
    throw new TargetingServiceError(
      'Unexpected error comparing targeting',
      'UNKNOWN',
      error
    );
  }
}

// ============================================================================
// TARGETING HELPERS
// ============================================================================

/**
 * Check if targeting rules will likely produce good results
 */
export function isTargetingEffective(rules: TargetingRules): {
  isEffective: boolean;
  reason: string;
} {
  // Too broad
  const hasNoFilters = 
    !rules.age_ranges?.length &&
    !rules.gender?.length &&
    !rules.income_levels?.length &&
    !rules.cities?.length &&
    !rules.interests?.length &&
    !rules.drivers_only &&
    !rules.min_activity_score;

  if (hasNoFilters) {
    return {
      isEffective: false,
      reason: 'No targeting filters applied - may result in low relevance'
    };
  }

  // Too narrow
  const hasMultipleRestrictive = 
    (rules.age_ranges?.length === 1) &&
    (rules.gender?.length === 1) &&
    (rules.income_levels?.length === 1) &&
    rules.drivers_only;

  if (hasMultipleRestrictive) {
    return {
      isEffective: false,
      reason: 'Too many restrictive filters - audience might be too small'
    };
  }

  // Good balance
  return {
    isEffective: true,
    reason: 'Targeting appears balanced between reach and relevance'
  };
}

/**
 * Suggest optimizations for targeting rules
 */
export function suggestTargetingOptimizations(
  rules: TargetingRules,
  currentReach: number
): string[] {
  const suggestions: string[] = [];

  // If reach is too low
  if (currentReach < 50) {
    if (rules.age_ranges && rules.age_ranges.length < 3) {
      suggestions.push('Expand age range selection to increase reach');
    }

    if (rules.drivers_only) {
      suggestions.push('Consider targeting all active users, not just Drivers');
    }

    if (rules.radius_km && rules.radius_km < 10) {
      suggestions.push('Increase location radius to reach more users');
    }

    if (rules.exclude_existing_customers) {
      suggestions.push('Include existing customers to increase reach');
    }
  }

  // If reach is very high
  if (currentReach > 10000) {
    if (!rules.interests || rules.interests.length === 0) {
      suggestions.push('Add interest targeting to improve relevance');
    }

    if (!rules.age_ranges || rules.age_ranges.length > 4) {
      suggestions.push('Narrow age range to improve targeting precision');
    }

    if (!rules.drivers_only && rules.min_activity_score === undefined) {
      suggestions.push('Consider targeting more engaged users (Drivers or min activity score)');
    }
  }

  return suggestions;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const targetingService = {
  // Audience estimation
  estimateAudienceReach,
  
  // Validation
  validateTargeting,
  getTargetingRecommendations,
  
  // Comparison
  compareTargeting,
  
  // Helpers
  isTargetingEffective,
  suggestTargetingOptimizations
};

export default targetingService;
