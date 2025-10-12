/**
 * Mock Targeting Service for Demo
 * Provides simulated responses without requiring database
 */

import type { TargetingRules, AudienceEstimate } from '../types/campaigns';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock validation function
 */
export function validateTargeting(rules: TargetingRules): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check if targeting is too broad - only warn if truly empty
  const hasAgeFilter = rules.age_ranges && rules.age_ranges.length > 0;
  const hasGenderFilter = rules.gender && rules.gender.length > 0;
  const hasIncomeFilter = rules.income_levels && rules.income_levels.length > 0;
  const hasCityFilter = rules.cities && rules.cities.length > 0;
  const hasInterestFilter = rules.interests && rules.interests.length > 0;
  const hasDriverFilter = rules.drivers_only === true;
  const hasActivityFilter = rules.min_activity_score !== undefined && rules.min_activity_score > 0;
  
  const hasAnyFilter = hasAgeFilter || hasGenderFilter || hasIncomeFilter || 
                       hasCityFilter || hasInterestFilter || hasDriverFilter || 
                       hasActivityFilter;

  // Only show warning if there are literally no filters at all
  if (!hasAnyFilter) {
    warnings.push('No targeting filters applied - campaign will target all users');
    suggestions.push('Consider adding demographic or interest filters to improve relevance');
  }

  // Check if targeting has many age ranges (broad)
  if (rules.age_ranges && rules.age_ranges.length > 4) {
    warnings.push('Many age ranges selected - targeting is quite broad');
    suggestions.push('Consider focusing on 2-3 key age ranges for better results');
  }

  // Check if targeting is too narrow
  const filterCount = [
    rules.age_ranges?.length,
    rules.gender?.length,
    rules.income_levels?.length,
    rules.interests?.length,
    rules.cities?.length
  ].filter(count => count && count > 0).length;

  if (filterCount > 3 && rules.drivers_only && rules.min_activity_score && rules.min_activity_score > 70) {
    warnings.push('Many filters applied with high activity score - audience might be very small');
    suggestions.push('Consider relaxing some filters to increase reach');
  }

  // Check driver targeting
  if (rules.drivers_only) {
    suggestions.push('Driver-only campaigns typically have 10% of total reach');
  }

  // Check activity score
  if (rules.min_activity_score && rules.min_activity_score > 80) {
    suggestions.push('High activity score filters out many users - consider lowering for broader reach');
  }

  // Premium targeting - good configuration
  if (rules.income_levels?.includes('high') && rules.min_activity_score && rules.min_activity_score >= 70) {
    suggestions.push('Premium targeting detected - expect higher engagement rates');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Mock audience estimation
 */
export async function estimateAudienceReach(
  request: { targeting_rules: TargetingRules; city_id?: string }
): Promise<AudienceEstimate> {
  // Simulate API delay
  await delay(300 + Math.random() * 200);

  const { targeting_rules } = request;
  
  // Calculate mock reach based on filters
  let baseReach = 10000; // Base pool of users
  
  // Reduce reach based on filters
  if (targeting_rules.drivers_only) {
    baseReach = Math.floor(baseReach * 0.15); // Drivers are 15% of users
  }
  
  if (targeting_rules.age_ranges) {
    const ageRatio = targeting_rules.age_ranges.length / 6; // 6 possible age ranges
    baseReach = Math.floor(baseReach * (0.3 + ageRatio * 0.7));
  }
  
  if (targeting_rules.income_levels) {
    const incomeRatio = targeting_rules.income_levels.length / 4; // 4 income levels
    baseReach = Math.floor(baseReach * (0.4 + incomeRatio * 0.6));
  }
  
  if (targeting_rules.min_activity_score) {
    const activityReduction = targeting_rules.min_activity_score / 100;
    baseReach = Math.floor(baseReach * (1 - activityReduction * 0.5));
  }
  
  if (targeting_rules.cities && targeting_rules.cities.length > 0) {
    baseReach = Math.floor(baseReach * 0.6); // City filtering
  }
  
  if (targeting_rules.interests && targeting_rules.interests.length > 0) {
    baseReach = Math.floor(baseReach * 0.7); // Interest filtering
  }
  
  // Generate demographic breakdowns
  const breakdown_by_age: Record<string, number> = {};
  if (targeting_rules.age_ranges && targeting_rules.age_ranges.length > 0) {
    targeting_rules.age_ranges.forEach((range, idx) => {
      breakdown_by_age[range] = Math.floor(baseReach * (0.2 + idx * 0.1));
    });
  }
  
  const breakdown_by_city: Record<string, number> = {};
  if (targeting_rules.cities && targeting_rules.cities.length > 0) {
    targeting_rules.cities.forEach((city, idx) => {
      breakdown_by_city[city] = Math.floor(baseReach * (0.4 + idx * 0.1));
    });
  }
  
  // Determine confidence based on reach size
  let confidence_level: 'low' | 'medium' | 'high';
  if (baseReach >= 1000) {
    confidence_level = 'high';
  } else if (baseReach >= 100) {
    confidence_level = 'medium';
  } else {
    confidence_level = 'low';
  }
  
  return {
    total_reach: baseReach,
    drivers_count: targeting_rules.drivers_only ? baseReach : Math.floor(baseReach * 0.15),
    breakdown_by_age: Object.keys(breakdown_by_age).length > 0 ? breakdown_by_age : undefined,
    breakdown_by_city: Object.keys(breakdown_by_city).length > 0 ? breakdown_by_city : undefined,
    confidence_level
  };
}

/**
 * Mock recommendations - returns targeting suggestions based on business profile
 * In a real implementation, this would analyze historical campaign performance
 */
export async function getTargetingRecommendations(
  _businessId: string,
  currentTargeting?: TargetingRules
): Promise<Partial<TargetingRules>> {
  // Simulate API delay
  await delay(400 + Math.random() * 300);
  
  // Generate contextual recommendations based on current targeting
  // If targeting is very broad, recommend more focused
  if (currentTargeting) {
    const hasAge = currentTargeting.age_ranges && currentTargeting.age_ranges.length > 0;
    const hasIncome = currentTargeting.income_levels && currentTargeting.income_levels.length > 0;
    const hasActivity = currentTargeting.min_activity_score !== undefined;
    
    // If no targeting at all, suggest balanced starting point
    if (!hasAge && !hasIncome && !hasActivity) {
      return {
        age_ranges: ['25-34', '35-44'],
        income_levels: ['middle', 'upper_middle'],
        min_activity_score: 50,
        drivers_only: true,
      };
    }
    
    // If targeting exists, suggest refinements
    if (hasAge && !hasIncome) {
      return {
        ...currentTargeting,
        income_levels: ['middle', 'upper_middle'],
      };
    }
    
    if (hasIncome && !hasActivity) {
      return {
        ...currentTargeting,
        min_activity_score: 60,
      };
    }
    
    // If well-targeted, suggest slight optimization
    return {
      ...currentTargeting,
      min_activity_score: Math.max(40, (currentTargeting.min_activity_score || 50) - 10),
    };
  }
  
  // Default balanced recommendation
  return {
    age_ranges: ['25-34', '35-44'],
    income_levels: ['middle', 'upper_middle'],
    min_activity_score: 50,
    drivers_only: true,
  };
}

export const mockTargetingService = {
  validateTargeting,
  estimateAudienceReach,
  getTargetingRecommendations,
};

export default mockTargetingService;
