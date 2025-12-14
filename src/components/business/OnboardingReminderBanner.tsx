/**
 * Onboarding Reminder Banner - Compact Version
 * Shows a compact two-line reminder for businesses that haven't completed onboarding
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBusinessUrl } from '@/hooks/useBusinessUrl';

interface OnboardingReminderBannerProps {
  businessId: string;
  businessName: string;
}

export const OnboardingReminderBanner: React.FC<OnboardingReminderBannerProps> = ({
  businessId,
  businessName
}) => {
  const { getBusinessUrl } = useBusinessUrl();
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

  const handleDismiss = () => {
    sessionStorage.setItem(`onboarding_temp_dismissed_${businessId}`, 'true');
    setIsVisible(false);
  };

  if (loading || !isVisible || isOnboardingComplete) {
    return null;
  }

  // Link to the enhanced-profile tab on the business page
  const businessUrl = getBusinessUrl(businessId, businessName);
  const enhancedProfileUrl = `${businessUrl}?tab=enhanced-profile`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="mb-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg px-3 py-1.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-medium text-gray-900">
                Complete Enhanced Profile for <span className="text-purple-700">{businessName}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <Link
              to={enhancedProfileUrl}
              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-md hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Complete
            </Link>
            <button
              onClick={handleDismiss}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-black/5"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
