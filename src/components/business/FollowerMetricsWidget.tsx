import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Bell, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface FollowerMetrics {
  totalFollowers: number;
  newFollowersThisWeek: number;
  activeCampaigns: number;
  engagementRate: number;
}

interface FollowerMetricsWidgetProps {
  businessId: string;
}

export const FollowerMetricsWidget: React.FC<FollowerMetricsWidgetProps> = ({ businessId }) => {
  const [metrics, setMetrics] = useState<FollowerMetrics>({
    totalFollowers: 0,
    newFollowersThisWeek: 0,
    activeCampaigns: 0,
    engagementRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowerMetrics();
  }, [businessId]);

  const fetchFollowerMetrics = async () => {
    try {
      setLoading(true);

      // Get total followers
      const { count: totalFollowers } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_active', true);

      // Get new followers this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { count: newFollowers } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('followed_at', oneWeekAgo.toISOString());

      // Get active campaigns
      const { count: activeCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'active');

      // Calculate engagement rate from recent campaigns
      const { data: recentMetrics } = await supabase
        .from('campaign_metrics')
        .select('impressions, clicks')
        .in('campaign_id', 
          supabase
            .from('campaigns')
            .select('id')
            .eq('business_id', businessId)
        )
        .gte('metric_date', oneWeekAgo.toISOString())
        .order('metric_date', { ascending: false })
        .limit(10);

      let engagementRate = 0;
      if (recentMetrics && recentMetrics.length > 0) {
        const totalImpressions = recentMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
        const totalClicks = recentMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
        engagementRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      }

      setMetrics({
        totalFollowers: totalFollowers || 0,
        newFollowersThisWeek: newFollowers || 0,
        activeCampaigns: activeCampaigns || 0,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
      });
    } catch (error) {
      console.error('Error fetching follower metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Follower Insights
        </h3>
        <Link
          to={`/business/${businessId}/followers/analytics`}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View Details →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Total Followers */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Followers</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.totalFollowers.toLocaleString()}
          </div>
          {metrics.newFollowersThisWeek > 0 && (
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{metrics.newFollowersThisWeek} this week
            </div>
          )}
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Campaigns</span>
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.activeCampaigns}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Targeting followers
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Engagement Rate</span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.engagementRate}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Campaign performance
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-4 shadow-sm flex flex-col justify-center">
          <Bell className="w-5 h-5 text-white mb-2" />
          <Link
            to={`/business/${businessId}/campaigns/create`}
            className="text-sm font-medium text-white hover:underline"
          >
            Create Campaign →
          </Link>
        </div>
      </div>

      {metrics.totalFollowers === 0 && (
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Tip:</strong> Start building your follower base! Share your business QR code or profile link to attract followers.
        </div>
      )}

      {metrics.totalFollowers > 0 && metrics.activeCampaigns === 0 && (
        <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
          <strong>Ready to engage?</strong> You have {metrics.totalFollowers} follower{metrics.totalFollowers > 1 ? 's' : ''}! 
          <Link to={`/business/${businessId}/campaigns/create`} className="font-semibold hover:underline ml-1">
            Launch your first campaign →
          </Link>
        </div>
      )}
    </div>
  );
};
