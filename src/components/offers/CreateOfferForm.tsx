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
  Loader2,
  // Categories
  Repeat,
  Package,
  Layers,
  Percent,
  Wallet,
  ShoppingCart,
  Users,
  Clock,
  Ticket,
  Tag,
  CreditCard,
  Gift,
  PlusCircle,
  Shield,
  Zap,
  X,
} from 'lucide-react';
import { useOfferMetadata } from '../../hooks/useOfferMetadata';
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
  { id: 1, title: 'Offer Type', icon: Tag, description: 'Select category' },
  { id: 2, title: 'Available Offers', icon: Zap, description: 'Select specific offer' },
  { id: 3, title: 'Offer Details', icon: FileText, description: 'Customize details' },
  { id: 4, title: 'Review', icon: Eye, description: 'Review and publish' },
];

const ICON_MAP: Record<string, any> = {
  'repeat': Repeat,
  'package': Package,
  'layers': Layers,
  'percent': Percent,
  'wallet': Wallet,
  'shopping-cart': ShoppingCart,
  'users': Users,
  'clock': Clock,
  'ticket': Ticket,
  'tag': Tag,
  'credit-card': CreditCard,
  'gift': Gift,
  'calendar': Calendar,
  'plus-circle': PlusCircle,
  'shield': Shield,
  'zap': Zap,
};

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
    offer_type_id: undefined,
  });

  const { categories, offerTypes, isLoading: isMetadataLoading } = useOfferMetadata();
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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
      // Determine step based on data completeness or draft state
      // If we have an offer_type_id, we can potentially go to step 2, but let's respect saved step
      setCurrentStep(currentDraft.step_completed + 1 > 4 ? 4 : currentDraft.step_completed + 1);

      // If offer_type_id exists, try to set selectedCategory
      if (currentDraft.form_data.offer_type_id && offerTypes.length > 0) {
        const type = offerTypes.find(t => t.id === currentDraft.form_data.offer_type_id);
        if (type) setSelectedCategory(type.category_id);
      } else if (currentDraft.step_completed >= 1) {
        // If we saved at step 1 or higher but no offer_type_id (maybe mid-selection?), try to restore
        // For now, if no offer_type_id, we probably restart at step 1 or 2 if we can track category
      }
    }
  }, [currentDraft, offerTypes]);

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
        return !!selectedCategory;
      case 2:
        return !!formData.offer_type_id;
      case 3:
        // Validate all fields in combined step 3 (was step 2)
        return !!(
          formData.title && formData.title.trim().length > 0 &&
          formData.valid_from && formData.valid_until &&
          formData.terms_conditions && formData.terms_conditions.trim().length > 0
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      // Pre-fill data if moving from Step 2 to Step 3
      if (currentStep === 2 && formData.offer_type_id && !formData.title) {
        const type = offerTypes.find(t => t.id === formData.offer_type_id);
        if (type) {
          setFormData(prev => ({
            ...prev,
            title: type.offer_name,
            description: type.description || prev.description,
            // Could also pre-fill terms based on category/type if we had that data
          }));
        }
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

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

    if (onComplete && offer) {
      onComplete(offer.id);
    } else if (onCancel) {
      onCancel();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1SelectCategory
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => {
              setSelectedCategory(id);
              // Auto-advance is often nice for tiles, but let's stick to handleNext calls
              // or we can invoke handleNext here if we want immediate transition
            }}
            isLoading={isMetadataLoading}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <Step2SelectOfferType
            formData={formData}
            onChange={handleChange}
            offerTypes={offerTypes}
            selectedCategory={selectedCategory}
            onNext={handleNext} // Just in case we want double click
          />
        );
      case 3:
        return (
          <CombinedOfferForm
            formData={formData}
            onChange={handleChange}
            businessId={businessId}
          />
        );
      case 4:
        return <Step4Review formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full flex flex-col relative">
      {/* Progress Bar - Compact & Sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 p-4 shrink-0 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  <p className={`text-xs font-medium mt-1 ${isActive ? 'text-purple-600' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-16 mx-2 rounded transition-colors ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 p-6">
        {renderStepContent()}
      </div>

      {/* Navigation - Sticky Bottom */}
      <div className="sticky bottom-0 z-20 p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] gap-2">
        {/* Left Side: Cancel & Previous */}
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center min-w-[40px] md:min-w-0"
              title="Cancel"
            >
              <X className="w-5 h-5 md:hidden" />
              <span className="hidden md:inline">Cancel</span>
            </button>
          )}

          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors bg-white min-w-[40px] md:min-w-0 justify-center"
              title="Previous Step"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden md:inline">Previous</span>
            </button>
          )}
        </div>

        {/* Right Side: Save & Next */}
        <div className="flex gap-2">
          {/* Save Draft & Exit button */}
          <button
            onClick={handleSaveAndExit}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 bg-white min-w-[40px] md:min-w-0 justify-center"
            title="Save as draft and exit"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span className="hidden md:inline">Save & Exit</span>
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[80px] justify-center"
            >
              <span className="hidden md:inline">Next</span>
              <span className="md:hidden">Next</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isCreating || !validateStep(4)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[100px] justify-center"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden md:inline">Publishing...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Publish</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step1SelectCategory({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading,
  onNext
}: {
  categories: any[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  isLoading: boolean;
  onNext: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-500">Loading offer catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Choose Offer Type</h2>
        <p className="text-gray-600 mb-6">Select a category to see available offers.</p>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {categories.map(cat => {
            const Icon = ICON_MAP[cat.icon_name] || Tag;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  // Optional: Auto-advance could be handled here or by user clicking Next
                }}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:bg-purple-50 ${selectedCategory === cat.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-200'
                  }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${selectedCategory === cat.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium text-center ${selectedCategory === cat.id ? 'text-purple-700' : 'text-gray-700'
                  }`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step2SelectOfferType({
  formData,
  onChange,
  offerTypes,
  selectedCategory,
  onNext
}: {
  formData: Partial<OfferFormData>;
  onChange: (field: keyof OfferFormData, value: any) => void;
  offerTypes: any[];
  selectedCategory: string;
  onNext: () => void;
}) {
  const filteredTypes = selectedCategory
    ? offerTypes.filter(t => t.category_id === selectedCategory)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Available Offers</h2>
        <p className="text-gray-600 mb-6">Select the specific type of offer you want to create.</p>

        <div className="space-y-3">
          {filteredTypes.length > 0 ? filteredTypes.map(type => (
            <label
              key={type.id}
              className={`flex items-start p-4 rounded-xl border cursor-pointer hover:bg-gray-50 transition-all ${formData.offer_type_id === type.id
                ? 'border-purple-600 ring-1 ring-purple-600 bg-purple-50'
                : 'border-gray-200'
                }`}
            >
              <input
                type="radio"
                name="offer_type"
                className="mt-1 w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                checked={formData.offer_type_id === type.id}
                onChange={() => onChange('offer_type_id', type.id)}
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{type.offer_name}</span>
                  {type.frequency === 'Very frequently' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                <p className="text-xs text-gray-400 mt-1 italic">Ex: {type.example}</p>
              </div>
            </label>
          )) : (
            <div className="text-center py-8 text-gray-500">
              No offer types found for this category.
            </div>
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
        <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h2>

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
        <h2 className="text-lg font-bold text-gray-900 mb-4">Validity Period</h2>

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
        <h2 className="text-lg font-bold text-gray-900 mb-4">Terms & Conditions</h2>

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



// Step 4: Review
function Step4Review({ formData }: { formData: Partial<OfferFormData> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Offer</h2>
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

    </div>
  );
}

export default CreateOfferForm;
