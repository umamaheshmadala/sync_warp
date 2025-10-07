import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Save, AlertCircle, CheckCircle, Users, Target, TrendingUp, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type Business = Database['public']['Tables']['businesses']['Row'];

interface EnhancedProfileTabProps {
  businessId: string;
  business: Business;
  isOwner: boolean;
  onUpdate?: () => void;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
}

interface PillOption {
  value: string;
  label: string;
}

export const EnhancedProfileTab: React.FC<EnhancedProfileTabProps> = ({
  businessId,
  business,
  isOwner,
  onUpdate
}) => {
  const [sections, setSections] = useState<Section[]>([
    { id: 'customer-profile', title: 'Customer Profile', icon: <Users className="w-5 h-5" />, isOpen: true },
    { id: 'metrics', title: 'Business Metrics', icon: <TrendingUp className="w-5 h-5" />, isOpen: false },
    { id: 'goals', title: 'Goals & Objectives', icon: <Target className="w-5 h-5" />, isOpen: false },
  ]);

  // Options for multiple choice questions
  const ageRangeOptions: PillOption[] = [
    { value: '18-24', label: '18-24' },
    { value: '25-34', label: '25-34' },
    { value: '35-44', label: '35-44' },
    { value: '45-54', label: '45-54' },
    { value: '55-64', label: '55-64' },
    { value: '65+', label: '65+' },
  ];

  const incomeLevelOptions: PillOption[] = [
    { value: 'budget', label: 'Budget ($0-30k)' },
    { value: 'moderate', label: 'Moderate ($30k-60k)' },
    { value: 'comfortable', label: 'Comfortable ($60k-100k)' },
    { value: 'affluent', label: 'Affluent ($100k+)' },
  ];

  const interestsOptions: PillOption[] = [
    { value: 'health-wellness', label: 'Health & Wellness' },
    { value: 'technology', label: 'Technology' },
    { value: 'outdoor', label: 'Outdoor Activities' },
    { value: 'food-dining', label: 'Food & Dining' },
    { value: 'fashion', label: 'Fashion & Style' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'sports', label: 'Sports & Fitness' },
    { value: 'arts-culture', label: 'Arts & Culture' },
    { value: 'family', label: 'Family & Kids' },
    { value: 'business', label: 'Business & Professional' },
  ];

  const customerBehaviorOptions: PillOption[] = [
    { value: 'convenience', label: 'Seeking Convenience' },
    { value: 'quality', label: 'Quality Focused' },
    { value: 'price-sensitive', label: 'Price Sensitive' },
    { value: 'experience', label: 'Experience Seekers' },
    { value: 'loyal', label: 'Brand Loyal' },
    { value: 'impulse', label: 'Impulse Buyers' },
  ];

  const transactionRangeOptions: PillOption[] = [
    { value: '0-25', label: '$0-$25' },
    { value: '25-50', label: '$25-$50' },
    { value: '50-100', label: '$50-$100' },
    { value: '100-200', label: '$100-$200' },
    { value: '200+', label: '$200+' },
  ];

  const customerBaseSizeOptions: PillOption[] = [
    { value: '0-100', label: '0-100 customers' },
    { value: '100-500', label: '100-500 customers' },
    { value: '500-1000', label: '500-1,000 customers' },
    { value: '1000-5000', label: '1,000-5,000 customers' },
    { value: '5000+', label: '5,000+ customers' },
  ];

  const visitFrequencyOptions: PillOption[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'occasional', label: 'Occasional' },
  ];

  const peakHoursOptions: PillOption[] = [
    { value: 'early-morning', label: 'Early Morning (6-9 AM)' },
    { value: 'mid-morning', label: 'Mid Morning (9-12 PM)' },
    { value: 'lunch', label: 'Lunch (12-2 PM)' },
    { value: 'afternoon', label: 'Afternoon (2-5 PM)' },
    { value: 'evening', label: 'Evening (5-8 PM)' },
    { value: 'night', label: 'Night (8-11 PM)' },
    { value: 'late-night', label: 'Late Night (11 PM+)' },
  ];

  const businessGoalsOptions: PillOption[] = [
    { value: 'increase-awareness', label: 'Increase Brand Awareness' },
    { value: 'boost-sales', label: 'Boost Sales' },
    { value: 'customer-retention', label: 'Improve Customer Retention' },
    { value: 'expand-market', label: 'Expand Market Reach' },
    { value: 'new-customers', label: 'Acquire New Customers' },
    { value: 'loyalty-program', label: 'Build Loyalty Program' },
  ];

  const budgetRangeOptions: PillOption[] = [
    { value: '0-500', label: '$0-$500/month' },
    { value: '500-1000', label: '$500-$1,000/month' },
    { value: '1000-2500', label: '$1,000-$2,500/month' },
    { value: '2500-5000', label: '$2,500-$5,000/month' },
    { value: '5000+', label: '$5,000+/month' },
  ];

  const campaignTypesOptions: PillOption[] = [
    { value: 'social-media', label: 'Social Media Ads' },
    { value: 'email', label: 'Email Marketing' },
    { value: 'coupons', label: 'Coupons & Discounts' },
    { value: 'events', label: 'Local Events' },
    { value: 'influencer', label: 'Influencer Marketing' },
    { value: 'seo', label: 'SEO & Content' },
    { value: 'print', label: 'Print Advertising' },
  ];

  // Form state - using arrays for multi-select
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [selectedIncomeLevels, setSelectedIncomeLevels] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  
  const [selectedTransactionRange, setSelectedTransactionRange] = useState<string>('');
  const [selectedCustomerBaseSize, setSelectedCustomerBaseSize] = useState<string>('');
  const [selectedVisitFrequency, setSelectedVisitFrequency] = useState<string>('');
  const [selectedPeakHours, setSelectedPeakHours] = useState<string[]>([]);
  
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [selectedCampaignTypes, setSelectedCampaignTypes] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load existing data
  useEffect(() => {
    const loadEnhancedProfile = async () => {
      try {
        setLoading(true);

        // Parse stored JSON data
        const parseJsonSafe = (value: any): string[] => {
          if (!value) return [];
          if (typeof value === 'string') {
            try {
              return JSON.parse(value);
            } catch {
              return value.split(',').map(s => s.trim()).filter(Boolean);
            }
          }
          if (Array.isArray(value)) return value;
          return [];
        };

        setSelectedAgeRanges(parseJsonSafe((business as any).target_age_range));
        setSelectedIncomeLevels(parseJsonSafe((business as any).target_income_level));
        setSelectedInterests(parseJsonSafe((business as any).target_interests));
        setSelectedBehaviors(parseJsonSafe((business as any).customer_pain_points));
        
        setSelectedTransactionRange((business as any).avg_transaction_value || '');
        setSelectedCustomerBaseSize((business as any).customer_retention_rate || '');
        setSelectedVisitFrequency((business as any).monthly_revenue || '');
        setSelectedPeakHours(parseJsonSafe((business as any).peak_hours));
        
        setSelectedGoals(parseJsonSafe((business as any).business_goals));
        setSelectedBudget((business as any).marketing_budget || '');
        setSelectedCampaignTypes(parseJsonSafe((business as any).expansion_plans));
      } catch (error) {
        console.error('Error loading enhanced profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedProfile();
  }, [business, businessId]);

  const toggleSection = (sectionId: string) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId ? { ...section, isOpen: !section.isOpen } : section
      )
    );
  };

  const toggleMultiSelect = (value: string, selected: string[], setter: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter(v => v !== value));
    } else {
      setter([...selected, value]);
    }
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSingleSelect = (value: string, setter: (val: string) => void) => {
    setter(value);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!isOwner) {
      setSaveError('Only business owners can update this profile');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const updateData = {
        target_age_range: JSON.stringify(selectedAgeRanges),
        target_income_level: JSON.stringify(selectedIncomeLevels),
        target_interests: JSON.stringify(selectedInterests),
        customer_pain_points: JSON.stringify(selectedBehaviors),
        avg_transaction_value: selectedTransactionRange,
        customer_retention_rate: selectedCustomerBaseSize,
        monthly_revenue: selectedVisitFrequency,
        peak_hours: JSON.stringify(selectedPeakHours),
        business_goals: JSON.stringify(selectedGoals),
        marketing_budget: selectedBudget,
        expansion_plans: JSON.stringify(selectedCampaignTypes),
      };

      console.log('Saving enhanced profile:', updateData);

      const { data, error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', businessId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Save successful:', data);
      setSaveSuccess(true);
      onUpdate?.();

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating business profile:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Pill component for better reusability
  const Pill: React.FC<{
    label: string;
    selected: boolean;
    onClick: () => void;
  }> = ({ label, selected, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        selected
          ? 'bg-indigo-600 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 text-gray-500">
          <AlertCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold text-gray-900">Access Restricted</h3>
            <p className="text-sm">Only business owners can view and edit the enhanced profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Status Messages */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">Profile updated successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{saveError}</span>
        </div>
      )}

      {/* Customer Profile Section */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <button
          onClick={() => toggleSection('customer-profile')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="text-indigo-600">
              {sections.find(s => s.id === 'customer-profile')?.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Customer Profile</h3>
          </div>
          {sections.find(s => s.id === 'customer-profile')?.isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {sections.find(s => s.id === 'customer-profile')?.isOpen && (
          <div className="p-6 pt-0 space-y-6 border-t">
            {/* Target Age Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Target Age Range <span className="text-gray-400">(Select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ageRangeOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedAgeRanges.includes(option.value)}
                    onClick={() => toggleMultiSelect(option.value, selectedAgeRanges, setSelectedAgeRanges)}
                  />
                ))}
              </div>
            </div>

            {/* Target Income Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Target Income Level <span className="text-gray-400">(Select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {incomeLevelOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedIncomeLevels.includes(option.value)}
                    onClick={() => toggleMultiSelect(option.value, selectedIncomeLevels, setSelectedIncomeLevels)}
                  />
                ))}
              </div>
            </div>

            {/* Target Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Target Interests <span className="text-gray-400">(Select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {interestsOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedInterests.includes(option.value)}
                    onClick={() => toggleMultiSelect(option.value, selectedInterests, setSelectedInterests)}
                  />
                ))}
              </div>
            </div>

            {/* Customer Behavior */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Customer Behavior <span className="text-gray-400">(Select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {customerBehaviorOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedBehaviors.includes(option.value)}
                    onClick={() => toggleMultiSelect(option.value, selectedBehaviors, setSelectedBehaviors)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Business Metrics Section */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <button
          onClick={() => toggleSection('metrics')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="text-indigo-600">
              {sections.find(s => s.id === 'metrics')?.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Business Metrics</h3>
          </div>
          {sections.find(s => s.id === 'metrics')?.isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {sections.find(s => s.id === 'metrics')?.isOpen && (
          <div className="p-6 pt-0 space-y-6 border-t">
            {/* Average Transaction Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Average Transaction Value <span className="text-gray-400">(Select one)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {transactionRangeOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedTransactionRange === option.value}
                    onClick={() => handleSingleSelect(option.value, setSelectedTransactionRange)}
                  />
                ))}
              </div>
            </div>

            {/* Customer Base Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Customer Base Size <span className="text-gray-400">(Select one)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {customerBaseSizeOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedCustomerBaseSize === option.value}
                    onClick={() => handleSingleSelect(option.value, setSelectedCustomerBaseSize)}
                  />
                ))}
              </div>
            </div>

            {/* Visit Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Average Visit Frequency <span className="text-gray-400">(Select one)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {visitFrequencyOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedVisitFrequency === option.value}
                    onClick={() => handleSingleSelect(option.value, setSelectedVisitFrequency)}
                  />
                ))}
              </div>
            </div>

            {/* Peak Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Peak Business Hours <span className="text-gray-400">(Select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {peakHoursOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedPeakHours.includes(option.value)}
                    onClick={() => toggleMultiSelect(option.value, selectedPeakHours, setSelectedPeakHours)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Goals & Objectives Section */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <button
          onClick={() => toggleSection('goals')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="text-indigo-600">
              {sections.find(s => s.id === 'goals')?.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Goals & Objectives</h3>
          </div>
          {sections.find(s => s.id === 'goals')?.isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {sections.find(s => s.id === 'goals')?.isOpen && (
          <div className="p-6 pt-0 space-y-6 border-t">
            {/* Primary Business Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Primary Business Goals <span className="text-gray-400">(Select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {businessGoalsOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedGoals.includes(option.value)}
                    onClick={() => toggleMultiSelect(option.value, selectedGoals, setSelectedGoals)}
                  />
                ))}
              </div>
            </div>

            {/* Monthly Marketing Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Monthly Marketing Budget <span className="text-gray-400">(Select one)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {budgetRangeOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedBudget === option.value}
                    onClick={() => handleSingleSelect(option.value, setSelectedBudget)}
                  />
                ))}
              </div>
            </div>

            {/* Preferred Campaign Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred Campaign Types <span className="text-gray-400">(Select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {campaignTypesOptions.map(option => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={selectedCampaignTypes.includes(option.value)}
                    onClick={() => toggleMultiSelect(option.value, selectedCampaignTypes, setSelectedCampaignTypes)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-md hover:shadow-lg"
        >
          <Save className="w-5 h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default EnhancedProfileTab;
