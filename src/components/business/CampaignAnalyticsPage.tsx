/**
 * Campaign Analytics Page
 * Shows detailed analytics for a specific campaign
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  MousePointer,
  DollarSign,
  Calendar,
  Target,
  Eye,
  BarChart3,
  TrendingDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Campaign } from '../../types/campaigns';

export default function CampaignAnalyticsPage() {
  const { businessId, campaignId } = useParams<{ businessId: string; campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;
      setCampaign(data);
    } catch (err: any) {
      console.error('Error fetching campaign:', err);
      setError(err.message || 'Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const calculateCTR = () => {
    if (!campaign?.impressions || campaign.impressions === 0) return 0;
    return ((campaign.clicks || 0) / campaign.impressions) * 100;
  };

  const calculateCPC = () => {
    if (!campaign?.clicks || campaign.clicks === 0) return 0;
    return campaign.total_budget_cents / 100 / campaign.clicks;
  };

  const calculateCPM = () => {
    if (!campaign?.impressions || campaign.impressions === 0) return 0;
    return (campaign.total_budget_cents / 100 / campaign.impressions) * 1000;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-96 mb-6" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error || 'Campaign not found'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/business/${businessId}/campaigns`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-gray-600 mt-1">{campaign.description}</p>
            </div>
            <Badge
              variant="outline"
              className={`capitalize ${
                campaign.status === 'active'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : campaign.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}
            >
              {campaign.status}
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Impressions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Impressions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatNumber(campaign.impressions || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clicks */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clicks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatNumber(campaign.clicks || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    CTR: {calculateCTR().toFixed(2)}%
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <MousePointer className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reach */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Estimated Reach</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatNumber(campaign.estimated_reach || 0)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spend */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Budget</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(campaign.total_budget_cents)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Cost Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Metrics</CardTitle>
              <CardDescription>Average costs per action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost Per Click (CPC)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{calculateCPC().toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost Per Mille (CPM)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{calculateCPM().toFixed(2)}
                  </p>
                </div>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Duration and targeting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Start Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(campaign.start_date).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">End Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {campaign.end_date
                      ? new Date(campaign.end_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Ongoing'}
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for charts */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
            <CardDescription>Coming soon: Interactive charts showing campaign performance trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">Performance charts coming soon</p>
                <p className="text-sm text-gray-500 mt-1">
                  Track impressions, clicks, and conversions over time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
