import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { parseBusinessIdentifier } from '../../utils/slugUtils';
import {
  Edit3,
  Save,
  X,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  Camera,
  Star,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Calendar,
  Tag,
  ArrowLeft,
  Home,
  ChevronRight,
  Package,
  MessageSquare,
  Info,
  Navigation
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Geolocation } from '@capacitor/geolocation';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import FeaturedProducts from './FeaturedProducts';
import FeaturedOffers from './FeaturedOffers';
import GoogleMapsLocationPicker from '../maps/GoogleMapsLocationPicker';
import BusinessReviews from '../reviews/BusinessReviews';
import BusinessReviewForm from '../reviews/BusinessReviewForm';
import EnhancedProfileTab from './EnhancedProfileTab';
import { useUserCheckin } from '../../hooks/useUserCheckin';
import { useReviewStats } from '../../hooks/useReviewStats';
import { createReview } from '../../services/reviewService';
import type { CreateReviewInput } from '../../types/review';
import { StorefrontShareButton } from '../Sharing/StorefrontShareButton';
import { ShareAnalytics } from '../analytics/ShareAnalytics';
import { StorefrontLoadingState } from './StorefrontLoadingState';
import { StorefrontErrorState } from './StorefrontErrorState';
import { EmptyOffersState } from '../offers/EmptyOffersState';
import { EmptyState } from '../ui/EmptyState';
import { AllReviews } from '../reviews/AllReviews';
import FollowButton from '../following/FollowButton';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { FollowerMetricsWidget } from './FollowerMetricsWidget';
import { useMemo } from 'react';

// TypeScript interfaces
interface Business {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description: string;
  business_email?: string;
  business_phone?: string;
  address: string;
  city: string;
  state: string;
  postal_code?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  operating_hours: Record<string, any>;
  categories: string[];
  tags: string[];
  logo_url?: string;
  cover_image_url?: string;
  gallery_images: string[];
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  verified: boolean;
  verified_at?: string;
  website_url?: string;
  social_media: Record<string, string>;
  average_rating: number;
  total_reviews: number;
  total_checkins: number;
  created_at: string;
  updated_at: string;
}

interface BusinessCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const BusinessProfile: React.FC = () => {
  const params = useParams<{ businessId?: string; slug?: string }>();
  const businessId = params.businessId || params.slug;
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [reviewsKey, setReviewsKey] = useState(0);

  // Parse the business ID from slug (do this once at the top)
  const parsedBusinessId = useMemo(() => {
    return parseBusinessIdentifier(businessId || '');
  }, [businessId]);

  // Load review stats for accurate counts - use full business ID once loaded
  const { stats: reviewStats, refreshStats } = useReviewStats({
    businessId: business?.id,
  });

  // Check if current user owns this business
  const isOwner = user?.id === business?.user_id;

  // Check if user has checked in at this business - use full business ID once loaded
  const { checkin, hasCheckin, isLoading: isLoadingCheckin } = useUserCheckin(
    business?.id,
    !isOwner && !!user?.id // Only check if user is logged in and not the owner
  );

  // Proper day ordering for operating hours
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Editable form state
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);

  // Image upload states
  const [imageUploads, setImageUploads] = useState({
    logo: null as File | null,
    cover: null as File | null,
    gallery: [] as File[]
  });
  const [imageUploadLoading, setImageUploadLoading] = useState({
    logo: false,
    cover: false,
    gallery: false
  });

  // Handle URL params (tab selection and offer code redirect)
  useEffect(() => {
    const offerCode = searchParams.get('offer');
    const tab = searchParams.get('tab');

    // Handle direct tab navigation
    if (tab && ['overview', 'reviews', 'statistics', 'enhanced-profile'].includes(tab)) {
      setActiveTab(tab);
    }

    // Handle offer code - redirect to offers management page
    if (offerCode && businessId && business) {
      const slug = getBusinessUrl(businessId, business.business_name);
      navigate(`${slug}/offers?offer=${offerCode}`);
    }
  }, [searchParams, businessId, navigate]);

  // Load business data and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        console.log('🔍 BusinessProfile: Loading business from URL param:', businessId);
        console.log('🔍 Parsed ID:', parsedBusinessId);

        // Fetch business data using short ID prefix match or full UUID
        let businessData;
        let businessError;

        // If it's 8 chars (short ID), use RPC function or manual filter
        if (parsedBusinessId && parsedBusinessId.length === 8) {
          console.log('🔍 Using short ID prefix match:', parsedBusinessId);
          // Use filter on all businesses where the ID starts with short ID
          const { data: allBusinesses, error: fetchError } = await supabase
            .from('businesses')
            .select('*');

          if (fetchError) {
            businessError = fetchError;
          } else {
            // Filter in JavaScript for businesses where UUID starts with short ID
            businessData = allBusinesses?.find(b =>
              b.id.toLowerCase().startsWith(parsedBusinessId.toLowerCase())
            );
            if (!businessData) {
              businessError = { message: 'Business not found', code: 'PGRST116' };
            }
          }
        } else if (parsedBusinessId) {
          // Full UUID - direct lookup
          console.log('🔍 Using full UUID match:', parsedBusinessId);
          const result = await supabase
            .from('businesses')
            .select('*')
            .eq('id', parsedBusinessId)
            .single();
          businessData = result.data;
          businessError = result.error;
        } else {
          throw new Error('Invalid business identifier');
        }

        if (businessError) {
          console.error('❌ Database error:', businessError);
          throw businessError;
        }

        if (!businessData) {
          console.error('❌ No business found for ID:', parsedBusinessId);
          throw new Error('Business not found');
        }

        console.log('✅ Business loaded:', businessData.business_name);
        setBusiness(businessData);
        // Initialize edit form with proper operating hours structure
        setEditForm({
          ...businessData,
          operating_hours: businessData.operating_hours || {}
        });

        // Fetch business categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('business_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (categoriesError) throw categoriesError;
        setBusinessCategories(categoriesData || []);

      } catch (error) {
        console.error('Error fetching business:', error);
        toast.error('Failed to load business profile');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (businessId) {
      fetchData();
    }
  }, [businessId, navigate]);

  // Handle review submission
  const handleReviewSubmit = async (reviewData: CreateReviewInput) => {
    if (!user?.id) {
      toast.error('Please log in to submit a review');
      return;
    }

    // TEMP: Check-in validation bypassed for desktop testing
    // if (!hasCheckin) {
    //   toast.error('You must check in before writing a review');
    //   return;
    // }

    setIsSubmittingReview(true);

    try {
      await createReview(reviewData);
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      setEditingReview(null);

      // Refresh business data to update review count
      const { data: updatedBusiness } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', business?.id)
        .single();

      if (updatedBusiness) {
        setBusiness(updatedBusiness);
      }

      // Refresh stats and trigger re-render of reviews component
      await refreshStats();
      setReviewsKey(prev => prev + 1);
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error; // Let the form handle the error display
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Open review modal with validation
  const handleOpenReviewModal = () => {
    if (!user?.id) {
      toast.error('Please log in to write a review');
      navigate('/login');
      return;
    }

    if (isOwner) {
      toast.error('You cannot review your own business');
      return;
    }

    // TEMP: Check-in validation bypassed for desktop testing
    // if (!hasCheckin) {
    //   toast.error('You must check in at this business before writing a review');
    //   return;
    // }

    setEditingReview(null);
    setShowReviewModal(true);
  };

  // Handle edit review
  const handleEditReview = async (review: any) => {
    setEditingReview(review);
    setShowReviewModal(true);
  };

  // Handle review update success
  const handleReviewUpdateSuccess = async () => {
    // Refresh stats and trigger re-render of reviews
    await refreshStats();
    setReviewsKey(prev => prev + 1);
    setShowReviewModal(false);
    setEditingReview(null);
    toast.success('Review updated successfully!');
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle nested form changes (social media, operating hours)
  const handleNestedChange = (parent, field, value) => {
    setEditForm(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Handle operating hours changes
  const handleOperatingHoursChange = (day, field, value) => {
    setEditForm(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day],
          [field]: value
        }
      }
    }));
  };

  // Handle tag changes
  const handleAddTag = (tag) => {
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle image uploads
  const handleImageUpload = async (file: File, type: 'logo' | 'cover' | 'gallery', index?: number) => {
    if (!file || !user?.id) return null;

    try {
      setImageUploadLoading(prev => ({ ...prev, [type]: true }));

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
      toast.error(`Failed to upload ${type} image`);
      return null;
    } finally {
      setImageUploadLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadedUrl = await handleImageUpload(file, type);
    if (uploadedUrl) {
      // Update edit form
      const fieldName = type === 'cover' ? 'cover_image_url' : `${type}_url`;
      setEditForm(prev => ({
        ...prev,
        [fieldName]: uploadedUrl
      }));

      // Update business state immediately for visual feedback
      setBusiness(prev => prev ? {
        ...prev,
        [fieldName]: uploadedUrl
      } : null);

      // Save to database immediately
      try {
        const updateField = type === 'cover' ? 'cover_image_url' : `${type}_url`;
        const { error } = await supabase
          .from('businesses')
          .update({ [updateField]: uploadedUrl })
          .eq('id', businessId)
          .eq('user_id', user?.id);

        if (error) {
          console.error('Database update error:', error);
          throw error;
        }

        toast.success(`${type === 'cover' ? 'Cover' : type} image updated successfully!`);
      } catch (error) {
        console.error('Error saving image:', error);
        toast.error(`Failed to save ${type === 'cover' ? 'cover' : type} image: ${error.message}`);
        // Revert the UI changes on error
        setEditForm(prev => ({
          ...prev,
          [`${type === 'cover' ? 'cover_image' : type}_url`]: business?.[`${type === 'cover' ? 'cover_image' : type}_url`] || null
        }));
        setBusiness(prev => prev ? {
          ...prev,
          [`${type === 'cover' ? 'cover_image' : type}_url`]: prev[`${type === 'cover' ? 'cover_image' : type}_url`] || null
        } : null);
      }
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!isOwner) {
      toast.error('You do not have permission to edit this business');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          business_name: editForm.business_name,
          business_type: editForm.business_type,
          description: editForm.description,
          business_email: editForm.business_email,
          business_phone: editForm.business_phone,
          address: editForm.address,
          city: editForm.city,
          state: editForm.state,
          postal_code: editForm.postal_code,
          latitude: editForm.latitude,
          longitude: editForm.longitude,
          website_url: editForm.website_url,
          social_media: editForm.social_media,
          operating_hours: editForm.operating_hours,
          tags: editForm.tags,
          logo_url: editForm.logo_url,
          cover_image_url: editForm.cover_image_url,
          gallery_images: editForm.gallery_images,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      setBusiness(editForm as Business);
      setEditing(false);
      toast.success('Business profile updated successfully!');
    } catch (error) {
      console.error('Error updating business:', error);
      toast.error('Failed to update business profile');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditForm(business);
    setEditing(false);
  };

  // Get current location using Capacitor Geolocation
  const getCurrentLocation = async () => {
    setImageUploadLoading(prev => ({ ...prev, gallery: true }));

    try {
      const permissionStatus = await Geolocation.checkPermissions();

      if (permissionStatus.location === 'denied') {
        toast.error('Location access denied. Please enable it in Settings.');
        setImageUploadLoading(prev => ({ ...prev, gallery: false }));
        return;
      }

      if (permissionStatus.location === 'prompt' || permissionStatus.location === 'prompt-with-rationale') {
        const request = await Geolocation.requestPermissions();
        if (request.location === 'denied') {
          setImageUploadLoading(prev => ({ ...prev, gallery: false }));
          return;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });

      const { latitude, longitude } = position.coords;
      handleFormChange('latitude', latitude);
      handleFormChange('longitude', longitude);
      toast.success('Location updated!');
    } catch (error) {
      console.error('Geolocation error:', error);
      toast.error('Failed to get location.');
    } finally {
      setImageUploadLoading(prev => ({ ...prev, gallery: false }));
    }
  };

  // Format operating hours for display
  const formatOperatingHours = (hours) => {
    return Object.keys(hours).map(day => {
      const dayHours = hours[day];
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);

      if (dayHours.closed) {
        return `${dayName}: Closed`;
      }

      return `${dayName}: ${dayHours.open} - ${dayHours.close}`;
    }).join('\n');
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: 'Pending Approval' },
      suspended: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Suspended' },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Inactive' }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    if (status === 'active') {
      return (
        <div className="bg-green-100 text-green-600 p-1.5 rounded-full" title="Active">
          <CheckCircle className="w-4 h-4" />
        </div>
      );
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Business Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </button>
          )}
        </div>

        {editing && isOwner ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input
                type="text"
                value={editForm.business_name || ''}
                onChange={(e) => handleFormChange('business_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
                <input
                  type="email"
                  value={editForm.business_email || ''}
                  onChange={(e) => handleFormChange('business_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone</label>
                <input
                  type="tel"
                  value={editForm.business_phone || ''}
                  onChange={(e) => handleFormChange('business_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Location Information</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={editForm.state || ''}
                    onChange={(e) => handleFormChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                  <input
                    type="text"
                    value={editForm.postal_code || ''}
                    onChange={(e) => handleFormChange('postal_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Location Map Picker */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Business Location</h4>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                    <GoogleMapsLocationPicker
                      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                      initialLocation={
                        editForm.latitude && editForm.longitude
                          ? { lat: editForm.latitude, lng: editForm.longitude }
                          : undefined
                      }
                      onLocationChange={(location, address) => {
                        handleFormChange('latitude', location.lat);
                        handleFormChange('longitude', location.lng);
                        if (address) {
                          // Parse address components
                          const addressParts = address.split(', ');
                          if (addressParts.length > 0) {
                            handleFormChange('address', addressParts[0]);
                          }
                        }
                      }}
                      height="400px"
                      className="w-full"
                    />
                  ) : (
                    <div className="bg-gray-100 p-8 text-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Google Maps Not Available</h3>
                      <p className="text-gray-600 mb-4">Please add your Google Maps API key to enable location selection.</p>

                      {/* Fallback coordinate inputs */}
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={editForm.latitude || ''}
                              onChange={(e) => handleFormChange('latitude', parseFloat(e.target.value) || null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="40.7128"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={editForm.longitude || ''}
                              onChange={(e) => handleFormChange('longitude', parseFloat(e.target.value) || null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="-74.0060"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={getCurrentLocation}
                          disabled={imageUploadLoading.gallery}
                          className="flex items-center px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          {imageUploadLoading.gallery ? 'Getting Location...' : 'Use Current Location'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Current coordinates display */}
                {editForm.latitude && editForm.longitude && (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Selected Coordinates:</p>
                    <p className="font-mono">
                      {editForm.latitude.toFixed(6)}, {editForm.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                <p>You can get coordinates from Google Maps by right-clicking on your location and copying the coordinates.</p>
                <p>Format: Latitude (North/South), Longitude (East/West)</p>
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Business Images</h4>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Logo</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {editForm.logo_url ? (
                      <img
                        src={editForm.logo_url}
                        alt="Business logo"
                        className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'logo')}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {imageUploadLoading.logo ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          {editForm.logo_url ? 'Change Logo' : 'Upload Logo'}
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Cover Image</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {editForm.cover_image_url ? (
                      <img
                        src={editForm.cover_image_url}
                        alt="Business cover"
                        className="w-24 h-16 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-16 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'cover')}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {imageUploadLoading.cover ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          {editForm.cover_image_url ? 'Change Cover' : 'Upload Cover'}
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Hours Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Operating Hours</label>
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                {dayOrder.map(day => {
                  const dayHours = editForm.operating_hours?.[day] || { closed: false, open: '09:00', close: '17:00' };
                  return (
                    <div key={day} className="flex items-center space-x-3">
                      <div className="w-24">
                        <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                      </div>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={dayHours.closed}
                          onChange={(e) => {
                            const closed = e.target.checked;
                            handleOperatingHoursChange(day, 'closed', closed);
                            if (!closed && !dayHours.open) {
                              handleOperatingHoursChange(day, 'open', '09:00');
                              handleOperatingHoursChange(day, 'close', '17:00');
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                        />
                        <span className="text-sm text-gray-600">Closed</span>
                      </label>

                      {!dayHours.closed && (
                        <>
                          <div className="flex items-center space-x-2">
                            <input
                              type="time"
                              value={dayHours.open || '09:00'}
                              onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={dayHours.close || '17:00'}
                              onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop: Compact Grid Layout */}
            <div className="hidden md:block">
              <div className="flex items-start justify-between gap-6">
                {/* Info Column */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium mb-1 line-clamp-1">{business?.business_name}</p>
                  <p className="text-gray-600 text-sm line-clamp-2">{business?.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{business?.business_type}</span>
                    <span>•</span>
                    {getStatusBadge(business?.status)}
                  </div>
                </div>

                {/* Contact/Loc Column */}
                <div className="flex-1 min-w-0 border-l pl-6">
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <p className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-2 text-gray-400" /> {business?.address}, {business?.city}</p>
                    {business?.business_phone && <p className="flex items-center"><Phone className="w-3.5 h-3.5 mr-2 text-gray-400" /> {business?.business_phone}</p>}
                    {business?.business_email && <p className="flex items-center"><Mail className="w-3.5 h-3.5 mr-2 text-gray-400" /> {business?.business_email}</p>}
                  </div>
                </div>

                {/* Hours/Link Column */}
                <div className="border-l pl-6">
                  <button
                    onClick={() => setShowInfoModal(true)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center whitespace-nowrap"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    View Hours & More
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile: Summary Row */}
            <div className="md:hidden flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-4">
                <h4 className="font-medium text-gray-900 truncate">{business?.business_name}</h4>
                <p className="text-xs text-gray-500 truncate flex items-center mt-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  {business?.address}, {business?.city}
                </p>
              </div>
              <button
                onClick={() => setShowInfoModal(true)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors whitespace-nowrap"
              >
                More Info
              </button>
            </div>
          </div>
        )}
      </div>



      {/* Tags */}
      {business?.tags && business.tags.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {business.tags.map((tag, index) => (
              <span key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Featured Offers Section */}
      {business && (
        <FeaturedOffers
          businessId={business.id}
          businessName={business.business_name}
          isOwner={isOwner}
          initialOfferId={searchParams.get('offerId')}
          shareId={searchParams.get('share_id')}
        />
      )}

      {/* Featured Products Section */}
      {business && (
        <FeaturedProducts
          businessId={business.id}
          businessName={business.business_name}
          isOwner={isOwner}
        />
      )}
    </div>
  );

  // Render statistics tab
  const renderStatistics = () => (
    <div className="space-y-6">
      {/* Follower Analytics Section */}
      <FollowerMetricsWidget businessId={business?.id!} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-semibold text-gray-900">
                {business?.average_rating ? business.average_rating.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reviews</p>
              <p className="text-2xl font-semibold text-gray-900">{business?.total_reviews || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Check-ins</p>
              <p className="text-2xl font-semibold text-gray-900">{business?.total_checkins || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share Analytics */}
      {isOwner && businessId && (
        <ShareAnalytics
          entityId={businessId}
          entityType="storefront"
          title="Storefront Share Analytics"
        />
      )}

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Detailed analytics coming soon!</p>
          <p className="text-sm mt-2">Track your business performance, customer engagement, and growth metrics.</p>
        </div>
      </div>
    </div>
  );


  // Render reviews tab
  const renderReviews = () => (
    <div className="space-y-4">
      {/* Write Review Button - Only show for non-owners */}
      {!isOwner && user && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Share Your Experience
              </h3>
              {/* TEMP: Check-in requirement bypassed for desktop testing */}
              {!hasCheckin ? (
                <div className="flex items-start space-x-2 text-sm text-blue-600">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>[Testing Mode]</strong> Check-in requirement temporarily disabled for desktop testing.
                    In production, users must check in before reviewing.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Checked in {checkin && new Date(checkin.checked_in_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={handleOpenReviewModal}
              disabled={isLoadingCheckin}
              className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
              title="Write a review"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Write Review
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <BusinessReviews
        key={reviewsKey}
        businessId={business?.id!}
        businessName={business?.business_name || ''}
        isBusinessOwner={isOwner}
        onEdit={handleEditReview}
        realtime={true}
      />
    </div>
  );

  if (loading) {
    return <StorefrontLoadingState />;
  }

  if (!business) {
    return (
      <StorefrontErrorState
        message="The business you're looking for doesn't exist."
        onRetry={() => window.location.reload()}

      />
    );
  }

  // Filter tabs based on ownership - only owners see Statistics and Enhanced Profile
  const allTabs = [
    { id: 'overview', label: 'Overview', count: null, ownerOnly: false },
    { id: 'reviews', label: 'Reviews', count: reviewStats?.total_reviews || business?.total_reviews || 0, ownerOnly: false },
    { id: 'statistics', label: 'Analytics', count: null, ownerOnly: true },
    { id: 'enhanced-profile', label: 'Enhanced Profile', count: null, ownerOnly: true }
  ];

  // Filter tabs: non-owners only see Overview and Reviews
  const tabs = allTabs.filter(tab => !tab.ownerOnly || isOwner);

  return (
    <>
      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowReviewModal(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <BusinessReviewForm
                businessId={business?.id!}
                businessName={business?.business_name || ''}
                checkinId={checkin?.id || null}
                onSubmit={handleReviewSubmit}
                onCancel={async () => {
                  if (editingReview) {
                    await refreshStats();
                    setReviewsKey(prev => prev + 1);
                  }
                  setShowReviewModal(false);
                  setEditingReview(null);
                }}
                loading={isSubmittingReview}
                editMode={!!editingReview}
                existingReview={editingReview}
              />
            </div>
          </motion.div>
        )}

        {/* Info Detail Modal */}
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowInfoModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-lg text-gray-900">Business Details</h3>
                <button onClick={() => setShowInfoModal(false)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">About</h4>
                  <p className="text-gray-700">{business?.description}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Contact & Location</h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-gray-900">{business?.address}</p>
                        <p className="text-gray-600 text-sm">{business?.city}, {business?.state} {business?.postal_code}</p>
                        {(business?.latitude && business?.longitude) && (
                          <a
                            href={`https://maps.google.com/?q=${business.latitude},${business.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mt-1 text-sm"
                          >
                            View on Google Maps <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                    {business?.business_phone && (
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-gray-400 mr-3" />
                        <a href={`tel:${business.business_phone}`} className="text-indigo-600 hover:underline">{business.business_phone}</a>
                      </div>
                    )}
                    {business?.business_email && (
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-3" />
                        <a href={`mailto:${business.business_email}`} className="text-indigo-600 hover:underline break-all">{business.business_email}</a>
                      </div>
                    )}
                    {business?.website_url && (
                      <div className="flex items-center">
                        <Globe className="w-5 h-5 text-gray-400 mr-3" />
                        <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all items-center inline-flex">
                          Visit Website <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Operating Hours</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {business?.operating_hours && dayOrder
                      .filter(day => business.operating_hours[day])
                      .map(day => {
                        const hours = business.operating_hours[day];
                        return (
                          <div key={day} className="flex justify-between text-sm">
                            <span className="capitalize font-medium text-gray-700">{day}</span>
                            <span className="text-gray-600">
                              {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumbs Navigation */}
        <div className="hidden md:block bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-3">
              <nav className="flex items-center space-x-2 text-sm">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  <Home className="w-4 h-4 mr-1" />
                  Dashboard
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <button
                  onClick={() => navigate('/business/dashboard')}
                  className="text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  Businesses
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="text-gray-900 font-medium">
                  {business?.business_name || 'Business Profile'}
                </span>
              </nav>
            </div>
          </div>
        </div>

        {/* Facebook-style Cover & Profile Header */}
        <div className="bg-white pb-4 border-b">
          <div className="relative group">
            {/* Cover Image Container - Centered and Max Width */}
            <div className="max-w-7xl mx-auto md:px-6 lg:px-8 relative group">
              {/* Back Button - Absolute Top Left */}
              <button
                onClick={() => navigate('/business/dashboard')}
                className="absolute top-4 left-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:bg-white transition-all shadow-sm"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="h-48 md:h-80 bg-gray-200 overflow-hidden w-full relative md:rounded-b-lg">
                {business?.cover_image_url ? (
                  <img
                    src={business.cover_image_url}
                    alt={`${business.business_name} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 font-medium">No cover photo</span>
                  </div>
                )}
              </div>

              {/* Profile Photo (Overlapping - 1/4 on cover, 3/4 below) */}
              <div className="absolute -bottom-[4.5rem] md:-bottom-[7.5rem] left-4 md:left-8 z-30">
                <div className="rounded-full border-[4px] border-white bg-white shadow-md overflow-hidden w-24 h-24 md:w-40 md:h-40">
                  {business?.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={`${business.business_name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Camera className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Section (Below Cover - In Normal Flow) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[0.5rem] pb-2">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                {/* Business Name & Details (Pushed right to clear profile pic) */}
                <div className="mt-0 pl-[7.5rem] md:pl-[12rem] flex flex-col items-start text-left w-full min-h-[5rem] md:min-h-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight">
                      {business?.business_name}
                    </h1>

                    <StorefrontShareButton
                      businessId={business.id}
                      businessName={business.business_name}
                      businessDescription={business.description}
                      variant="ghost"
                      size="icon"
                      showLabel={false}
                      className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      onShareSuccess={() => console.log('Shared')}
                    />

                    {business?.verified && (
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                    {getStatusBadge(business?.status)}
                  </div>
                  <p className="text-gray-600 text-sm mb-2 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    {business?.city}, {business?.state}
                  </p>

                  {/* Action Buttons Row - Desktop Only */}
                  <div className="hidden md:flex flex-wrap items-center gap-2 mt-4">
                    {!isOwner && user && (
                      <FollowButton
                        businessId={business.id}
                        variant="default"
                        size="default"
                      />
                    )}
                    {/* Navigate Button */}
                    <button
                      onClick={() => {
                        if (business?.latitude && business?.longitude) {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`);
                        } else {
                          // Fallback to searching by address
                          const query = encodeURIComponent(`${business?.address || ''} ${business?.city || ''} ${business?.state || ''}`);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${query}`);
                        }
                      }}
                      className="inline-flex flex-1 justify-center items-center px-2 py-2 border border-gray-300 shadow-sm text-xs md:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 md:flex-none md:px-3"
                      title="Navigate"
                    >
                      <Navigation className="w-3.5 h-3.5 mr-1.5 md:mr-2 md:w-4 md:h-4" />
                      <span>Navigate</span>
                    </button>

                    {isOwner && (
                      <>
                        <button
                          onClick={() => navigate(`/business/${business?.id}/manage/campaigns`)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition-colors"
                        >
                          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-trending-up'%3E%3Cpolyline points='22 7 13.5 15.5 8.5 10.5 2 17'/%3E%3Cpolyline points='16 7 22 7 22 13'/%3E%3C/svg%3E" alt="" className="w-4 h-4 mr-2" />
                          Campaigns
                        </button>

                        <button
                          onClick={() => navigate(`/business/${business?.id}/manage/coupons`)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Manage Coupons
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Row - Mobile Only (Full Width) */}
              <div className="md:hidden flex flex-row items-stretch gap-2 mt-2 w-full">
                {!isOwner && user && (
                  <FollowButton
                    businessId={business.id}
                    businessName={business.business_name}
                  />
                )}
                <button
                  onClick={() => {
                    if (business?.latitude && business?.longitude) {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`);
                    } else {
                      const query = encodeURIComponent(`${business?.address || ''} ${business?.city || ''} ${business?.state || ''}`);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`);
                    }
                  }}
                  className="inline-flex flex-1 justify-center items-center px-2 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                  title="Navigate"
                >
                  <Navigation className="w-3.5 h-3.5 mr-1.5" />
                  <span>Navigate</span>
                </button>

                {isOwner && (
                  <>
                    <button
                      onClick={() => navigate(`/business/${business?.id}/manage/campaigns`)}
                      className="inline-flex flex-1 justify-center items-center px-2 py-2 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition-colors"
                    >
                      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-trending-up'%3E%3Cpolyline points='22 7 13.5 15.5 8.5 10.5 2 17'/%3E%3Cpolyline points='16 7 22 7 22 13'/%3E%3C/svg%3E" alt="" className="w-3.5 h-3.5 mr-1.5" />
                      Campaigns
                    </button>

                    <button
                      onClick={() => navigate(`/business/${business?.id}/manage/coupons`)}
                      className="inline-flex flex-1 justify-center items-center px-2 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Tag className="w-3.5 h-3.5 mr-1.5" />
                      Coupons
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {tab.label}
                    {tab.count !== null && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-900'
                        }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'reviews' && renderReviews()}
                {activeTab === 'statistics' && renderStatistics()}
                {activeTab === 'enhanced-profile' && (
                  <EnhancedProfileTab
                    businessId={businessId!}
                    business={business!}
                    isOwner={isOwner}
                    onUpdate={async () => {
                      // Refresh business data after update
                      const { data } = await supabase
                        .from('businesses')
                        .select('*')
                        .eq('id', businessId)
                        .single();
                      if (data) setBusiness(data);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default BusinessProfile;
