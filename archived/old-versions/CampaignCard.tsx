/**
 * CampaignCard Component
 * Phase 4: UI Components
 * 
 * Displays a campaign summary card with status, metrics, and quick actions
 */

import React from 'react';
import type { Campaign, CampaignStatus } from '../../types/campaigns';

// ============================================================================
// TYPES
// ============================================================================

interface CampaignCardProps {
  campaign: Campaign;
  onView?: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
  onPause?: (campaign: Campaign) => void;
  onResume?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
  isLoading?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const getStatusColor = (status: CampaignStatus): string => {
  const colors: Record<CampaignStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

const calculateProgress = (campaign: Campaign): number => {
  if (!campaign.budget || campaign.budget === 0) return 0;
  // This would come from analytics in real implementation
  const spent = 0; // TODO: Get from analytics
  return Math.min((spent / campaign.budget) * 100, 100);
};

// ============================================================================
// COMPONENT
// ============================================================================

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onView,
  onEdit,
  onPause,
  onResume,
  onDelete,
  isLoading = false
}) => {
  const progress = calculateProgress(campaign);
  const isActive = campaign.status === 'active';
  const isPaused = campaign.status === 'paused';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 
                className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
                onClick={() => onView?.(campaign)}
              >
                {campaign.name}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>
            {campaign.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {campaign.description}
              </p>
            )}
          </div>

          {/* Ad Format Badge */}
          <div className="ml-4 flex-shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {campaign.ad_format}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Budget</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(campaign.budget || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Target Reach</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatNumber(campaign.target_impressions || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Priority</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {campaign.priority || 'medium'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {(isActive || isPaused) && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Campaign Progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                progress >= 100 ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Date Range */}
      <div className="px-6 pb-4 flex items-center gap-2 text-xs text-gray-500">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>
          {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
        </span>
      </div>

      {/* Actions */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg flex items-center justify-between">
        <button
          onClick={() => onView?.(campaign)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          disabled={isLoading}
        >
          View Details
        </button>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(campaign)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              title="Edit"
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {isActive && onPause && (
            <button
              onClick={() => onPause(campaign)}
              className="p-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded transition-colors"
              title="Pause"
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          {isPaused && onResume && (
            <button
              onClick={() => onResume(campaign)}
              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
              title="Resume"
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(campaign)}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Delete"
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
};

export default CampaignCard;
