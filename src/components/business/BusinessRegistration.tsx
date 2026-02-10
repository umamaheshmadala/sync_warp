import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Camera,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  X,
  Plus,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { RegistrationCompleteScreen } from './RegistrationCompleteScreen';
import { BusinessSearchInput } from './BusinessSearchInput';
import { BusinessPhoneVerification } from './BusinessPhoneVerification';
import { Step0_SmartSearch, BusinessPrefillData } from './onboarding/steps/Step0_SmartSearch';
import { Step1_PhoneVerify } from './onboarding/steps/Step1_PhoneVerify';
import { Step2_BasicDetails } from './onboarding/steps/Step2_BasicDetails';
import { Step4_OperatingHours } from './onboarding/steps/Step4_OperatingHours';
import { parseOpeningHours, parseWeekdayTextToHours } from '@/services/businessSearchService';
import { useQueryClient } from '@tanstack/react-query';

// TypeScript interfaces
interface OperatingHours {
  open: string;
  close: string;
  closed: boolean;
}

interface SocialMedia {
  facebook: string;
  instagram: string;
  twitter: string;
}

interface BusinessFormData {
  businessName: string;
  businessType: string;
  category: string;
  description: string;
  businessEmail: string;
  businessPhone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string;
  socialMedia: SocialMedia;
  operatingHours: Record<string, OperatingHours>;
  tags: string[];
  googlePlaceId?: string;
  phone_verified?: boolean;
  claim_status?: 'verified' | 'unclaimed' | 'pending' | 'manual';
  phone_verified_at?: string;
  // Enhanced Google Places fields
  googleRating?: number;
  googleUserRatingsTotal?: number;
  googlePriceLevel?: number;
  googleMapsUrl?: string;
  googleBusinessStatus?: string;
  googlePhotoReference?: string;
}

interface BusinessCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  is_active: boolean;
  sort_order: number;
}

interface SelectedImages {
  logo: File | null;
  cover: File | null;
  gallery: File[];
}

const BusinessRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0); // Start at Step 0 (Search)
  const [loading, setLoading] = useState(false);
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImages>({ logo: null, cover: null, gallery: [] });
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [registeredBusinessId, setRegisteredBusinessId] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false); // Can we proceed?
  const [isOtpVerified, setIsOtpVerified] = useState(false); // Did we actually verify?

  // Form data state
  const [formData, setFormData] = useState<BusinessFormData>({
    // Step 1: Basic Information
    businessName: '',
    businessType: '',
    category: '',
    description: '',
    businessEmail: '',
    businessPhone: '',

    // Step 2: Location & Contact
    address: '',
    city: '',
    state: '',
    postalCode: '',
    latitude: null,
    longitude: null,
    websiteUrl: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    },

    // Step 3: Operating Hours
    operatingHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: true }
    },

    // Step 4: Media & Final Details
    tags: [],

    // Internal State
    googlePlaceId: undefined,
    phone_verified: false,
    claim_status: 'unclaimed'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prefilledFields, setPrefilledFields] = useState<string[]>([]);

  // Fetch business categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('business_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (error) throw error;
        setBusinessCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load business categories');
      }
    };

    fetchCategories();
  }, []);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle nested object changes (social media, operating hours)
  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Handle operating hours changes
  const handleOperatingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }));
  };

  // Handle tags
  const handleAddTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };



  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle bulk operating hours change (from templates)
  const handleBulkOperatingHoursChange = (hours) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: hours
    }));
  };

  // Handle image uploads
  const handleImageUpload = async (file, type) => {
    if (!file) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `business_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  // Form validation for each step
  const validateStep = (step) => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!phoneVerified) {
          toast.error('Please verify your phone number or click Skip');
          return false;
        }
        break;

      case 2:
        if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
        if (!formData.businessType) newErrors.businessType = 'Business type is required';
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (formData.businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) {
          newErrors.businessEmail = 'Please enter a valid email';
        }
        break;

      case 3:
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (formData.websiteUrl && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
          newErrors.websiteUrl = 'Please enter a valid URL (including http/https)';
        }
        break;

      case 4:
        // Operating hours validation - ensure open time is before close time
        Object.keys(formData.operatingHours).forEach(day => {
          const hours = formData.operatingHours[day];
          if (!hours.closed && hours.open >= hours.close) {
            newErrors[`${day}_hours`] = 'Opening time must be before closing time';
          }
        });
        break;

      case 5:
        // No required validations for final step
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Get location using geocoding API
  const handleGetLocation = async () => {
    if (!formData.address || !formData.city) {
      toast.error('Please enter address and city first');
      return;
    }

    try {
      const query = `${formData.address}, ${formData.city}, ${formData.state}`;
      const response = await fetch(
        `https://api.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        }));
        toast.success('Location coordinates added successfully');
      } else {
        toast.error('Could not find location. Please check your address.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to get location coordinates');
    }
  };

  // Submit business registration
  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setLoading(true);
    try {
      // Upload images
      let logoUrl = null, coverUrl = null, galleryUrls = [];

      if (selectedImages.logo) {
        logoUrl = await handleImageUpload(selectedImages.logo, 'logo');
      }

      if (selectedImages.cover) {
        coverUrl = await handleImageUpload(selectedImages.cover, 'cover');
      }

      if (selectedImages.gallery.length > 0) {
        const galleryPromises = selectedImages.gallery.map(
          (file, index) => handleImageUpload(file, `gallery_${index}`)
        );
        galleryUrls = (await Promise.all(galleryPromises)).filter(url => url);
      }

      // Prepare business data
      const businessData = {
        user_id: user.id,
        business_name: formData.businessName,
        business_type: formData.businessType,
        description: formData.description,
        business_email: formData.businessEmail,
        business_phone: formData.businessPhone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        operating_hours: formData.operatingHours,
        categories: [formData.category],
        tags: formData.tags,
        logo_url: logoUrl,
        cover_image_url: coverUrl,
        gallery_images: galleryUrls,
        website_url: formData.websiteUrl,
        google_place_id: formData.googlePlaceId || null,

        phone_verified: isOtpVerified,
        claim_status: isOtpVerified ? 'verified' : 'unclaimed',
        status: 'pending', // Will need admin approval

        // Enhanced Google Places fields
        google_rating: formData.googleRating || null,
        google_user_ratings_total: formData.googleUserRatingsTotal || null,
        google_price_level: formData.googlePriceLevel ?? null,
        google_maps_url: formData.googleMapsUrl || null,
        google_business_status: formData.googleBusinessStatus || null,
        google_photo_reference: formData.googlePhotoReference || null
      };

      const { data: newBusiness, error } = await supabase
        .from('businesses')
        .insert([businessData])
        .select('id')
        .single();

      if (error) {
        console.error('[Registration] Supabase error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // Show transition screen instead of navigating directly
      setRegisteredBusinessId(newBusiness.id);

      // Invalidate dashboard query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['businessDashboard'] });

      setShowCompletionScreen(true);
      toast.success('Business registration submitted successfully!');

    } catch (error: any) {
      console.error('[Registration] Error:', error);
      toast.error(error?.message || 'Failed to register business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step components
  const renderStep2 = () => (
    <Step2_BasicDetails
      formData={formData}
      onFieldChange={handleInputChange}
      prefilledFields={prefilledFields}
      categories={businessCategories}
      errors={errors}
    />
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address *
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          rows={3}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.address ? 'border-red-500' : 'border-gray-300'
            }`}
          placeholder="Enter full address"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="City"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State *
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.state ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="State"
          />
          {errors.state && (
            <p className="mt-1 text-sm text-red-600">{errors.state}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="123456"
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-blue-800">Location Coordinates</p>
          <button
            type="button"
            onClick={handleGetLocation}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            <MapPin className="w-4 h-4 inline mr-1" />
            Get Location
          </button>
        </div>
        {formData.latitude && formData.longitude ? (
          <p className="text-sm text-green-600">
            ✓ Location set: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Click "Get Location" to automatically set coordinates based on your address
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website URL
        </label>
        <input
          type="url"
          value={formData.websiteUrl}
          onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.websiteUrl ? 'border-red-500' : 'border-gray-300'
            }`}
          placeholder="https://yourwebsite.com"
        />
        {errors.websiteUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.websiteUrl}</p>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Social Media (Optional)</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook
            </label>
            <input
              type="url"
              value={formData.socialMedia.facebook}
              onChange={(e) => handleNestedChange('socialMedia', 'facebook', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://facebook.com/yourpage"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram
            </label>
            <input
              type="url"
              value={formData.socialMedia.instagram}
              onChange={(e) => handleNestedChange('socialMedia', 'instagram', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://instagram.com/youraccount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twitter
            </label>
            <input
              type="url"
              value={formData.socialMedia.twitter}
              onChange={(e) => handleNestedChange('socialMedia', 'twitter', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://twitter.com/youraccount"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <Step4_OperatingHours
      operatingHours={formData.operatingHours}
      onHoursChange={handleOperatingHoursChange}
      onBulkHoursChange={handleBulkOperatingHoursChange}
      errors={errors}
    />
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-700 mb-4">Business Images</h4>

        {/* Logo Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImages(prev => ({ ...prev, logo: e.target.files[0] }))}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className="cursor-pointer">
              {selectedImages.logo ? (
                <div className="flex items-center justify-center">
                  <img
                    src={URL.createObjectURL(selectedImages.logo)}
                    alt="Logo preview"
                    className="w-16 h-16 object-cover rounded"
                  />
                  <p className="ml-3 text-sm text-gray-600">{selectedImages.logo.name}</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload logo</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Image
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImages(prev => ({ ...prev, cover: e.target.files[0] }))}
              className="hidden"
              id="cover-upload"
            />
            <label htmlFor="cover-upload" className="cursor-pointer">
              {selectedImages.cover ? (
                <div className="flex items-center justify-center">
                  <img
                    src={URL.createObjectURL(selectedImages.cover)}
                    alt="Cover preview"
                    className="w-24 h-16 object-cover rounded"
                  />
                  <p className="ml-3 text-sm text-gray-600">{selectedImages.cover.name}</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload cover image</p>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (for better discoverability)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm flex items-center"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 text-indigo-600 hover:text-indigo-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            placeholder="Add a tag..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const target = e.target as HTMLInputElement;
                handleAddTag(target.value.trim());
                target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const input = target.previousElementSibling as HTMLInputElement;
              if (input) {
                handleAddTag(input.value.trim());
                input.value = '';
              }
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Press Enter or click + to add tags. Tags help users discover your business.
        </p>
      </div>

      {/* Registration Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-700 mb-3">Registration Summary</h5>
        <div className="space-y-2 text-sm">
          <p><strong>Business:</strong> {formData.businessName}</p>
          <p><strong>Type:</strong> {formData.businessType}</p>
          <p><strong>Category:</strong> {businessCategories.find(cat => cat.name === formData.category)?.display_name}</p>
          <p><strong>Location:</strong> {formData.city}, {formData.state}</p>
          <p><strong>Status:</strong> Will be set to "Pending Approval"</p>
        </div>
      </div>
    </div>
  );



  /* Step 1: Phone Verification */
  const renderStep1 = () => (
    <Step1_PhoneVerify
      phoneNumber={formData.businessPhone}
      businessName={formData.businessName}
      isPrefilledFromGoogle={!!formData.googlePlaceId}
      onPhoneChange={(phone) => setFormData(prev => ({ ...prev, businessPhone: phone }))}
      onVerified={() => {
        setIsOtpVerified(true);
        // Also update the form data status immediately
        setFormData(prev => ({ ...prev, phone_verified: true, claim_status: 'verified' }));
        toast.success("Phone verified successfully!");
        setCurrentStep(2);
      }}
      onSkip={() => {
        setIsOtpVerified(false);
        setFormData(prev => ({ ...prev, phone_verified: false, claim_status: 'unclaimed' }));
        toast('Verification skipped. You can verify later.', { icon: '⚠️' });
        setCurrentStep(2);
      }}
    />
  );

  const steps = [
    { number: 0, title: 'Find Business', icon: Search },
    { number: 1, title: 'Verify Phone', icon: Phone },
    { number: 2, title: 'Basic Info', icon: User },
    { number: 3, title: 'Location', icon: MapPin },
    { number: 4, title: 'Hours', icon: Clock },
    { number: 5, title: 'Final Details', icon: Camera }
  ];

  // Handle business selection from Google Places search
  const handleBusinessSelect = (business: BusinessPrefillData) => {
    // Determine which fields are being pre-filled
    const newPrefilledFields: string[] = [];
    if (business.name) newPrefilledFields.push('businessName');
    if (business.phone) newPrefilledFields.push('businessPhone');
    if (business.category) newPrefilledFields.push('category');

    setPrefilledFields(newPrefilledFields);

    // Parse opening hours from Google if available
    let parsedHours: Record<string, OperatingHours> | undefined;
    if (business.openingPeriods && business.openingPeriods.length > 0) {
      // Use actual periods data from Google Places API
      const googleHours = parseOpeningHours({
        weekday_text: business.openingHours || [],
        periods: business.openingPeriods
      });
      if (googleHours) {
        parsedHours = googleHours;
        newPrefilledFields.push('operatingHours');
      }
    } else if (business.openingHours && business.openingHours.length > 0) {
      // Fallback: parse weekday_text strings like "Monday: 8:00 AM – 10:00 PM"
      parsedHours = parseWeekdayTextToHours(business.openingHours);
      if (parsedHours) {
        newPrefilledFields.push('operatingHours');
      }
    }

    // Pre-fill form with Google Places data
    setFormData(prev => ({
      ...prev,
      businessName: business.name,
      businessPhone: business.phone,
      websiteUrl: business.website,
      address: business.address,
      city: business.city,
      state: business.state,
      postalCode: business.postalCode,
      latitude: business.latitude,
      longitude: business.longitude,
      googlePlaceId: business.googlePlaceId,
      category: business.category || prev.category,
      // Enhanced Google Places fields
      googleRating: business.rating,
      googleUserRatingsTotal: business.userRatingsTotal,
      googlePriceLevel: business.priceLevel,
      googleMapsUrl: business.googleMapsUrl,
      googleBusinessStatus: business.businessStatus,
      googlePhotoReference: business.photoReference,
      // Operating hours pre-fill
      ...(parsedHours ? { operatingHours: parsedHours } : {})
    }));

    toast.success(`Found "${business.name}"! Details pre-filled.`);
    setCurrentStep(1); // Move to Step 1 (Basic Info)
  };

  // Handle manual entry (business not found in Google)
  const handleManualEntry = (businessName: string) => {
    if (businessName) {
      setFormData(prev => ({
        ...prev,
        businessName: businessName
      }));
    }
    setCurrentStep(1); // Move to Step 1 (Basic Info)
  };

  // Render  /* Step 0: Smart Search */
  const renderStep0 = () => (
    <Step0_SmartSearch
      onBusinessSelected={handleBusinessSelect}
      onAddNewBusiness={handleManualEntry}
      onSkipToManual={() => {
        handleManualEntry('');
      }}
    />
  );

  // Show completion screen if registration successful
  if (showCompletionScreen && registeredBusinessId) {
    return (
      <RegistrationCompleteScreen
        businessId={registeredBusinessId}
        businessName={formData.businessName}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register Your Business</h1>
          <p className="text-gray-600">Join SynC and start connecting with local customers</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <div key={step.number} className="flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                    }`}>
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <p className={`text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-600'
                    }`}>
                    {step.title}
                  </p>
                </div>
                {step.number < steps.length && (
                  <div className={`h-1 mt-6 ${step.number < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 0 && renderStep0()}
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation - Hide on Step 0 */}
        {currentStep > 0 && (
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center px-6 py-2 rounded-lg ${currentStep === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessRegistration;