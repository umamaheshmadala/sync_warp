// =====================================================
// Story 4.12: Business Offers Management
// Component: OfferAnalyticsDashboard - Analytics view
// =====================================================

import React from 'react';
import { Eye, Share2, MousePointerClick, TrendingUp, Calendar } from 'lucide-react';
import { useOfferAnalytics } from '../../hooks/useOfferAnalytics';
import { format } from 'date-fns';

interface OfferAnalyticsDashboardProps {
  offerId: string;
}

export function OfferAnalyticsDashboard({ offerId }: OfferAnalyticsDashboardProps) {
  const {
    analytics,
    summary,
    isLoading,
    error,
    getViewsOverTime,
    getSharesOverTime,
    getClicksOverTime,
    getShareChannelBreakdown,
  } = useOfferAnalytics({
    offerId,
    autoFetch: true,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading analytics: {error}</p>
      </div>
    );
  }

  if (!analytics || !summary) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Yet</h3>
          <p className="text-gray-600">
            Analytics will appear once users start viewing and interacting with this offer.
          </p>
        </div>
      </div>
    );
  }

  const viewsData = getViewsOverTime();
  const sharesData = getSharesOverTime();
  const clicksData = getClicksOverTime();
  const channelData = getShareChannelBreakdown();

  // Calculate max value for chart scaling
  const maxViews = Math.max(...viewsData.map(d => d.count), 1);
  const maxShares = Math.max(...sharesData.map(d => d.count), 1);
  const maxClicks = Math.max(...clicksData.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Views */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-blue-600">+12%</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{summary.views}</h3>
          <p className="text-sm text-gray-600 mt-1">Total Views</p>
        </div>

        {/* Shares */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Share2 className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-purple-600">
              {summary.share_rate.toFixed(1)}% rate
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{summary.shares}</h3>
          <p className="text-sm text-gray-600 mt-1">Total Shares</p>
        </div>

        {/* Clicks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MousePointerClick className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-green-600">
              {summary.ctr.toFixed(1)}% CTR
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{summary.clicks}</h3>
          <p className="text-sm text-gray-600 mt-1">Total Clicks</p>
        </div>

        {/* Unique Viewers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-orange-600">Unique</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{analytics.unique_viewers}</h3>
          <p className="text-sm text-gray-600 mt-1">Unique Viewers</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Views Over Time</h3>
          </div>
          <div className="space-y-2">
            {viewsData.slice(-7).map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">
                  {format(new Date(item.date), 'MMM d')}
                </span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-lg transition-all duration-500"
                    style={{ width: `${(item.count / maxViews) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shares Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Share2 className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Shares Over Time</h3>
          </div>
          <div className="space-y-2">
            {sharesData.slice(-7).map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">
                  {format(new Date(item.date), 'MMM d')}
                </span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-lg transition-all duration-500"
                    style={{ width: `${(item.count / maxShares) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Clicks Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <MousePointerClick className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Clicks Over Time</h3>
          </div>
          <div className="space-y-2">
            {clicksData.slice(-7).map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">
                  {format(new Date(item.date), 'MMM d')}
                </span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-lg transition-all duration-500"
                    style={{ width: `${(item.count / maxClicks) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Share Channels */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Share Channels</h3>
          </div>
          <div className="space-y-3">
            {channelData.map((item, index) => {
              const percentage = summary.shares > 0 ? (item.count / summary.shares) * 100 : 0;
              const colors = ['bg-green-500', 'bg-blue-500', 'bg-sky-500', 'bg-purple-500', 'bg-gray-500'];
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {item.channel.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[index % colors.length]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfferAnalyticsDashboard;
