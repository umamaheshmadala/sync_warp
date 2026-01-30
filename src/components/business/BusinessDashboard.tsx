import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import {
  Plus,
  MapPin,
  Clock,
  Star,
  Users,
  Eye,
  Edit3,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Camera,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  Package,
  BarChart3,
  Activity,
  Target,
  QrCode,
  UserPlus,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { OnboardingReminderBanner } from './OnboardingReminderBanner'; // Keep if used elsewhere, otherwise remove? 
// No, I should remove it if unused, but safety first.
import { ConsolidatedOnboardingBanner } from './ConsolidatedOnboardingBanner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  follower_count?: number;
  // average_rating: number; // Removed, now derived from review stats
  total_reviews: number;
  recommend_count?: number; // Added for cumulative calc
  total_checkins: number;
  created_at: string;
  updated_at: string;
  onboarding_completed_at?: string | null;
}

interface BusinessStats {
  totalBusinesses: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  totalFollowers: number;
  totalReviews: number;
  recommendationPercentage: number; // Changed from averageRating
  totalCheckins: number;
}

interface StatsCardProps {
  icon: React.FC<any>;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

interface BusinessCardProps {
  business: Business;
}

// Fetch businesses for the current user
async function fetchUserBusinesses(userId: string): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }); // Changed order to created_at

  if (error) {
    console.error('Error fetching businesses:', error);
    throw error;
  }

  // Fetch accurate counts for each business
  const businessesWithCounts = await Promise.all((data || []).map(async (b) => {
    // 1. Get accurate follower count
    const { count: followers } = await supabase
      .from('business_followers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', b.id)
      .eq('entity_type', 'business')
      .eq('is_active', true);

    // 2. Get accurate review stats via direct count (bypass RPC to ensure accuracy)
    // Total ACTIVE & APPROVED reviews (matching storefront)
    const { count: totalReviews } = await supabase
      .from('business_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', b.id)
      .eq('moderation_status', 'approved')
      .is('deleted_at', null);

    // Recommended reviews (Active & Approved only)
    const { count: recommendedCount } = await supabase
      .from('business_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', b.id)
      .eq('recommendation', true)
      .eq('moderation_status', 'approved')
      .is('deleted_at', null);

    console.log(`[Dashboard] Business ${b.business_name}: Followers=${followers}, Reviews=${totalReviews}, Recs=${recommendedCount}`);

    return {
      ...b,
      follower_count: followers || 0,
      total_reviews: totalReviews || 0,
      recommend_count: recommendedCount || 0,
    };
  }));

  return businessesWithCounts;
}

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Added useState for modal

  const queryClient = useQueryClient();

  // Use React Query with SWR pattern - cached data shown immediately
  const { data: businesses = [], isLoading: loading } = useQuery({
    queryKey: ['user-businesses', user?.id], // Updated queryKey
    queryFn: async () => {
      const data = await fetchUserBusinesses(user!.id);
      console.log('BusinessDashboard fetched:', data);
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Realtime subscription to listen for status changes
  React.useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`business-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate and refetch when any business data changes
          queryClient.invalidateQueries({ queryKey: ['user-businesses', user.id] }); // Updated queryKey
          toast.success('Business information updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Calculate stats from businesses (memoized)
  const stats = useMemo<BusinessStats>(() => {
    const totalBusinesses = businesses.length;
    const activeBusinesses = businesses.filter(b => b.status === 'active').length;
    const pendingBusinesses = businesses.filter(b => b.status === 'pending').length;

    // Summing accurate counts fetched above
    const totalReviews = businesses.reduce((sum, b) => sum + (b.total_reviews || 0), 0);
    const totalFollowers = businesses.reduce((sum, b) => sum + (b.follower_count || 0), 0);
    const totalCheckins = businesses.reduce((sum, b) => sum + (b.total_checkins || 0), 0);
    const totalRecommended = businesses.reduce((sum, b) => sum + (b.recommend_count || 0), 0);

    // Calculate cumulative recommendation percentage
    // specific logic: (Total Recommended Reviews / Total Reviews) * 100
    const recommendationPercentage = totalReviews > 0
      ? Math.round((totalRecommended / totalReviews) * 100)
      : 0;

    return {
      totalBusinesses,
      activeBusinesses,
      pendingBusinesses,
      totalFollowers,
      totalReviews,
      recommendationPercentage,
      totalCheckins
    };
  }, [businesses]);

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: 'Pending' },
      suspended: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Suspended' },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Inactive' }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };


  // Business card component
  const BusinessCard: React.FC<BusinessCardProps> = ({ business }) => (
    <motion.div
      initial={false}  // Prevent animation replay on parent re-renders
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 cursor-pointer group"
      onClick={() => navigate(getBusinessUrl(business.id, business.business_name))}
    >
      {/* Cover Image */}
      <div className="h-32 bg-gray-200 rounded-t-lg overflow-hidden relative">
        {business.cover_image_url ? (
          <img
            src={business.cover_image_url}
            alt={business.business_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
        )}
        {/* Status Badge Overlay */}
        <div className="absolute top-2 right-2">
          {getStatusBadge(business.status)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {business.business_name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`${getBusinessUrl(business.id, business.business_name)}/qr-code`);
                }}
                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="Generate QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <MapPin className="w-4 h-4 mr-1" />
              {business.city}, {business.state}
            </div>
          </div>


        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <UserPlus className="w-4 h-4 text-purple-500 mr-1" />
              <span className="font-semibold text-xs">{business.follower_count || 0}</span>
            </div>
            <p className="text-xs text-gray-500">Followers</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-blue-500 mr-1" />
              <span className="font-semibold text-xs">{business.total_reviews || 0}</span>
            </div>
            <p className="text-xs text-gray-500">Reviews</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <MapPin className="w-4 h-4 text-green-500 mr-1" />
              <span className="font-semibold text-xs">{business.total_checkins || 0}</span>
            </div>
            <p className="text-xs text-gray-500">Check-ins</p>
          </div>
        </div>


      </div>
    </motion.div>
  );

  // Statistics card component
  const StatsCard: React.FC<StatsCardProps> = ({ icon: Icon, title, value, subtitle, color = 'indigo' }) => (
    <div className="bg-white rounded-lg shadow-sm border p-3">
      <div className="flex items-center">
        <div className={`p-2 bg-${color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 hidden md:block truncate" title={title}>{title}</p>
          <p className="text-lg font-semibold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your businesses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-auto text-center md:text-left">
              <h1 className="text-lg md:text-3xl font-bold text-gray-900">My Businesses</h1>
              <p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-base hidden md:block">
                Manage and monitor your business listings on SynC
              </p>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-center md:justify-end">
              {/* Create Campaign Button - shows if there is at least one active business */}
              {businesses.some(b => b.status === 'active') && (
                <Link
                  to={`${getBusinessUrl(businesses.find(b => b.status === 'active')!.id, businesses.find(b => b.status === 'active')!.business_name)}/campaigns/create`}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-sm"
                >
                  <TrendingUp className="w-4 h-4 mr-1.5" />
                  Create Campaign
                </Link>
              )}

              <Link
                to="/business/register"
                className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Business
              </Link>
            </div>
          </div>
        </div>

        {/* Onboarding Reminder - Consolidated Banner */}
        {businesses.length > 0 && (
          <div className="mb-6">
            <ConsolidatedOnboardingBanner businesses={businesses} />
          </div>
        )}

        {/* Statistics - grid row */}
        {businesses.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatsCard
              icon={TrendingUp}
              title="Total Businesses"
              value={stats.totalBusinesses}
              color="indigo"
            />

            <StatsCard
              icon={Users}
              title="Total Followers"
              value={stats.totalFollowers}
              color="pink"
            />

            <StatsCard
              icon={CheckCircle}
              title="Active"
              value={stats.activeBusinesses}
              color="green"
            />

            <StatsCard
              icon={Clock}
              title="Pending"
              value={stats.pendingBusinesses}
              color="yellow"
            />

            <StatsCard
              icon={ThumbsUp} // Using ThumbsUp for recommendation
              title="Recommended"
              value={`${stats.recommendationPercentage}%`}
              color="green"
            />

            <StatsCard
              icon={MessageSquare}
              title="Total Reviews"
              value={stats.totalReviews}
              color="blue"
            />

            <StatsCard
              icon={MapPin}
              title="Check-ins"
              value={stats.totalCheckins}
              color="green"
            />
          </div>
        )}



        {/* Business Grid */}
        {businesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="p-6 bg-white rounded-lg shadow-sm border">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No businesses registered
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by registering your first business on SynC.
                  Connect with local customers and grow your business presence.
                </p>

                <Link
                  to="/business/register"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Register Your Business
                </Link>

                <div className="mt-6 text-sm text-gray-500">
                  <h4 className="font-medium mb-2">Benefits of registering:</h4>
                  <ul className="text-left space-y-1">
                    <li>• Connect with local customers</li>
                    <li>• Manage customer reviews and feedback</li>
                    <li>• Track business performance metrics</li>
                    <li>• Build your online presence</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default BusinessDashboard;