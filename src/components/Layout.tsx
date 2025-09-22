// src/components/Layout.tsx
// Main layout wrapper for the application with responsive design

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { routes } from '../router/Router'
import PageTransition from './PageTransition'
import BottomNavigation from './BottomNavigation'
import GestureHandler from './GestureHandler'
import { useNavigationPreferences } from '../hooks/useNavigationState'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, initialized } = useAuthStore()
  const { preferences } = useNavigationPreferences()

  // Update page title and meta description based on current route
  useEffect(() => {
    const currentRoute = routes.find(route => route.path === location.pathname)
    
    if (currentRoute?.title) {
      document.title = currentRoute.title
    } else {
      document.title = 'SynC - Find Local Deals & Connect'
    }

    // Update meta description
    if (currentRoute?.description) {
      const metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', currentRoute.description)
      }
    }
  }, [location.pathname])

  // Show loading screen while auth is initializing
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading SynC...</h2>
          <p className="text-gray-600">Getting things ready for you</p>
        </div>
      </div>
    )
  }

  // Get current route info
  const currentRoute = routes.find(route => route.path === location.pathname)
  const isAuthPage = location.pathname.startsWith('/auth/')
  const isLandingPage = location.pathname === '/'
  const isOnboardingPage = location.pathname === '/onboarding'
  const isProtectedPage = currentRoute?.protected
  
  // Tab routes for navigation
  const tabRoutes = ['/dashboard', '/search', '/wallet', '/social', '/profile']

  // For auth pages, onboarding, and landing - no layout wrapper needed
  if (isAuthPage || isLandingPage || isOnboardingPage) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    )
  }

  // For protected pages - full layout with navigation
  const layoutContent = (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to main content (accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-lg z-50"
      >
        Skip to main content
      </a>

      {/* Header - only show on protected pages */}
      {currentRoute?.protected && (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-semibold text-gray-900">SynC</h1>
                </div>
              </div>

              {/* User info */}
              {user && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700">
                    Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-medium text-sm">
                      {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => useAuthStore.getState().signOut()}
                    className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-md transition-colors"
                    title="Sign out"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main content area */}
      <main id="main-content" className="flex-1">
        {/* Breadcrumb navigation for deep pages */}
        {currentRoute?.protected && location.pathname !== '/dashboard' && (
          <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8" aria-label="Breadcrumb">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center space-x-4 py-4">
                <a
                  href="/dashboard"
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Dashboard
                </a>
                <svg
                  className="flex-shrink-0 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">
                  {currentRoute?.title?.replace(' - SynC', '') || 'Page'}
                </span>
              </div>
            </div>
          </nav>
        )}

        {/* Page content with transitions */}
        <div className="flex-1">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
      
      {/* Enhanced Bottom Navigation for protected pages */}
      {isProtectedPage && (
        <BottomNavigation currentRoute={location.pathname} />
      )}

    </div>
  )
  
  // Wrap with gesture handler for protected pages with gesture support enabled
  if (isProtectedPage && preferences.swipeGesturesEnabled) {
    return (
      <GestureHandler
        enableTabSwitching={true}
        tabRoutes={tabRoutes}
        currentRoute={location.pathname}
        enableHaptics={preferences.enableHapticFeedback}
        className="min-h-screen"
      >
        {layoutContent}
      </GestureHandler>
    )
  }
  
  return layoutContent
}