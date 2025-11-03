// src/router/ProtectedRoute.tsx
// Enhanced route protection component with authentication and authorization

import { useEffect, ReactNode, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  redirectTo?: string
  fallbackComponent?: ReactNode
  requireOnboarding?: boolean
  debugMode?: boolean
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  redirectTo = '/auth/login',
  fallbackComponent,
  requireOnboarding = false,
  debugMode = false
}: ProtectedRouteProps) {
  const { user, profile, initialized, loading, checkUser } = useAuthStore()
  const location = useLocation()
  const [retryCount, setRetryCount] = useState(0)
  const [sessionChecked, setSessionChecked] = useState(false)
  
  // Debug mode logging (only in development)
  const isDevelopment = import.meta.env.MODE === 'development'
  const shouldDebug = debugMode || isDevelopment

  useEffect(() => {
    if (shouldDebug && !sessionChecked) {
      console.log('[ProtectedRoute] State:', {
        path: location.pathname,
        requireAuth,
        user: !!user,
        profile: !!profile,
        initialized,
        loading,
        sessionChecked
      })
    }
  }, [location.pathname, requireAuth, user, profile, initialized, loading, sessionChecked, shouldDebug])

  useEffect(() => {
    // Enhanced session checking with retry logic
    const checkUserSession = async () => {
      if (!initialized && !loading && retryCount < 3) {
        if (shouldDebug) {
          console.log('[ProtectedRoute] Checking user session, attempt:', retryCount + 1)
        }
        
        try {
          await checkUser()
          setSessionChecked(true)
        } catch (error) {
          console.error('[ProtectedRoute] Session check failed:', error)
          setRetryCount(prev => prev + 1)
          
          // Retry after delay for network issues
          if (retryCount < 2) {
            setTimeout(() => checkUserSession(), 1000 * (retryCount + 1))
          }
        }
      } else if (initialized && !sessionChecked) {
        setSessionChecked(true)
      }
    }

    checkUserSession()
  }, [initialized, loading, retryCount, sessionChecked, checkUser, shouldDebug])

  // Show loading while checking authentication
  if (!initialized || loading || !sessionChecked) {
    // Use custom fallback component if provided
    if (fallbackComponent) {
      return <>{fallbackComponent}</>
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {retryCount > 0 ? `Retrying authentication... (${retryCount}/3)` : 'Checking authentication...'}
          </h2>
          <p className="text-gray-600">
            {retryCount > 0 ? 'Having trouble connecting. Please wait...' : 'Please wait while we verify your access'}
          </p>
          {shouldDebug && (
            <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-2 rounded">
              <p>Debug: initialized={String(initialized)}, loading={String(loading)}, sessionChecked={String(sessionChecked)}</p>
              <p>Path: {location.pathname}</p>
              <p>Retry: {retryCount}/3</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    if (shouldDebug) {
      console.log('[ProtectedRoute] Redirecting to login - user not authenticated')
    }
    
    // Store the attempted URL to redirect back after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ 
          from: location.pathname, 
          message: 'Please log in to access this page',
          timestamp: Date.now()
        }}
        replace 
      />
    )
  }

  // If authentication is NOT required but user IS logged in (for auth pages)
  if (!requireAuth && user) {
    const authPages = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']
    if (authPages.includes(location.pathname)) {
      if (shouldDebug) {
        console.log('[ProtectedRoute] Redirecting authenticated user away from auth page')
      }
      
      // Check if user completed onboarding
      const hasCompletedOnboarding = profile && profile.city && profile.interests?.length > 0
      const redirectPath = hasCompletedOnboarding ? '/dashboard' : '/onboarding'
      
      return <Navigate to={redirectPath} replace />
    }
  }

  // Enhanced onboarding logic
  if (user && profile) {
    const hasCompletedOnboarding = profile.city && profile.interests?.length > 0
    const isOnOnboardingPage = location.pathname === '/onboarding'
    
    // If user hasn't completed onboarding and is not on onboarding page
    if (!hasCompletedOnboarding && !isOnOnboardingPage && requireOnboarding) {
      if (shouldDebug) {
        console.log('[ProtectedRoute] Redirecting to onboarding - profile incomplete')
      }
      return (
        <Navigate 
          to="/onboarding" 
          state={{ 
            from: location.pathname,
            message: 'Please complete your profile setup'
          }}
          replace 
        />
      )
    }
    
    // If user has completed onboarding but is still on onboarding page
    if (hasCompletedOnboarding && isOnOnboardingPage) {
      if (shouldDebug) {
        console.log('[ProtectedRoute] Redirecting away from onboarding - already completed')
      }
      return <Navigate to="/dashboard" replace />
    }
  }

  // Final debug log before rendering (only once per session)
  if (shouldDebug && !sessionChecked) {
    console.log('[ProtectedRoute] Rendering protected content for:', location.pathname)
  }
  
  // Render the protected component
  return <>{children}</>
}

// Enhanced higher-order component for easy wrapping
export function withProtection<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    requireAuth?: boolean
    redirectTo?: string
    requireOnboarding?: boolean
    debugMode?: boolean
    fallbackComponent?: ReactNode
  } = {}
) {
  const {
    requireAuth = true,
    redirectTo = '/auth/login',
    requireOnboarding = false,
    debugMode = false,
    fallbackComponent
  } = options
  
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute 
        requireAuth={requireAuth} 
        redirectTo={redirectTo}
        requireOnboarding={requireOnboarding}
        debugMode={debugMode}
        fallbackComponent={fallbackComponent}
      >
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Enhanced hook for checking authentication status in components
export function useRequireAuth(debugMode = false) {
  const { user, profile, initialized, loading } = useAuthStore()
  const location = useLocation()
  const [authChecked, setAuthChecked] = useState(false)
  
  useEffect(() => {
    if (initialized && !authChecked) {
      setAuthChecked(true)
      
      if (debugMode || import.meta.env.MODE === 'development') {
        console.log('[useRequireAuth] Authentication check:', {
          path: location.pathname,
          authenticated: !!user,
          hasProfile: !!profile,
          loading
        })
      }
      
      if (!user) {
        // Could dispatch a custom event or show a toast notification
        console.log('Authentication required for:', location.pathname)
      }
    }
  }, [user, profile, initialized, loading, location.pathname, authChecked, debugMode])

  return { 
    user, 
    profile,
    authenticated: !!user, 
    initialized,
    loading,
    hasCompletedOnboarding: !!(profile?.city && profile?.interests?.length > 0)
  }
}

// Debug component for development
export function AuthDebugPanel() {
  const { user, profile, initialized, loading } = useAuthStore()
  const location = useLocation()
  
  if (import.meta.env.MODE !== 'development') {
    return null
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded text-xs z-50 max-w-sm">
      <div className="font-bold mb-2">Auth Debug Panel</div>
      <div>Path: {location.pathname}</div>
      <div>User: {user ? '✅ Logged in' : '❌ Not logged in'}</div>
      {user && (
        <div className="text-yellow-300 font-semibold">
          👤 {profile?.full_name || user.user_metadata?.full_name || user.email}
        </div>
      )}
      <div>Profile: {profile ? '✅ Loaded' : '❌ Missing'}</div>
      <div>Initialized: {initialized ? '✅ Yes' : '❌ No'}</div>
      <div>Loading: {loading ? '⏳ Yes' : '✅ No'}</div>
      {profile && (
        <div>
          <div>City: {profile.city || '❌ Missing'}</div>
          <div>Interests: {profile.interests?.length || 0}</div>
          <div>Onboarding: {(profile.city && profile.interests?.length > 0) ? '✅ Complete' : '❌ Incomplete'}</div>
        </div>
      )}
    </div>
  )
}
