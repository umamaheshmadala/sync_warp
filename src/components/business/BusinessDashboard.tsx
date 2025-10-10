import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { OnboardingReminderBanner } from './OnboardingReminderBanner';

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

interface BusinessStats {
  totalBusinesses: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  totalReviews: number;
  averageRating: number;
  totalCheckins: number;
}

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string; }>;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

interface BusinessCardProps {
  business: Business;
}

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BusinessStats>({
    totalBusinesses: 0,
    activeBusinesses: 0,
    pendingBusinesses: 0,
    totalReviews: 0,
    averageRating: 0,
    totalCheckins: 0
  });

  // Fetch user's businesses
  useEffect(() => {
    let isMounted = true;
    
    const fetchBusinesses = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Fetch businesses owned by the user
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (businessError) throw businessError;
        
        // Only update state if component is still mounted
        if (!isMounted) return;

        setBusinesses(businessData || []);

        // Calculate statistics
        const totalBusinesses = businessData?.length || 0;
        const activeBusinesses = businessData?.filter(b => b.status === 'active').length || 0;
        const pendingBusinesses = businessData?.filter(b => b.status === 'pending').length || 0;
        const totalReviews = businessData?.reduce((sum, b) => sum + (b.total_reviews || 0), 0) || 0;
        const totalCheckins = businessData?.reduce((sum, b) => sum + (b.total_checkins || 0), 0) || 0;
        
        // Calculate average rating across all businesses
        const businessesWithRatings = businessData?.filter(b => b.average_rating > 0) || [];
        const averageRating = businessesWithRatings.length > 0 
          ? businessesWithRatings.reduce((sum, b) => sum + b.average_rating, 0) / businessesWithRatings.length 
          : 0;

        if (isMounted) {
          setStats({
            totalBusinesses,
            activeBusinesses,
            pendingBusinesses,
            totalReviews,
            averageRating,
            totalCheckins
          });
        }

      } catch (error) {
        if (isMounted) {
          console.error('Error fetching businesses:', error);
          toast.error('Failed to load your businesses');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBusinesses();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Only depend on user.id, not the entire user object

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200"
    >
      {/* Cover Image */}
      <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
        {business.cover_image_url ? (
          <img
            src={business.cover_image_url}
            alt={business.business_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {business.business_name}
            </h3>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <MapPin className="w-4 h-4 mr-1" />
              {business.city}, {business.state}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusBadge(business.status)}
            {business.verified && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {business.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="font-semibold text-sm">
                {business.average_rating ? business.average_rating.toFixed(1) : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-blue-500 mr-1" />
              <span className="font-semibold text-sm">{business.total_reviews || 0}</span>
            </div>
            <p className="text-xs text-gray-500">Reviews</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <MapPin className="w-4 h-4 text-green-500 mr-1" />
              <span className="font-semibold text-sm">{business.total_checkins || 0}</span>
            </div>
            <p className="text-xs text-gray-500">Check-ins</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          {business.business_phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-2" />
              {business.business_phone}
            </div>
          )}
          {business.business_email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-4 h-4 mr-2" />
              {business.business_email}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Link
              to={`/business/${business.id}`}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Link>
            
            <Link
              to={`/business/${business.id}/edit`}
              className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Link>
          </div>
          
          <div className="space-y-2">
            <Link
              to={`/business/${business.id}/analytics`}
              className="w-full flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              View Analytics
            </Link>
            
            <Link
              to={`/business/${business.id}/products`}
              className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Package className="w-4 h-4 mr-1" />
              Manage Products
            </Link>
            
            <Link
              to={`/business/${business.id}/coupons`}
              className="w-full flex items-center justify-center px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Manage Coupons
            </Link>
            
            <Link
              to={`/business/${business.id}/qr-code`}
              className="w-full flex items-center justify-center px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              <QrCode className="w-4 h-4 mr-1" />
              Generate QR Code
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Statistics card component
  const StatsCard: React.FC<StatsCardProps> = ({ icon: Icon, title, value, subtitle, color = 'indigo' }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center">
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Businesses</h1>
              <p className="mt-2 text-gray-600">
                Manage and monitor your business listings on SynC
              </p>
            </div>
            
            <Link
              to="/business/register"
              className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Business
            </Link>
          </div>
        </div>

        {/* Onboarding Reminder - Show for first business if not completed */}
        {businesses.length > 0 && businesses[0] && (
          <OnboardingReminderBanner businessId={businesses[0].id} />
        )}

        {/* Statistics */}
        {businesses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            <StatsCard
              icon={TrendingUp}
              title="Total Businesses"
              value={stats.totalBusinesses}
              color="indigo"
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
              icon={Star}
              title="Avg Rating"
              value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
              color="yellow"
            />
            
            <StatsCard
              icon={Users}
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

        {/* Recent Activity (Placeholder) */}
        {businesses.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Recent activity feed coming soon!</p>
              <p className="text-sm mt-2">
                Track customer interactions, reviews, and business updates.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDashboard;