/**
 * useRateLimit Hook
 * 
 * React hook for integrating rate limiting into components.
 * Provides real-time rate limit status and enforcement.
 * 
 * @module useRateLimit
 */

import { useState, useEffect, useCallback } from 'react';
import { rateLimitService, RateLimitResult, RateLimitError } from '../services/rateLimitService';
import { useAuthStore } from '../store/authStore';

interface UseRateLimitOptions {
  endpoint: string;
  autoCheck?: boolean; // Automatically check rate limit on mount
  pollInterval?: number; // Poll for rate limit status (in ms)
}

interface UseRateLimitReturn {
  rateLimitInfo: RateLimitResult | null;
  isLoading: boolean;
  error: Error | null;
  checkRateLimit: () => Promise<RateLimitResult>;
  enforceRateLimit: () => Promise<void>;
  isRateLimited: boolean;
  remainingRequests: number | null;
  resetAt: Date | null;
  retryAfter: number | null;
}

/**
 * Hook for managing rate limiting
 * 
 * @param options - Configuration options
 * @returns Rate limit state and methods
 * 
 * @example
 * ```tsx
 * const { enforceRateLimit, isRateLimited, remainingRequests } = useRateLimit({
 *   endpoint: 'coupons/create',
 *   autoCheck: true
 * });
 * 
 * const handleCreateCoupon = async () => {
 *   try {
 *     await enforceRateLimit();
 *     // Proceed with coupon creation
 *   } catch (error) {
 *     if (error instanceof RateLimitError) {
 *       console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
 *     }
 *   }
 * };
 * ```
 */
export function useRateLimit(options: UseRateLimitOptions): UseRateLimitReturn {
  const { endpoint, autoCheck = false, pollInterval } = options;
  const { user } = useAuthStore();
  
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Check rate limit without recording a request
   */
  const checkRateLimit = useCallback(async (): Promise<RateLimitResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rateLimitService.getRateLimitInfo(
        endpoint,
        user?.id
      );
      
      setRateLimitInfo(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check rate limit');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, user?.id]);

  /**
   * Enforce rate limit and throw error if exceeded
   */
  const enforceRateLimit = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await rateLimitService.enforceRateLimit(
        endpoint,
        user?.id
      );
      
      // Refresh rate limit info after recording request
      await checkRateLimit();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Rate limit check failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, user?.id, checkRateLimit]);

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      checkRateLimit();
    }
  }, [autoCheck, checkRateLimit]);

  // Poll for rate limit status if interval is set
  useEffect(() => {
    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(() => {
        checkRateLimit();
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [pollInterval, checkRateLimit]);

  // Computed values
  const isRateLimited = rateLimitInfo ? !rateLimitInfo.allowed : false;
  const remainingRequests = rateLimitInfo?.remaining ?? null;
  const resetAt = rateLimitInfo?.resetAt ? new Date(rateLimitInfo.resetAt) : null;
  const retryAfter = rateLimitInfo?.retryAfter ?? null;

  return {
    rateLimitInfo,
    isLoading,
    error,
    checkRateLimit,
    enforceRateLimit,
    isRateLimited,
    remainingRequests,
    resetAt,
    retryAfter
  };
}

/**
 * Hook for displaying rate limit status
 * Provides formatted messages for UI display
 */
export function useRateLimitStatus(endpoint: string) {
  const rateLimitHook = useRateLimit({
    endpoint,
    autoCheck: true,
    pollInterval: 30000 // Poll every 30 seconds
  });

  const {
    isRateLimited,
    remainingRequests,
    resetAt,
    retryAfter,
    rateLimitInfo
  } = rateLimitHook;

  // Format status message
  const statusMessage = (() => {
    if (!rateLimitInfo) {
      return null;
    }

    if (isRateLimited) {
      if (retryAfter) {
        const minutes = Math.ceil(retryAfter / 60);
        if (minutes > 1) {
          return `Rate limit exceeded. Try again in ${minutes} minutes.`;
        }
        return `Rate limit exceeded. Try again in ${retryAfter} seconds.`;
      }
      return 'Rate limit exceeded. Please try again later.';
    }

    if (remainingRequests !== null && remainingRequests <= 5) {
      return `${remainingRequests} requests remaining before rate limit.`;
    }

    return null;
  })();

  // Format reset time
  const resetTimeFormatted = resetAt
    ? resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return {
    ...rateLimitHook,
    statusMessage,
    resetTimeFormatted,
    shouldShowWarning: remainingRequests !== null && remainingRequests <= 5,
    shouldShowError: isRateLimited
  };
}