import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Percent,
  IndianRupee,
  Gift,
  Calendar,
  Users,
  Settings,
  AlertCircle,
  Clock,
  Target,
  Tag,
  QrCode
} from 'lucide-react';
import {
  CouponFormData,
  CouponType,
  DiscountType,
  TargetAudience,
  COUPON_LIMITS
} from '../../types/coupon';
import { useCoupons } from '../../hooks/useCoupons';
import useCouponDrafts, { DraftFormData } from '../../hooks/useCouponDrafts';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { useRateLimit } from '../../hooks/useRateLimit';
import { RateLimitBanner } from '../common/RateLimitBanner';
import { RateLimitError } from '../../services/rateLimitService';

interface CouponCreatorProps {
  businessId: string;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCoupon?: any; // For editing existing coupons
}

interface FormStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CouponCreator: React.FC<CouponCreatorProps> = ({
  businessId,
  businessName,
  isOpen,
  onClose,
  onSuccess,
  editingCoupon
}) => {
  const { createCoupon, updateCoupon, loading, generateCouponCode } = useCoupons();
  const drafts = useCouponDrafts(businessId);
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [previewCode, setPreviewCode] = useState('');
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);

  // Determine if editing mode (must be before useRateLimit)
  const isEditing = !!editingCoupon;

  // Rate limiting
  const { enforceRateLimit, isRateLimited } = useRateLimit({
    endpoint: isEditing ? 'coupons/update' : 'coupons/create',
    autoCheck: true
  });

  // Prevent form reset on tab switch or hot reload
  const formStateKey = `coupon-form-${businessId}-${isEditing ? editingCoupon?.id : 'new'}`;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<CouponFormData>({
    defaultValues: {
      title: editingCoupon?.title || '',
      description: editingCoupon?.description || '',
      type: editingCoupon?.type || 'percentage',
      discount_type: editingCoupon?.discount_type || 'percentage',
      discount_value: editingCoupon?.discount_value || 10,
      min_purchase_amount: editingCoupon?.min_purchase_amount || undefined,
      max_discount_amount: editingCoupon?.max_discount_amount || undefined,
      terms_conditions: editingCoupon?.terms_conditions || '',
      total_limit: editingCoupon?.total_limit || undefined,
      per_user_limit: editingCoupon?.per_user_limit || 1,
      valid_from: editingCoupon?.valid_from
        ? new Date(editingCoupon.valid_from).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      valid_until: editingCoupon?.valid_until
        ? new Date(editingCoupon.valid_until).toISOString().slice(0, 16)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 30 days from now
      target_audience: editingCoupon?.target_audience || 'all_users',
      is_public: editingCoupon?.is_public ?? true
    }
  });

  const watchedType = watch('type');
  const watchedDiscountValue = watch('discount_value');
  const watchedMinPurchase = watch('min_purchase_amount');

  // Form state management functions - memoized to prevent infinite loops
  const saveFormState = useCallback(() => {
    try {
      const formData = watch();
      const stateToSave = {
        currentStep,
        formData,
        previewCode,
        timestamp: Date.now()
      };
      sessionStorage.setItem(formStateKey, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Could not save form state:', error);
    }
  }, [watch, currentStep, previewCode, formStateKey]);

  const loadFormState = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(formStateKey);
      if (saved) {
        const { currentStep: savedStep, formData, previewCode: savedCode, timestamp } = JSON.parse(saved);

        // Only restore if less than 1 hour old
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          setCurrentStep(savedStep);
          setPreviewCode(savedCode);

          // Restore form data
          Object.keys(formData).forEach(key => {
            if (formData[key] !== undefined && formData[key] !== null) {
              setValue(key as any, formData[key]);
            }
          });

          return true; // Successfully restored
        }
      }
    } catch (error) {
      console.warn('Could not load form state:', error);
    }
    return false; // No state restored
  }, [formStateKey, setValue]);

  const clearFormState = useCallback(() => {
    try {
      sessionStorage.removeItem(formStateKey);
    } catch (error) {
      console.warn('Could not clear form state:', error);
    }
  }, [formStateKey]);

  // Draft management functions
  const saveToDrafts = useCallback(async () => {
    const formData = watch() as DraftFormData;

    // Check if form has meaningful content
    if (!drafts.hasFormContent(formData)) {
      toast.error('Please fill in some form data before saving as draft');
      return;
    }

    // Auto-generate name if none provided
    const finalDraftName = draftName.trim() || drafts.generateDraftName(formData);
    setDraftName(finalDraftName);

    const draftId = await drafts.saveDraft(
      businessId,
      finalDraftName,
      formData,
      currentStep
    );

    if (draftId) {
      setShowSaveDraftDialog(false);
      setDraftName('');
    }
  }, [watch, draftName, drafts, businessId, currentStep]);

  const loadFromDraft = useCallback((draftId: string) => {
    const draft = drafts.loadDraft(draftId);
    if (!draft) {
      toast.error('Draft not found');
      return;
    }

    // Load form data
    Object.entries(draft.form_data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        setValue(key as any, value);
      }
    });

    // Restore step if available
    if (draft.step_completed) {
      setCurrentStep(draft.step_completed);
    }

    // Update preview code if needed
    const formData = draft.form_data as DraftFormData;
    if (formData.type) {
      const code = generateCouponCode(formData.type);
      setPreviewCode(code);
    }

    setShowDrafts(false);
    toast.success(`Loaded draft: ${draft.draft_name}`);
  }, [drafts, setValue, setCurrentStep, generateCouponCode]);

  const steps: FormStep[] = [
    {
      id: 1,
      title: 'Basic Details',
      subtitle: 'Coupon name and description',
      icon: Tag
    },
    {
      id: 2,
      title: 'Discount Setup',
      subtitle: 'Type and value of discount',
      icon: Percent
    },
    {
      id: 3,
      title: 'Terms & Conditions',
      subtitle: 'Usage rules and restrictions',
      icon: Settings
    },
    {
      id: 4,
      title: 'Validity Period',
      subtitle: 'When the coupon is valid',
      icon: Calendar
    },
    {
      id: 5,
      title: 'Target Audience',
      subtitle: 'Who can use this coupon',
      icon: Users
    },
    {
      id: 6,
      title: 'Review & Create',
      subtitle: 'Confirm details and create',
      icon: Check
    }
  ];

  // Load saved form state when component mounts
  useEffect(() => {
    if (isOpen && !isEditing) {
      const restored = loadFormState();
      if (restored) {
        toast.success('Restored your previous form data', { duration: 2000 });
      }
    }
  }, [isOpen, isEditing, loadFormState]);

  // Save form state periodically and on changes
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        // Only save if there's actually form data to save
        const formData = watch();
        if (formData.title || formData.description || formData.type) {
          saveFormState();
        }
      }, 60000); // Save every 60 seconds (much less frequent)
      return () => clearInterval(interval);
    }
  }, [isOpen, watch, saveFormState]);

  // Save on visibility change (tab switch) - with debouncing
  useEffect(() => {
    if (!isOpen) return;

    let timeoutId: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Debounce the save operation
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const formData = watch();
          if (formData.title || formData.description || formData.type) {
            saveFormState();
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [isOpen, watch, saveFormState]);

  // Save on beforeunload (page refresh/close)
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const formData = watch();
      if (formData.title || formData.description || formData.type) {
        saveFormState();
        // Only show confirmation if there's unsaved data
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, watch, saveFormState]);

  // Generate preview coupon code when type changes and sync discount_type
  useEffect(() => {
    if (watchedType) {
      const code = generateCouponCode(watchedType);
      setPreviewCode(code);
      // Ensure discount_type matches type (required by database)
      setValue('discount_type', watchedType);
    }
  }, [watchedType, setValue]); // Remove generateCouponCode from dependencies to prevent infinite loop

  const couponTypes: Array<{ value: CouponType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
    {
      value: 'percentage',
      label: 'Percentage Off',
      description: 'e.g., 20% off on all items',
      icon: Percent
    },
    {
      value: 'fixed_amount',
      label: 'Fixed Amount Off',
      description: 'e.g., ₹100 off on orders',
      icon: IndianRupee
    },
    {
      value: 'buy_x_get_y',
      label: 'Buy X Get Y',
      description: 'e.g., Buy 2 Get 1 Free',
      icon: Gift
    },
    {
      value: 'free_item',
      label: 'Free Item',
      description: 'e.g., Free coffee with meal',
      icon: Gift
    }
  ];

  const targetAudiences: Array<{ value: TargetAudience; label: string; description: string }> = [
    {
      value: 'all_users',
      label: 'All Users',
      description: 'Everyone can use this coupon'
    },
    {
      value: 'new_users',
      label: 'New Customers',
      description: 'First-time visitors only'
    },
    {
      value: 'returning_users',
      label: 'Returning Customers',
      description: 'Previous customers only'
    },
    {
      value: 'frequent_users',
      label: 'Frequent Customers',
      description: 'Regular customers'
    },
    {
      value: 'drivers',
      label: 'Driver Users',
      description: 'Top 10% most active users'
    }
  ];

  // Validate current step before moving to next
  const validateCurrentStep = () => {
    const formData = watch();
    const errors: string[] = [];

    switch (currentStep) {
      case 1: // Basic Details
        if (!formData.title?.trim()) errors.push('Coupon title is required');
        if (!formData.description?.trim()) errors.push('Description is required');
        if (formData.description && formData.description.length < 10) errors.push('Description must be at least 10 characters');
        break;

      case 2: // Discount Setup
        if (!formData.type) errors.push('Discount type is required');
        if (!formData.discount_value || formData.discount_value <= 0) errors.push('Discount value must be greater than 0');
        if (formData.type === 'percentage' && formData.discount_value > 100) errors.push('Percentage cannot exceed 100%');
        break;

      case 3: // Terms & Conditions
        if (!formData.terms_conditions?.trim()) errors.push('Terms and conditions are required');
        if (formData.terms_conditions && formData.terms_conditions.length < 20) errors.push('Terms must be at least 20 characters');
        if (!formData.per_user_limit || formData.per_user_limit < 1) errors.push('Per user limit must be at least 1');
        break;

      case 4: // Validity Period
        if (!formData.valid_from) errors.push('Start date is required');
        if (!formData.valid_until) errors.push('End date is required');
        if (formData.valid_from && formData.valid_until) {
          const startDate = new Date(formData.valid_from);
          const endDate = new Date(formData.valid_until);
          if (startDate >= endDate) errors.push('End date must be after start date');
          if (startDate < new Date()) errors.push('Start date cannot be in the past');
        }
        break;

      case 5: // Target Audience
        if (!formData.target_audience) errors.push('Target audience is required');
        break;
    }

    return errors;
  };

  const nextStep = () => {
    const validationErrors = validateCurrentStep();

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]); // Show first error
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: CouponFormData) => {
    // Check rate limit first
    try {
      await enforceRateLimit();
    } catch (error) {
      if (error instanceof RateLimitError) {
        const minutes = error.retryAfter ? Math.ceil(error.retryAfter / 60) : 1;
        toast.error(
          `Rate limit exceeded. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
          { duration: 5000 }
        );
        return;
      }
      // Other errors are logged but don't block submission
      console.warn('Rate limit check failed:', error);
    }

    // Final validation before submitting
    const validationErrors = [
      ...(!data.title?.trim() ? ['Coupon title is required'] : []),
      ...(!data.description?.trim() ? ['Description is required'] : []),
      ...(!data.type ? ['Discount type is required'] : []),
      ...(!data.discount_value || data.discount_value <= 0 ? ['Discount value is required'] : []),
      ...(!data.terms_conditions?.trim() ? ['Terms and conditions are required'] : []),
      ...(!data.valid_from ? ['Start date is required'] : []),
      ...(!data.valid_until ? ['End date is required'] : []),
      ...(!data.target_audience ? ['Target audience is required'] : []),
    ];

    if (validationErrors.length > 0) {
      toast.error(`Please complete all required fields: ${validationErrors[0]}`);
      return;
    }

    // Date validation
    const startDate = new Date(data.valid_from);
    const endDate = new Date(data.valid_until);

    if (startDate >= endDate) {
      toast.error('End date must be after start date');
      return;
    }

    if (startDate < new Date(Date.now() - 60000)) { // Allow 1 minute tolerance for current time
      toast.error('Start date cannot be in the past');
      return;
    }

    try {
      console.log('Attempting to create coupon with data:', data);
      console.log('Business ID:', businessId);
      console.log('User info:', user);

      let result;

      if (isEditing && editingCoupon) {
        result = await updateCoupon(editingCoupon.id, data);
      } else {
        result = await createCoupon(data, businessId);
      }

      console.log('Coupon creation result:', result);

      if (result) {
        clearFormState(); // Clear saved state on success
        toast.success(`Coupon ${isEditing ? 'updated' : 'created'} successfully!`);
        onSuccess();
        handleClose();
      } else {
        console.error('Coupon creation returned null/false');
        toast.error(`Failed to ${isEditing ? 'update' : 'create'} coupon. Please check your connection and try again.`);
      }
    } catch (error) {
      console.group('🚨 Coupon Creation Error Debug');
      console.error('Full error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);

      // Log the form data that failed
      console.log('Form data that failed:', data);
      console.log('Business ID:', businessId);
      console.log('User info:', {
        id: user?.id,
        email: user?.email,
        authenticated: !!user
      });

      // Try to extract Supabase error details if available
      if (error && typeof error === 'object') {
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          statusCode: error.statusCode
        });
      }

      console.groupEnd();

      let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} coupon`;

      if (error instanceof Error) {
        if (error.message.includes('Invalid business ID')) {
          errorMessage = 'Business not found. Please try refreshing the page.';
        } else if (error.message.includes('Invalid user ID')) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (error.message.includes('permission') || error.message.includes('auth')) {
          errorMessage = 'Permission denied. Please ensure you own this business.';
        } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = 'A coupon with this code already exists. Please try again.';
        } else if (error.message.includes('validation') || error.message.includes('constraint')) {
          errorMessage = 'Invalid data provided. Please check all fields and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);

      // Show suggestion to run debug test
      console.log('💡 To debug this issue, run: runCouponTest() in the browser console');
    }
  };

  const handleClose = useCallback(() => {
    clearFormState(); // Clear saved form state
    setCurrentStep(1);
    reset();
    onClose();
  }, [clearFormState, reset, onClose]);

  const formatDiscountPreview = (type: CouponType, value: number, minPurchase?: number) => {
    let discount = '';

    switch (type) {
      case 'percentage':
        discount = `${value}% OFF`;
        break;
      case 'fixed_amount':
        discount = `₹${value} OFF`;
        break;
      case 'buy_x_get_y':
        discount = `BUY ${Math.floor(value)} GET ${Math.floor(value / 2)} FREE`;
        break;
      case 'free_item':
        discount = 'FREE ITEM';
        break;
      default:
        discount = 'SPECIAL OFFER';
    }

    if (minPurchase && minPurchase > 0) {
      discount += `\nMin. purchase ₹${minPurchase}`;
    }

    return discount;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coupon Title *
              </label>
              <input
                type="text"
                {...register('title', {
                  required: 'Coupon title is required',
                  maxLength: { value: COUPON_LIMITS.MAX_TITLE_LENGTH, message: `Title cannot exceed ${COUPON_LIMITS.MAX_TITLE_LENGTH} characters` }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 20% off on all pizzas"
                maxLength={COUPON_LIMITS.MAX_TITLE_LENGTH}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Description must be at least 10 characters' },
                  maxLength: { value: COUPON_LIMITS.MAX_DESCRIPTION_LENGTH, message: `Description cannot exceed ${COUPON_LIMITS.MAX_DESCRIPTION_LENGTH} characters` }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what the coupon offers and any special details..."
                maxLength={COUPON_LIMITS.MAX_DESCRIPTION_LENGTH}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            {previewCode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Preview Code:</span>
                  <code className="text-sm font-mono bg-blue-100 px-2 py-1 rounded text-blue-800">
                    {previewCode}
                  </code>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Discount Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {couponTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <Controller
                      key={type.value}
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <label
                          className={`relative border rounded-lg p-4 cursor-pointer transition-all ${field.value === type.value
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                          <input
                            type="radio"
                            {...field}
                            value={type.value}
                            checked={field.value === type.value}
                            className="sr-only"
                            onChange={() => {
                              field.onChange(type.value);
                              setValue('discount_type', type.value === 'percentage' ? 'percentage' : 'fixed_amount');
                            }}
                          />
                          <div className="flex items-start space-x-3">
                            <IconComponent className={`w-5 h-5 mt-0.5 ${field.value === type.value ? 'text-blue-600' : 'text-gray-400'
                              }`} />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{type.label}</div>
                              <div className="text-sm text-gray-500">{type.description}</div>
                            </div>
                          </div>
                        </label>
                      )}
                    />
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {watchedType === 'percentage' ? 'Percentage Value *' :
                    watchedType === 'fixed_amount' ? 'Discount Amount (₹) *' :
                      'Quantity *'}
                </label>
                <input
                  type="number"
                  {...register('discount_value', {
                    required: 'Discount value is required',
                    min: { value: 0.01, message: 'Value must be greater than 0' },
                    max: {
                      value: watchedType === 'percentage' ? 100 : COUPON_LIMITS.MAX_FIXED_DISCOUNT_AMOUNT,
                      message: watchedType === 'percentage' ? 'Percentage cannot exceed 100%' : `Amount cannot exceed ₹${COUPON_LIMITS.MAX_FIXED_DISCOUNT_AMOUNT}`
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={watchedType === 'percentage' ? '20' : watchedType === 'fixed_amount' ? '100' : '2'}
                  step={watchedType === 'percentage' ? '0.01' : '1'}
                />
                {errors.discount_value && (
                  <p className="text-red-500 text-sm mt-1">{errors.discount_value.message}</p>
                )}
              </div>

              {watchedType === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    {...register('max_discount_amount')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional: Cap the maximum discount</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Purchase Amount (₹)
              </label>
              <input
                type="number"
                {...register('min_purchase_amount')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="200"
              />
              <p className="text-xs text-gray-500 mt-1">Optional: Minimum amount required to use this coupon</p>
            </div>

            {/* Discount Preview */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">
                  {formatDiscountPreview(watchedType, watchedDiscountValue, watchedMinPurchase)}
                </div>
                <div className="text-sm opacity-90">
                  {businessName}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms and Conditions *
              </label>
              <textarea
                {...register('terms_conditions', {
                  required: 'Terms and conditions are required',
                  minLength: { value: 20, message: 'Terms must be at least 20 characters' },
                  maxLength: { value: COUPON_LIMITS.MAX_TERMS_LENGTH, message: `Terms cannot exceed ${COUPON_LIMITS.MAX_TERMS_LENGTH} characters` }
                })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="• Valid only at our store location&#10;• Cannot be combined with other offers&#10;• One use per customer&#10;• Valid for dine-in only"
                maxLength={COUPON_LIMITS.MAX_TERMS_LENGTH}
              />
              {errors.terms_conditions && (
                <p className="text-red-500 text-sm mt-1">{errors.terms_conditions.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  {...register('total_limit')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="100"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Total number of times this coupon can be used</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Per User Limit *
                </label>
                <input
                  type="number"
                  {...register('per_user_limit', {
                    required: 'Per user limit is required',
                    min: { value: 1, message: 'Must allow at least 1 use per user' },
                    max: { value: 100, message: 'Cannot exceed 100 uses per user' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1"
                  min="1"
                  max="100"
                />
                {errors.per_user_limit && (
                  <p className="text-red-500 text-sm mt-1">{errors.per_user_limit.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid From *
                </label>
                <input
                  type="datetime-local"
                  {...register('valid_from', { required: 'Start date is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.valid_from && (
                  <p className="text-red-500 text-sm mt-1">{errors.valid_from.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until *
                </label>
                <input
                  type="datetime-local"
                  {...register('valid_until', { required: 'End date is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.valid_until && (
                  <p className="text-red-500 text-sm mt-1">{errors.valid_until.message}</p>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-900">Validity Guidelines</h4>
                  <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                    <li>Coupons must be valid for at least 1 hour</li>
                    <li>Maximum validity period is 365 days</li>
                    <li>Start time must be before end time</li>
                    <li>Consider your business hours when setting times</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Target Audience *
              </label>
              <div className="space-y-3">
                {targetAudiences.map((audience) => (
                  <Controller
                    key={audience.value}
                    name="target_audience"
                    control={control}
                    render={({ field }) => (
                      <label
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all ${field.value === audience.value
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-300 hover:border-gray-400'
                          }`}
                      >
                        <input
                          type="radio"
                          {...field}
                          value={audience.value}
                          checked={field.value === audience.value}
                          className="sr-only"
                        />
                        <div className="flex items-start space-x-3">
                          <Target className={`w-5 h-5 mt-0.5 ${field.value === audience.value ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{audience.label}</div>
                            <div className="text-sm text-gray-500">{audience.description}</div>
                          </div>
                        </div>
                      </label>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">Public Coupon</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Allow users to discover this coupon through search
                </p>
              </div>
              <Controller
                name="is_public"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                )}
              />
            </div>
          </div>
        );

      case 6:
        const formData = watch();
        const finalValidationErrors = [
          ...validateCurrentStep(),
          // Additional comprehensive validation
          ...(!formData.title?.trim() ? ['Coupon title is required'] : []),
          ...(!formData.description?.trim() ? ['Description is required'] : []),
          ...(!formData.type ? ['Discount type is required'] : []),
          ...(!formData.discount_value || formData.discount_value <= 0 ? ['Discount value is required'] : []),
          ...(!formData.terms_conditions?.trim() ? ['Terms and conditions are required'] : []),
          ...(!formData.valid_from ? ['Start date is required'] : []),
          ...(!formData.valid_until ? ['End date is required'] : []),
          ...(!formData.target_audience ? ['Target audience is required'] : []),
        ];

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Your Coupon</h3>
              <p className="text-sm text-gray-500">Please review all details before creating the coupon</p>
            </div>

            {/* Validation Errors */}
            {finalValidationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-900">Please Complete Required Fields</h4>
                    <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                      {finalValidationErrors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {finalValidationErrors.length > 5 && (
                        <li className="italic">...and {finalValidationErrors.length - 5} more issues</li>
                      )}
                    </ul>
                    <p className="text-sm text-red-600 mt-2 font-medium">
                      Go back to previous steps to fix these issues before creating the coupon.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Coupon Preview - Only show if validation passes */}
            {finalValidationErrors.length === 0 && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-bold">{businessName}</div>
                  <div className="text-right">
                    <div className="text-xs opacity-75">Code:</div>
                    <div className="text-sm font-mono">{previewCode}</div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <div className="text-3xl font-bold mb-1">
                    {formatDiscountPreview(formData.type, formData.discount_value, formData.min_purchase_amount)}
                  </div>
                  <div className="text-lg">{formData.title}</div>
                </div>

                <div className="text-sm opacity-90">
                  <div>Valid: {new Date(formData.valid_from).toLocaleDateString()} - {new Date(formData.valid_until).toLocaleDateString()}</div>
                  <div>Target: {targetAudiences.find(a => a.value === formData.target_audience)?.label}</div>
                </div>
              </div>
            )}

            {/* Summary - Only show if validation passes */}
            {finalValidationErrors.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Coupon Details</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Description:</span>
                    <p className="text-gray-900">{formData.description}</p>
                  </div>

                  <div>
                    <span className="text-gray-500">Usage Limits:</span>
                    <p className="text-gray-900">
                      {formData.total_limit ? `Total: ${formData.total_limit}` : 'Unlimited'} |
                      Per user: {formData.per_user_limit}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-gray-500">Terms:</span>
                    <p className="text-gray-900 whitespace-pre-line">{formData.terms_conditions}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success message when ready */}
            {finalValidationErrors.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900">Ready to Create</h4>
                    <p className="text-sm text-green-700">All required information is complete. Click "Create Coupon" to proceed.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Coupon' : 'Create New Coupon'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Save to Drafts Button */}
            {!isEditing && (
              <button
                type="button"
                onClick={() => setShowSaveDraftDialog(true)}
                disabled={drafts.loading || !drafts.hasFormContent(watch() as DraftFormData)}
                className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Tag className="w-4 h-4 mr-2" />
                Save to Drafts
              </button>
            )}

            {/* Load Drafts Button */}
            {!isEditing && drafts.hasDrafts && (
              <button
                type="button"
                onClick={() => setShowDrafts(true)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Drafts ({drafts.draftCount})
              </button>
            )}

            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 ${index < steps.length - 1 ? 'flex-1' : ''
                    }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${currentStep === step.id
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : currentStep > step.id
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 bg-white text-gray-500'
                      }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <IconComponent className="w-4 h-4" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rate Limit Banner */}
        {currentStep === steps.length && (
          <div className="px-6 pt-4">
            <RateLimitBanner
              endpoint={isEditing ? 'coupons/update' : 'coupons/create'}
              className="mb-0"
            />
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>

              {currentStep === steps.length ? (
                (() => {
                  const formData = watch();
                  const hasValidationErrors = [
                    ...(!formData.title?.trim() ? ['Coupon title is required'] : []),
                    ...(!formData.description?.trim() ? ['Description is required'] : []),
                    ...(!formData.type ? ['Discount type is required'] : []),
                    ...(!formData.discount_value || formData.discount_value <= 0 ? ['Discount value is required'] : []),
                    ...(!formData.terms_conditions?.trim() ? ['Terms and conditions are required'] : []),
                    ...(!formData.valid_from ? ['Start date is required'] : []),
                    ...(!formData.valid_until ? ['End date is required'] : []),
                    ...(!formData.target_audience ? ['Target audience is required'] : []),
                  ].length > 0;

                  return (
                    <motion.button
                      type="submit"
                      disabled={loading || hasValidationErrors}
                      whileHover={{ scale: (loading || hasValidationErrors) ? 1 : 1.05 }}
                      whileTap={{ scale: (loading || hasValidationErrors) ? 1 : 0.95 }}
                      className={`inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${hasValidationErrors ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                        </div>
                      ) : hasValidationErrors ? (
                        <>
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Complete Required Fields
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          {isEditing ? 'Update Coupon' : 'Create Coupon'}
                        </>
                      )}
                    </motion.button>
                  );
                })()
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>

      {/* Save Draft Dialog */}
      {showSaveDraftDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Save to Drafts
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Draft Name
              </label>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={drafts.generateDraftName(watch() as DraftFormData)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to use auto-generated name
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowSaveDraftDialog(false);
                  setDraftName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveToDrafts}
                disabled={drafts.loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {drafts.loading ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Load Drafts Dialog */}
      {showDrafts && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Load from Drafts
              </h3>
              <button
                onClick={() => setShowDrafts(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {drafts.loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : drafts.drafts.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No drafts found</h3>
                  <p className="text-sm text-gray-500">Start creating a coupon and save it as a draft.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {drafts.getDraftsByBusiness(businessId).map((draft) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {draft.draft_name}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Step {draft.step_completed} of 6</span>
                          <span>•</span>
                          <span>Updated {new Date(draft.updated_at).toLocaleDateString()}</span>
                          {draft.form_data.title && (
                            <>
                              <span>•</span>
                              <span>"{draft.form_data.title}"</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => loadFromDraft(draft.id)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this draft?')) {
                              drafts.deleteDraft(draft.id);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CouponCreator;