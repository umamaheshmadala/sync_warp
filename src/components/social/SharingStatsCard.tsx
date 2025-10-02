// =====================================================
// Story 5.5: Enhanced Sharing Limits - Sharing Stats Card
// =====================================================

import React from 'react';
import { Share2, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { useSharingLimits } from '../../hooks/useSharingLimits';
import type { SharingStatsCardProps } from '../../types/sharingLimits';

/**
 * Card component displaying user's sharing statistics and remaining limits
 */
export const SharingStatsCard: React.FC<SharingStatsCardProps> = ({
  userId,
  onRefresh,
  showDetails = true,
}) => {
  const {
    stats,
    limits,
    loading,
    error,
    isDriver,
    refreshStats,
    canShareMore,
    remainingTotal,
    percentageUsed,
  } = useSharingLimits({ userId, autoLoad: true });

  const handleRefresh = async () => {
    await refreshStats();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800 text-sm">⚠️ {error}</p>
      </div>
    );
  }

  if (!stats || !limits) {
    return null;
  }

  // Calculate progress bar color
  const getProgressColor = () => {
    if (percentageUsed >= 90) return 'bg-red-500';
    if (percentageUsed >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  // Calculate text color
  const getTextColor = () => {
    if (percentageUsed >= 90) return 'text-red-600';
    if (percentageUsed >= 70) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Share2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Sharing Stats
          </h3>
          {isDriver && (
            <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              🚗 Driver
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Refresh stats"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main stat */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2 mb-2">
          <span className="text-4xl font-bold text-gray-900">
            {remainingTotal}
          </span>
          <span className="text-lg text-gray-600">
            / {stats.total_daily_limit}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {remainingTotal === 0 ? (
            <span className="text-red-600 font-medium">No more shares today</span>
          ) : (
            <>Coupons remaining today</>
          )}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Daily usage</span>
          <span className={getTextColor()}>
            {percentageUsed}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
      </div>

      {/* Detailed stats */}
      {showDetails && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Total shared today */}
            <div className="bg-white rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600">Shared Today</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_shared_today}
              </p>
            </div>

            {/* Friends shared with */}
            <div className="bg-white rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600">Friends</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.friends_shared_with.length}
              </p>
            </div>
          </div>

          {/* Limits info */}
          <div className="bg-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium mb-1">
              📋 Your Daily Limits {isDriver && '(Driver)'}
            </p>
            <div className="text-xs text-blue-700 space-y-0.5">
              <p>• {limits.per_friend_daily} coupons per friend</p>
              <p>• {limits.total_daily} coupons total</p>
              <p className="text-blue-600 italic">Resets at midnight</p>
            </div>
          </div>
        </>
      )}

      {/* Warning message */}
      {!canShareMore && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            ⚠️ You've reached your daily sharing limit. Come back tomorrow!
          </p>
        </div>
      )}
    </div>
  );
};

export default SharingStatsCard;
