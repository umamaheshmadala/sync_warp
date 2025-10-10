/**
 * useProfileCompletion Hook
 * Story 4B.4 - Enhanced Business Onboarding
 * 
 * Manages profile completion calculation and recommendations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  EnhancedBusinessData,
  ProfileCompletionData,
  BusinessCustomerProfile,
  BusinessMetrics,
  BusinessMarketingGoals,
  getMissingFields,
  getProfileRecommendations,
  calculateCustomerProfileCompletion,
  calculateMetricsCompletion,
  calculateMarketingGoalsCompletion
} from '@/types/business-onboarding';

interface UseProfileCompletionOptions {
  businessId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface UseProfileCompletionReturn {
  // Completion data
  completionData: ProfileCompletionData | null;
  percentage: number;
  missingFields: string[];
  recommendations: string[];
  
  // Section breakdowns
  sectionsCompletion: {
    basics: number;
    customer_profile: number;
    metrics: number;
    marketing_goals: number;
  };
  
  // Business data
  businessData: EnhancedBusinessData | null;
  
  // Actions
  refresh: () => Promise<void>;
  updateSection: (
    section: 'customer_profile' | 'metrics' | 'marketing_goals',
    data: any
  ) => Promise<boolean>;
  
  // Status
  loading: boolean;
  updating: boolean;
  error: string | null;
}

/**
 * Custom hook for managing profile completion tracking
 */
export function useProfileCompletion({
  businessId,
  autoRefresh = false,
  refreshInterval = 30000
}: UseProfileCompletionOptions): UseProfileCompletionReturn {
  
  const [businessData, setBusinessData] = useState<EnhancedBusinessData | null>(null);
  const [completionData, setCompletionData] = useState<ProfileCompletionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile data on mount
  useEffect(() => {
    loadProfileData();
  }, [businessId]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadProfileData();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, businessId]);

  /**
   * Load complete business profile data
   */
  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch business basic data
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          category,
          employees_count,
          years_in_business,
          profile_completion_percentage,
          onboarding_completed_at,
          last_profile_update
        `)
        .eq('id', businessId)
        .single();

      if (businessError) throw businessError;
      if (!business) throw new Error('Business not found');

      // Fetch customer profile
      const { data: customerProfile } = await supabase
        .from('business_customer_profiles')
        .select('*')
        .eq('business_id', businessId)
        .single();

      // Fetch business metrics
      const { data: metrics } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('business_id', businessId)
        .single();

      // Fetch marketing goals
      const { data: marketingGoals } = await supabase
        .from('business_marketing_goals')
        .select('*')
        .eq('business_id', businessId)
        .single();

      // Fetch onboarding progress
      const { data: progress } = await supabase
        .from('business_onboarding_progress')
        .select('*')
        .eq('business_id', businessId)
        .order('step_number');

      // Build enhanced business data
      const enhancedData: EnhancedBusinessData = {
        ...business,
        customer_profile: customerProfile || undefined,
        metrics: metrics || undefined,
        marketing_goals: marketingGoals || undefined,
        onboarding_progress: progress || undefined
      };

      setBusinessData(enhancedData);

      // Calculate completion data
      const completion = calculateCompletion(enhancedData);
      setCompletionData(completion);

    } catch (err: any) {
      setError(err.message || 'Failed to load profile data');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate profile completion metrics
   */
  const calculateCompletion = (data: EnhancedBusinessData): ProfileCompletionData => {
    // Calculate section completions
    const basics = calculateBasicsCompletion(data);
    const customer_profile = calculateCustomerProfileCompletion(data.customer_profile);
    const metrics = calculateMetricsCompletion(data.metrics);
    const marketing_goals = calculateMarketingGoalsCompletion(data.marketing_goals);

    // Overall percentage (weighted average)
    const percentage = Math.round(
      (basics * 0.2 + customer_profile * 0.3 + metrics * 0.3 + marketing_goals * 0.2)
    );

    // Get missing and completed fields
    const missing = getMissingFields(data);
    const completed = getCompletedFields(data);

    // Get recommendations
    const recommendations = getProfileRecommendations(data);

    return {
      percentage,
      missing_fields: missing,
      completed_fields: completed,
      recommendations,
      sections: {
        basics,
        customer_profile,
        metrics,
        marketing_goals
      }
    };
  };

  /**
   * Calculate basics section completion
   */
  const calculateBasicsCompletion = (data: EnhancedBusinessData): number => {
    let score = 0;
    const maxScore = 6;

    // Required basics
    if (data.name) score++;
    if (data.category) score++;

    // Optional basics
    if (data.employees_count) score++;
    if (data.years_in_business) score++;

    // Profile status
    if (data.onboarding_completed_at) score++;
    if (data.profile_completion_percentage >= 75) score++;

    return Math.round((score / maxScore) * 100);
  };

  /**
   * Get list of completed fields
   */
  const getCompletedFields = (data: EnhancedBusinessData): string[] => {
    const completed: string[] = [];

    // Basics
    if (data.name) completed.push('Business name');
    if (data.category) completed.push('Business category');
    if (data.employees_count) completed.push('Number of employees');
    if (data.years_in_business) completed.push('Years in business');

    // Customer profile
    if (data.customer_profile) {
      if (data.customer_profile.primary_age_ranges.length > 0) {
        completed.push('Customer age ranges');
      }
      if (data.customer_profile.income_levels.length > 0) {
        completed.push('Customer income levels');
      }
      if (data.customer_profile.interest_categories.length > 0) {
        completed.push('Customer interests');
      }
      if (data.customer_profile.customer_behavior_notes) {
        completed.push('Customer behavior notes');
      }
    }

    // Metrics
    if (data.metrics) {
      if (data.metrics.avg_transaction_cents) {
        completed.push('Average transaction size');
      }
      if (data.metrics.current_customer_base_size) {
        completed.push('Customer base size');
      }
      if (data.metrics.busiest_days.length > 0 || data.metrics.busiest_hours.length > 0) {
        completed.push('Busiest hours/days');
      }
      if (data.metrics.seasonal_pattern) {
        completed.push('Seasonal patterns');
      }
    }

    // Marketing goals
    if (data.marketing_goals) {
      if (data.marketing_goals.primary_goal) {
        completed.push('Primary marketing goal');
      }
      if (data.marketing_goals.monthly_budget_cents) {
        completed.push('Marketing budget');
      }
      if (data.marketing_goals.preferred_campaign_types.length > 0) {
        completed.push('Campaign preferences');
      }
    }

    return completed;
  };

  /**
   * Update a specific profile section
   */
  const updateSection = useCallback(async (
    section: 'customer_profile' | 'metrics' | 'marketing_goals',
    data: any
  ): Promise<boolean> => {
    try {
      setUpdating(true);
      setError(null);

      const tableName = section === 'customer_profile'
        ? 'business_customer_profiles'
        : section === 'metrics'
        ? 'business_metrics'
        : 'business_marketing_goals';

      // Upsert to appropriate table
      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert({
          business_id: businessId,
          ...data
        }, {
          onConflict: 'business_id'
        });

      if (upsertError) throw upsertError;

      // Refresh profile data to get updated completion percentage
      // (triggers will have updated it automatically)
      await loadProfileData();

      return true;

    } catch (err: any) {
      setError(err.message || 'Failed to update profile section');
      console.error('Error updating section:', err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [businessId]);

  /**
   * Refresh profile data manually
   */
  const refresh = useCallback(async () => {
    await loadProfileData();
  }, [businessId]);

  // Computed values
  const percentage = completionData?.percentage || 0;
  const missingFields = completionData?.missing_fields || [];
  const recommendations = completionData?.recommendations || [];
  const sectionsCompletion = completionData?.sections || {
    basics: 0,
    customer_profile: 0,
    metrics: 0,
    marketing_goals: 0
  };

  return {
    // Completion data
    completionData,
    percentage,
    missingFields,
    recommendations,
    
    // Section breakdowns
    sectionsCompletion,
    
    // Business data
    businessData,
    
    // Actions
    refresh,
    updateSection,
    
    // Status
    loading,
    updating,
    error
  };
}
