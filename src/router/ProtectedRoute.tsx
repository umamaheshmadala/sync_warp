// src/router/ProtectedRoute.tsx
// Route protection component with authentication and authorization

import { useEffect, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { user, initialized, checkUser } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    // Ensure user state is checked on mount
    if (!initialized) {
      checkUser()
    }
  }, [initialized, checkUser])

  // Show loading while checking authentication
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking authentication...</h2>
          <p className="text-gray-600">Please wait while we verify your access</p>
        </div>
      </div>
    )
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    // Store the attempted URL to redirect back after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname, message: 'Please log in to access this page' }}
        replace 
      />
    )
  }

  // If authentication is NOT required but user IS logged in (for auth pages)
  if (!requireAuth && user) {
    // If user is trying to access auth pages while logged in, redirect to dashboard
    const authPages = ['/auth/login', '/auth/signup']
    if (authPages.includes(location.pathname)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  // Special handling for onboarding
  if (location.pathname === '/onboarding' && user) {
    // Allow access to onboarding for authenticated users
    // In the future, you could check if onboarding is already completed
    // and redirect to dashboard if so
  }

  // Render the protected component
  return <>{children}</>
}

// Higher-order component for easy wrapping
export function withProtection<T extends object>(
  Component: React.ComponentType<T>,
  requireAuth = true,
  redirectTo = '/auth/login'
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute requireAuth={requireAuth} redirectTo={redirectTo}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Hook for checking authentication status in components
export function useRequireAuth() {
  const { user, initialized } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (initialized && !user) {
      // Could dispatch a custom event or show a toast notification
      console.log('Authentication required for:', location.pathname)
    }
  }, [user, initialized, location.pathname])

  return { user, authenticated: !!user, initialized }
}