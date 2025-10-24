// src/pages/examples/CreateCampaignExample.tsx
// Example page demonstrating how to create a campaign with follower targeting

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CampaignTargetingForm } from '../../components/campaign';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Send } from 'lucide-react';

export const CreateCampaignExample: React.FC = () => {
  const navigate = useNavigate();
  const [campaignData, setCampaignData] = useState({
    title: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
  });
  const [targeting, setTargeting] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // In a real app, get businessId from auth context or route params
  const businessId = 'your-business-id';

  const handleSaveDraft = async () => {
    if (!campaignData.title) {
      toast.error('Please enter a campaign title');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from('campaigns').insert({
        business_id: businessId,
        title: campaignData.title,
        description: campaignData.description,
        budget: parseFloat(campaignData.budget) || null,
        start_date: campaignData.startDate || null,
        end_date: campaignData.endDate || null,
        status: 'draft',
        targeting_filters: targeting || {},
      }).select().single();

      if (error) throw error;

      toast.success('Campaign draft saved!');
      navigate(`/campaigns/${data.id}`);
    } catch (err) {
      console.error('Error saving campaign:', err);
      toast.error('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!campaignData.title) {
      toast.error('Please enter a campaign title');
      return;
    }

    if (!campaignData.startDate) {
      toast.error('Please set a start date');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from('campaigns').insert({
        business_id: businessId,
        title: campaignData.title,
        description: campaignData.description,
        budget: parseFloat(campaignData.budget) || null,
        start_date: campaignData.startDate,
        end_date: campaignData.endDate || null,
        status: 'active',
        targeting_filters: targeting || {},
      }).select().single();

      if (error) throw error;

      toast.success('Campaign published successfully!');
      navigate(`/campaigns/${data.id}/analytics`);
    } catch (err) {
      console.error('Error publishing campaign:', err);
      toast.error('Failed to publish campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
          <p className="mt-2 text-gray-600">
            Set up your marketing campaign with targeted audience reach
          </p>
        </div>

        {/* Campaign Details Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Details</h2>
          
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                id="title"
                value={campaignData.title}
                onChange={(e) => setCampaignData({ ...campaignData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Summer Sale 2025"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={campaignData.description}
                onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe your campaign..."
              />
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                Budget (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  id="budget"
                  value={campaignData.budget}
                  onChange={(e) => setCampaignData({ ...campaignData, budget: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={campaignData.startDate}
                  onChange={(e) => setCampaignData({ ...campaignData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={campaignData.endDate}
                  onChange={(e) => setCampaignData({ ...campaignData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Targeting Form */}
        <CampaignTargetingForm
          businessId={businessId}
          onTargetingChange={(newTargeting) => {
            setTargeting(newTargeting);
            console.log('Targeting updated:', newTargeting);
          }}
        />

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>
            
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{saving ? 'Publishing...' : 'Publish Campaign'}</span>
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips for Better Campaigns</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Target your followers for higher engagement rates</li>
            <li>• Use demographic filters to reach your ideal audience</li>
            <li>• Monitor your campaign analytics to optimize performance</li>
            <li>• Start with a smaller budget and scale up based on results</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignExample;
