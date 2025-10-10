/**
 * useDrivers Hook
 * Phase 3: React Hooks
 * 
 * Custom hook for managing driver profiles, scoring, rankings, and statistics
 * Provides caching, error handling, and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { driverService, DriverServiceError } from '../services/driverService';
import type {
  DriverProfile,
  DriverAlgorithmConfig,
  DriverBadge,
  DriverListRequest,
  DriverListResponse
} from '../types/campaigns';
import { useAuthStore } from '../store/authStore';

// ============================================================================
// HOOK: useDriverProfile
// ============================================================================

/**
 * Get driver profile for a specific user
 */
export function useDriverProfile(userId?: string, cityId?: string) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId || !cityId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await driverService.getDriverProfile(userId, cityId);
      setProfile(data);
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to fetch driver profile';
      setError(errorMessage);
      console.error('Error fetching driver profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, cityId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refresh = useCallback(async () => {
    if (!userId || !cityId) return;
    
    try {
      setError(null);
      const refreshed = await driverService.refreshDriverProfile(userId, cityId);
      setProfile(refreshed);
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to refresh driver profile';
      setError(errorMessage);
      console.error('Error refreshing profile:', err);
    }
  }, [userId, cityId]);

  return {
    profile,
    isLoading,
    error,
    refresh,
    badge: profile ? driverService.getDriverBadgeForProfile(profile) : null
  };
}

// ============================================================================
// HOOK: useMyDriverProfile
// ============================================================================

/**
 * Get driver profile for the current authenticated user
 */
export function useMyDriverProfile(cityId?: string) {
  const { profile: userProfile } = useAuthStore();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = userProfile?.id;

  const fetchProfile = useCallback(async () => {
    if (!cityId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await driverService.getMyDriverProfile(cityId);
      setProfile(data);
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to fetch your driver profile';
      setError(errorMessage);
      console.error('Error fetching my driver profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refresh = useCallback(async () => {
    if (!userId || !cityId) return;
    
    try {
      setError(null);
      const refreshed = await driverService.refreshDriverProfile(userId, cityId);
      setProfile(refreshed);
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to refresh your driver profile';
      setError(errorMessage);
      console.error('Error refreshing my profile:', err);
    }
  }, [userId, cityId]);

  return {
    profile,
    isLoading,
    error,
    refresh,
    isDriver: profile?.is_driver || false,
    badge: profile ? driverService.getDriverBadgeForProfile(profile) : null
  };
}

// ============================================================================
// HOOK: useDriverList
// ============================================================================

/**
 * Get paginated list of drivers
 */
export function useDriverList(request: DriverListRequest) {
  const [data, setData] = useState<DriverListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await driverService.listDrivers(request);
      setData(response);
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to fetch drivers';
      setError(errorMessage);
      console.error('Error fetching drivers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(request)]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const loadMore = useCallback(async () => {
    if (!data || !data.has_more) return;

    try {
      const nextRequest = {
        ...request,
        offset: (data.page * data.per_page)
      };
      const response = await driverService.listDrivers(nextRequest);
      
      setData(prev => prev ? {
        ...response,
        drivers: [...prev.drivers, ...response.drivers]
      } : response);
    } catch (err) {
      console.error('Error loading more drivers:', err);
    }
  }, [data, request]);

  return {
    drivers: data?.drivers || [],
    totalCount: data?.total_count || 0,
    page: data?.page || 1,
    perPage: data?.per_page || 50,
    hasMore: data?.has_more || false,
    isLoading,
    error,
    refresh: fetchDrivers,
    loadMore
  };
}

// ============================================================================
// HOOK: useTopDrivers
// ============================================================================

/**
 * Get top drivers in a city
 */
export function useTopDrivers(cityId?: string, limit: number = 10) {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopDrivers = useCallback(async () => {
    if (!cityId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await driverService.getTopDrivers(cityId, limit);
      setDrivers(data);
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to fetch top drivers';
      setError(errorMessage);
      console.error('Error fetching top drivers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [cityId, limit]);

  useEffect(() => {
    fetchTopDrivers();
  }, [fetchTopDrivers]);

  return {
    drivers,
    isLoading,
    error,
    refresh: fetchTopDrivers
  };
}

// ============================================================================
// HOOK: useDriverStats
// ============================================================================

/**
 * Get driver statistics for a city
 */
export function useDriverStats(cityId?: string) {
  const [stats, setStats] = useState<{
    total_users: number;
    driver_count: number;
    driver_percentage: number;
    avg_score: number;
    driver_avg_score: number;
    min_driver_score: number;
    max_score: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!cityId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await driverService.getDriverStats(cityId);
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to fetch driver statistics';
      setError(errorMessage);
      console.error('Error fetching driver stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats
  };
}

// ============================================================================
// HOOK: useDriverConfig
// ============================================================================

/**
 * Get and manage driver algorithm configuration (admin only)
 */
export function useDriverConfig() {
  const [config, setConfig] = useState<DriverAlgorithmConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await driverService.getActiveDriverConfig();
      setConfig(data);
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to fetch driver configuration';
      setError(errorMessage);
      console.error('Error fetching driver config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (
    newConfig: Omit<DriverAlgorithmConfig, 'id' | 'created_at' | 'created_by'>
  ) => {
    try {
      setIsSaving(true);
      setError(null);
      const updated = await driverService.updateDriverConfig(newConfig);
      setConfig(updated);
      return { success: true, data: updated };
    } catch (err) {
      const errorMessage = err instanceof DriverServiceError 
        ? err.message 
        : 'Failed to update driver configuration';
      setError(errorMessage);
      console.error('Error updating driver config:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    config,
    isLoading,
    isSaving,
    error,
    updateConfig,
    refresh: fetchConfig
  };
}

// ============================================================================
// HOOK: useIsDriver
// ============================================================================

/**
 * Check if a user is a driver (lightweight)
 */
export function useIsDriver(userId?: string, cityId?: string) {
  const [isDriver, setIsDriver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !cityId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    driverService.isUserDriver(userId, cityId).then(result => {
      if (isMounted) {
        setIsDriver(result);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId, cityId]);

  return { isDriver, isLoading };
}

// ============================================================================
// HOOK: useDriverCount
// ============================================================================

/**
 * Get driver count for a city
 */
export function useDriverCount(cityId?: string) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!cityId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    driverService.getDriverCount(cityId).then(result => {
      if (isMounted) {
        setCount(result);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [cityId]);

  return { count, isLoading };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const useDrivers = {
  useDriverProfile,
  useMyDriverProfile,
  useDriverList,
  useTopDrivers,
  useDriverStats,
  useDriverConfig,
  useIsDriver,
  useDriverCount
};

export default useDrivers;
