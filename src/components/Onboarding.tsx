// src/components/Onboarding.tsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { CheckCircle, ArrowRight } from 'lucide-react'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleContinue = () => {
    // For now, redirect to dashboard
    // This will be replaced with proper onboarding flow in Story 2.2
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Success Header */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to SynC!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your account has been created successfully
          </p>
        </div>

        {/* Success message */}
        <div className="bg-white p-8 rounded-xl shadow-lg space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Account Created Successfully!
            </h3>
            <p className="text-gray-600 mb-6">
              Welcome to SynC, {user?.user_metadata?.full_name || user?.email}! 
              You're now ready to discover amazing local deals and connect with businesses in your area.
            </p>
          </div>

          {/* Next steps preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">What's next:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Explore local businesses and deals</li>
              <li>• Connect with friends to share coupons</li>
              <li>• Start building your profile</li>
            </ul>
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>

          {/* Note about full onboarding */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Complete onboarding flow coming in Story 2.2
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}