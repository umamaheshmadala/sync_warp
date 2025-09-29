// src/components/business/BusinessAnalyticsPage.tsx
// Comprehensive analytics page for individual businesses

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  Clock,
  Target,
  Download,
  RefreshCw,
  Calendar,
  Eye,
  Star,
  Activity,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import BusinessCheckinAnalytics from '../checkins/BusinessCheckinAnalytics';
import { toast } from 'react-hot-toast';

interface Business {
  id: string;
  business_name: string;
  business_type: string;
  address: string;
  status: string;
  logo_url?: string;
  total_checkins: number;
  average_rating: number;
  total_reviews: number;
  created_at: string;
}

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
}

const BusinessAnalyticsPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load business data
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!businessId || !user?.id) return;

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .eq('user_id', user.id) // Ensure user owns this business
          .single();

        if (error) throw error;

        setBusiness(data);
      } catch (error) {
        console.error('Error fetching business:', error);
        toast.error('Failed to load business analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger a re-fetch by updating the component
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('user_id', user?.id)
      .single();
    
    if (data) setBusiness(data);
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      suspended: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, text: 'Suspended' },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle, text: 'Inactive' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h2>
          <p className="text-gray-600 mb-4">
            The business you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link
            to="/business/dashboard"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Quick stats data
  const quickStats: QuickStat[] = [
    {
      label: 'Total Check-ins',
      value: business.total_checkins || 0,
      icon: Target,
      color: 'green',
    },
    {
      label: 'Average Rating',
      value: business.average_rating ? business.average_rating.toFixed(1) : 'N/A',
      icon: Star,
      color: 'yellow',
    },
    {
      label: 'Total Reviews',
      value: business.total_reviews || 0,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Business Status',
      value: business.status.charAt(0).toUpperCase() + business.status.slice(1),
      icon: Activity,
      color: business.status === 'active' ? 'green' : 'yellow',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/business/dashboard"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Dashboard
              </Link>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Business Header */}
          <div className="mt-6 bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.business_name}
                    className="w-16 h-16 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{business.business_name}</h1>
                  <p className="text-gray-600">{business.business_type}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{business.address}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                {getStatusBadge(business.status)}
                <p className="text-sm text-gray-500 mt-2">
                  Since {new Date(business.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  {stat.change && (
                    <p className={`text-sm mt-1 flex items-center ${
                      stat.changeType === 'increase' ? 'text-green-600' : 
                      stat.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.changeType === 'increase' && <TrendingUp className="w-3 h-3 mr-1" />}
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Analytics Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <BusinessCheckinAnalytics 
            businessId={businessId!} 
            businessName={business.business_name}
          />
        </motion.div>

        {/* Quick Actions */}
        <div className="mt-12 bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to={`/business/${businessId}/edit`}
              className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Edit Business</p>
                <p className="text-sm text-gray-600">Update business information</p>
              </div>
            </Link>
            
            <Link
              to={`/business/${businessId}/qr`}
              className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Target className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">QR Code</p>
                <p className="text-sm text-gray-600">Generate check-in QR code</p>
              </div>
            </Link>
            
            <Link
              to={`/business/${businessId}/reviews`}
              className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Star className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Reviews</p>
                <p className="text-sm text-gray-600">Manage customer reviews</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessAnalyticsPage;