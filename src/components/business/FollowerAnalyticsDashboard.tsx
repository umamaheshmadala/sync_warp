// src/components/business/FollowerAnalyticsDashboard.tsx
// Analytics dashboard showing follower statistics, demographics, and growth trends

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Calendar, Activity, Download, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFollowerAnalytics } from '../../hooks/useFollowerAnalytics';
import { cn } from '../../lib/utils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const FollowerAnalyticsDashboard: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { analytics, loading, error, refresh } = useFollowerAnalytics(businessId || '');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('month');

  // Update page title dynamically
  useEffect(() => {
    if (analytics?.business_name) {
      document.title = `${analytics.business_name} - Follower Analytics - SynC`;
    }
  }, [analytics?.business_name]);

  if (!businessId) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Invalid business ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Error loading analytics</p>
        <button
          onClick={refresh}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Prepare chart data
  const ageChartData = Object.entries(analytics.demographics.age_distribution).map(([age, count]) => ({
    age,
    count,
  }));

  const genderChartData = Object.entries(analytics.demographics.gender_split).map(([gender, count]) => ({
    name: gender.charAt(0).toUpperCase() + gender.slice(1),
    value: count,
  }));

  const growthChange = analytics.new_followers_this_week;
  const growthPercentage = analytics.total_followers > 0 
    ? ((growthChange / analytics.total_followers) * 100).toFixed(1)
    : '0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{analytics.business_name}</h1>
            <p className="text-indigo-600 font-semibold mt-2">Follower Analytics</p>
            <p className="text-gray-500 text-sm mt-1">Understand your audience and grow your business</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refresh}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <Activity className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate(`/business/${businessId}/campaigns/create?target=followers`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Target className="h-4 w-4" />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Followers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {analytics.total_followers}
          </div>
          <div className="text-sm text-gray-600">Total Followers</div>
        </motion.div>

        {/* New This Week */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className={cn(
              "flex items-center text-sm font-medium",
              growthChange >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {growthChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span>{growthPercentage}%</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            +{analytics.new_followers_this_week}
          </div>
          <div className="text-sm text-gray-600">New This Week</div>
        </motion.div>

        {/* Active Followers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {analytics.active_followers}
          </div>
          <div className="text-sm text-gray-600">Active Followers</div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics.engagement_rate.toFixed(0)}% engagement rate
          </div>
        </motion.div>

        {/* New This Month */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            +{analytics.new_followers_this_month}
          </div>
          <div className="text-sm text-gray-600">New This Month</div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Growth Trend */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.growth_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
          {genderChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={genderChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">No data available</div>
          )}
        </div>

        {/* Age Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
          {ageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ageChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">No data available</div>
          )}
        </div>

        {/* Top Cities */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Cities</h3>
          {analytics.demographics.top_cities.length > 0 ? (
            <div className="space-y-3">
              {analytics.demographics.top_cities.map((city, index) => (
                <div key={city.city} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl font-bold text-gray-300">#{index + 1}</div>
                    <div>
                      <div className="font-medium text-gray-900">{city.city}</div>
                      <div className="text-sm text-gray-500">{city.count} followers</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-indigo-600">
                    {((city.count / analytics.total_followers) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">No data available</div>
          )}
        </div>
      </div>

      {/* Top Interests */}
      {analytics.demographics.top_interests.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Interests</h3>
          <div className="flex flex-wrap gap-2">
            {analytics.demographics.top_interests.map((interest) => (
              <span
                key={interest.interest}
                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
              >
                {interest.interest} ({interest.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Ready to engage your followers?</h3>
        <p className="text-indigo-100 mb-6">
          Create targeted campaigns based on these insights
        </p>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => navigate(`/business/${businessId}/campaigns/create?target=followers`)}
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
          >
            Create Campaign for Followers
          </button>
          <button
            onClick={() => navigate(`/business/${businessId}/followers/list`)}
            className="px-6 py-3 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition-colors font-medium"
          >
            View Follower List
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowerAnalyticsDashboard;
