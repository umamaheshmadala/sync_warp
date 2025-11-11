// src/router/ProtectedRoute.tsx
// Enhanced route protection component with authentication and authorization

import { useEffect, ReactNode, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

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

  // Show loading while checking authentication - use minimal loading
  if (!initialized || loading || !sessionChecked) {
    // Use custom fallback component if provided
    if (fallbackComponent) {
      return <>{fallbackComponent}</>
    }
    
    // Return minimal loading - splash screen handles initial load
    return null;
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
  const [testResult, setTestResult] = useState<string>('Not tested')
  
  // Test push notification function
  const testPushNotifications = async () => {
    setTestResult('Testing...')
    try {
      // Check platform
      const isNative = Capacitor.isNativePlatform()
      setTestResult(prev => prev + '\nPlatform: ' + Capacitor.getPlatform() + ', Native: ' + isNative)
      
      if (!isNative) {
        setTestResult('Platform check bypassed for development')
        // Don't return - continue with test on native device
      }
      
      // Request permission
      const permissionStatus = await PushNotifications.requestPermissions()
      setTestResult(prev => prev + '\nPermission status: ' + JSON.stringify(permissionStatus))
      
      if (permissionStatus.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register()
        setTestResult(prev + prev + '\n✅ Permission granted and registered!')
        
        // Add listener for token
        PushNotifications.addListener('registration', (token) => {
          setTestResult(prev => prev + '\n✅ Token received: ' + token.value.substring(0, 20) + '...')
        })
        
        PushNotifications.addListener('registrationError', (error) => {
          setTestResult(prev + prev + '\n❌ Registration error: ' + error.error)
        })
      } else {
        setTestResult('❌ Permission denied')
      }
    } catch (error: any) {
      setTestResult('❌ Error: ' + error.message)
    }
  }
  
  // Debug panel shown in all modes for testing
  
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
      
      {/* Push notification test button */}
      <div className="mt-3 pt-3 border-t border-white border-opacity-30">
        <button 
          onClick={testPushNotifications}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 transition-colors w-full"
        >
          📱 Test Push Notifications
        </button>
        <div className="mt-2 text-green-300 font-mono text-xs break-all whitespace-pre-wrap">
          {testResult}
        </div>
      </div>
    </div>
  )
}
