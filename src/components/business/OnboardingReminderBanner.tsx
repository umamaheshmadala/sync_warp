/**
 * Onboarding Reminder Banner
 * Shows a banner in the business dashboard for businesses that haven't completed onboarding
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OnboardingReminderBannerProps {
  businessId: string;
}

export const OnboardingReminderBanner: React.FC<OnboardingReminderBannerProps> = ({
  businessId
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [businessId]);

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);

      // Check if business has completed onboarding
      const { data: business, error } = await supabase
        .from('businesses')
        .select('onboarding_completed_at')
        .eq('id', businessId)
        .single();

      if (error) throw error;

      const isComplete = !!business?.onboarding_completed_at;
      setIsOnboardingComplete(isComplete);

      // Check if user has permanently dismissed the reminder
      if (!isComplete) {
        const dismissed = localStorage.getItem(`onboarding_dismissed_${businessId}`);
        const tempDismissed = sessionStorage.getItem(`onboarding_temp_dismissed_${businessId}`);
        
        if (!dismissed && !tempDismissed) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTempDismiss = () => {
    sessionStorage.setItem(`onboarding_temp_dismissed_${businessId}`, 'true');
    setIsVisible(false);
  };

  const handlePermanentDismiss = () => {
    localStorage.setItem(`onboarding_dismissed_${businessId}`, 'true');
    setIsVisible(false);
  };

  if (loading || !isVisible || isOnboardingComplete) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  🎯 Enhance Your Business Profile
                </h3>
                <button
                  onClick={handlePermanentDismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Dismiss permanently"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-700 mb-4">
                Complete your marketing profile to reach more customers and create better campaigns. 
                Define your target audience, set marketing goals, and track business metrics.
              </p>

              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  <span className="text-gray-700">Better targeting</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  <span className="text-gray-700">Marketing insights</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  <span className="text-gray-700">Goal tracking</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/business/onboarding?businessId=${businessId}`}
                  className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Complete Profile (15 min)
                </Link>

                <button
                  onClick={handleTempDismiss}
                  className="inline-flex items-center px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Remind Me Later
                </button>
              </div>

              {/* Info Text */}
              <p className="text-xs text-gray-500 mt-3 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your progress is saved automatically. You can exit at any time and continue later.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator (Optional) */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Profile Completion:</span>
            <div className="flex items-center">
              <div className="w-32 h-2 bg-white rounded-full overflow-hidden mr-2">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600" style={{ width: '20%' }}></div>
              </div>
              <span className="text-gray-700 font-semibold">20%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
