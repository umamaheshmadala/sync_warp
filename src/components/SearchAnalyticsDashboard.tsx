// SearchAnalyticsDashboard.tsx
// Dashboard component for displaying search analytics and insights

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  Users, 
  Clock, 
  Target, 
  Filter,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import searchAnalyticsService, { SearchInsight, SearchTrend } from '../services/searchAnalyticsService';

interface DateRange {
  start: Date;
  end: Date;
}

const SearchAnalyticsDashboard: React.FC = () => {
  const [insights, setInsights] = useState<SearchInsight | null>(null);
  const [trends, setTrends] = useState<Array<{ date: string; searches: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [insightsData, trendsData] = await Promise.all([
        searchAnalyticsService.getSearchInsights(dateRange),
        searchAnalyticsService.getSearchTrends(30)
      ]);
      
      setInsights(insightsData);
      setTrends(trendsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await searchAnalyticsService.refreshPopularTerms();
    await loadAnalytics();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80 bg-gray-200 rounded-lg"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
          Search Analytics Dashboard
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Range Selector */}
          <div className="flex gap-2">
            <input
              type="date"
              value={formatDate(dateRange.start)}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date"
              value={formatDate(dateRange.end)}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Searches"
            value={insights.total_searches.toLocaleString()}
            icon={<Search className="w-6 h-6" />}
            color="blue"
          />
          <MetricCard
            title="Unique Users"
            value={insights.unique_users.toLocaleString()}
            icon={<Users className="w-6 h-6" />}
            color="green"
          />
          <MetricCard
            title="Avg Search Time"
            value={`${insights.avg_search_time}ms`}
            icon={<Clock className="w-6 h-6" />}
            color="yellow"
          />
          <MetricCard
            title="Success Rate"
            value={`${insights.search_success_rate}%`}
            icon={<Target className="w-6 h-6" />}
            color="purple"
          />
        </div>
      )}

      {/* Charts and Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Popular Search Terms */}
        {insights && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Top Search Terms</h2>
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="space-y-4">
              {insights.top_terms.map((term, index) => (
                <div key={term.search_term} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{term.search_term}</p>
                      <p className="text-sm text-gray-500">
                        {term.search_count} searches • {term.unique_users} users
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(term.trend_direction)}
                    <span className={`text-sm font-medium ${
                      term.trend_direction === 'up' ? 'text-green-600' : 
                      term.trend_direction === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {Math.abs(Math.round(term.change_percentage))}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Trends Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Search Trends</h2>
            <Activity className="w-5 h-5 text-gray-500" />
          </div>
          
          <div className="h-64">
            {trends.length > 0 ? (
              <SimpleLineChart data={trends} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No trend data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Insights Grid */}
      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Popular Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Popular Filters</h2>
              <Filter className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="space-y-3">
              {insights.popular_filters.map((filter, index) => {
                const percentage = insights.total_searches > 0 
                  ? (filter.usage_count / insights.total_searches) * 100 
                  : 0;
                
                return (
                  <div key={filter.filter} className="flex items-center justify-between">
                    <span className="text-gray-700 capitalize">{filter.filter}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Peak Search Hours</h2>
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="space-y-3">
              {insights.peak_hours.map((hour, index) => {
                const maxSearches = Math.max(...insights.peak_hours.map(h => h.search_count));
                const percentage = maxSearches > 0 ? (hour.search_count / maxSearches) * 100 : 0;
                
                return (
                  <div key={hour.hour} className="flex items-center justify-between">
                    <span className="text-gray-700">
                      {hour.hour}:00 - {hour.hour + 1}:00
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">
                        {hour.search_count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conversion Rate */}
      {insights && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Conversion Rate</h3>
              <p className="text-gray-600">
                Percentage of successful searches that result in clicks
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {insights.conversion_rate}%
              </div>
              <Target className="w-6 h-6 text-purple-500 mx-auto mt-1" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Simple Line Chart Component
interface SimpleLineChartProps {
  data: Array<{ date: string; searches: number }>;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data }) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.searches));
  const minValue = Math.min(...data.map(d => d.searches));
  const range = maxValue - minValue || 1;

  return (
    <div className="w-full h-full relative">
      <svg className="w-full h-full" viewBox="0 0 400 200">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1="40"
            y1={40 + (i * 30)}
            x2="380"
            y2={40 + (i * 30)}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        ))}
        
        {/* Line path */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={data.map((point, index) => {
            const x = 40 + (index * (340 / (data.length - 1)));
            const y = 160 - ((point.searches - minValue) / range) * 120;
            return `${x},${y}`;
          }).join(' ')}
        />
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = 40 + (index * (340 / (data.length - 1)));
          const y = 160 - ((point.searches - minValue) / range) * 120;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="#3b82f6"
            />
          );
        })}
        
        {/* Y-axis labels */}
        {[0, 1, 2, 3, 4].map(i => {
          const value = minValue + ((maxValue - minValue) * (4 - i)) / 4;
          return (
            <text
              key={i}
              x="35"
              y={40 + (i * 30) + 5}
              textAnchor="end"
              fontSize="10"
              fill="#6b7280"
            >
              {Math.round(value)}
            </text>
          );
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-10 right-10 flex justify-between text-xs text-gray-500">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
};

export default SearchAnalyticsDashboard;