// src/components/admin/FollowerActivityMonitor.tsx
// Admin dashboard for monitoring follower activity patterns and detecting anomalies

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, AlertCircle, Activity, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ActivityStats {
  totalFollowers: number;
  followsToday: number;
  unfollowsToday: number;
  followsThisWeek: number;
  unfollowsThisWeek: number;
  netGrowth: number;
  averageFollowsPerBusiness: number;
  mostFollowedBusinesses: Array<{ business_name: string; follower_count: number }>;
  suspiciousPatterns: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    userId?: string;
    businessId?: string;
  }>;
}

export const FollowerActivityMonitor: React.FC = () => {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get all followers
      const { data: allFollowers, error: followersError } = await supabase
        .from('business_followers')
        .select('id, business_id, user_id, followed_at, is_active');

      if (followersError) throw followersError;

      // Calculate stats
      const activeFollowers = allFollowers?.filter(f => f.is_active) || [];
      const todayFollows = activeFollowers.filter(
        f => new Date(f.followed_at) >= oneDayAgo
      );
      const weekFollows = activeFollowers.filter(
        f => new Date(f.followed_at) >= oneWeekAgo
      );

      // Get unfollow data (is_active = false)
      const inactiveFollowers = allFollowers?.filter(f => !f.is_active) || [];
      const todayUnfollows = inactiveFollowers.filter(
        f => f.followed_at && new Date(f.followed_at) >= oneDayAgo
      );
      const weekUnfollows = inactiveFollowers.filter(
        f => f.followed_at && new Date(f.followed_at) >= oneWeekAgo
      );

      // Get most followed businesses
      const businessFollowerCounts: Record<string, number> = {};
      activeFollowers.forEach(f => {
        businessFollowerCounts[f.business_id] = (businessFollowerCounts[f.business_id] || 0) + 1;
      });

      const topBusinessIds = Object.entries(businessFollowerCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, business_name')
        .in('id', topBusinessIds);

      const mostFollowedBusinesses = topBusinessIds.map(id => {
        const business = businessData?.find(b => b.id === id);
        return {
          business_name: business?.business_name || 'Unknown',
          follower_count: businessFollowerCounts[id],
        };
      });

      // Detect suspicious patterns
      const suspiciousPatterns = detectSuspiciousPatterns(allFollowers || []);

      setStats({
        totalFollowers: activeFollowers.length,
        followsToday: todayFollows.length,
        unfollowsToday: todayUnfollows.length,
        followsThisWeek: weekFollows.length,
        unfollowsThisWeek: weekUnfollows.length,
        netGrowth: weekFollows.length - weekUnfollows.length,
        averageFollowsPerBusiness: activeFollowers.length / Math.max(Object.keys(businessFollowerCounts).length, 1),
        mostFollowedBusinesses,
        suspiciousPatterns,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      toast.error('Failed to load activity stats');
    } finally {
      setLoading(false);
    }
  };

  const detectSuspiciousPatterns = (followers: any[]): ActivityStats['suspiciousPatterns'] => {
    const patterns: ActivityStats['suspiciousPatterns'] = [];

    // Check for users with excessive follows
    const userFollowCounts: Record<string, number> = {};
    followers.forEach(f => {
      userFollowCounts[f.user_id] = (userFollowCounts[f.user_id] || 0) + 1;
    });

    Object.entries(userFollowCounts).forEach(([userId, count]) => {
      if (count > 50) {
        patterns.push({
          type: 'Mass Following',
          description: `User has followed ${count} businesses (potential bot)`,
          severity: 'high',
          userId,
        });
      }
    });

    // Check for businesses with suspicious growth
    const businessFollowCounts: Record<string, number> = {};
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    followers.forEach(f => {
      if (new Date(f.followed_at) >= oneDayAgo) {
        businessFollowCounts[f.business_id] = (businessFollowCounts[f.business_id] || 0) + 1;
      }
    });

    Object.entries(businessFollowCounts).forEach(([businessId, count]) => {
      if (count > 100) {
        patterns.push({
          type: 'Unusual Growth',
          description: `Business gained ${count} followers in 24 hours (potential manipulation)`,
          severity: 'medium',
          businessId,
        });
      }
    });

    return patterns;
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
    return <div className="text-center py-12 text-gray-600">No data available</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Activity className="h-8 w-8 text-indigo-600 mr-3" />
          Follower Activity Monitor
        </h1>
        <p className="mt-2 text-gray-600">Monitor platform-wide follower activity and detect anomalies</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex items-center space-x-2">
        {(['24h', '7d', '30d'] as const).map(range => (
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
            {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Followers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalFollowers}</p>
            </div>
            <Users className="h-12 w-12 text-indigo-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Follows Today</p>
              <p className="text-3xl font-bold text-green-600">{stats.followsToday}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unfollows Today</p>
              <p className="text-3xl font-bold text-red-600">{stats.unfollowsToday}</p>
            </div>
            <TrendingDown className="h-12 w-12 text-red-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Growth (7d)</p>
              <p className={cn(
                "text-3xl font-bold",
                stats.netGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {stats.netGrowth >= 0 ? '+' : ''}{stats.netGrowth}
              </p>
            </div>
            <BarChart3 className="h-12 w-12 text-purple-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Most Followed Businesses */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
          Most Followed Businesses
        </h2>
        <div className="space-y-3">
          {stats.mostFollowedBusinesses.map((business, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-semibold text-sm">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-900">{business.business_name}</span>
              </div>
              <span className="text-lg font-bold text-indigo-600">{business.follower_count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suspicious Patterns */}
      {stats.suspiciousPatterns.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
            Suspicious Activity Detected
          </h2>
          <div className="space-y-3">
            {stats.suspiciousPatterns.map((pattern, index) => (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border-2',
                  getSeverityColor(pattern.severity)
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">{pattern.type}</h3>
                    <p className="text-sm">{pattern.description}</p>
                    {pattern.userId && (
                      <p className="text-xs mt-2 opacity-70">User ID: {pattern.userId}</p>
                    )}
                    {pattern.businessId && (
                      <p className="text-xs mt-2 opacity-70">Business ID: {pattern.businessId}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-bold uppercase">
                    {pattern.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.suspiciousPatterns.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 mb-2">✓</div>
          <p className="font-medium text-green-900">No Suspicious Activity Detected</p>
          <p className="text-sm text-green-700 mt-1">All follower activity appears normal</p>
        </div>
      )}
    </div>
  );
};

export default FollowerActivityMonitor;
