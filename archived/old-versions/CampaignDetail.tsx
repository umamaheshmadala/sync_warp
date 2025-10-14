/**
 * CampaignDetail Component
 * Phase 4: UI Components
 * 
 * Detailed campaign view with tabs for overview, analytics, targeting, and settings
 * Uses shadcn/ui components for enhanced UI
 */

import React, { useState } from 'react';
import type { Campaign, CampaignAnalytics } from '../../types/campaigns';
import { StatusBadge, MetricCard, ProgressBar, Alert } from '../shared/SharedComponents';

// ============================================================================
// TYPES
// ============================================================================

interface CampaignDetailProps {
  campaign: Campaign;
  analytics?: CampaignAnalytics | null;
  isLoading?: boolean;
  onEdit?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

type TabValue = 'overview' | 'analytics' | 'targeting' | 'settings';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const CampaignHeader: React.FC<Pick<CampaignDetailProps, 'campaign' | 'onEdit' | 'onPause' | 'onResume' | 'onDelete' | 'onRefresh'>> = ({
  campaign,
  onEdit,
  onPause,
  onResume,
  onDelete,
  onRefresh
}) => {
  const isActive = campaign.status === 'active';
  const isPaused = campaign.status === 'paused';

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {campaign.name}
            </h1>
            <StatusBadge status={campaign.status} size="lg" />
          </div>
          {campaign.description && (
            <p className="text-gray-600 mt-2">{campaign.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {campaign.ad_format}
            </span>
            <span>•</span>
            <span>Created {formatDate(campaign.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Campaign
            </button>
          )}

          {isActive && onPause && (
            <button
              onClick={onPause}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Pause Campaign
            </button>
          )}

          {isPaused && onResume && (
            <button
              onClick={onResume}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Resume Campaign
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

const OverviewTab: React.FC<{ campaign: Campaign; analytics?: CampaignAnalytics | null }> = ({
  campaign,
  analytics
}) => {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Impressions"
            value={analytics?.total_impressions || 0}
            format="number"
          />
          <MetricCard
            label="Total Clicks"
            value={analytics?.total_clicks || 0}
            format="number"
          />
          <MetricCard
            label="CTR"
            value={analytics?.ctr || 0}
            format="percent"
          />
          <MetricCard
            label="Total Spent"
            value={analytics?.total_spent || 0}
            format="currency"
          />
        </div>
      </div>

      {/* Budget Progress */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Status</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(campaign.budget || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics?.total_spent || 0)}
              </p>
            </div>
          </div>
          <ProgressBar
            value={analytics?.total_spent || 0}
            max={campaign.budget || 1}
            label="Budget Progress"
            color={
              (analytics?.total_spent || 0) >= (campaign.budget || 0) ? 'red' : 'blue'
            }
          />
        </div>
      </div>

      {/* Campaign Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-600 mb-1">Start Date</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatDate(campaign.start_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600 mb-1">End Date</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatDate(campaign.end_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600 mb-1">Target Impressions</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatNumber(campaign.target_impressions || 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600 mb-1">Priority</dt>
              <dd className="text-sm font-medium text-gray-900 capitalize">
                {campaign.priority || 'medium'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600 mb-1">Ad Format</dt>
              <dd className="text-sm font-medium text-gray-900">
                {campaign.ad_format}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600 mb-1">Business ID</dt>
              <dd className="text-sm font-medium text-gray-900 font-mono">
                {campaign.business_id}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

const AnalyticsTab: React.FC<{ analytics?: CampaignAnalytics | null }> = ({ analytics }) => {
  if (!analytics) {
    return (
      <Alert
        variant="info"
        title="No Analytics Data"
        message="Analytics data will appear once the campaign starts receiving impressions."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Detailed Analytics</h3>
      
      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Total Conversions"
          value={analytics.total_conversions || 0}
          format="number"
        />
        <MetricCard
          label="Conversion Rate"
          value={analytics.conversion_rate || 0}
          format="percent"
        />
        <MetricCard
          label="Cost Per Conversion"
          value={analytics.cost_per_conversion || 0}
          format="currency"
        />
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="CPC (Cost Per Click)"
          value={analytics.cpc || 0}
          format="currency"
        />
        <MetricCard
          label="CPM (Cost Per Mille)"
          value={analytics.cpm || 0}
          format="currency"
        />
        <MetricCard
          label="Average Position"
          value={analytics.avg_position || 0}
          format="number"
        />
      </div>

      {/* Engagement Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Campaign Timeline</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">First Impression</span>
            <span className="text-sm font-medium text-gray-900">
              {analytics.first_impression_at ? formatDate(analytics.first_impression_at) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Last Impression</span>
            <span className="text-sm font-medium text-gray-900">
              {analytics.last_impression_at ? formatDate(analytics.last_impression_at) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600">Last Updated</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(analytics.updated_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TargetingTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const targeting = campaign.targeting_rules;

  if (!targeting || Object.keys(targeting).length === 0) {
    return (
      <Alert
        variant="warning"
        title="No Targeting Rules"
        message="This campaign does not have any targeting rules configured."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Targeting Configuration</h3>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
          {JSON.stringify(targeting, null, 2)}
        </pre>
      </div>

      {campaign.city_id && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Geographic Targeting:</strong> City ID {campaign.city_id}
          </p>
        </div>
      )}
    </div>
  );
};

const SettingsTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Campaign Settings</h3>
      
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Campaign ID</h4>
          <p className="text-sm text-gray-600 font-mono">{campaign.id}</p>
        </div>
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Business ID</h4>
          <p className="text-sm text-gray-600 font-mono">{campaign.business_id}</p>
        </div>
        {campaign.city_id && (
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-1">City ID</h4>
            <p className="text-sm text-gray-600 font-mono">{campaign.city_id}</p>
          </div>
        )}
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Created At</h4>
          <p className="text-sm text-gray-600">{formatDate(campaign.created_at)}</p>
        </div>
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Last Updated</h4>
          <p className="text-sm text-gray-600">{formatDate(campaign.updated_at)}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CampaignDetail: React.FC<CampaignDetailProps> = ({
  campaign,
  analytics,
  isLoading = false,
  onEdit,
  onPause,
  onResume,
  onDelete,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CampaignHeader
        campaign={campaign}
        onEdit={onEdit}
        onPause={onPause}
        onResume={onResume}
        onDelete={onDelete}
        onRefresh={onRefresh}
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'targeting', label: 'Targeting' },
              { id: 'settings', label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabValue)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab campaign={campaign} analytics={analytics} />}
        {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} />}
        {activeTab === 'targeting' && <TargetingTab campaign={campaign} />}
        {activeTab === 'settings' && <SettingsTab campaign={campaign} />}
      </div>
    </div>
  );
};

export default CampaignDetail;
