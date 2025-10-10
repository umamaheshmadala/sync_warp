/**
 * Driver Service
 * Phase 2: Driver Algorithm & Scoring
 * 
 * Manages driver profiles, activity scoring, rankings, and Driver status
 * Wraps database functions with error handling and caching
 */

import { supabase } from '../lib/supabase';
import type {
  DriverProfile,
  DriverAlgorithmConfig,
  DriverBadge,
  DriverListRequest,
  DriverListResponse
} from '../types/campaigns';
import { getDriverBadge } from '../types/campaigns';

// ============================================================================
// ERROR TYPES
// ============================================================================

export class DriverServiceError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'DriverServiceError';
  }
}

// ============================================================================
// DRIVER PROFILE OPERATIONS
// ============================================================================

/**
 * Get driver profile for a specific user in a city
 */
export async function getDriverProfile(
  userId: string,
  cityId: string
): Promise<DriverProfile | null> {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('city_id', cityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - user doesn't have a driver profile yet
        return null;
      }
      throw new DriverServiceError(
        'Failed to fetch driver profile',
        error.code,
        error
      );
    }

    return data as DriverProfile;
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error fetching driver profile',
      'UNKNOWN',
      error
    );
  }
}

/**
 * Get driver profile for current authenticated user
 */
export async function getMyDriverProfile(
  cityId: string
): Promise<DriverProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new DriverServiceError('User not authenticated', 'NOT_AUTHENTICATED');
    }

    return await getDriverProfile(user.id, cityId);
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Failed to fetch current user driver profile',
      'UNKNOWN',
      error
    );
  }
}

/**
 * List drivers with optional filters
 */
export async function listDrivers(
  request: DriverListRequest
): Promise<DriverListResponse> {
  try {
    const {
      city_id,
      min_percentile,
      limit = 50,
      offset = 0
    } = request;

    let query = supabase
      .from('driver_profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (city_id) {
      query = query.eq('city_id', city_id);
    }

    if (min_percentile !== undefined) {
      query = query.gte('percentile', min_percentile);
    }

    // Only show drivers
    query = query.eq('is_driver', true);

    // Order by score (highest first)
    query = query.order('total_activity_score', { ascending: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new DriverServiceError(
        'Failed to list drivers',
        error.code,
        error
      );
    }

    const total_count = count || 0;
    const page = Math.floor(offset / limit) + 1;

    return {
      drivers: (data as DriverProfile[]) || [],
      total_count,
      page,
      per_page: limit,
      has_more: total_count > offset + limit
    };
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error listing drivers',
      'UNKNOWN',
      error
    );
  }
}

/**
 * Get top drivers in a city
 */
export async function getTopDrivers(
  cityId: string,
  limit: number = 10
): Promise<DriverProfile[]> {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('city_id', cityId)
      .eq('is_driver', true)
      .order('city_rank', { ascending: true })
      .limit(limit);

    if (error) {
      throw new DriverServiceError(
        'Failed to fetch top drivers',
        error.code,
        error
      );
    }

    return (data as DriverProfile[]) || [];
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error fetching top drivers',
      'UNKNOWN',
      error
    );
  }
}

// ============================================================================
// DRIVER SCORING & RANKING
// ============================================================================

/**
 * Calculate driver score for a user
 * This calls the database function calculate_driver_score()
 */
export async function calculateDriverScore(
  userId: string,
  cityId: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_driver_score', {
      p_user_id: userId,
      p_city_id: cityId
    });

    if (error) {
      throw new DriverServiceError(
        'Failed to calculate driver score',
        error.code,
        error
      );
    }

    return data as number || 0;
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error calculating driver score',
      'UNKNOWN',
      error
    );
  }
}

/**
 * Update driver rankings for all cities or specific city
 * This calls the database function update_driver_rankings()
 */
export async function updateDriverRankings(
  cityId?: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_driver_rankings', {
      p_city_id: cityId || null
    });

    if (error) {
      throw new DriverServiceError(
        'Failed to update driver rankings',
        error.code,
        error
      );
    }
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error updating driver rankings',
      'UNKNOWN',
      error
    );
  }
}

/**
 * Refresh driver profile (calculate score and update ranking)
 * This is useful for on-demand updates when a user completes an activity
 */
export async function refreshDriverProfile(
  userId: string,
  cityId: string
): Promise<DriverProfile> {
  try {
    // Calculate new score
    const score = await calculateDriverScore(userId, cityId);

    // Upsert driver profile
    const { data, error } = await supabase
      .from('driver_profiles')
      .upsert({
        user_id: userId,
        city_id: cityId,
        total_activity_score: score,
        last_calculated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,city_id'
      })
      .select()
      .single();

    if (error) {
      throw new DriverServiceError(
        'Failed to refresh driver profile',
        error.code,
        error
      );
    }

    // Update rankings for the city (in background)
    updateDriverRankings(cityId).catch(err => {
      console.error('Failed to update rankings after refresh:', err);
    });

    return data as DriverProfile;
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error refreshing driver profile',
      'UNKNOWN',
      error
    );
  }
}

// ============================================================================
// DRIVER ALGORITHM CONFIG
// ============================================================================

/**
 * Get active driver algorithm configuration
 */
export async function getActiveDriverConfig(): Promise<DriverAlgorithmConfig | null> {
  try {
    const { data, error } = await supabase
      .from('driver_algorithm_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active config found
        return null;
      }
      throw new DriverServiceError(
        'Failed to fetch driver algorithm config',
        error.code,
        error
      );
    }

    return data as DriverAlgorithmConfig;
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error fetching driver config',
      'UNKNOWN',
      error
    );
  }
}

/**
 * Update driver algorithm configuration (admin only)
 * This will deactivate the old config and create a new one
 */
export async function updateDriverConfig(
  config: Omit<DriverAlgorithmConfig, 'id' | 'created_at' | 'created_by'>
): Promise<DriverAlgorithmConfig> {
  try {
    // Validate weights sum to 100
    const weightSum = 
      config.coupons_collected_weight +
      config.coupons_shared_weight +
      config.coupons_redeemed_weight +
      config.checkins_weight +
      config.reviews_weight +
      config.social_interactions_weight;

    if (Math.abs(weightSum - 100) > 0.01) {
      throw new DriverServiceError(
        `Weights must sum to 100 (current sum: ${weightSum})`,
        'INVALID_WEIGHTS'
      );
    }

    // Deactivate old config
    await supabase
      .from('driver_algorithm_config')
      .update({ is_active: false })
      .eq('is_active', true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Insert new config
    const { data, error } = await supabase
      .from('driver_algorithm_config')
      .insert({
        ...config,
        created_by: user?.id,
        is_active: true,
        effective_from: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new DriverServiceError(
        'Failed to update driver config',
        error.code,
        error
      );
    }

    // Trigger ranking update for all cities (in background)
    updateDriverRankings().catch(err => {
      console.error('Failed to update rankings after config change:', err);
    });

    return data as DriverAlgorithmConfig;
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error updating driver config',
      'UNKNOWN',
      error
    );
  }
}

// ============================================================================
// DRIVER BADGE HELPERS
// ============================================================================

/**
 * Get driver badge for a profile
 */
export function getDriverBadgeForProfile(profile: DriverProfile): DriverBadge {
  return getDriverBadge(profile);
}

/**
 * Check if user is a driver
 */
export async function isUserDriver(
  userId: string,
  cityId: string
): Promise<boolean> {
  try {
    const profile = await getDriverProfile(userId, cityId);
    return profile?.is_driver || false;
  } catch (error) {
    console.error('Error checking driver status:', error);
    return false;
  }
}

/**
 * Get driver count for a city
 */
export async function getDriverCount(cityId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('driver_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', cityId)
      .eq('is_driver', true);

    if (error) {
      throw new DriverServiceError(
        'Failed to get driver count',
        error.code,
        error
      );
    }

    return count || 0;
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error getting driver count',
      'UNKNOWN',
      error
    );
  }
}

// ============================================================================
// DRIVER STATISTICS
// ============================================================================

/**
 * Get driver statistics for a city
 */
export async function getDriverStats(cityId: string) {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('total_activity_score, is_driver')
      .eq('city_id', cityId);

    if (error) {
      throw new DriverServiceError(
        'Failed to get driver statistics',
        error.code,
        error
      );
    }

    const profiles = data as DriverProfile[];
    const driverCount = profiles.filter(p => p.is_driver).length;
    const totalUsers = profiles.length;
    const avgScore = profiles.reduce((sum, p) => sum + p.total_activity_score, 0) / totalUsers;
    const driverAvgScore = profiles
      .filter(p => p.is_driver)
      .reduce((sum, p) => sum + p.total_activity_score, 0) / driverCount;

    return {
      total_users: totalUsers,
      driver_count: driverCount,
      driver_percentage: (driverCount / totalUsers) * 100,
      avg_score: avgScore,
      driver_avg_score: driverAvgScore,
      min_driver_score: Math.min(...profiles.filter(p => p.is_driver).map(p => p.total_activity_score)),
      max_score: Math.max(...profiles.map(p => p.total_activity_score))
    };
  } catch (error) {
    if (error instanceof DriverServiceError) throw error;
    throw new DriverServiceError(
      'Unexpected error getting driver statistics',
      'UNKNOWN',
      error
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const driverService = {
  // Profile operations
  getDriverProfile,
  getMyDriverProfile,
  listDrivers,
  getTopDrivers,
  
  // Scoring & ranking
  calculateDriverScore,
  updateDriverRankings,
  refreshDriverProfile,
  
  // Config
  getActiveDriverConfig,
  updateDriverConfig,
  
  // Helpers
  getDriverBadgeForProfile,
  isUserDriver,
  getDriverCount,
  getDriverStats
};

export default driverService;
