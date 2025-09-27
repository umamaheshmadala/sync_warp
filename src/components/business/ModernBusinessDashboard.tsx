import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MapPin,
  Star,
  Users,
  Eye,
  Edit3,
  CheckCircle,
  AlertCircle,
  Camera,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  Package,
  BarChart3,
  Award,
  Zap,
  Target,
  Activity,
  Globe,
  ShoppingBag,
  Sparkles,
  Building2,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { TiltedCard, AnimatedList, MagicBento, GlassCard } from '../ui';

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

const ModernBusinessDashboard: React.FC = () => {
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

        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (businessError) throw businessError;
        
        if (!isMounted) return;

        setBusinesses(businessData || []);

        const totalBusinesses = businessData?.length || 0;
        const activeBusinesses = businessData?.filter(b => b.status === 'active').length || 0;
        const pendingBusinesses = businessData?.filter(b => b.status === 'pending').length || 0;
        const totalReviews = businessData?.reduce((sum, b) => sum + (b.total_reviews || 0), 0) || 0;
        const totalCheckins = businessData?.reduce((sum, b) => sum + (b.total_checkins || 0), 0) || 0;
        
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
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const getStatusIcon = (status: string) => {
    const statusConfig = {
      active: { icon: CheckCircle, color: 'text-emerald-500' },
      pending: { icon: Clock, color: 'text-amber-500' },
      suspended: { icon: AlertCircle, color: 'text-red-500' },
      inactive: { icon: AlertCircle, color: 'text-gray-500' }
    };
    return statusConfig[status] || statusConfig.inactive;
  };

  const getBentoConfig = () => [
    {
      id: '1',
      title: 'Total Businesses',
      value: stats.totalBusinesses.toString(),
      icon: Building2,
      gradient: 'from-purple-500 to-purple-600',
      description: 'Active listings'
    },
    {
      id: '2',
      title: 'Average Rating',
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A',
      icon: Star,
      gradient: 'from-amber-400 to-orange-500',
      description: 'Customer satisfaction'
    },
    {
      id: '3',
      title: 'Total Reviews',
      value: stats.totalReviews.toString(),
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      description: 'Customer feedback'
    },
    {
      id: '4',
      title: 'Quick Actions',
      value: '',
      icon: Zap,
      gradient: 'from-green-500 to-green-600',
      description: 'Manage your businesses',
      isAction: true
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto"></div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 w-20 h-20 border-4 border-blue-200 rounded-full mx-auto opacity-50"
            />
          </div>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-medium text-slate-600"
          >
            Loading your business empire...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent mb-3">
                Business Empire
              </h1>
              <p className="text-xl text-slate-600 font-medium">
                Command center for your business presence on SynC
              </p>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to="/business/register"
                className="group relative flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Plus className="w-5 h-5 mr-2 relative z-10" />
                <span className="relative z-10">Add Business</span>
                <Sparkles className="w-4 h-4 ml-2 relative z-10 group-hover:rotate-12 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {businesses.length > 0 ? (
          <>
            {/* Statistics Bento Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <MagicBento tiles={getBentoConfig()} />
            </motion.div>

            {/* Business Showcase */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <div className="flex items-center mb-8">
                <Award className="w-6 h-6 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-slate-900">Your Businesses</h2>
              </div>

              <AnimatedList
                items={businesses.map((business, index) => ({
                  id: business.id,
                  content: (
                    <TiltedCard
                      key={business.id}
                      className="h-full"
                    >
                      <GlassCard className="h-full">
                        {/* Cover Image */}
                        <div className="h-48 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg overflow-hidden mb-6 relative">
                          {business.cover_image_url ? (
                            <img
                              src={business.cover_image_url}
                              alt={business.business_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="w-12 h-12 text-purple-300" />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div className="absolute top-4 right-4">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-md ${business.status === 'active' ? 'bg-emerald-100/80 text-emerald-700' :
                                business.status === 'pending' ? 'bg-amber-100/80 text-amber-700' :
                                'bg-red-100/80 text-red-700'}`}
                            >
                              {React.createElement(getStatusIcon(business.status).icon, {
                                className: `w-3 h-3 mr-1 ${getStatusIcon(business.status).color}`
                              })}
                              {business.status.charAt(0).toUpperCase() + business.status.slice(1)}
                            </motion.div>
                          </div>

                          {business.verified && (
                            <div className="absolute top-4 left-4">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100/80 text-blue-700 backdrop-blur-md"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </motion.div>
                            </div>
                          )}
                        </div>

                        {/* Business Info */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                              {business.business_name}
                            </h3>
                            <div className="flex items-center text-slate-600 mb-3">
                              <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                              <span className="text-sm">{business.city}, {business.state}</span>
                            </div>
                            <p className="text-slate-600 text-sm line-clamp-2">
                              {business.description}
                            </p>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1">
                                <Star className="w-4 h-4 text-amber-500 mr-1" />
                                <span className="font-bold text-slate-900">
                                  {business.average_rating ? business.average_rating.toFixed(1) : 'N/A'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">Rating</p>
                            </div>
                            
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1">
                                <Users className="w-4 h-4 text-blue-500 mr-1" />
                                <span className="font-bold text-slate-900">{business.total_reviews || 0}</span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">Reviews</p>
                            </div>
                            
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1">
                                <Activity className="w-4 h-4 text-green-500 mr-1" />
                                <span className="font-bold text-slate-900">{business.total_checkins || 0}</span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">Check-ins</p>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2">
                            {business.business_phone && (
                              <div className="flex items-center text-sm text-slate-600">
                                <Phone className="w-4 h-4 mr-3 text-purple-500" />
                                {business.business_phone}
                              </div>
                            )}
                            {business.business_email && (
                              <div className="flex items-center text-sm text-slate-600">
                                <Mail className="w-4 h-4 mr-3 text-purple-500" />
                                {business.business_email}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-3 pt-4 border-t border-slate-200">
                            <div className="grid grid-cols-2 gap-3">
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Link
                                  to={`/business/${business.id}`}
                                  className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-300"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Link>
                              </motion.div>
                              
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Link
                                  to={`/business/${business.id}/edit`}
                                  className="flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:shadow-md transition-all duration-300"
                                >
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Edit
                                </Link>
                              </motion.div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Link
                                  to={`/business/${business.id}/products`}
                                  className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-300"
                                >
                                  <Package className="w-4 h-4 mr-2" />
                                  Products
                                </Link>
                              </motion.div>
                              
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Link
                                  to={`/business/${business.id}/coupons`}
                                  className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-300"
                                >
                                  <ShoppingBag className="w-4 h-4 mr-2" />
                                  Coupons
                                </Link>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </TiltedCard>
                  )
                }))}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
              />
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GlassCard className="p-8">
                <div className="flex items-center mb-6">
                  <BarChart3 className="w-6 h-6 text-purple-600 mr-3" />
                  <h3 className="text-2xl font-bold text-slate-900">Business Insights</h3>
                </div>
                <div className="text-center py-12">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                  </motion.div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">
                    Advanced Analytics Coming Soon!
                  </h4>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Get detailed insights into customer interactions, performance metrics, and growth trends across all your businesses.
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          </>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="max-w-2xl mx-auto">
              <GlassCard className="p-12">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="mb-8"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-blue-400 rounded-2xl mx-auto flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-white" />
                  </div>
                </motion.div>
                
                <h3 className="text-3xl font-bold text-slate-900 mb-4">
                  Build Your Business Empire
                </h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Start your journey on SynC by registering your first business. 
                  Connect with local customers, showcase your products, and grow your digital presence.
                </p>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mb-8"
                >
                  <Link
                    to="/business/register"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="w-6 h-6 mr-3" />
                    Register Your First Business
                    <Sparkles className="w-5 h-5 ml-3" />
                  </Link>
                </motion.div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-purple-600" />
                      Business Benefits
                    </h4>
                    <ul className="space-y-2 text-slate-600">
                      <li className="flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-blue-500" />
                        Enhanced online visibility
                      </li>
                      <li className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-green-500" />
                        Direct customer engagement
                      </li>
                      <li className="flex items-center">
                        <Star className="w-4 h-4 mr-2 text-amber-500" />
                        Customer reviews & ratings
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-purple-600" />
                      Platform Features
                    </h4>
                    <ul className="space-y-2 text-slate-600">
                      <li className="flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-purple-500" />
                        Performance analytics
                      </li>
                      <li className="flex items-center">
                        <Package className="w-4 h-4 mr-2 text-pink-500" />
                        Product & service listings
                      </li>
                      <li className="flex items-center">
                        <ShoppingBag className="w-4 h-4 mr-2 text-cyan-500" />
                        Coupon & promotion tools
                      </li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ModernBusinessDashboard;