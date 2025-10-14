/**
 * CampaignWizard Component
 * Phase 4: UI Components
 * 
 * Multi-step campaign creation wizard with form validation and preview
 */

import React, { useState } from 'react';
import type { CreateCampaignRequest, TargetingRules, AdFormat, CampaignPriority } from '../../types/campaigns';
import { Alert, ProgressBar } from '../shared/SharedComponents';

// ============================================================================
// TYPES
// ============================================================================

interface CampaignWizardProps {
  onSubmit: (campaign: CreateCampaignRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type WizardStep = 'basic' | 'details' | 'targeting' | 'review';

interface WizardFormData {
  name: string;
  description: string;
  business_id: string;
  city_id?: string;
  ad_format: AdFormat;
  priority: CampaignPriority;
  budget: number;
  target_impressions: number;
  start_date: string;
  end_date: string;
  targeting_rules: TargetingRules;
}

// ============================================================================
// VALIDATION
// ============================================================================

const validateBasic = (data: Partial<WizardFormData>): string[] => {
  const errors: string[] = [];
  if (!data.name || data.name.trim().length < 3) {
    errors.push('Campaign name must be at least 3 characters');
  }
  if (!data.business_id || data.business_id.trim().length === 0) {
    errors.push('Business ID is required');
  }
  return errors;
};

const validateDetails = (data: Partial<WizardFormData>): string[] => {
  const errors: string[] = [];
  if (!data.ad_format) {
    errors.push('Ad format is required');
  }
  if (!data.budget || data.budget <= 0) {
    errors.push('Budget must be greater than 0');
  }
  if (!data.target_impressions || data.target_impressions <= 0) {
    errors.push('Target impressions must be greater than 0');
  }
  if (!data.start_date) {
    errors.push('Start date is required');
  }
  if (!data.end_date) {
    errors.push('End date is required');
  }
  if (data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date)) {
    errors.push('End date must be after start date');
  }
  return errors;
};

// ============================================================================
// STEP COMPONENTS
// ============================================================================

const BasicInfoStep: React.FC<{
  data: Partial<WizardFormData>;
  onChange: (field: keyof WizardFormData, value: any) => void;
}> = ({ data, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Campaign Name *
        </label>
        <input
          type="text"
          value={data.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="e.g., Summer Promotion 2024"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Describe your campaign objectives..."
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business ID *
        </label>
        <input
          type="text"
          value={data.business_id || ''}
          onChange={(e) => onChange('business_id', e.target.value)}
          placeholder="Enter your business ID"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          City ID (Optional)
        </label>
        <input
          type="text"
          value={data.city_id || ''}
          onChange={(e) => onChange('city_id', e.target.value)}
          placeholder="Leave empty for all cities"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />
      </div>
    </div>
  );
};

const DetailsStep: React.FC<{
  data: Partial<WizardFormData>;
  onChange: (field: keyof WizardFormData, value: any) => void;
}> = ({ data, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ad Format *
        </label>
        <select
          value={data.ad_format || ''}
          onChange={(e) => onChange('ad_format', e.target.value as AdFormat)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select ad format...</option>
          <option value="banner">Banner</option>
          <option value="video">Video</option>
          <option value="native">Native</option>
          <option value="interstitial">Interstitial</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority *
        </label>
        <select
          value={data.priority || 'medium'}
          onChange={(e) => onChange('priority', e.target.value as CampaignPriority)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Budget (USD) *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={data.budget || ''}
            onChange={(e) => onChange('budget', parseFloat(e.target.value))}
            placeholder="1000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Impressions *
          </label>
          <input
            type="number"
            min="0"
            value={data.target_impressions || ''}
            onChange={(e) => onChange('target_impressions', parseInt(e.target.value))}
            placeholder="10000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="datetime-local"
            value={data.start_date || ''}
            onChange={(e) => onChange('start_date', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date *
          </label>
          <input
            type="datetime-local"
            value={data.end_date || ''}
            onChange={(e) => onChange('end_date', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

const TargetingStep: React.FC<{
  data: Partial<WizardFormData>;
  onChange: (field: keyof WizardFormData, value: any) => void;
}> = ({ data, onChange }) => {
  const [targetingJson, setTargetingJson] = useState(
    JSON.stringify(data.targeting_rules || {}, null, 2)
  );

  const handleJsonChange = (value: string) => {
    setTargetingJson(value);
    try {
      const parsed = JSON.parse(value);
      onChange('targeting_rules', parsed);
    } catch (e) {
      // Invalid JSON, don't update
    }
  };

  return (
    <div className="space-y-6">
      <Alert
        variant="info"
        title="Targeting Configuration"
        message="Configure your targeting rules using JSON format. Leave empty to target all users."
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Targeting Rules (JSON)
        </label>
        <textarea
          value={targetingJson}
          onChange={(e) => handleJsonChange(e.target.value)}
          rows={15}
          placeholder={`{
  "driver_score_min": 70,
  "driver_score_max": 100,
  "verification_status": ["verified"],
  "activity_level": ["high", "medium"]
}`}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="mt-2 text-sm text-gray-500">
          Advanced targeting options. Consult documentation for available fields.
        </p>
      </div>
    </div>
  );
};

const ReviewStep: React.FC<{ data: Partial<WizardFormData> }> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Alert
        variant="info"
        title="Review Your Campaign"
        message="Please review all details before creating the campaign."
      />

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-900">Name:</dt>
              <dd className="text-sm text-gray-600">{data.name}</dd>
            </div>
            {data.description && (
              <div>
                <dt className="text-sm font-medium text-gray-900">Description:</dt>
                <dd className="text-sm text-gray-600">{data.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-900">Business ID:</dt>
              <dd className="text-sm text-gray-600 font-mono">{data.business_id}</dd>
            </div>
            {data.city_id && (
              <div>
                <dt className="text-sm font-medium text-gray-900">City ID:</dt>
                <dd className="text-sm text-gray-600 font-mono">{data.city_id}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Campaign Details</h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-900">Ad Format:</dt>
              <dd className="text-sm text-gray-600 capitalize">{data.ad_format}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Priority:</dt>
              <dd className="text-sm text-gray-600 capitalize">{data.priority}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Budget:</dt>
              <dd className="text-sm text-gray-600">{formatCurrency(data.budget || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Target Impressions:</dt>
              <dd className="text-sm text-gray-600">{data.target_impressions?.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Start Date:</dt>
              <dd className="text-sm text-gray-600">{data.start_date ? formatDate(data.start_date) : 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">End Date:</dt>
              <dd className="text-sm text-gray-600">{data.end_date ? formatDate(data.end_date) : 'Not set'}</dd>
            </div>
          </dl>
        </div>

        {data.targeting_rules && Object.keys(data.targeting_rules).length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Targeting Rules</h3>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
              {JSON.stringify(data.targeting_rules, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [formData, setFormData] = useState<Partial<WizardFormData>>({
    priority: 'medium',
    targeting_rules: {}
  });
  const [errors, setErrors] = useState<string[]>([]);

  const steps: { id: WizardStep; label: string; index: number }[] = [
    { id: 'basic', label: 'Basic Info', index: 0 },
    { id: 'details', label: 'Details', index: 1 },
    { id: 'targeting', label: 'Targeting', index: 2 },
    { id: 'review', label: 'Review', index: 3 }
  ];

  const currentStepIndex = steps.find(s => s.id === currentStep)?.index || 0;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleChange = (field: keyof WizardFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const handleNext = () => {
    let validationErrors: string[] = [];

    if (currentStep === 'basic') {
      validationErrors = validateBasic(formData);
    } else if (currentStep === 'details') {
      validationErrors = validateDetails(formData);
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
      setErrors([]);
    }
  };

  const handleSubmit = async () => {
    const allErrors = [
      ...validateBasic(formData),
      ...validateDetails(formData)
    ];

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    try {
      await onSubmit(formData as CreateCampaignRequest);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to create campaign']);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Campaign</h2>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <ProgressBar value={progress} max={100} showPercentage={false} />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center ${
                step.index < currentStepIndex
                  ? 'text-blue-600'
                  : step.index === currentStepIndex
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step.index < currentStepIndex
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : step.index === currentStepIndex
                    ? 'border-blue-600 text-blue-600'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {step.index < currentStepIndex ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step.index + 1
                )}
              </div>
              <span className="ml-2 text-sm hidden sm:inline">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6">
          <Alert
            variant="error"
            title="Validation Errors"
            message={
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
          />
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {currentStep === 'basic' && (
          <BasicInfoStep data={formData} onChange={handleChange} />
        )}
        {currentStep === 'details' && (
          <DetailsStep data={formData} onChange={handleChange} />
        )}
        {currentStep === 'targeting' && (
          <TargetingStep data={formData} onChange={handleChange} />
        )}
        {currentStep === 'review' && <ReviewStep data={formData} />}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>

        <div className="flex gap-3">
          {currentStepIndex > 0 && (
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
          )}

          {currentStep !== 'review' ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;
