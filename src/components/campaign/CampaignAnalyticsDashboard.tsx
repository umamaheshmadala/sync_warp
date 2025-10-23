// src/components/campaign/CampaignAnalyticsDashboard.tsx
// Analytics dashboard for tracking campaign performance and follower engagement

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  Heart,
  Share2,
  Target,
  Calendar,
  Download,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  clickThroughRate: number;
  engagementRate: number;
  followerReach: number;
  publicReach: number;
  conversionRate: number;
  topPerformingDemographic: {
    segment: string;
    engagementRate: number;
  };
  dailyMetrics: Array<{
    date: string;
    impressions: number;
    clicks: number;
    engagement: number;
  }>;
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  targeting_filters?: any;
}

interface CampaignAnalyticsDashboardProps {
  campaignId: string;
  businessId: string;
}

export const CampaignAnalyticsDashboard: React.FC<CampaignAnalyticsDashboardProps> = ({
  campaignId,
  businessId,
}) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    loadCampaignData();
  }, [campaignId, timeRange]);

  const loadCampaignData = async () => {
    setLoading(true);
    try {
      // Load campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Load campaign metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId);

      if (metricsError) throw metricsError;

      // Calculate aggregated metrics
      const aggregated = calculateMetrics(metricsData || []);
      setMetrics(aggregated);
    } catch (err) {
      console.error('Error loading campaign data:', err);
      toast.error('Failed to load campaign analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (rawMetrics: any[]): CampaignMetrics => {
    const totalImpressions = rawMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalClicks = rawMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
    const totalLikes = rawMetrics.reduce((sum, m) => sum + (m.likes || 0), 0);
    const totalShares = rawMetrics.reduce((sum, m) => sum + (m.shares || 0), 0);

    const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const engagementRate =
      totalImpressions > 0
        ? ((totalClicks + totalLikes + totalShares) / totalImpressions) * 100
        : 0;

    // Group by demographic
    const demographicMetrics: Record<string, { impressions: number; engagement: number }> = {};
    rawMetrics.forEach(m => {
      const demo = m.demographic || 'unknown';
      if (!demographicMetrics[demo]) {
        demographicMetrics[demo] = { impressions: 0, engagement: 0 };
      }
      demographicMetrics[demo].impressions += m.impressions || 0;
      demographicMetrics[demo].engagement +=
        (m.clicks || 0) + (m.likes || 0) + (m.shares || 0);
    });

    const topDemographic = Object.entries(demographicMetrics)
      .map(([segment, data]) => ({
        segment,
        engagementRate: data.impressions > 0 ? (data.engagement / data.impressions) * 100 : 0,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate)[0] || {
      segment: 'N/A',
      engagementRate: 0,
    };

    // Group by date for daily metrics
    const dailyData: Record<string, { impressions: number; clicks: number; engagement: number }> =
      {};
    rawMetrics.forEach(m => {
      const date = m.created_at ? new Date(m.created_at).toISOString().split('T')[0] : 'unknown';
      if (!dailyData[date]) {
        dailyData[date] = { impressions: 0, clicks: 0, engagement: 0 };
      }
      dailyData[date].impressions += m.impressions || 0;
      dailyData[date].clicks += m.clicks || 0;
      dailyData[date].engagement += (m.clicks || 0) + (m.likes || 0) + (m.shares || 0);
    });

    const dailyMetrics = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      likes: totalLikes,
      shares: totalShares,
      clickThroughRate,
      engagementRate,
      followerReach: rawMetrics.filter(m => m.is_follower).length,
      publicReach: rawMetrics.filter(m => !m.is_follower).length,
      conversionRate: 0, // Placeholder
      topPerformingDemographic: topDemographic,
      dailyMetrics,
    };
  };

  const exportData = () => {
    if (!metrics || !campaign) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Campaign', campaign.title],
      ['Total Impressions', metrics.impressions.toString()],
      ['Total Clicks', metrics.clicks.toString()],
      ['Total Likes', metrics.likes.toString()],
      ['Total Shares', metrics.shares.toString()],
      ['CTR (%)', metrics.clickThroughRate.toFixed(2)],
      ['Engagement Rate (%)', metrics.engagementRate.toFixed(2)],
      ['Follower Reach', metrics.followerReach.toString()],
      ['Public Reach', metrics.publicReach.toString()],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaignId}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Analytics exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!campaign || !metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-8 w-8 text-indigo-600 mr-3" />
              Campaign Analytics
            </h1>
            <p className="mt-2 text-gray-600">{campaign.title}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Started: {new Date(campaign.created_at).toLocaleDateString()}
              </span>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  campaign.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : campaign.status === 'completed'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                )}
              >
                {campaign.status}
              </span>
            </div>
          </div>
          <button
            onClick={exportData}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex items-center space-x-2">
        {(['7d', '30d', 'all'] as const).map(range => (
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
            {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Impressions</span>
            <Eye className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.impressions.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total views</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Clicks</span>
            <MousePointer className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.clicks.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">CTR: {metrics.clickThroughRate.toFixed(2)}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Engagement</span>
            <Heart className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {(metrics.likes + metrics.shares).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Rate: {metrics.engagementRate.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Shares</span>
            <Share2 className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.shares.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Viral coefficient</p>
        </div>
      </div>

      {/* Reach Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 text-indigo-600 mr-2" />
            Audience Reach
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Follower Reach</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {metrics.followerReach.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">
                  {metrics.impressions > 0
                    ? ((metrics.followerReach / metrics.impressions) * 100).toFixed(1)
                    : 0}
                  %
                </p>
                <p className="text-xs text-gray-500">of total</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Public Reach</p>
                <p className="text-2xl font-bold text-gray-600">
                  {metrics.publicReach.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">
                  {metrics.impressions > 0
                    ? ((metrics.publicReach / metrics.impressions) * 100).toFixed(1)
                    : 0}
                  %
                </p>
                <p className="text-xs text-gray-500">of total</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 text-indigo-600 mr-2" />
            Top Performing Segment
          </h3>
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Demographic</p>
            <p className="text-2xl font-bold text-indigo-600 mb-4">
              {metrics.topPerformingDemographic.segment}
            </p>
            <div className="flex items-baseline space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">
                {metrics.topPerformingDemographic.engagementRate.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-600">engagement rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Performance Chart (Simplified) */}
      {metrics.dailyMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance</h3>
          <div className="space-y-2">
            {metrics.dailyMetrics.slice(-7).map((day, index) => (
              <div key={index} className="flex items-center space-x-4">
                <span className="text-xs text-gray-600 w-24">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className="flex-1 flex items-center space-x-2">
                  <div
                    className="h-8 bg-indigo-200 rounded"
                    style={{
                      width: `${Math.max(
                        (day.impressions / Math.max(...metrics.dailyMetrics.map(d => d.impressions))) * 100,
                        5
                      )}%`,
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {day.impressions.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignAnalyticsDashboard;
