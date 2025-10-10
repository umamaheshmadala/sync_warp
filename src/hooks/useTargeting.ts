/**
 * useTargeting Hook
 * Phase 3: React Hooks
 * 
 * Custom hook for campaign targeting with reach estimation, validation, and recommendations
 * Provides real-time updates and intelligent suggestions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { targetingService, TargetingServiceError } from '../services/targetingService';
import type {
  TargetingRules,
  AudienceEstimate,
  EstimateAudienceRequest
} from '../types/campaigns';

// ============================================================================
// HOOK: useAudienceEstimate
// ============================================================================

/**
 * Estimate campaign reach with real-time updates
 */
export function useAudienceEstimate(
  targetingRules: TargetingRules,
  cityId?: string,
  debounceMs: number = 500
) {
  const [estimate, setEstimate] = useState<AudienceEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await targetingService.estimateAudienceReach({
        targeting_rules: targetingRules,
        city_id: cityId
      });
      setEstimate(data);
    } catch (err) {
      const errorMessage = err instanceof TargetingServiceError 
        ? err.message 
        : 'Failed to estimate audience reach';
      setError(errorMessage);
      console.error('Error estimating audience:', err);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(targetingRules), cityId]);

  // Debounce the fetch to avoid too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEstimate();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [fetchEstimate, debounceMs]);

  return {
    estimate,
    isLoading,
    error,
    refresh: fetchEstimate
  };
}

// ============================================================================
// HOOK: useTargetingValidation
// ============================================================================

/**
 * Validate targeting rules with errors, warnings, and suggestions
 */
export function useTargetingValidation(targetingRules: TargetingRules) {
  const validation = useMemo(() => {
    return targetingService.validateTargeting(targetingRules);
  }, [JSON.stringify(targetingRules)]);

  return validation;
}

// ============================================================================
// HOOK: useTargetingRecommendations
// ============================================================================

/**
 * Get AI-powered targeting recommendations for a business
 */
export function useTargetingRecommendations(businessId?: string) {
  const [recommendations, setRecommendations] = useState<Partial<TargetingRules> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await targetingService.getTargetingRecommendations(businessId);
      setRecommendations(data);
    } catch (err) {
      const errorMessage = err instanceof TargetingServiceError 
        ? err.message 
        : 'Failed to fetch targeting recommendations';
      setError(errorMessage);
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    refresh: fetchRecommendations
  };
}

// ============================================================================
// HOOK: useTargetingComparison
// ============================================================================

/**
 * Compare two targeting configurations
 */
export function useTargetingComparison(
  rulesA?: TargetingRules,
  rulesB?: TargetingRules,
  cityId?: string
) {
  const [comparison, setComparison] = useState<{
    reach_a: number;
    reach_b: number;
    reach_difference: number;
    reach_difference_percent: number;
    overlap: number;
    overlap_percent: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    if (!rulesA || !rulesB) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await targetingService.compareTargeting(rulesA, rulesB, cityId);
      setComparison(data);
    } catch (err) {
      const errorMessage = err instanceof TargetingServiceError 
        ? err.message 
        : 'Failed to compare targeting';
      setError(errorMessage);
      console.error('Error comparing targeting:', err);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(rulesA), JSON.stringify(rulesB), cityId]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  return {
    comparison,
    isLoading,
    error,
    refresh: fetchComparison
  };
}

// ============================================================================
// HOOK: useTargetingEffectiveness
// ============================================================================

/**
 * Check if targeting rules will likely produce good results
 */
export function useTargetingEffectiveness(targetingRules: TargetingRules) {
  const effectiveness = useMemo(() => {
    return targetingService.isTargetingEffective(targetingRules);
  }, [JSON.stringify(targetingRules)]);

  return effectiveness;
}

// ============================================================================
// HOOK: useTargetingOptimizations
// ============================================================================

/**
 * Get dynamic optimization suggestions based on current reach
 */
export function useTargetingOptimizations(
  targetingRules: TargetingRules,
  currentReach: number
) {
  const optimizations = useMemo(() => {
    return targetingService.suggestTargetingOptimizations(targetingRules, currentReach);
  }, [JSON.stringify(targetingRules), currentReach]);

  return optimizations;
}

// ============================================================================
// HOOK: useSmartTargeting (Combined Hook)
// ============================================================================

/**
 * Combined hook providing all targeting features
 * This is the recommended hook for campaign builders
 */
export function useSmartTargeting(
  targetingRules: TargetingRules,
  cityId?: string,
  businessId?: string
) {
  // Get reach estimate
  const {
    estimate,
    isLoading: isEstimating,
    error: estimateError,
    refresh: refreshEstimate
  } = useAudienceEstimate(targetingRules, cityId);

  // Get validation
  const validation = useTargetingValidation(targetingRules);

  // Get effectiveness check
  const effectiveness = useTargetingEffectiveness(targetingRules);

  // Get optimization suggestions
  const optimizations = useTargetingOptimizations(
    targetingRules,
    estimate?.total_reach || 0
  );

  // Get recommendations (for initial setup)
  const {
    recommendations,
    isLoading: isLoadingRecommendations,
    error: recommendationsError
  } = useTargetingRecommendations(businessId);

  // Compute overall status
  const status = useMemo(() => {
    if (!validation.isValid) return 'invalid';
    if (!effectiveness.isEffective) return 'ineffective';
    if (validation.warnings.length > 0) return 'warning';
    return 'good';
  }, [validation, effectiveness]);

  // Compute all suggestions
  const allSuggestions = useMemo(() => {
    return [
      ...validation.suggestions,
      ...optimizations
    ];
  }, [validation.suggestions, optimizations]);

  return {
    // Estimate
    estimate,
    isEstimating,
    estimateError,
    refreshEstimate,

    // Validation
    validation,
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,

    // Effectiveness
    effectiveness,
    isEffective: effectiveness.isEffective,

    // Recommendations
    recommendations,
    isLoadingRecommendations,
    recommendationsError,

    // Optimizations
    optimizations,
    allSuggestions,

    // Overall status
    status
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const useTargeting = {
  useAudienceEstimate,
  useTargetingValidation,
  useTargetingRecommendations,
  useTargetingComparison,
  useTargetingEffectiveness,
  useTargetingOptimizations,
  useSmartTargeting
};

export default useTargeting;
