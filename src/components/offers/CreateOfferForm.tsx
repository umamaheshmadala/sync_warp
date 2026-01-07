// =====================================================
// Story 4.12: Business Offers Management
// Component: CreateOfferForm - Multi-step form wizard
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  FileText,
  Image as ImageIcon,
  Eye,
  Save,
  Loader2
} from 'lucide-react';
import { useOfferDrafts } from '../../hooks/useOfferDrafts';
import { useOffers } from '../../hooks/useOffers';
import type { OfferFormData } from '../../types/offers';
import { ImageUpload } from './ImageUpload';
import { supabase } from '@/lib/supabase';

interface CreateOfferFormProps {
  businessId: string;
  userId: string;
  onComplete?: (offerId?: string) => void;
  onCancel?: () => void;
  offerId?: string; // ID of existing offer to edit
}

const STEPS = [
  { id: 1, title: 'Offer Details', icon: FileText, description: 'All offer information' },
  { id: 2, title: 'Review', icon: Eye, description: 'Review and publish' },
];

export function CreateOfferForm({
  businessId,
  userId,
  onComplete,
  onCancel,
  offerId,
}: CreateOfferFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<OfferFormData>>({
    title: '',
    description: '',
    terms_conditions: '',
    icon_image_url: null,
    valid_from: '',
    valid_until: '',
  });

  // Hooks
  const {
    currentDraft,
    isSaving,
    loadDraft,
    createDraft,
    updateDraft,
  } = useOfferDrafts({
    userId,
    businessId,
  });

  const { createOffer, updateOffer, isLoading: isCreating } = useOffers({
    businessId,
    autoFetch: false,
  });

  // Load existing offer if offerId is provided
  useEffect(() => {
    const loadExistingData = async () => {
      if (offerId) {
        // Load existing offer from offers table
        const { data: offer, error } = await supabase
          .from('offers')
          .select('*')
          .eq('id', offerId)
          .single();

        if (!error && offer) {
          setFormData({
            title: offer.title,
            description: offer.description || '',
            terms_conditions: offer.terms_conditions || '',
            icon_image_url: offer.icon_image_url,
            valid_from: offer.valid_from,
            valid_until: offer.valid_until,
          });
          // Start at step 1 so user can edit all fields
          setCurrentStep(1);
        }
      } else {
        // Create new draft for autosave
        createDraft('New Offer Draft');
      }
    };

    loadExistingData();
  }, [offerId]);

  // Sync form data with loaded draft
  useEffect(() => {
    if (currentDraft) {
      setFormData(currentDraft.form_data as Partial<OfferFormData>);
      setCurrentStep(currentDraft.step_completed + 1);
    }
  }, [currentDraft]);

  // Auto-save on form data change
  useEffect(() => {
    if (currentDraft && formData) {
      updateDraft(formData, currentStep - 1);
    }
  }, [formData, currentStep, currentDraft]);

  const handleChange = (field: keyof OfferFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Validate all fields in combined step 1
        return !!(
          formData.title && formData.title.trim().length > 0 &&
          formData.valid_from && formData.valid_until &&
          formData.terms_conditions && formData.terms_conditions.trim().length > 0
        );
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 2) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    let offer;
    if (offerId) {
      // Update existing offer and set to active
      const updateData = { ...(formData as OfferFormData), status: 'active' as const };
      offer = await updateOffer(offerId, updateData);
    } else {
      // Create new offer
      offer = await createOffer(formData as OfferFormData);
    }

    if (onComplete) {
      onComplete(offer?.id);
    }
  };

  const handleSaveAndExit = async () => {
    // Save offer - preserve status when editing existing offers
    let offer;
    if (offerId) {
      // Update existing offer - DON'T change status, just save form data
      offer = await updateOffer(offerId, formData as OfferFormData);
    } else {
      // Create new draft offer
      const { data: { session } } = await supabase.auth.getSession();
      const { data: newDraft, error } = await supabase
        .from('offers')
        .insert({
          business_id: businessId,
          created_by: session?.user?.id || null,
          title: formData.title || 'Untitled Offer',
          description: formData.description || null,
          terms_conditions: formData.terms_conditions || null,
          icon_image_url: formData.icon_image_url || null,
          valid_from: formData.valid_from || new Date().toISOString(),
          valid_until: formData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'draft',
        })
        .select()
        .single();

      if (!error) offer = newDraft;
    }

    if (onCancel) {
      onCancel();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CombinedOfferForm
            formData={formData}
            onChange={handleChange}
            businessId={businessId}
          />
        );
      case 2:
        return <Step4Review formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </div>
                  <p className={`text-sm font-medium mt-2 ${isActive ? 'text-purple-600' : 'text-gray-600'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 text-center hidden sm:block">
                    {step.description}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-colors ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Auto-save indicator */}
        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving draft...</span>
          </div>
        )}
      </div>

      {/* Step Content - Scrollable */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6 max-h-[60vh] overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {/* Save Draft & Exit button */}
          <button
            onClick={handleSaveAndExit}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Save as draft and exit"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Exit
          </button>

          {currentStep < 2 ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isCreating || !validateStep(2)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Publish Offer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Combined Step: All offer details in one scrollable form
function CombinedOfferForm({
  formData,
  onChange,
  businessId,
}: {
  formData: Partial<OfferFormData>;
  onChange: (field: keyof OfferFormData, value: any) => void;
  businessId: string;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {/* Basic Information Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Basic Information</h2>
        <p className="text-gray-600 mb-4">Let's start with the basics of your offer.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offer Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="e.g., 20% Off All Items"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.title?.length || 0}/100 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Describe your offer in detail..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.description?.length || 0}/500 characters</p>
          </div>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Validity Period Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Validity Period</h2>
        <p className="text-gray-600 mb-4">Set when your offer will be active.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid From <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.valid_from || ''}
              onChange={(e) => onChange('valid_from', e.target.value)}
              min={today}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Until <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.valid_until || ''}
              onChange={(e) => onChange('valid_until', e.target.value)}
              min={formData.valid_from || today}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Terms & Conditions Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Terms & Conditions</h2>
        <p className="text-gray-600 mb-4">Add terms and an optional icon.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.terms_conditions || ''}
              onChange={(e) => onChange('terms_conditions', e.target.value)}
              placeholder="e.g., Valid on purchases above $50. Cannot be combined with other offers."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.terms_conditions?.length || 0}/1000 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon Image (Optional)
            </label>
            <ImageUpload
              value={formData.icon_image_url || null}
              onChange={(url) => onChange('icon_image_url', url)}
              businessId={businessId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Basic Info
function Step1BasicInfo({
  formData,
  onChange,
}: {
  formData: Partial<OfferFormData>;
  onChange: (field: keyof OfferFormData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
        <p className="text-gray-600">Let's start with the basics of your offer.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Offer Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="e.g., 20% Off All Items"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.title?.length || 0}/100 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Describe your offer in detail..."
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          maxLength={500}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.description?.length || 0}/500 characters</p>
      </div>
    </div>
  );
}

// Step 2: Validity Period
function Step2ValidityPeriod({
  formData,
  onChange,
}: {
  formData: Partial<OfferFormData>;
  onChange: (field: keyof OfferFormData, value: any) => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Validity Period</h2>
        <p className="text-gray-600">Set when your offer will be active.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valid From <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.valid_from || ''}
            onChange={(e) => onChange('valid_from', e.target.value)}
            min={today}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valid Until <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.valid_until || ''}
            onChange={(e) => onChange('valid_until', e.target.value)}
            min={formData.valid_from || today}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> Choose dates carefully. Your offer will automatically activate on the start date and expire on the end date.
        </p>
      </div>
    </div>
  );
}

// Step 3: Details
function Step3Details({
  formData,
  onChange,
  businessId,
}: {
  formData: Partial<OfferFormData>;
  onChange: (field: keyof OfferFormData, value: any) => void;
  businessId: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Offer Details</h2>
        <p className="text-gray-600">Add terms & conditions and an icon.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Terms & Conditions <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.terms_conditions || ''}
          onChange={(e) => onChange('terms_conditions', e.target.value)}
          placeholder="e.g., Valid on purchases above $50. Cannot be combined with other offers."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          maxLength={1000}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.terms_conditions?.length || 0}/1000 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Icon Image (Optional)
        </label>
        <ImageUpload
          value={formData.icon_image_url || null}
          onChange={(url) => onChange('icon_image_url', url)}
          businessId={businessId}
        />
      </div>
    </div>
  );
}

// Step 4: Review
function Step4Review({ formData }: { formData: Partial<OfferFormData> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Offer</h2>
        <p className="text-gray-600">Please review all details before publishing.</p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Title</h3>
          <p className="text-gray-900">{formData.title}</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
          <p className="text-gray-900">{formData.description || 'No description provided'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Valid From</h3>
            <p className="text-gray-900">
              {formData.valid_from ? new Date(formData.valid_from).toLocaleDateString() : 'Not set'}
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Valid Until</h3>
            <p className="text-gray-900">
              {formData.valid_until ? new Date(formData.valid_until).toLocaleDateString() : 'Not set'}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h3>
          <p className="text-gray-900 whitespace-pre-wrap">{formData.terms_conditions}</p>
        </div>

        {formData.icon_image_url && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Icon</h3>
            <img
              src={formData.icon_image_url}
              alt="Offer icon"
              className="w-24 h-24 rounded-lg object-cover"
            />
          </div>
        )}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-700">
          <strong>Ready to publish?</strong> Your offer will be created as a draft and you can activate it later from the offers list.
        </p>
      </div>
    </div>
  );
}

export default CreateOfferForm;
