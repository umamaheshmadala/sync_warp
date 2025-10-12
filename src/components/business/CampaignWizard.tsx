/**
 * Campaign Wizard Component
 * Multi-step wizard for creating new campaigns
 * Integrates: TargetingEditor, ReachEstimator, TargetingValidator, RecommendationCard
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { TargetingEditor } from '../campaign/TargetingEditor';
import { ReachEstimator } from '../campaign/ReachEstimator';
import { TargetingValidator } from '../campaign/TargetingValidator';
import { RecommendationCard } from '../campaign/RecommendationCard';
import { supabase } from '../../lib/supabase';
import type { TargetingRules } from '../../types/campaigns';

type Step = 1 | 2 | 3 | 4;

interface CampaignFormData {
  name: string;
  description: string;
  campaign_type: string;
  total_budget_cents: number;
  start_date: string;
  end_date: string;
  targeting_rules: TargetingRules;
  target_drivers_only: boolean;
}

export default function CampaignWizard() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    campaign_type: 'coupons',
    total_budget_cents: 1000000, // ₹10,000 default
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    targeting_rules: {
      demographics: {},
      location: {},
      behavior: {},
    },
    target_drivers_only: false,
  });

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateTargetingRules = (rules: TargetingRules) => {
    // Auto-detect if targeting power users
    const isDriverOnly = rules.behavior?.isDriver === true;
    // Update both at once to prevent multiple re-renders
    updateFormData({ 
      targeting_rules: rules,
      target_drivers_only: isDriverOnly 
    });
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const { data, error: submitError } = await supabase
        .from('campaigns')
        .insert({
          business_id: businessId,
          name: formData.name,
          description: formData.description,
          campaign_type: formData.campaign_type,
          targeting_rules: formData.targeting_rules,
          target_drivers_only: formData.target_drivers_only,
          total_budget_cents: formData.total_budget_cents,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          status: 'draft',
          impressions: 0,
          clicks: 0,
          conversions: 0,
        })
        .select()
        .single();

      if (submitError) throw submitError;

      // Success! Navigate back to campaign manager
      navigate(`/business/${businessId}/campaigns`);
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      setError(err.message || 'Failed to create campaign');
      setIsSubmitting(false);
    }
  };

  const getStepProgress = () => {
    return (currentStep / 4) * 100;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== '' && formData.total_budget_cents > 0;
      case 2:
        return true; // Targeting is optional
      case 3:
        return true; // Review step
      case 4:
        return true; // Final confirmation
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/business/${businessId}/campaigns`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Campaign</h1>
          <p className="text-gray-600">
            Step {currentStep} of 4: {
              currentStep === 1 ? 'Basic Information' :
              currentStep === 2 ? 'Target Audience' :
              currentStep === 3 ? 'Review & Optimize' :
              'Confirm & Launch'
            }
          </p>

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={getStepProgress()} className="h-2" />
          </div>
        </div>

        {/* Error Display */}
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

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Set up the basic information for your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Welcome New Users, Power User Rewards"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the goal and target audience for this campaign"
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="campaign_type">Campaign Type</Label>
                  <select
                    id="campaign_type"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.campaign_type}
                    onChange={(e) => updateFormData({ campaign_type: e.target.value })}
                  >
                    <option value="coupons">Coupons</option>
                    <option value="ads">Advertisements</option>
                    <option value="events">Events</option>
                    <option value="promotions">Promotions</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Total Budget (₹) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="100"
                    step="100"
                    value={formData.total_budget_cents / 100}
                    onChange={(e) => updateFormData({ total_budget_cents: parseFloat(e.target.value) * 100 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => updateFormData({ start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => updateFormData({ end_date: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Targeting */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <TargetingEditor
                value={formData.targeting_rules}
                onChange={updateTargetingRules}
                showValidation={true}
              />
            </div>
            <div className="space-y-6">
              <ReachEstimator
                targetingRules={formData.targeting_rules}
                budget={formData.total_budget_cents / 100}
                updateInterval={3000}
                useMockData={true}
              />
              <TargetingValidator
                targetingRules={formData.targeting_rules}
              />
            </div>
          </div>
        )}

        {/* Step 3: Review & Recommendations */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Summary</CardTitle>
                <CardDescription>
                  Review your campaign details before launching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Campaign Name</div>
                    <div className="font-medium">{formData.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Campaign Type</div>
                    <div className="font-medium capitalize">{formData.campaign_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Budget</div>
                    <div className="font-medium">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                      }).format(formData.total_budget_cents / 100)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Duration</div>
                    <div className="font-medium">
                      {new Date(formData.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {formData.end_date ? new Date(formData.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Ongoing'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <RecommendationCard
              businessId={businessId!}
              currentTargeting={formData.targeting_rules}
              budget={formData.total_budget_cents / 100}
              onApply={updateTargetingRules}
              useMockData={true}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ReachEstimator
                targetingRules={formData.targeting_rules}
                budget={formData.total_budget_cents / 100}
                updateInterval={5000}
                useMockData={true}
              />
              <TargetingValidator
                targetingRules={formData.targeting_rules}
              />
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to Launch</CardTitle>
              <CardDescription>
                Your campaign is ready to go live
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Check className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">Campaign Ready</h3>
                </div>
                <p className="text-blue-700 mb-4">
                  Your campaign "{formData.name}" is configured and ready to launch. Once created, it will be saved as a draft and you can activate it when ready.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Estimated Reach:</span>
                    <span className="text-blue-900 ml-2">~5,000 users</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Campaign Type:</span>
                    <span className="text-blue-900 ml-2 capitalize">{formData.campaign_type}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Campaign
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
