/**
 * Enhanced Onboarding Wizard
 * Story 4B.4 - Enhanced Business Onboarding
 * 
 * Multi-step wizard for comprehensive business profiling
 */

import React, { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNavigate } from 'react-router-dom';
import { ONBOARDING_STEPS } from '@/types/business-onboarding';
import { CustomerProfileStep } from './steps/CustomerProfileStep';
import { BusinessMetricsStep } from './steps/BusinessMetricsStep';
import { MarketingGoalsStep } from './steps/MarketingGoalsStep';
import { ReviewStep } from './steps/ReviewStep';

interface EnhancedOnboardingWizardProps {
  businessId: string;
  onComplete?: () => void;
}

export function EnhancedOnboardingWizard({
  businessId,
  onComplete
}: EnhancedOnboardingWizardProps) {

  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const {
    currentStep,
    totalSteps,
    completedSteps,
    completionPercentage,
    currentStepInfo,
    allSteps,
    goToStep,
    nextStep,
    previousStep,
    canGoNext,
    canGoPrevious,
    completeOnboarding,
    loading,
    saving,
    error,
    validationErrors,
    isComplete
  } = useOnboarding({ businessId, autoSave: true });

  const handleNext = async () => {
    const success = await nextStep();
    if (success && currentStep === totalSteps) {
      // Last step completed, trigger final completion
      const completed = await completeOnboarding();
      if (completed) {
        onComplete?.();
      }
    }
  };

  const handleExit = () => {
    if (completionPercentage > 0 && !isComplete) {
      setShowExitConfirm(true);
    } else {
      navigate('/business/dashboard');
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    navigate('/business/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Onboarding Complete!
          </h2>
          <p className="text-gray-600 mb-6">
            Your business profile is all set up. You can now start creating campaigns and attracting customers.
          </p>
          <button
            onClick={() => navigate('/business/dashboard')}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                Business Onboarding
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Step {currentStep} of {totalSteps}: {currentStepInfo?.title}
              </p>
            </div>

            <button
              onClick={handleExit}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="pb-4">
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">
                  {completionPercentage}% Complete
                </span>
                <span className="text-xs text-gray-500">
                  {currentStepInfo?.estimatedMinutes} min remaining
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between mt-4">
              {allSteps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = completedSteps.includes(stepNumber);
                const isCurrent = stepNumber === currentStep;
                const isClickable = isCompleted || stepNumber <= currentStep;

                return (
                  <button
                    key={step.number}
                    onClick={() => isClickable && goToStep(stepNumber)}
                    disabled={!isClickable}
                    className={`flex-1 group relative ${index < allSteps.length - 1 ? 'mr-2' : ''
                      }`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${isCompleted
                            ? 'bg-green-600 text-white'
                            : isCurrent
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                              : 'bg-gray-200 text-gray-500'
                          } ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}`}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          stepNumber
                        )}
                      </div>
                      <span
                        className={`text-xs mt-1 font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-500'
                          } hidden sm:block`}
                      >
                        {step.name.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Please fix the following:</h3>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step Content Container */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {currentStepInfo?.title}
            </h2>
            <p className="text-gray-600">
              {currentStepInfo?.description}
            </p>
            {currentStepInfo?.required && (
              <span className="inline-block mt-2 text-xs font-medium text-red-600">
                * Required
              </span>
            )}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Welcome to Business Onboarding!
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                    Let's set up your business profile to help you create better marketing campaigns.
                    This will only take about 15-20 minutes.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-3">What you'll complete:</h4>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Target customer demographics and interests</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Business metrics and performance data (optional)</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Marketing goals and budget</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start">
                  <svg className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Your progress is automatically saved. You can exit at any time and continue later.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <CustomerProfileStep businessId={businessId} />
            )}

            {currentStep === 3 && (
              <BusinessMetricsStep businessId={businessId} />
            )}

            {currentStep === 4 && (
              <MarketingGoalsStep businessId={businessId} />
            )}

            {currentStep === 5 && (
              <ReviewStep businessId={businessId} />
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={previousStep}
            disabled={!canGoPrevious || saving}
            className="flex items-center px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center space-x-4">
            {saving && (
              <div className="flex items-center text-sm text-gray-600">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving draft...
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={!canGoNext || saving}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === totalSteps ? 'Complete' : 'Continue'}
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Save your progress?
            </h3>
            <p className="text-gray-600 mb-6">
              Your progress has been automatically saved. You can continue later from where you left off.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continue Onboarding
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Exit for Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedOnboardingWizard;
