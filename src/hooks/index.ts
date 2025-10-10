/**
 * Hooks Index
 * Phase 3: React Hooks
 * 
 * Central export file for all campaign-related hooks
 * Provides a single import point for driver, targeting, and campaign hooks
 */

// ============================================================================
// DRIVER HOOKS
// ============================================================================

export {
  // Individual hooks
  useDriverProfile,
  useMyDriverProfile,
  useDriverList,
  useTopDrivers,
  useDriverStats,
  useDriverConfig,
  useIsDriver,
  useDriverCount,
  
  // Combined export
  useDrivers,
  
  // Error class
  DriverServiceError,
  
  // Types
  type DriverListOptions,
  type DriverFilters
} from './useDrivers';

// ============================================================================
// TARGETING HOOKS
// ============================================================================

export {
  // Individual hooks
  useAudienceEstimate,
  useTargetingValidation,
  useTargetingRecommendations,
  useTargetingComparison,
  useTargetingEffectiveness,
  useTargetingOptimizations,
  
  // Combined hook
  useSmartTargeting,
  
  // Combined export
  useTargeting
} from './useTargeting';

// ============================================================================
// CAMPAIGN HOOKS
// ============================================================================

export {
  // Individual hooks
  useCampaign,
  useCampaignList,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useCampaignAnalytics,
  useCampaignStatus,
  
  // Combined hook
  useCampaignManager,
  
  // Combined export
  useCampaigns,
  
  // Error class
  CampaignServiceError
} from './useCampaigns';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

/**
 * For convenience, we also provide the default exports
 * This allows both import styles:
 * 
 * import { useDriverProfile } from '@/hooks';
 * import useDrivers from '@/hooks/useDrivers';
 */

export { default as useDriversDefault } from './useDrivers';
export { default as useTargetingDefault } from './useTargeting';
export { default as useCampaignsDefault } from './useCampaigns';
