import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Bell, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

interface FollowerMetrics {
  totalFollowers: number;
  newFollowersThisWeek: number;
  activeCampaigns: number;
  engagementRate: number;
}

interface FollowerMetricsWidgetProps {
  businessId: string;
  businessName?: string;
}

export const FollowerMetricsWidget: React.FC<FollowerMetricsWidgetProps> = ({ businessId, businessName }) => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
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
      // Step 1: Get campaign IDs for this business
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('id')
        .eq('business_id', businessId);

      const campaignIds = campaignData?.map(c => c.id) || [];

      // Step 2: Fetch metrics using the campaign IDs
      let recentMetrics: { impressions: number; clicks: number }[] = [];
      if (campaignIds.length > 0) {
        const { data: metricsData } = await supabase
          .from('campaign_metrics')
          .select('impressions, clicks')
          .in('campaign_id', campaignIds)
          .gte('metric_date', oneWeekAgo.toISOString())
          .order('metric_date', { ascending: false })
          .limit(10);
        recentMetrics = metricsData || [];
      }

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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center">
          <Users className="w-4 h-4 mr-2 text-blue-600" />
          Follower Insights
        </h3>
        <button
          onClick={() => navigate(`${getBusinessUrl(businessId, businessName)}/followers/analytics`)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          View Details →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Total Followers */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium truncate">Followers</span>
            <Users className="w-3 h-3 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 leading-tight">
            {metrics.totalFollowers.toLocaleString()}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium truncate">Campaigns</span>
            <Target className="w-3 h-3 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 leading-tight">
            {metrics.activeCampaigns}
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium truncate">Engagement</span>
            <TrendingUp className="w-3 h-3 text-green-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 leading-tight">
            {metrics.engagementRate}%
          </div>
        </div>
      </div>
    </div>
  );
};
