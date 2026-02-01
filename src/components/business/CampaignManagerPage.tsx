/**
 * Campaign Manager Page
 * Main page for business owners to view and manage their campaigns
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  Plus,
  TrendingUp,
  Users,
  IndianRupee,
  Calendar,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Trash2,
  Edit,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Campaign } from '../../types/campaigns';

export default function CampaignManagerPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchCampaigns();
    }
  }, [businessId]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCampaigns(data || []);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'draft': return <Edit className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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

  // Handler functions
  const handleViewAnalytics = (campaignId: string) => {
    navigate(`${getBusinessUrl(businessId!)}/campaigns/${campaignId}/analytics`);
  };

  const handleEdit = (campaignId: string, campaign: Campaign) => {
    // If it's a draft, navigate to wizard with draftId to resume editing
    if (campaign.status === 'draft') {
      navigate(`${getBusinessUrl(businessId!)}/campaigns/create?draftId=${campaignId}`);
    } else {
      // For active/paused campaigns, navigate to edit page (to be implemented)
      navigate(`${getBusinessUrl(businessId!)}/campaigns/${campaignId}/edit`);
    }
  };

  const handlePause = async (campaignId: string) => {
    if (!confirm('Are you sure you want to pause this campaign?')) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      if (error) throw error;
      fetchCampaigns(); // Refresh list
    } catch (err: any) {
      console.error('Error pausing campaign:', err);
      alert('Failed to pause campaign: ' + err.message);
    }
  };

  const handleResume = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId);

      if (error) throw error;
      fetchCampaigns(); // Refresh list
    } catch (err: any) {
      console.error('Error resuming campaign:', err);
      alert('Failed to resume campaign: ' + err.message);
    }
  };

  const handleDelete = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Are you sure you want to delete "${campaignName}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      fetchCampaigns(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting campaign:', err);
      alert('Failed to delete campaign: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
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
            to={`/business/dashboard`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Campaign Manager</h1>
              <p className="text-gray-600 mt-1">
                Create and manage marketing campaigns for your business
              </p>
            </div>
            <Button
              onClick={() => navigate(`${getBusinessUrl(businessId!)}/campaigns/create`)}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Campaign
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && campaigns.length === 0 && !error && (
          <Card className="text-center py-12">
            <CardContent>
              <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No campaigns yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first marketing campaign
              </p>
              <Button
                onClick={() => navigate(`${getBusinessUrl(businessId!)}/campaigns/create`)}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Campaigns List */}
        {campaigns.length > 0 && (
          <div className="grid gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{campaign.name}</CardTitle>
                        <Badge variant="outline" className={getStatusColor(campaign.status)}>
                          {getStatusIcon(campaign.status)}
                          <span className="ml-1 capitalize">{campaign.status}</span>
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {campaign.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    {/* Budget */}
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <IndianRupee className="w-4 h-4" />
                        Total Budget
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(campaign.total_budget_cents)}
                      </div>
                    </div>

                    {/* Impressions */}
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        Impressions
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatNumber(campaign.impressions || 0)}
                      </div>
                    </div>

                    {/* Clicks */}
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Users className="w-4 h-4" />
                        Clicks
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatNumber(campaign.clicks || 0)}
                      </div>
                      {campaign.clicks && campaign.impressions && (
                        <div className="text-xs text-gray-500">
                          {((campaign.clicks / campaign.impressions) * 100).toFixed(2)}% CTR
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        Duration
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(campaign.start_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' - '}
                        {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        }) : 'Ongoing'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAnalytics(campaign.id)}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(campaign.id, campaign)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {campaign.status === 'draft' ? 'Resume' : 'Edit'}
                    </Button>
                    {campaign.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePause(campaign.id)}
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    {campaign.status === 'paused' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResume(campaign.id)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(campaign.id, campaign.name)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
