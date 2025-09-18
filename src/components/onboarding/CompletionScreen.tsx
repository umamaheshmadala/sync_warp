// src/components/onboarding/CompletionScreen.tsx
import { CheckCircle, Sparkles } from 'lucide-react'
import { AuthUser } from '../../lib/supabase'

interface CompletionScreenProps {
  user: AuthUser | null
}

export default function CompletionScreen({ user }: CompletionScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative mx-auto flex items-center justify-center h-24 w-24 mb-6">
            {/* Animated background circles */}
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping"></div>
            <div className="absolute inset-2 rounded-full bg-green-200 animate-pulse"></div>
            <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-green-500">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            {/* Sparkles */}
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-bounce" />
            <Sparkles className="absolute -bottom-1 -left-1 h-4 w-4 text-purple-400 animate-bounce delay-200" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎉 Welcome to SynC!
          </h1>
          <p className="text-gray-600">
            Your profile is all set up and ready to go
          </p>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Profile Complete!
            </h2>
            <p className="text-gray-600">
              Hi {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! 
              Your personalized experience is ready.
            </p>
          </div>

          {/* What's Next */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 text-center mb-4">
              What's waiting for you:
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">1</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Discover Local Deals</p>
                  <p className="text-xs text-blue-700">Browse personalized offers in your area</p>
                </div>
              </div>

              <div className="flex items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">2</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">Connect with Friends</p>
                  <p className="text-xs text-purple-700">Share and discover deals together</p>
                </div>
              </div>

              <div className="flex items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">3</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Start Saving</p>
                  <p className="text-xs text-green-700">Unlock exclusive discounts and coupons</p>
                </div>
              </div>
            </div>
          </div>

          {/* Redirecting Message */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              <span className="text-sm text-gray-700">Taking you to your dashboard...</span>
            </div>
          </div>
        </div>

        {/* Pro Tip */}
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
            <Sparkles className="h-4 w-4 text-yellow-500 mr-2" />
            <span className="text-xs text-gray-600">
              Pro tip: Check your notifications for the latest deals!
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}