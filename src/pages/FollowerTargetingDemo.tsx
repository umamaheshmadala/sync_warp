import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Target,
  TrendingUp,
  Bell,
  BarChart3,
  Send,
  Eye,
  MousePointer,
  IndianRupee,
  Calendar,
  Settings,
  CheckCircle,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  estimated_reach: number;
  start_date: string;
  end_date: string;
}

interface FollowerStats {
  total_followers: number;
  active_campaigns: number;
  total_impressions: number;
  engagement_rate: number;
}

export default function FollowerTargetingDemo() {
  const [stats, setStats] = useState<FollowerStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'campaigns' | 'analytics' | 'notifications'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = async () => {
    try {
      setLoading(true);

      // Get follower stats
      const { count: followerCount } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true });

      // Get campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Get total metrics
      const { data: metricsData } = await supabase
        .from('campaign_metrics')
        .select('impressions, clicks, conversions');

      const totalImpressions = metricsData?.reduce((sum, m) => sum + (m.impressions || 0), 0) || 0;
      const totalClicks = metricsData?.reduce((sum, m) => sum + (m.clicks || 0), 0) || 0;
      const engagementRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      setStats({
        total_followers: followerCount || 0,
        active_campaigns: campaignsData?.filter(c => c.status === 'active').length || 0,
        total_impressions: totalImpressions,
        engagement_rate: engagementRate,
      });

      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error loading demo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className="bg-gray-100 p-3 rounded-full">
          <Icon className="w-8 h-8" style={{ color }} />
        </div>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Followers"
          value={stats?.total_followers || 0}
          trend="+12% this week"
          color="#3B82F6"
        />
        <StatCard
          icon={Target}
          label="Active Campaigns"
          value={stats?.active_campaigns || 0}
          color="#10B981"
        />
        <StatCard
          icon={Eye}
          label="Total Impressions"
          value={(stats?.total_impressions || 0).toLocaleString()}
          trend="+24% this week"
          color="#F59E0B"
        />
        <StatCard
          icon={MousePointer}
          label="Engagement Rate"
          value={`${stats?.engagement_rate.toFixed(2)}%`}
          trend="+5.2% this week"
          color="#8B5CF6"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Key Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Advanced Targeting',
              description: 'Target followers based on engagement, interests, and demographics',
              icon: Target,
            },
            {
              title: 'Campaign Analytics',
              description: 'Track impressions, clicks, conversions, and ROI in real-time',
              icon: BarChart3,
            },
            {
              title: 'Smart Notifications',
              description: 'Send personalized updates to segmented follower groups',
              icon: Bell,
            },
            {
              title: 'Budget Management',
              description: 'Set campaign budgets and track spending automatically',
              icon: IndianRupee,
            },
          ].map((feature, idx) => (
            <div key={idx} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <feature.icon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const CampaignsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Your Campaigns</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center">
          <Send className="w-4 h-4 mr-2" />
          Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-4">Create your first campaign to start engaging with your followers</p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            Get Started
          </button>
        </div>
      ) : (
        campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{campaign.name}</h4>
                <p className="text-gray-600 text-sm mt-1">{campaign.description}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${campaign.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : campaign.status === 'draft'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-blue-100 text-blue-800'
                  }`}
              >
                {campaign.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-gray-600 text-sm">Impressions</p>
                <p className="text-2xl font-bold text-gray-900">{(campaign.impressions || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Clicks</p>
                <p className="text-2xl font-bold text-gray-900">{(campaign.clicks || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Conversions</p>
                <p className="text-2xl font-bold text-gray-900">{campaign.conversions || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Est. Reach</p>
                <p className="text-2xl font-bold text-gray-900">{campaign.estimated_reach || 0}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(campaign.start_date).toLocaleDateString()} -{' '}
                {new Date(campaign.end_date).toLocaleDateString()}
              </div>
              <div className="flex space-x-2">
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View Analytics
                </button>
                <button className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const AnalyticsTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
        Campaign Performance
      </h3>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-600 text-sm font-medium">Click-Through Rate</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">{stats?.engagement_rate.toFixed(2)}%</p>
            <p className="text-xs text-blue-600 mt-1">Industry avg: 2.5%</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-green-600 text-sm font-medium">Conversion Rate</p>
            <p className="text-3xl font-bold text-green-900 mt-2">4.2%</p>
            <p className="text-xs text-green-600 mt-1">+0.8% from last period</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-purple-600 text-sm font-medium">Avg. ROI</p>
            <p className="text-3xl font-bold text-purple-900 mt-2">3.5x</p>
            <p className="text-xs text-purple-600 mt-1">Revenue vs. Cost</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4">Campaign Insights</h4>
          <ul className="space-y-3">
            {[
              'Your engagement rate is 40% higher than the industry average',
              'Morning campaigns (8-10 AM) show 25% better performance',
              'Followers who engage with products are 3x more likely to convert',
              'Mobile users account for 78% of all campaign impressions',
            ].map((insight, idx) => (
              <li key={idx} className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const NotificationsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Follower Notifications</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center">
          <Send className="w-4 h-4 mr-2" />
          Send Update
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-semibold mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-blue-600" />
          Notification Settings
        </h4>
        <div className="space-y-3">
          {[
            { label: 'New Products', enabled: true },
            { label: 'New Offers', enabled: true },
            { label: 'New Coupons', enabled: true },
            { label: 'Announcements', enabled: true },
          ].map((setting, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">{setting.label}</span>
              <Switch
                checked={setting.enabled}
                onCheckedChange={() => { }} // Demo only
                className="pointer-events-none" // Optional: or make it interactive
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Pro Tip
        </h4>
        <p className="text-blue-800 text-sm">
          Send targeted notifications based on follower engagement to increase conversion rates by up to 40%
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading demo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Follower Targeting Demo</h1>
          <p className="text-gray-600">
            Experience powerful follower engagement and campaign management features
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'campaigns', label: 'Campaigns', icon: Target },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'notifications', label: 'Notifications', icon: Bell },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center px-6 py-4 font-medium transition whitespace-nowrap ${selectedTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {selectedTab === 'overview' && <OverviewTab />}
          {selectedTab === 'campaigns' && <CampaignsTab />}
          {selectedTab === 'analytics' && <AnalyticsTab />}
          {selectedTab === 'notifications' && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}
