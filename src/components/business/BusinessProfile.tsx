import React, { useState, useEffect, useMemo } from 'react';
import { QuickImageUploader } from './QuickImageUploader';
import { PendingChangesWarning } from './PendingChangesWarning';
import { submitPendingEdits, applyInstantUpdates, isSensitiveField } from '../../services/businessEditService';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  Navigation,
  MoreVertical,
  Share2,
  LayoutGrid,
  BarChart,
  Sparkles,
  History
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Geolocation } from '@capacitor/geolocation';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import FeaturedProducts from './FeaturedProducts';
import { BusinessProductsTab } from '../products/grid/BusinessProductsTab';
import { ProductCreationWizard } from '../products/creation/ProductCreationWizard';
import FeaturedOffers from './FeaturedOffers';
import GoogleMapsLocationPicker from '../maps/GoogleMapsLocationPicker';
import BusinessReviews from '../reviews/BusinessReviews';
import BusinessReviewForm from '../reviews/BusinessReviewForm';
import EnhancedProfileTab from './EnhancedProfileTab';
import { BusinessActivityLogsTab } from './BusinessActivityLogsTab';
import { useUserCheckin } from '../../hooks/useUserCheckin';
import { useCheckins } from '../../hooks/useCheckins';
import ReviewRequestModal from '../reviews/ReviewRequestModal';
import { createReviewRequest } from '../../services/reviewRequestService';
import { useReviewStats } from '../../hooks/useReviewStats';
import { createReview, getUserBusinessReview } from '../../services/reviewService';
import { useSystemSettings } from '../../hooks/useSystemSettings';
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
import { BusinessShareDashboard } from './BusinessShareDashboard';
import { BusinessEngagementLog } from './analytics/BusinessEngagementLog';
import BusinessCheckinAnalytics from '../checkins/BusinessCheckinAnalytics';
import { useBusinessProfile, useBusinessCategories, type Business, type BusinessCategory } from '../../hooks/business';
import { VerificationBadge } from './VerificationBadge';
import { ClaimBusinessButton } from './ClaimBusinessButton';
import ReviewAnalyticsDashboard from '../../pages/business/ReviewAnalyticsDashboard';
import { RecommendationBadge } from './RecommendationBadge';
import { FollowerListModal } from './FollowerListModal';
import { OperatingHoursModal } from './OperatingHoursModal';
import { ProductAnalyticsDashboard } from './dashboard/ProductAnalyticsDashboard';



const BusinessProfile: React.FC = () => {
  const params = useParams<{ businessId?: string; slug?: string }>();
  const businessIdParam = params.businessId || params.slug;
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuthStore();

  // SWR: Fetch business data with caching (instant load on revisits)
  const {
    data: business,
    isLoading: loading,
    error: businessError,
    refetch: refetchBusiness
  } = useBusinessProfile(businessIdParam);

  // SWR: Fetch business categories with caching
  const { data: businessCategories = [] } = useBusinessCategories();

  // Handle business fetch error
  useEffect(() => {
    if (businessError) {
      console.error('Error fetching business:', businessError);
      toast.error('Failed to load business profile');
      navigate('/dashboard');
    }
  }, [businessError, navigate]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Handle URL tab selection
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [userReview, setUserReview] = useState<any>(null);
  const topRef = React.useRef<HTMLDivElement>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [reviewsKey, setReviewsKey] = useState(0);

  // Load review stats for accurate counts - use full business ID once loaded
  const { stats: reviewStats, refreshStats } = useReviewStats({
    businessId: business?.id,
  });

  // Check if current user owns this business
  const isOwner = user?.id === business?.user_id;

  // Fetch user's existing review to toggle Write/Manage button
  useEffect(() => {
    if (business?.id && user?.id && !isOwner) {
      getUserBusinessReview(business.id).then(review => {
        // Only set if it's an active (non-deleted) review
        if (review && !review.deleted_at) {
          setUserReview(review);
        } else {
          setUserReview(null);
        }
      });
    }
  }, [business?.id, user?.id, isOwner, reviewsKey]);

  // Handle navigation from Review Request Modal (Deep linking)
  useEffect(() => {
    if (location.state && (location.state as any).openReviewForm) {
      // Small timeout to ensure data is ready and animations are smooth
      setTimeout(() => {
        handleOpenReviewModal();
        // Clear state to prevent reopening
        navigate(location.pathname, { replace: true, state: {} });
      }, 500);
    }
  }, [location.state, navigate]);

  // Fetch global settings
  const { requireGpsCheckin, isLoading: isSettingsLoading } = useSystemSettings();

  // Check if user has checked in at this business - use full business ID once loaded
  const { checkin, hasCheckin, isLoading: isLoadingCheckin, refetch: refetchUserCheckin } = useUserCheckin(
    business?.id,
    !isOwner && !!user?.id // Only check if user is logged in and not the owner
  );

  const checkins = useCheckins();
  const [showReviewRequestModal, setShowReviewRequestModal] = useState(false);
  const [lastCheckinId, setLastCheckinId] = useState<string | null>(null);

  const handleCheckIn = async () => {
    if (!business?.id) return;

    // Perform check-in
    const result = await checkins.performCheckin(business.id);

    if (result) {
      setLastCheckinId(result.id);

      // Create review request
      try {
        await createReviewRequest(result.id, business.id);
      } catch (error) {
        console.error('Failed to create review request:', error);
        // Continue anyway to show modal
      }

      // Refresh checkin status so "Write Review" works immediately
      await refetchUserCheckin();

      // Refresh business data (checkins count)
      await refetchBusiness();

      // Show modal
      setShowReviewRequestModal(true);
    }
  };

  // Proper day ordering for operating hours
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Editable form state - initialize when business loads
  const [editForm, setEditForm] = useState<Partial<Business>>({});

  // Sync editForm when business data loads/updates
  useEffect(() => {
    if (business) {
      setEditForm({
        ...business,
        operating_hours: business.operating_hours || {}
      });
    }
  }, [business]);

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
  // This effect only runs on mount and when URL changes (not when activeTab changes)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const isOffersRoute = location.pathname.endsWith('/offers');
    const isProductsRoute = location.pathname.endsWith('/products');
    const isCouponsRoute = location.pathname.endsWith('/coupons');

    // Set tab based on URL path
    if (isOffersRoute) {
      setActiveTab('offers');
      // Scroll to top when navigating to offers
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
      }, 0);
    } else if (isProductsRoute) {
      setActiveTab('products');
    } else if (isCouponsRoute) {
      setActiveTab('coupons');
    } else if (tabParam && ['overview', 'reviews', 'statistics', 'enhanced-profile', 'offers', 'activity'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    // Note: When clicking tabs manually, the URL won't have these paths, so activeTab won't be overridden
  }, [searchParams, location.pathname]);


  // Handle review submission
  const handleReviewSubmit = async (reviewData: CreateReviewInput) => {
    if (!user?.id) {
      toast.error('Please log in to submit a review');
      return;
    }

    // GPS check-in validation (respects admin setting)
    if (!isSettingsLoading && requireGpsCheckin && !hasCheckin) {
      toast.error('You must check in at this business before writing a review');
      return;
    }

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
        // Refetch to update cache with latest data
        await refetchBusiness();
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

    // GPS check-in validation (respects admin setting)
    if (!isSettingsLoading && requireGpsCheckin && !hasCheckin) {
      toast.error('You must check in at this business before writing a review');
      return;
    }

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
    setEditForm(prev => {
      const currentDay = prev.operating_hours?.[day] || { closed: false, open: '09:00', close: '17:00' };
      return {
        ...prev,
        operating_hours: {
          ...prev.operating_hours,
          [day]: {
            ...currentDay,
            [field]: value
          }
        }
      };
    });
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

  // Handle quick image updates (direct from profile)
  const handleQuickImageUpdate = async (url: string | null, type: 'logo' | 'cover') => {
    try {
      const updateField = type === 'cover' ? 'cover_image_url' : `${type}_url`;

      const { error } = await supabase
        .from('businesses')
        .update({
          [updateField]: url,
          updated_at: new Date().toISOString()
        })
        .eq('id', business?.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Refetch to get updated data
      await refetchBusiness();
      toast.success(`${type === 'cover' ? 'Cover' : type} updated successfully!`);
    } catch (error: any) {
      console.error('Error saving image:', error);
      toast.error(`Failed to update image: ${error.message}`);
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

      // Save to database immediately
      try {
        const updateField = type === 'cover' ? 'cover_image_url' : `${type}_url`;
        const { error } = await supabase
          .from('businesses')
          .update({ [updateField]: uploadedUrl })
          .eq('id', business?.id)
          .eq('user_id', user?.id);

        if (error) {
          console.error('Database update error:', error);
          throw error;
        }

        // Refetch to get updated data
        await refetchBusiness();
        toast.success(`${type === 'cover' ? 'Cover' : type} image updated successfully!`);
      } catch (error) {
        console.error('Error saving image:', error);
        toast.error(`Failed to save ${type === 'cover' ? 'cover' : type} image: ${error.message}`);
        // Revert the edit form on error
        setEditForm(prev => ({
          ...prev,
          [`${type === 'cover' ? 'cover_image' : type}_url`]: business?.[`${type === 'cover' ? 'cover_image' : type}_url`] || null
        }));
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
      const sensitiveChanges: Record<string, any> = {};
      const instantChanges: Record<string, any> = {};
      let hasChanges = false;

      // Fields to check for changes
      const fieldsToCheck = [
        'business_name', 'business_type', 'description', 'business_email',
        'business_phone', 'address', 'city', 'state', 'postal_code',
        'latitude', 'longitude', 'website_url', 'social_media',
        'operating_hours', 'tags', 'logo_url', 'cover_image_url', 'gallery_images'
      ];

      fieldsToCheck.forEach(field => {
        // Simple equality check (works for primitives, need JSON.stringify for objects/arrays)
        const oldValue = business?.[field];
        const newValue = editForm[field];

        const isDifferent = typeof oldValue === 'object'
          ? JSON.stringify(oldValue) !== JSON.stringify(newValue)
          : oldValue !== newValue;

        if (isDifferent) {
          hasChanges = true;
          if (isSensitiveField(field)) {
            sensitiveChanges[field] = newValue;
          } else {
            instantChanges[field] = newValue;
          }
        }
      });

      if (!hasChanges) {
        setEditing(false);
        return;
      }

      // Submit sensitive changes
      if (Object.keys(sensitiveChanges).length > 0) {
        await submitPendingEdits(business!.id, sensitiveChanges);
        toast.success('Core business details submitted for admin review.');
      }

      // Apply instant updates
      if (Object.keys(instantChanges).length > 0) {
        // Always update updated_at if making instant changes
        instantChanges['updated_at'] = new Date().toISOString();
        await applyInstantUpdates(business!.id, instantChanges);
        if (Object.keys(sensitiveChanges).length === 0) {
          toast.success('Business profile updated successfully!');
        }
      }

      // Refetch to sync cache with database
      await refetchBusiness();
      setEditing(false);

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

  // Get business open/closed status based on operating hours
  const getBusinessOpenStatus = () => {
    if (!business?.operating_hours) {
      return { status: 'unknown', text: '', color: '', todayHours: '' };
    }

    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[now.getDay()];
    // Handle potential case differences in keys (e.g. "Sunday" vs "sunday")
    const todayKey = Object.keys(business.operating_hours).find(k => k.toLowerCase() === today) || today;
    const todayHours = business.operating_hours[todayKey];

    if (!todayHours || todayHours.closed) {
      return {
        status: 'closed',
        text: 'Closed for Today',
        color: 'text-red-600',
        todayHours: 'Closed'
      };
    }

    const { open, close } = todayHours;
    if (!open || !close) {
      return { status: 'unknown', text: '', color: '', todayHours: '' };
    }

    // Parse hours (format: "09:00" or "9:00 AM")
    const parseTime = (timeStr: string): number => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let h = hours;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + (minutes || 0);
    };

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = parseTime(open);
    const closeMinutes = parseTime(close);

    // Format hours for display (e.g., "9:00 AM - 6:00 PM")
    const formatHours = `${open} - ${close}`;

    if (currentMinutes < openMinutes) {
      return {
        status: 'closed',
        text: 'Closed',
        color: 'text-red-600',
        todayHours: formatHours
      };
    }

    if (currentMinutes >= closeMinutes) {
      return {
        status: 'closed',
        text: 'Closed for Today',
        color: 'text-red-600',
        todayHours: formatHours
      };
    }

    const minutesUntilClose = closeMinutes - currentMinutes;

    if (minutesUntilClose <= 60) {
      return {
        status: 'closing_soon',
        text: 'Closes Soon',
        color: 'text-orange-600',
        todayHours: formatHours
      };
    }

    return {
      status: 'open',
      text: 'Open',
      color: 'text-green-600',
      todayHours: formatHours
    };
  };

  const businessOpenStatus = getBusinessOpenStatus();


  // Handle review deletion
  const handleDeleteReview = async (reviewId: string) => {
    // If the deleted review is the current user's review, clear it to toggle button state
    if (userReview && userReview.id === reviewId) {
      setUserReview(null);
    }
    // Refresh stats to update the review counts/stars
    await refreshStats();
  };

  // Render overview tab
  const renderOverview = () => {
    return (
      <div className="space-y-6">
        {/* Editing Form - Shown only when editing */}
        {editing && isOwner && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Business Information</h3>
            </div>
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
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={editForm.business_email || ''}
                    onChange={(e) => handleFormChange('business_email', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Business Email"
                    title="Business Email"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={editForm.business_phone || ''}
                    onChange={(e) => handleFormChange('business_phone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Business Phone"
                    title="Business Phone"
                  />
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Location Information</h4>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Street Address"
                    title="Street Address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="City"
                    title="City"
                  />

                  <input
                    type="text"
                    value={editForm.state || ''}
                    onChange={(e) => handleFormChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="State"
                    title="State"
                  />

                  <input
                    type="text"
                    value={editForm.postal_code || ''}
                    onChange={(e) => handleFormChange('postal_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Postal Code"
                    title="Postal Code"
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
        )}

        {!editing && (
          <>



            {/* Tags */}
            {
              business?.tags && business.tags.length > 0 && (
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
              )
            }

            {/* Featured Offers Section */}
            {
              business && (
                <FeaturedOffers
                  businessId={business.id}
                  businessName={business.business_name}
                  isOwner={isOwner}
                  initialOfferId={searchParams.get('offer') || searchParams.get('offerId')}
                  shareId={searchParams.get('share_id')}
                  compact={true}
                  className=""
                  showHeading={false}
                  showAddButton={false}
                  onViewAll={() => {
                    setSearchParams(prev => {
                      const newParams = new URLSearchParams(prev);
                      newParams.set('tab', 'offers');
                      return newParams;
                    });
                    // Scroll to top
                    window.scrollTo(0, 0);
                    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                />
              )
            }

            {/* Featured Products Section */}
            {
              business && (
                <FeaturedProducts
                  businessId={business.id}
                  businessName={business.business_name}
                  isOwner={isOwner}
                />
              )
            }

            {/* Reviews Section (Preview) */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Latest Reviews</h3>
              </div>
              <div className="p-0">
                <BusinessReviews
                  key={`overview-${reviewsKey}`}
                  businessId={business?.id!}
                  businessName={business?.business_name || ''}
                  isBusinessOwner={isOwner}
                  onEdit={handleEditReview}
                  onDelete={handleDeleteReview}
                  showFilters={false}
                  showStats={false}
                  businessImage={business?.logo_url}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render statistics tab - Comprehensive Business Analytics
  const renderStatistics = () => (
    <div className="space-y-6">
      {/* Review Analytics Dashboard (Story 11.3.4) */}
      {business?.id && <ReviewAnalyticsDashboard businessId={business.id} />}

      {/* Product Analytics Dashboard (Story 12.14) */}
      {business?.id && <ProductAnalyticsDashboard businessId={business.id} />}

      {/* Follower Analytics Section */}
      <FollowerMetricsWidget businessId={business?.id!} />

      {/* Share Analytics Dashboard - Story 10.1.10 */}
      {isOwner && business?.id && (
        <BusinessShareDashboard
          businessId={business.id}
          businessName={business.business_name}
        />
      )}

      {/* Comprehensive Engagement Log - Story 10.1.9 */}
      {business?.id && (
        <BusinessEngagementLog businessId={business.id} />
      )}

      {/* Check-in Analytics Section - Coming Soon */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Check-in Trends (Charts)</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Coming Soon</p>
          <p className="text-sm mt-2">Aggregate charts for peak hours and visitor patterns will be available here.</p>
        </div>
      </div>
    </div>
  );


  // Render reviews tab
  const renderReviews = () => (
    <div className="space-y-4">
      {/* Write/Manage Review Button - Only show for non-owners AND if no review exists */}
      {!isOwner && user && !userReview && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {userReview ? 'Your Review' : 'Share Your Experience'}
              </h3>
              {userReview ? null : (
                /* GPS check-in requirement prompt */
                !isSettingsLoading && requireGpsCheckin ? (
                  !hasCheckin ? (
                    <div className="flex items-start space-x-2 text-sm text-amber-600">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        Check in at this business to leave a review.
                        GPS verification ensures authentic reviews.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Checked in {checkin && new Date(checkin.checked_in_at).toLocaleDateString()}
                    </p>
                  )
                ) : (
                  <div className="flex items-start space-x-2 text-sm text-blue-600">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>[Testing Mode]</strong> GPS check-in disabled. Write your review anytime.
                    </p>
                  </div>
                )
              )}
            </div>
            {userReview ? (
              <button
                onClick={() => handleEditReview(userReview)}
                className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 md:px-4 md:py-2 p-2"
                title="Manage your review"
              >
                <Edit3 className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">Manage Review</span>
              </button>
            ) : (
              <button
                onClick={handleOpenReviewModal}
                disabled={isLoadingCheckin}
                className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
                title="Write a review"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Write Review
              </button>
            )}
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
        onDelete={handleDeleteReview}
        businessImage={business?.logo_url}
        userReview={userReview}
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
    { id: 'overview', label: 'Overview', count: null, ownerOnly: false, icon: LayoutGrid },
    { id: 'products', label: 'Products', count: null, ownerOnly: false, icon: Package },
    { id: 'offers', label: 'Offers', count: null, ownerOnly: false, icon: Tag },
    { id: 'reviews', label: 'Reviews', count: null, ownerOnly: false, icon: MessageSquare },
    { id: 'statistics', label: 'Analytics', count: null, ownerOnly: true, icon: BarChart },
    { id: 'enhanced-profile', label: 'Enhanced Profile', count: null, ownerOnly: true, icon: Sparkles },
    { id: 'activity', label: 'Activity', count: null, ownerOnly: true, icon: History }
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
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowInfoModal(false)} className="p-1 hover:bg-gray-200 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
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
          </motion.div >
        )}
      </AnimatePresence >

      {/* Follower List Modal */}
      < FollowerListModal
        businessId={business?.id || ''}
        businessName={business?.business_name || ''}
        followerCount={business?.follower_count || 0}
        isOpen={showFollowerModal}
        onClose={() => setShowFollowerModal(false)}
      />

      {/* Operating Hours Modal */}
      <OperatingHoursModal
        business={{
          business_name: business?.business_name || '',
          operating_hours: business?.operating_hours,
          timezone: business?.timezone
        }}
        isOpen={showHoursModal}
        onClose={() => setShowHoursModal(false)}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumbs Navigation */}
        <div className="hidden md:block bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-[5px]">
            <div className="py-0">
              <nav className="flex items-center space-x-2 text-sm">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  <Home className="w-4 h-4 mr-1" />
                  Dashboard
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300" />

                {location.state?.from === 'search' ? (
                  <>
                    <button
                      onClick={() => navigate(`/search?q=${encodeURIComponent(location.state.query || '')}`)}
                      className="text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      Search Results
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/business/dashboard')}
                      className="text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      Businesses
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </>
                )}
                <span className="text-gray-900 font-medium">
                  {business?.business_name || 'Business Profile'}
                </span>
                {/* Pending Edits Warning */}
                {isOwner && business?.has_pending_edits && (
                  <div className="mt-4">
                    <PendingChangesWarning
                      businessId={business.id}
                      onDismiss={() => {
                        // Optional: could implement session dismiss logic here
                      }}
                    />
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>

        {/* Facebook-style Cover & Profile Header */}
        <div className="bg-white pb-4 border-b">
          <div className="relative group">
            {/* Cover Image Container - Centered and Max Width */}
            <div className="max-w-7xl mx-auto px-[5px] relative group">
              <div className="h-36 md:h-48 bg-gray-200 overflow-hidden w-full relative md:rounded-b-lg">
                {/* Back Button - Inside Cover Photo */}
                <button
                  onClick={() => navigate(-1)}
                  className="absolute top-3 left-3 md:top-4 md:left-4 z-20 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white/90 rounded-full text-gray-700 hover:bg-white transition-colors shadow-sm"
                  title="Go Back"
                >
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                </button>

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

                {/* Quick Edit Cover Button */}
                {isOwner && (
                  <div className="absolute bottom-4 right-4 z-20">
                    <QuickImageUploader
                      businessId={business?.id!}
                      bucketName="business-assets"
                      imageType="cover"
                      folderPath={`business_images/${business?.id}`}
                      currentImageUrl={business?.cover_image_url}
                      onUploadComplete={(url) => handleQuickImageUpdate(url, 'cover')}
                      onDelete={() => handleQuickImageUpdate(null, 'cover')}
                      aspectRatio={16 / 9}
                      maxSizeMB={0.6}
                    />
                  </div>
                )}
              </div>

              {/* Profile Photo (Overlapping - 1/4 on cover, 3/4 below) */}
              <div className="absolute -bottom-24 md:-bottom-[9.75rem] left-4 md:left-8 z-30">
                <div className="rounded-full border-[4px] border-white bg-white shadow-md overflow-hidden w-32 h-32 md:w-52 md:h-52 relative group">
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

                  {/* Quick Edit Logo Button */}
                  {isOwner && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer">
                      <QuickImageUploader
                        businessId={business?.id!}
                        bucketName="business-assets"
                        imageType="logo"
                        folderPath={`business_images/${business?.id}`}
                        currentImageUrl={business?.logo_url}
                        onUploadComplete={(url) => handleQuickImageUpdate(url, 'logo')}
                        onDelete={() => handleQuickImageUpdate(null, 'logo')}
                        aspectRatio={1}
                        maxSizeMB={0.4}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Section (Below Cover - In Normal Flow) */}
            <div className="max-w-7xl mx-auto px-[5px] pt-[0.5rem] pb-2">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                {/* Business Name & Details (Pushed right to clear profile pic) */}
                <div className="mt-0 pl-[9.5rem] md:pl-[15.5rem] flex flex-col items-start text-left w-full min-h-0 space-y-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0">
                    <h1 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight">
                      {business?.business_name}
                    </h1>

                    {/* Verification Badge */}
                    <VerificationBadge
                      status={business?.claim_status || 'unclaimed'}
                      phoneVerified={business?.phone_verified}
                      className="ml-1"
                    />

                    {/* Recommendation Badge */}
                    {business?.recommendation_badge && (
                      <RecommendationBadge
                        tier={business.recommendation_badge}
                        percentage={business.recommendation_percentage}
                        reviewCount={business.approved_review_count}
                        size="md"
                        className="ml-2"
                      />
                    )}

                    {getStatusBadge(business?.status)}
                  </div>
                  {/* Location line */}
                  <button
                    onClick={() => {
                      if (business?.latitude && business?.longitude) {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`);
                      } else {
                        const query = encodeURIComponent(`${business?.address || ''} ${business?.city || ''} ${business?.state || ''}`);
                        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`);
                      }
                    }}
                    className="flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors text-left py-[5px] px-2 -ml-2 rounded-md hover:bg-gray-100 m-0 leading-tight h-auto min-h-0 border-0 w-fit"
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                    {business?.city}, {business?.state}
                  </button>

                  {/* Business Hours Status - Made clickable */}
                  {businessOpenStatus.text && (
                    <button
                      onClick={() => setShowHoursModal(true)}
                      className="flex items-center text-sm hover:text-indigo-600 transition-colors cursor-pointer group py-[5px] px-2 -ml-2 rounded-md hover:bg-gray-100 m-0 leading-tight h-auto min-h-0 border-0 w-fit"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0 group-hover:text-indigo-500" />
                      <span className={`font-medium ${businessOpenStatus.color} group-hover:text-indigo-600`}>
                        {businessOpenStatus.text}
                      </span>
                      {businessOpenStatus.todayHours && (
                        <span className="text-gray-500 ml-1.5 group-hover:text-indigo-600">
                          · {businessOpenStatus.todayHours}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Phone + More Info line */}
                  {business?.business_phone && (
                    <div className="flex items-center justify-between w-full text-sm text-gray-600">
                      <div className="flex items-center">
                        <a href={`tel:${business.business_phone}`} className="flex items-center hover:text-indigo-600 py-[5px] px-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors w-fit">
                          <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                          {business.business_phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Follower Count - Clickable only for business owners */}
                  {isOwner ? (
                    <button
                      onClick={() => setShowFollowerModal(true)}
                      className="flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer group py-[5px] px-2 -ml-2 rounded-md hover:bg-gray-100 m-0 leading-tight h-auto min-h-0 border-0 w-fit"
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0 group-hover:text-indigo-500" />
                      <span className="group-hover:underline">
                        {business?.follower_count || 0} {(business?.follower_count || 0) === 1 ? 'Follower' : 'Followers'}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                      <span>
                        {business?.follower_count || 0} {(business?.follower_count || 0) === 1 ? 'Follower' : 'Followers'}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons Row - Desktop Only */}
                  <div className="hidden md:flex flex-wrap items-center gap-2 mt-2 mb-2 w-full max-w-2xl">

                    {!isOwner && user && (
                      <div className="flex-1">
                        <FollowButton
                          businessId={business.id}
                          variant="default"
                          size="default"
                          className="w-full justify-center h-10"
                          onFollowChange={() => refetchBusiness()}
                        />
                      </div>
                    )}

                    {/* Check-In Button */}
                    {!isOwner && user && (
                      <button
                        onClick={handleCheckIn}
                        disabled={checkins.isCheckingIn}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed h-10"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        {checkins.isCheckingIn ? 'Checking in...' : 'Check In'}
                      </button>
                    )}

                    {/* Navigate Button - Always visible to reach 3 buttons (Follow, Check In, Navigate) */}
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
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 h-10"
                      title="Navigate"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      <span>Navigate</span>
                    </button>

                    {isOwner && (
                      <>
                        <button
                          onClick={() => navigate(`/business/${business?.id}/manage/campaigns`)}
                          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition-colors h-10"
                        >
                          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-trending-up'%3E%3Cpolyline points='22 7 13.5 15.5 8.5 10.5 2 17'/%3E%3Cpolyline points='16 7 22 7 22 13'/%3E%3C/svg%3E" alt="" className="w-4 h-4 mr-2" />
                          Campaigns
                        </button>

                        <button
                          onClick={() => navigate(`/business/${business?.id}/manage/coupons`)}
                          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 h-10"
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Coupons
                        </button>
                      </>
                    )}

                    {/* More Options Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                        className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 min-w-[2.5rem]"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {showMoreDropdown && (
                        <>
                          {/* Backdrop to close dropdown */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowMoreDropdown(false)}
                          />
                          <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">

                            {/* Share Button (Always in dropdown for non-owners now) */}
                            {!isOwner && (
                              <StorefrontShareButton
                                businessId={business.id}
                                businessName={business.business_name}
                                businessDescription={business.description}
                                variant="ghost"
                                showLabel={true}
                                showIcon={true}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 h-auto justify-start rounded-none gap-2"
                                onShareSuccess={() => {
                                  setShowMoreDropdown(false);
                                  console.log('Shared');
                                }}
                              />
                            )}


                            {isOwner && (
                              <StorefrontShareButton
                                businessId={business.id}
                                businessName={business.business_name}
                                businessDescription={business.description}
                                variant="ghost"
                                showLabel={true}
                                showIcon={true}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 h-auto justify-start rounded-none gap-2"
                                onShareSuccess={() => {
                                  setShowMoreDropdown(false);
                                  console.log('Shared');
                                }}
                              />
                            )}

                            {isOwner && (
                              <button
                                onClick={() => {
                                  setShowMoreDropdown(false);
                                  // Switch to overview tab first, then enable editing
                                  setSearchParams(prev => {
                                    const newParams = new URLSearchParams(prev);
                                    newParams.set('tab', 'overview');
                                    return newParams;
                                  });
                                  setEditing(true);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit Profile
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setShowInfoModal(true);
                                setShowMoreDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Info className="w-4 h-4" />
                              More Info
                            </button>
                            <ClaimBusinessButton
                              businessId={business.id}
                              businessName={business.business_name}
                              businessPhone={business.business_phone || ''}
                              claimStatus={business.claim_status || 'unclaimed'}
                              ownerId={business.user_id}
                              onClaimed={() => {
                                setShowMoreDropdown(false);
                                refetchBusiness();
                              }}
                              className="text-left justify-start rounded-none px-4 py-2 w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row - Mobile Only (Full Width) */}
              <div className="md:hidden flex flex-row items-stretch gap-2 mt-2 w-full">

                {!isOwner && user && (
                  <div className="flex-1">
                    <FollowButton
                      businessId={business.id}
                      businessName={business.business_name}
                      className="w-full justify-center h-10"
                      onFollowChange={() => refetchBusiness()}
                    />
                  </div>
                )}

                {/* Check-In Button - Mobile */}
                {!isOwner && user && (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkins.isCheckingIn}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-blue-200 shadow-sm text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 h-10"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {checkins.isCheckingIn ? '...' : 'Check In'}
                  </button>
                )}

                {/* Navigate Button - Mobile - Always visible */}
                <button
                  onClick={() => {
                    if (business?.latitude && business?.longitude) {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`);
                    } else {
                      const query = encodeURIComponent(`${business?.address || ''} ${business?.city || ''} ${business?.state || ''}`);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`);
                    }
                  }}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 h-10"
                  title="Navigate"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  <span>Navigate</span>
                </button>

                {isOwner && (
                  <>
                    <button
                      onClick={() => navigate(`/business/${business?.id}/manage/campaigns`)}
                      className="flex-1 inline-flex justify-center items-center px-2 py-2 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition-colors h-10"
                    >
                      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-trending-up'%3E%3Cpolyline points='22 7 13.5 15.5 8.5 10.5 2 17'/%3E%3Cpolyline points='16 7 22 7 22 13'/%3E%3C/svg%3E" alt="" className="w-3.5 h-3.5 mr-1.5" />
                      Campaigns
                    </button>

                    <button
                      onClick={() => navigate(`/business/${business?.id}/manage/coupons`)}
                      className="flex-1 inline-flex justify-center items-center px-2 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 h-10"
                    >
                      <Tag className="w-3.5 h-3.5 mr-1.5" />
                      Coupons
                    </button>
                  </>
                )}

                {/* More Options Dropdown - Mobile */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 min-w-[2.5rem]"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMoreDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMoreDropdown(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">

                        {/* Show Share in dropdown for everyone except Owner (who has dedicated logic above? No, owner share also here) */}
                        {/* Actually, share is always here now for uniformity */}
                        <StorefrontShareButton
                          businessId={business.id}
                          businessName={business.business_name}
                          businessDescription={business.description}
                          variant="ghost"
                          showLabel={true}
                          showIcon={true}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 h-auto justify-start rounded-none gap-2"
                          onShareSuccess={() => {
                            setShowMoreDropdown(false);
                            console.log('Shared');
                          }}
                        />

                        <button
                          onClick={() => {
                            setShowInfoModal(true);
                            setShowMoreDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Info className="w-4 h-4" />
                          More Info
                        </button>
                        <ClaimBusinessButton
                          businessId={business.id}
                          businessName={business.business_name}
                          businessPhone={business.business_phone || ''}
                          claimStatus={business.claim_status || 'unclaimed'}
                          ownerId={business.user_id}
                          onClaimed={() => {
                            setShowMoreDropdown(false);
                            refetchBusiness();
                          }}
                          className="text-left justify-start rounded-none px-4 py-2 w-full"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-7xl mx-auto px-[5px]">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex w-full justify-between items-center overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        // Fix for bug where navigating from sub-routes (like /offers) locks the tab
                        // If we are on a sub-route, we must navigate to the root profile URL with the tab param
                        const isSubRoute = location.pathname.endsWith('/offers') ||
                          location.pathname.endsWith('/products') ||
                          location.pathname.endsWith('/coupons');

                        if (isSubRoute) {
                          navigate(`${getBusinessUrl(business?.id || businessIdParam, business?.business_name)}?tab=${tab.id}`);
                        } else {
                          setSearchParams(prev => {
                            const newParams = new URLSearchParams(prev);
                            newParams.set('tab', tab.id);
                            return newParams;
                          });
                        }
                      }}
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-1 flex items-center justify-center ${activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      title={tab.label}
                    >
                      <span className="md:hidden">
                        {Icon && <Icon className="w-5 h-5" />}
                      </span>
                      <span className="hidden md:inline">
                        {tab.label}
                      </span>
                      {tab.count !== null && (
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs hidden md:inline-flex ${activeTab === tab.id
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-gray-100 text-gray-900'
                          }`}>
                          {tab.count}
                        </span>
                      )}
                      {/* Mobile count badge (dot) */}
                      {tab.count !== null && tab.count > 0 && (
                        <span className={`md:hidden ml-1 w-1.5 h-1.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-600' : 'bg-gray-400'}`} />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-7xl mx-auto px-[5px] pt-[25px] pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'products' && (
                  <BusinessProductsTab
                    businessId={business?.id!}
                    isOwner={isOwner}
                  />
                )}
                {activeTab === 'offers' && (
                  <div className="space-y-6">
                    <FeaturedOffers
                      businessId={business?.id!}
                      businessName={business?.business_name!}
                      isOwner={isOwner}
                      initialOfferId={searchParams.get('offer') || searchParams.get('offerId')}
                      shareId={searchParams.get('share_id')}
                      compact={false}
                      className=""
                      showHeading={false}
                    />
                  </div>
                )}
                {activeTab === 'reviews' && renderReviews()}
                {activeTab === 'statistics' && renderStatistics()}
                {activeTab === 'enhanced-profile' && (
                  <EnhancedProfileTab
                    businessId={business?.id!}
                    business={business!}
                    isOwner={isOwner}
                    onUpdate={async () => {
                      // Refresh business data from cache
                      await refetchBusiness();
                    }}
                  />
                )}
                {activeTab === 'activity' && (
                  <BusinessActivityLogsTab businessId={business?.id!} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div >

      {/* Review Request Modal */}
      {
        business && lastCheckinId && (
          <ReviewRequestModal
            isOpen={showReviewRequestModal}
            onClose={() => setShowReviewRequestModal(false)}
            businessId={business.id}
            businessName={business.business_name}
            checkinId={lastCheckinId}
            onWriteReview={() => {
              setShowReviewRequestModal(false);
              handleOpenReviewModal();
            }}
          />
        )
      }
      <ProductCreationWizard />
    </>
  );
};

export default BusinessProfile;
