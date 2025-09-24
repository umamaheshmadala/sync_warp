import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import CouponManager from './CouponManager';

interface Business {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  verified: boolean;
}

const CouponManagerPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optimized effect to run only when businessId or user.id changes
  useEffect(() => {
    let isCancelled = false;
    
    const fetchBusiness = async () => {
      if (!businessId || !user?.id) {
        setError('Business ID or user not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('businesses')
          .select('id, user_id, business_name, business_type, status, verified')
          .eq('id', businessId)
          .single();

        if (isCancelled) return;

        if (fetchError) {
          console.error('Error fetching business:', fetchError);
          if (fetchError.code === 'PGRST116') {
            setError('Business not found');
          } else {
            setError('Failed to load business information');
          }
          return;
        }

        if (!data) {
          setError('Business not found');
          return;
        }

        // Check if user owns this business
        if (data.user_id !== user.id) {
          setError('You do not have permission to manage coupons for this business');
          return;
        }

        setBusiness(data);
      } catch (err) {
        if (!isCancelled) {
          console.error('Unexpected error:', err);
          setError('An unexpected error occurred');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchBusiness();
    
    return () => {
      isCancelled = true;
    };
  }, [businessId, user?.id]); // Only depend on businessId and user.id to prevent unnecessary re-renders

  const handleGoBack = useCallback(() => {
    navigate(`/business/${businessId}`);
  }, [navigate, businessId]);

  const handleGoHome = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleGoToBusinessDashboard = useCallback(() => {
    navigate('/business/dashboard');
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business information...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Unable to access this business'}
          </p>
          <div className="space-y-3">
            <button
              onClick={handleGoToBusinessDashboard}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Business Dashboard
            </button>
            <button
              onClick={handleGoHome}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                onClick={handleGoHome}
                className="hover:text-gray-700 transition-colors flex items-center"
              >
                <Home className="w-4 h-4" />
              </button>
              
              <ChevronRight className="w-4 h-4" />
              
              <button
                onClick={handleGoToBusinessDashboard}
                className="hover:text-gray-700 transition-colors"
              >
                Businesses
              </button>
              
              <ChevronRight className="w-4 h-4" />
              
              <button
                onClick={handleGoBack}
                className="hover:text-gray-700 transition-colors max-w-48 truncate"
              >
                {business.business_name}
              </button>
              
              <ChevronRight className="w-4 h-4" />
              
              <span className="text-gray-900 font-medium">Coupons</span>
            </nav>

            {/* Back Button */}
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Business
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-6">
        <CouponManager
          businessId={business.id}
          businessName={business.business_name}
          isOwner={true} // Already verified ownership above
        />
      </div>
    </div>
  );
};

export default CouponManagerPage;
