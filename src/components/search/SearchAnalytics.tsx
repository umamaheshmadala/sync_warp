// SearchAnalytics.tsx
// Component for displaying search analytics and metrics
// Shows popular search terms, search trends, and performance data

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Search, Users, Clock, Target } from 'lucide-react';
import { useSearchAnalytics } from '../../hooks/useSearch';

interface SearchAnalyticsProps {
  businessId?: string; // If provided, shows analytics for specific business
  timeRange?: 'day' | 'week' | 'month' | 'year';
  className?: string;
}

export const SearchAnalytics: React.FC<SearchAnalyticsProps> = ({
  businessId,
  timeRange = 'week',
  className = ''
}) => {
  const { analytics, loading, fetchAnalytics } = useSearchAnalytics();
  const [selectedMetric, setSelectedMetric] = useState<'searches' | 'terms' | 'trends'>('searches');

  useEffect(() => {
    const dateRange = getDateRange(timeRange);
    fetchAnalytics(dateRange);
  }, [timeRange, fetchAnalytics]);

  const getDateRange = (range: string) => {
    const now = new Date();
    const start = new Date();
    
    switch (range) {
      case 'day':
        start.setDate(now.getDate() - 1);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      start: start.toISOString(),
      end: now.toISOString()
    };
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-2" />
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
              Search Analytics
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Insights into search behavior and performance
            </p>
          </div>
          
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedMetric('searches')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedMetric === 'searches'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedMetric('terms')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedMetric === 'terms'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Top Terms
            </button>
            <button
              onClick={() => setSelectedMetric('trends')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedMetric === 'trends'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Trends
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedMetric === 'searches' && (
          <div>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Search className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics.totalSearches.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Searches</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics.avgResultsPerSearch.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Avg Results/Search</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics.topTerms.length}
                    </div>
                    <div className="text-sm text-gray-600">Unique Terms</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Search Performance</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center text-gray-600">
                  <Clock className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">
                    Performance metrics are being collected and will be displayed here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMetric === 'terms' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Top Search Terms</h4>
            <div className="space-y-3">
              {analytics.topTerms.map((term, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{term.term}</div>
                      <div className="text-sm text-gray-500">{term.count} searches</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {((term.count / analytics.totalSearches) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedMetric === 'trends' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Search Trends</h4>
            <div className="bg-gray-50 rounded-lg p-8">
              <div className="text-center text-gray-600">
                <TrendingUp className="h-8 w-8 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Trend Analysis Coming Soon</p>
                <p className="text-xs text-gray-500">
                  We're collecting data to show you search trends over time.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAnalytics;