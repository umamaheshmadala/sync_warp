// src/components/business/FollowerInsightsDashboard.tsx
// Dashboard providing detailed analytics about follower demographics and engagement

import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar,
  UserCheck,
  UserX,
  Activity,
  PieChart,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface FollowerStats {
  totalFollowers: number;
  newFollowersThisWeek: number;
  unfollowersThisWeek: number;
  growthRate: number;
  demographics: {
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    topCities: Array<{ city: string; count: number }>;
  };
  engagementMetrics: {
    averageEngagementRate: number;
    mostActiveTime: string;
    topEngagingSegment: string;
  };
  retentionRate: number;
}

interface FollowerInsightsDashboardProps {
  businessId: string;
}

export const FollowerInsightsDashboard: React.FC<FollowerInsightsDashboardProps> = ({
  businessId,
}) => {
  const [stats, setStats] = useState<FollowerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadFollowerInsights();
  }, [businessId, timeRange]);

  const loadFollowerInsights = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const timeRangeDays =
        timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const rangeStart = new Date(now.getTime() - timeRangeDays * 24 * 60 * 60 * 1000);

      // Get all followers for the business
      const { data: followers, error: followersError } = await supabase
        .from('business_followers')
        .select(`
          id,
          user_id,
          followed_at,
          is_active,
          users:user_id (
            id,
            age,
            gender,
            city
          )
        `)
        .eq('business_id', businessId);

      if (followersError) throw followersError;

      const activeFollowers = followers?.filter(f => f.is_active) || [];
      const totalFollowers = activeFollowers.length;

      // Calculate new followers this week
      const newFollowersThisWeek = activeFollowers.filter(
        f => new Date(f.followed_at) >= oneWeekAgo
      ).length;

      // Calculate unfollowers this week
      const unfollowersThisWeek = followers?.filter(
        f => !f.is_active && new Date(f.followed_at) >= oneWeekAgo
      ).length || 0;

      // Calculate growth rate
      const previousWeekFollowers = activeFollowers.filter(
        f => new Date(f.followed_at) < oneWeekAgo
      ).length;
      const growthRate =
        previousWeekFollowers > 0
          ? ((newFollowersThisWeek - unfollowersThisWeek) / previousWeekFollowers) * 100
          : 0;

      // Demographics breakdown
      const ageGroups: Record<string, number> = {};
      const genders: Record<string, number> = {};
      const cities: Record<string, number> = {};

      activeFollowers.forEach(follower => {
        const user = follower.users as any;
        if (!user) return;

        // Age groups
        const age = user.age || 0;
        let ageGroup = '65+';
        if (age < 18) ageGroup = '13-17';
        else if (age < 25) ageGroup = '18-24';
        else if (age < 35) ageGroup = '25-34';
        else if (age < 45) ageGroup = '35-44';
        else if (age < 55) ageGroup = '45-54';
        else if (age < 65) ageGroup = '55-64';
        
        ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;

        // Genders
        const gender = user.gender || 'other';
        genders[gender] = (genders[gender] || 0) + 1;

        // Cities
        if (user.city) {
          cities[user.city] = (cities[user.city] || 0) + 1;
        }
      });

      const topCities = Object.entries(cities)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Engagement metrics (placeholder - would need actual engagement data)
      const engagementMetrics = {
        averageEngagementRate: 8.5, // Placeholder
        mostActiveTime: '6:00 PM - 9:00 PM', // Placeholder
        topEngagingSegment: Object.entries(ageGroups)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
      };

      // Retention rate (followers still active after 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const followersFrom30DaysAgo = followers?.filter(
        f => new Date(f.followed_at) <= thirtyDaysAgo
      ) || [];
      const stillActiveFrom30Days = followersFrom30DaysAgo.filter(f => f.is_active).length;
      const retentionRate =
        followersFrom30DaysAgo.length > 0
          ? (stillActiveFrom30Days / followersFrom30DaysAgo.length) * 100
          : 0;

      setStats({
        totalFollowers,
        newFollowersThisWeek,
        unfollowersThisWeek,
        growthRate,
        demographics: {
          ageGroups,
          genders,
          topCities,
        },
        engagementMetrics,
        retentionRate,
      });
    } catch (err) {
      console.error('Error loading follower insights:', err);
      toast.error('Failed to load follower insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No follower data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="h-8 w-8 text-indigo-600 mr-3" />
          Follower Insights
        </h1>
        <p className="mt-2 text-gray-600">
          Understand your audience demographics and engagement patterns
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex items-center space-x-2">
        {(['7d', '30d', '90d'] as const).map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              timeRange === range
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Followers</span>
            <Users className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalFollowers.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Active followers</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">New Followers</span>
            <UserCheck className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            +{stats.newFollowersThisWeek.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">This week</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Unfollowers</span>
            <UserX className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            -{stats.unfollowersThisWeek.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">This week</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Growth Rate</span>
            {stats.growthRate >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </div>
          <p
            className={cn(
              'text-3xl font-bold',
              stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {stats.growthRate >= 0 ? '+' : ''}
            {stats.growthRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Week over week</p>
        </div>
      </div>

      {/* Demographics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Age Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 text-indigo-600 mr-2" />
            Age Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.demographics.ageGroups)
              .sort(([, a], [, b]) => b - a)
              .map(([age, count]) => {
                const percentage = (count / stats.totalFollowers) * 100;
                return (
                  <div key={age}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{age}</span>
                      <span className="text-sm text-gray-600">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 text-indigo-600 mr-2" />
            Gender Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.demographics.genders)
              .sort(([, a], [, b]) => b - a)
              .map(([gender, count]) => {
                const percentage = (count / stats.totalFollowers) * 100;
                return (
                  <div key={gender}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {gender}
                      </span>
                      <span className="text-sm text-gray-600">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Top Cities */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 text-indigo-600 mr-2" />
          Top Cities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.demographics.topCities.map((city, index) => (
            <div
              key={city.city}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-semibold text-sm">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-900">{city.city}</span>
              </div>
              <span className="text-lg font-bold text-indigo-600">{city.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 text-indigo-600 mr-2" />
            Engagement Metrics
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Engagement Rate</p>
              <p className="text-3xl font-bold text-indigo-600">
                {stats.engagementMetrics.averageEngagementRate}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Most Active Time</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.engagementMetrics.mostActiveTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Top Engaging Segment</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.engagementMetrics.topEngagingSegment}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-green-600 mr-2" />
            Retention Rate
          </h3>
          <div className="flex items-baseline space-x-2 mb-4">
            <span className="text-5xl font-bold text-green-600">
              {stats.retentionRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-gray-700">
            of followers who joined 30+ days ago are still following you
          </p>
          <div className="mt-6 pt-6 border-t border-green-200">
            <p className="text-xs text-gray-600 mb-2">Retention Benchmark</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Poor</span>
              <span className="text-gray-600">Good</span>
              <span className="text-gray-600">Excellent</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
              <div
                className={cn(
                  'h-3 rounded-full transition-all',
                  stats.retentionRate >= 70
                    ? 'bg-green-600'
                    : stats.retentionRate >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${Math.min(stats.retentionRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowerInsightsDashboard;
