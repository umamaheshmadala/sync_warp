/**
 * SharingStatsCard Component
 * Story 5.5: Enhanced Sharing Limits
 * 
 * Displays current sharing statistics and limits for the user.
 * Shows progress bars for total daily usage and per-friend limits.
 */

import React from 'react';
import { Share2, Users, TrendingUp } from 'lucide-react';
import type { SharingStats } from '../types/sharingLimits';

interface SharingStatsCardProps {
  stats: SharingStats;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

export const SharingStatsCard: React.FC<SharingStatsCardProps> = ({
  stats,
  isLoading = false,
  compact = false,
  className = '',
}) => {
  // Handle missing stats gracefully
  if (!stats || isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow animate-pulse ${className}`}>
        <div className="p-4">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalUsagePercent = (stats.total_shared_today / stats.total_daily_limit) * 100;
  const isNearLimit = totalUsagePercent >= 80;
  const isAtLimit = stats.remaining_today === 0;

  // Determine progress bar color
  const getProgressColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-amber-500';
    return 'bg-green-500';
  };

  // Compact view for inline display
  if (compact) {
    return (
      <div className={`flex items-center gap-4 p-3 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">
            {stats.remaining_today}/{stats.total_daily_limit}
          </span>
          <span className="text-xs text-gray-500">shares left today</span>
        </div>
        {stats.is_driver && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Driver
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-600" />
            Sharing Limits
          </h3>
          {stats.is_driver && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">
              Driver
            </span>
          )}
        </div>
      </div>
      
      <div className="px-6 py-4 space-y-4">
        {/* Total Daily Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Daily Total</span>
            </div>
            <span className="text-gray-600">
              {stats.total_shared_today} / {stats.total_daily_limit}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(totalUsagePercent, 100)}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {stats.remaining_today} shares remaining today
            </span>
            {isNearLimit && !isAtLimit && (
              <span className="text-amber-600 font-medium">
                Near limit
              </span>
            )}
            {isAtLimit && (
              <span className="text-red-600 font-medium">
                Limit reached
              </span>
            )}
          </div>
        </div>

        {/* Per-Friend Limit Info */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">
              <span className="font-medium">{stats.per_friend_limit}</span> coupons per friend/day
            </span>
          </div>
          
          {/* Show friends shared with today */}
          {stats.friends_shared_with.length > 0 && (
            <div className="mt-2 pl-6">
              <p className="text-xs text-gray-500 mb-1">
                Shared with {stats.friends_shared_with.length} friend{stats.friends_shared_with.length > 1 ? 's' : ''} today:
              </p>
              <div className="space-y-1">
                {stats.friends_shared_with.map((friend) => (
                  <div 
                    key={friend.recipient_id} 
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600">Friend</span>
                    <span 
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        friend.count >= stats.per_friend_limit 
                          ? 'bg-red-50 text-red-700 border border-red-300' 
                          : 'bg-gray-50 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {friend.count}/{stats.per_friend_limit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Driver Benefit Message */}
        {!stats.is_driver && (
          <div className="pt-3 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">💡 Become a Driver</span> and get higher sharing limits!
                <br />
                Drivers can share up to 5 coupons per friend and 30 per day.
              </p>
            </div>
          </div>
        )}

        {/* At Limit Warning */}
        {isAtLimit && (
          <div className="pt-3 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-800 font-medium">
                ⚠️ Daily sharing limit reached. Come back tomorrow to share more coupons!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharingStatsCard;
