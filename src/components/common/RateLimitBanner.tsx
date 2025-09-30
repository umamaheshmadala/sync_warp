/**
 * RateLimitBanner Component
 * 
 * Displays rate limit warnings and errors to users.
 * Shows remaining requests, reset time, and retry information.
 * 
 * @module RateLimitBanner
 */

import React from 'react';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import { useRateLimitStatus } from '../../hooks/useRateLimit';

interface RateLimitBannerProps {
  endpoint: string;
  className?: string;
  showAlways?: boolean; // Show even when not rate limited
}

/**
 * Banner component for displaying rate limit information
 * 
 * @example
 * ```tsx
 * <RateLimitBanner endpoint="coupons/create" />
 * ```
 */
export function RateLimitBanner({
  endpoint,
  className = '',
  showAlways = false
}: RateLimitBannerProps) {
  const {
    statusMessage,
    resetTimeFormatted,
    shouldShowWarning,
    shouldShowError,
    isLoading,
    remainingRequests,
    rateLimitInfo
  } = useRateLimitStatus(endpoint);

  // Don't show anything if loading or no info
  if (isLoading || !rateLimitInfo) {
    return null;
  }

  // Don't show if not rate limited and showAlways is false
  if (!showAlways && !shouldShowWarning && !shouldShowError) {
    return null;
  }

  // Determine banner style based on status
  const bannerStyles = (() => {
    if (shouldShowError) {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    if (shouldShowWarning) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    return 'bg-blue-50 border-blue-200 text-blue-800';
  })();

  // Determine icon based on status
  const Icon = (() => {
    if (shouldShowError) return AlertTriangle;
    if (shouldShowWarning) return AlertTriangle;
    return Info;
  })();

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border
        ${bannerStyles}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {/* Main message */}
        {statusMessage && (
          <p className="text-sm font-medium mb-1">
            {statusMessage}
          </p>
        )}
        
        {/* Additional info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {remainingRequests !== null && remainingRequests > 0 && (
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              {remainingRequests} request{remainingRequests !== 1 ? 's' : ''} remaining
            </span>
          )}
          
          {resetTimeFormatted && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Resets at {resetTimeFormatted}
            </span>
          )}
          
          {rateLimitInfo.limit && (
            <span className="opacity-75">
              Limit: {rateLimitInfo.limit} requests
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact rate limit indicator for UI elements like buttons
 */
export function RateLimitIndicator({
  endpoint,
  className = ''
}: {
  endpoint: string;
  className?: string;
}) {
  const { remainingRequests, isRateLimited } = useRateLimitStatus(endpoint);

  if (remainingRequests === null) {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded text-xs
        ${isRateLimited 
          ? 'bg-red-100 text-red-700' 
          : remainingRequests <= 5 
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-gray-100 text-gray-600'
        }
        ${className}
      `}
    >
      <Clock className="w-3 h-3" />
      {remainingRequests} left
    </span>
  );
}