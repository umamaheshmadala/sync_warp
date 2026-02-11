/**
 * Business Onboarding Page
 * Story 4B.4 - Enhanced Business Onboarding
 * 
 * Wrapper page component for the Enhanced Onboarding Wizard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { EnhancedOnboardingWizard } from './onboarding/EnhancedOnboardingWizard';
import { toast } from 'react-hot-toast';

export default function BusinessOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessForOnboarding();
  }, [user?.id, searchParams]);

  const loadBusinessForOnboarding = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        toast.error('Please log in to continue');
        navigate('/login');
        return;
      }

      // Check if businessId is provided in URL params
      const businessIdParam = searchParams.get('businessId');

      if (businessIdParam) {
        // Verify user owns this business
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id, user_id, business_name')
          .eq('id', businessIdParam)
          .eq('user_id', user.id)
          .single();

        if (businessError || !business) {
          toast.error('Business not found or you don\'t have permission to access it');
          navigate('/business/dashboard');
          return;
        }

        setBusinessId(business.id);
      } else {
        // No businessId provided, get the user's most recent business
        const { data: businesses, error: businessesError } = await supabase
          .from('businesses')
          .select('id, user_id, business_name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (businessesError) {
          throw businessesError;
        }

        if (!businesses || businesses.length === 0) {
          // No businesses found, redirect to registration
          toast.error('Please register a business first');
          navigate('/business/register');
          return;
        }

        setBusinessId(businesses[0].id);
      }

    } catch (err: any) {
      console.error('Error loading business for onboarding:', err);
      setError(err.message || 'Failed to load business information');
      toast.error('Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    toast.success('🎉 Onboarding completed successfully!');
    navigate('/business/dashboard');
  };

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load Onboarding
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <Link
            to="/business/dashboard"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Business Found
          </h2>
          <p className="text-gray-600 mb-6">
            Please register a business before starting the onboarding process.
          </p>
          <Link
            to="/business/register"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Register Business
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EnhancedOnboardingWizard
      businessId={businessId}
      onComplete={handleOnboardingComplete}
    />
  );
}
