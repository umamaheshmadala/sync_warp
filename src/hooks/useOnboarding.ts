/**
 * useOnboarding Hook
 * Story 4B.4 - Enhanced Business Onboarding
 * 
 * Manages onboarding wizard state, navigation, and data persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BusinessOnboardingProgress,
  OnboardingStep,
  ONBOARDING_STEPS,
  TOTAL_ONBOARDING_STEPS,
  validateStepData
} from '@/types/business-onboarding';

interface UseOnboardingOptions {
  businessId: string;
  autoSave?: boolean;
  autoSaveDelay?: number; // milliseconds
}

interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  stepData: Record<number, any>;
  progress: BusinessOnboardingProgress[];
  isComplete: boolean;
}

interface UseOnboardingReturn {
  // State
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  completionPercentage: number;
  stepData: Record<number, any>;
  isComplete: boolean;
  
  // Step info
  currentStepInfo: OnboardingStep;
  allSteps: OnboardingStep[];
  
  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => Promise<boolean>;
  previousStep: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  
  // Data management
  saveStepData: (stepNumber: number, data: any) => Promise<boolean>;
  getStepData: (stepNumber: number) => any;
  updateCurrentStepData: (data: any) => void;
  
  // Completion
  completeOnboarding: () => Promise<boolean>;
  
  // Status
  loading: boolean;
  saving: boolean;
  error: string | null;
  validationErrors: string[];
}

/**
 * Custom hook for managing business onboarding wizard
 */
export function useOnboarding({
  businessId,
  autoSave = true,
  autoSaveDelay = 2000
}: UseOnboardingOptions): UseOnboardingReturn {
  
  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    completedSteps: [],
    stepData: {},
    progress: [],
    isComplete: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load existing progress on mount
  useEffect(() => {
    loadProgress();
  }, [businessId]);

  // Auto-save effect
  useEffect(() => {
    if (autoSave && autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    if (autoSave && state.stepData[state.currentStep]) {
      const timeout = setTimeout(() => {
        saveStepData(state.currentStep, state.stepData[state.currentStep], true);
      }, autoSaveDelay);
      
      setAutoSaveTimeout(timeout);
      
      return () => clearTimeout(timeout);
    }
  }, [state.stepData[state.currentStep], autoSave]);

  /**
   * Load progress from database
   */
  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch onboarding progress
      const { data: progressData, error: progressError } = await supabase
        .from('business_onboarding_progress')
        .select('*')
        .eq('business_id', businessId)
        .order('step_number');

      if (progressError) throw progressError;

      // Build state from progress data
      const completed = progressData
        ?.filter(p => p.completed)
        .map(p => p.step_number) || [];
      
      const dataMap: Record<number, any> = {};
      progressData?.forEach(p => {
        dataMap[p.step_number] = p.data;
      });

      // Determine current step (first incomplete or last step)
      let current = 1;
      for (let i = 1; i <= TOTAL_ONBOARDING_STEPS; i++) {
        if (!completed.includes(i)) {
          current = i;
          break;
        }
      }

      // Check if onboarding is complete
      const { data: businessData } = await supabase
        .from('businesses')
        .select('onboarding_completed_at')
        .eq('id', businessId)
        .single();

      setState({
        currentStep: current,
        completedSteps: completed,
        stepData: dataMap,
        progress: progressData || [],
        isComplete: !!businessData?.onboarding_completed_at
      });

    } catch (err: any) {
      setError(err.message || 'Failed to load onboarding progress');
      console.error('Error loading progress:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save step data to database
   */
  const saveStepData = useCallback(async (
    stepNumber: number,
    data: any,
    isDraft = false
  ): Promise<boolean> => {
    try {
      if (!isDraft) {
        setSaving(true);
      }
      setError(null);

      const step = ONBOARDING_STEPS.find(s => s.number === stepNumber);
      if (!step) {
        throw new Error('Invalid step number');
      }

      // Validate data if not a draft
      if (!isDraft) {
        console.log('Validating step', stepNumber, 'with data:', data);
        const validation = validateStepData(stepNumber, data);
        if (!validation.valid) {
          console.log('Validation failed:', validation.errors);
          setValidationErrors(validation.errors);
          return false;
        }
        console.log('Validation passed');
        setValidationErrors([]);
      }

      // Upsert progress record
      const { error: upsertError } = await supabase
        .from('business_onboarding_progress')
        .upsert({
          business_id: businessId,
          step_number: stepNumber,
          step_name: step.name,
          completed: !isDraft,
          completed_at: isDraft ? null : new Date().toISOString(),
          data: data
        }, {
          onConflict: 'business_id,step_number'
        });

      if (upsertError) throw upsertError;

      // Update local state
      setState(prev => ({
        ...prev,
        stepData: {
          ...prev.stepData,
          [stepNumber]: data
        },
        completedSteps: isDraft
          ? prev.completedSteps
          : [...new Set([...prev.completedSteps, stepNumber])]
      }));

      // If step 2, 3, or 4, save to respective tables
      if (!isDraft && [2, 3, 4].includes(stepNumber)) {
        console.log('Saving to database tables for step', stepNumber);
        await saveStepToTables(stepNumber, data);
      }

      console.log('Step data saved successfully');
      return true;

    } catch (err: any) {
      setError(err.message || 'Failed to save step data');
      console.error('Error saving step:', err);
      return false;
    } finally {
      if (!isDraft) {
        setSaving(false);
      }
    }
  }, [businessId]);

  /**
   * Save step data to appropriate database tables
   */
  const saveStepToTables = async (stepNumber: number, data: any) => {
    try {
      switch (stepNumber) {
        case 2: // Customer Profile
          await supabase
            .from('business_customer_profiles')
            .upsert({
              business_id: businessId,
              ...data
            }, {
              onConflict: 'business_id'
            });
          break;

        case 3: // Business Metrics
          await supabase
            .from('business_metrics')
            .upsert({
              business_id: businessId,
              ...data
            }, {
              onConflict: 'business_id'
            });
          break;

        case 4: // Marketing Goals
          await supabase
            .from('business_marketing_goals')
            .upsert({
              business_id: businessId,
              ...data
            }, {
              onConflict: 'business_id'
            });
          break;
      }
    } catch (err) {
      console.error('Error saving to tables:', err);
      // Don't throw - progress is still saved
    }
  };

  /**
   * Navigate to specific step
   */
  const goToStep = useCallback((step: number) => {
    if (step < 1 || step > TOTAL_ONBOARDING_STEPS) {
      return;
    }
    setState(prev => ({ ...prev, currentStep: step }));
    setValidationErrors([]);
  }, []);

  /**
   * Go to next step (with validation)
   */
  const nextStep = async (): Promise<boolean> => {
    const currentData = state.stepData[state.currentStep] || {};
    
    // Save current step data
    const saved = await saveStepData(state.currentStep, currentData, false);
    
    if (saved && state.currentStep < TOTAL_ONBOARDING_STEPS) {
      goToStep(state.currentStep + 1);
      return true;
    }
    
    return saved;
  };

  /**
   * Go to previous step
   */
  const previousStep = useCallback(() => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  }, [state.currentStep, goToStep]);

  /**
   * Update current step data (local only, triggers auto-save)
   */
  const updateCurrentStepData = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      stepData: {
        ...prev.stepData,
        [prev.currentStep]: data
      }
    }));
  }, []);

  /**
   * Get data for a specific step
   */
  const getStepData = useCallback((stepNumber: number) => {
    return state.stepData[stepNumber] || {};
  }, [state.stepData]);

  /**
   * Complete onboarding
   */
  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);

      // Verify all required steps are completed
      const requiredSteps = ONBOARDING_STEPS
        .filter(s => s.required)
        .map(s => s.number);
      
      const allCompleted = requiredSteps.every(step =>
        state.completedSteps.includes(step)
      );

      if (!allCompleted) {
        setError('Please complete all required steps');
        return false;
      }

      // Mark onboarding as complete
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (updateError) throw updateError;

      setState(prev => ({ ...prev, isComplete: true }));
      return true;

    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
      console.error('Error completing onboarding:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [businessId, state.completedSteps]);

  // Computed values
  const currentStepInfo = ONBOARDING_STEPS[state.currentStep - 1];
  const completionPercentage = Math.round(
    (state.completedSteps.length / TOTAL_ONBOARDING_STEPS) * 100
  );
  // Allow "next" on all steps including the last one (for completion)
  const canGoNext = true;
  const canGoPrevious = state.currentStep > 1;

  return {
    // State
    currentStep: state.currentStep,
    totalSteps: TOTAL_ONBOARDING_STEPS,
    completedSteps: state.completedSteps,
    completionPercentage,
    stepData: state.stepData,
    isComplete: state.isComplete,
    
    // Step info
    currentStepInfo,
    allSteps: ONBOARDING_STEPS,
    
    // Navigation
    goToStep,
    nextStep,
    previousStep,
    canGoNext,
    canGoPrevious,
    
    // Data management
    saveStepData,
    getStepData,
    updateCurrentStepData,
    
    // Completion
    completeOnboarding,
    
    // Status
    loading,
    saving,
    error,
    validationErrors
  };
}
