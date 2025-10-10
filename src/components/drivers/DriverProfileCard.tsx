/**
 * DriverProfileCard Component
 * Phase 4: UI Components
 * 
 * Displays driver profile information with score, ranking, and verification status
 */

import React from 'react';
import type { DriverProfile } from '../../types/campaigns';

// ============================================================================
// TYPES
// ============================================================================

interface DriverProfileCardProps {
  driver: DriverProfile;
  rank?: number;
  showDetails?: boolean;
  onClick?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const getVerificationBadge = (status: string) => {
  const badges = {
    verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    unverified: { label: 'Unverified', color: 'bg-gray-100 text-gray-800' }
  };
  return badges[status as keyof typeof badges] || badges.unverified;
};

const getTierBadge = (tier: string) => {
  const colors = {
    platinum: 'bg-purple-100 text-purple-800 border-purple-300',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    silver: 'bg-gray-100 text-gray-800 border-gray-300',
    bronze: 'bg-orange-100 text-orange-800 border-orange-300'
  };
  return colors[tier as keyof typeof colors] || colors.bronze;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const DriverProfileCard: React.FC<DriverProfileCardProps> = ({
  driver,
  rank,
  showDetails = false,
  onClick
}) => {
  const verificationBadge = getVerificationBadge(driver.verification_status);

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Header with Rank */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {rank !== undefined && (
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
              #{rank}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {driver.driver_name || 'Unknown Driver'}
            </h3>
            <p className="text-sm text-gray-500 font-mono">{driver.user_id}</p>
          </div>
        </div>

        {/* Score Badge */}
        <div className={`px-3 py-1 rounded-lg border font-bold text-lg ${getScoreColor(driver.driver_score)}`}>
          {driver.driver_score.toFixed(1)}
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${verificationBadge.color}`}>
          {verificationBadge.label}
        </span>
        {driver.driver_tier && (
          <span className={`px-2 py-1 rounded border text-xs font-medium capitalize ${getTierBadge(driver.driver_tier)}`}>
            {driver.driver_tier}
          </span>
        )}
        {driver.activity_level && (
          <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium capitalize">
            {driver.activity_level} Activity
          </span>
        )}
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-4 space-y-3">
          {driver.total_trips !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Trips:</span>
              <span className="font-medium text-gray-900">{driver.total_trips.toLocaleString()}</span>
            </div>
          )}
          {driver.avg_rating !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Average Rating:</span>
              <span className="font-medium text-gray-900">
                {driver.avg_rating.toFixed(2)} ⭐
              </span>
            </div>
          )}
          {driver.completion_rate !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Completion Rate:</span>
              <span className="font-medium text-gray-900">{driver.completion_rate.toFixed(1)}%</span>
            </div>
          )}
          {driver.acceptance_rate !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Acceptance Rate:</span>
              <span className="font-medium text-gray-900">{driver.acceptance_rate.toFixed(1)}%</span>
            </div>
          )}
          {driver.on_time_rate !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">On-Time Rate:</span>
              <span className="font-medium text-gray-900">{driver.on_time_rate.toFixed(1)}%</span>
            </div>
          )}
          {driver.cancellation_rate !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cancellation Rate:</span>
              <span className="font-medium text-gray-900">{driver.cancellation_rate.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Score Components */}
      {showDetails && driver.score_components && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Score Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(driver.score_components).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="font-medium text-gray-900">{(value as number).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-gray-200 pt-4 mt-4 text-xs text-gray-500">
        <p>Last Updated: {new Date(driver.updated_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default DriverProfileCard;
