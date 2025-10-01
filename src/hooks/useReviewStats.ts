// =====================================================
// Story 5.2: Binary Review System - useReviewStats Hook
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import reviewService from '../services/reviewService';
import type { ReviewStats, UserReviewActivity } from '../types/review';

interface UseReviewStatsOptions {
  businessId?: string;
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseReviewStatsReturn {
  stats: ReviewStats | null;
  userActivity: UserReviewActivity | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

/**
 * Hook for managing review statistics
 * Can fetch business stats or user activity stats
 */
export function useReviewStats(options: UseReviewStatsOptions = {}): UseReviewStatsReturn {
  const { businessId, userId, autoRefresh = false, refreshInterval = 30000 } = options;

  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [userActivity, setUserActivity] = useState<UserReviewActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load statistics
   */
  const loadStats = useCallback(async () => {
    console.log('📊 Loading review stats:', { businessId, userId });
    setLoading(true);
    setError(null);

    try {
      if (businessId) {
        // Load business review stats
        const businessStats = await reviewService.getReviewStats(businessId);
        setStats(businessStats);
      }

      if (userId !== undefined) {
        // Load user activity stats
        const activity = await reviewService.getUserReviewActivity(userId || undefined);
        setUserActivity(activity);
      }
    } catch (err) {
      console.error('❌ Load stats error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [businessId, userId]);

  /**
   * Set up auto-refresh interval
   */
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    console.log(`🔄 Setting up auto-refresh every ${refreshInterval}ms`);

    const interval = setInterval(() => {
      loadStats();
    }, refreshInterval);

    return () => {
      console.log('🔄 Cleaning up auto-refresh');
      clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, loadStats]);

  /**
   * Load stats on mount and when dependencies change
   */
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    userActivity,
    loading,
    error,
    refreshStats: loadStats,
  };
}

export default useReviewStats;
