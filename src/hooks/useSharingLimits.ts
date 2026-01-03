// =====================================================
// Story 5.5: Enhanced Sharing Limits - React Hook
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import sharingLimitsService from '../services/sharingLimitsService';
import type {
  SharingStatsToday,
  CanShareResult,
  SharingLimits,
} from '../types/sharingLimits';

interface UseSharingLimitsOptions {
  userId?: string;
  autoLoad?: boolean;
  refreshInterval?: number; // Auto-refresh interval in milliseconds
}

interface UseSharingLimitsReturn {
  stats: SharingStatsToday | null;
  limits: SharingLimits | null;
  loading: boolean;
  error: string | null;
  isDriver: boolean;
  
  // Actions
  refreshStats: () => Promise<void>;
  checkCanShare: (recipientId: string) => Promise<CanShareResult>;
  shareWithValidation: (recipientId: string, couponId: string, senderCollectionId: string) => Promise<{ 
    success: boolean; 
    message: string; 
    message_id?: string; 
    conversation_id?: string; 
    error?: string;
    canShareResult?: CanShareResult;
  }>;
  
  // Computed values
  canShareMore: boolean;
  remainingTotal: number;
  percentageUsed: number;
}

/**
 * Hook for managing sharing limits and statistics
 */
export function useSharingLimits(options: UseSharingLimitsOptions = {}): UseSharingLimitsReturn {
  const { userId, autoLoad = true, refreshInterval } = options;

  const [stats, setStats] = useState<SharingStatsToday | null>(null);
  const [limits, setLimits] = useState<SharingLimits | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [isDriver, setIsDriver] = useState(false);

  /**
   * Load sharing statistics and limits
   */
  const loadStats = useCallback(async () => {
    console.log('📊 Loading sharing stats and limits');
    setLoading(true);
    setError(null);

    try {
      // Get current user ID if not provided
      let targetUserId = userId;
      if (!targetUserId) {
        targetUserId = await sharingLimitsService.getCurrentUserId();
        if (!targetUserId) {
          throw new Error('User not authenticated');
        }
      }

      // Check if user is a Driver
      const driverStatus = await sharingLimitsService.isUserDriver(targetUserId);
      setIsDriver(driverStatus);

      // Get sharing limits
      const userLimits = await sharingLimitsService.getSharingLimits(targetUserId, driverStatus);
      setLimits(userLimits);

      // Get sharing stats for today
      const todayStats = await sharingLimitsService.getSharingStatsToday(targetUserId);
      setStats(todayStats);

      console.log('✅ Sharing stats loaded successfully');
    } catch (err) {
      console.error('❌ Load sharing stats error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sharing stats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Check if user can share to a specific friend
   */
  const checkCanShare = useCallback(async (recipientId: string): Promise<CanShareResult> => {
    console.log('🔍 Checking if can share to recipient:', recipientId);

    try {
      // Get current user ID
      let senderId = userId;
      if (!senderId) {
        senderId = await sharingLimitsService.getCurrentUserId();
        if (!senderId) {
          throw new Error('User not authenticated');
        }
      }

      // Check with current Driver status
      const canShareResult = await sharingLimitsService.canShareToFriend(
        senderId,
        recipientId,
        isDriver
      );

      console.log('✅ Can share check result:', canShareResult);
      return canShareResult;
    } catch (err) {
      console.error('❌ Check can share error:', err);
      throw err;
    }
  }, [userId, isDriver]);

  /**
   * Share with validation and logging
   */
  const shareWithValidation = useCallback(async (
    recipientId: string,
    couponId: string,
    senderCollectionId: string
  ): Promise<{ 
    success: boolean; 
    message: string; 
    message_id?: string; 
    conversation_id?: string; 
    error?: string;
    canShareResult?: CanShareResult;
  }> => {
    console.log('🎁 Sharing with validation:', { recipientId, couponId, senderCollectionId });

    try {
      const result = await sharingLimitsService.shareWithLimitValidation(recipientId, couponId, senderCollectionId);
      
      // Refresh stats after successful share
      if (result.success) {
        await loadStats();
      }

      return result;
    } catch (err) {
      console.error('❌ Share with validation error:', err);
      throw err;
    }
  }, [loadStats]);

  /**
   * Refresh stats manually
   */
  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  /**
   * Set up auto-refresh if interval is provided
   */
  useEffect(() => {
    if (!refreshInterval) return;

    console.log(`🔄 Setting up auto-refresh every ${refreshInterval}ms`);

    const interval = setInterval(() => {
      loadStats();
    }, refreshInterval);

    return () => {
      console.log('🔄 Cleaning up auto-refresh');
      clearInterval(interval);
    };
  }, [refreshInterval, loadStats]);

  /**
   * Load stats on mount if autoLoad is true
   */
  useEffect(() => {
    if (autoLoad) {
      loadStats();
    }
  }, [autoLoad, loadStats]);

  // Computed values
  const canShareMore = stats ? stats.remaining_today > 0 : false;
  const remainingTotal = stats?.remaining_today || 0;
  const percentageUsed = stats && stats.total_daily_limit > 0
    ? Math.round((stats.total_shared_today / stats.total_daily_limit) * 100)
    : 0;

  return {
    stats,
    limits,
    loading,
    error,
    isDriver,
    refreshStats,
    checkCanShare,
    shareWithValidation,
    canShareMore,
    remainingTotal,
    percentageUsed,
  };
}

export default useSharingLimits;
