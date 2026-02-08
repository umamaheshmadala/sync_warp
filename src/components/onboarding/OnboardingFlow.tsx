import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import ProgressIndicator from './ProgressIndicator'
// import Step1BasicInfo from './Step1BasicInfo' // Removed
import Step2Location from './Step2Location'
import Step3Interests from './Step3Interests'
import CompletionScreen from './CompletionScreen'

export interface OnboardingData {
  city: string
  interests: string[]
  notificationPreferences: {
    email: boolean
    push: boolean
    deals: boolean
  }
}

const TOTAL_STEPS = 2


export default function OnboardingFlow() {
  const navigate = useNavigate()
  const { user, updateProfile, loading } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data state
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    city: '',
    interests: [],
    notificationPreferences: {
      email: true,
      push: true,
      deals: true
    }
  })

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth/login')
    }
  }, [user, loading, navigate])

  // Update onboarding data
  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }))
    setError(null) // Clear any previous errors
  }

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const jumpToStep = (step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step)
    }
  }

  // Complete onboarding process
  const handleComplete = async () => {
    if (!user) return

    setIsCompleting(true)
    setError(null)

    try {
      // City is now optional, but we trim it if present
      const cityToSave = onboardingData.city?.trim() || ''

      // Update user profile with onboarding data
      await updateProfile({
        city: cityToSave,
        interests: onboardingData.interests || [],
        // Store notification preferences in user metadata if needed
        updated_at: new Date().toISOString()
      })

      // Show completion screen
      setShowCompletion(true)

      // After a delay, redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)

    } catch (error: any) {
      console.error('Onboarding completion error:', error)

      // Provide user-friendly error messages
      let errorMessage = 'Failed to complete onboarding. Please try again.'

      if (error.message?.includes('Failed to create profile')) {
        errorMessage = 'Unable to save your profile. Please check your connection and try again.'
      } else if (error.message?.includes('Failed to update profile')) {
        errorMessage = 'Unable to update your profile. Please try again.'
      } else if (error.message?.includes('Network error')) {
        errorMessage = 'Network connection issue. Please check your internet and try again.'
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setIsCompleting(false)
    }
  }

  // Skip onboarding and go directly to dashboard
  const handleSkip = () => {
    navigate('/dashboard')
  }

  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Show completion screen
  if (showCompletion) {
    return <CompletionScreen user={user} />
  }

  // Get current step component
  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step2Location
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={goToNextStep}
            onBack={goToPreviousStep} // Back button might need to be hidden if step 1
            isFirstStep={true}
          />
        )
      case 2:
        return (
          <Step3Interests
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onComplete={handleComplete}
            onBack={goToPreviousStep}
            isCompleting={isCompleting}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to SynC!
            </h1>
            <p className="text-gray-600">
              Let's set up your profile to personalize your experience
            </p>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onStepClick={jumpToStep}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="text-red-700 text-sm flex-1">{error}</div>
                {currentStep === TOTAL_STEPS && (
                  <button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className="ml-4 text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
                  >
                    {isCompleting ? 'Retrying...' : 'Try Again'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Step Component */}
        <div className="max-w-2xl mx-auto">
          {getCurrentStepComponent()}
        </div>

        {/* Skip Option */}
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip onboarding for now
          </button>
        </div>
      </div>
    </div>
  )
}