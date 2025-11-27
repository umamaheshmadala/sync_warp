import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import CouponManager from './CouponManager';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

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
  const { getBusinessUrl } = useBusinessUrl();
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
    navigate(getBusinessUrl(businessId!, business?.business_name));
  }, [navigate, businessId, business?.business_name, getBusinessUrl]);

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
  export default CouponManagerPage;
