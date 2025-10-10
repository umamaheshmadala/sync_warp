/**
 * Services Index
 * Central export for all campaign-related services
 */

// Driver Service
export {
  driverService,
  getDriverProfile,
  getMyDriverProfile,
  listDrivers,
  getTopDrivers,
  calculateDriverScore,
  updateDriverRankings,
  refreshDriverProfile,
  getActiveDriverConfig,
  updateDriverConfig,
  getDriverBadgeForProfile,
  isUserDriver,
  getDriverCount,
  getDriverStats,
  DriverServiceError
} from './driverService';

// Targeting Service
export {
  targetingService,
  estimateAudienceReach,
  validateTargeting,
  getTargetingRecommendations,
  compareTargeting,
  isTargetingEffective,
  suggestTargetingOptimizations,
  TargetingServiceError
} from './targetingService';

// Re-export default services
export { default as driverService } from './driverService';
export { default as targetingService } from './targetingService';
