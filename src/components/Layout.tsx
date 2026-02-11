// src/components/Layout.tsx
// Main layout wrapper for the application with responsive design

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { routes } from '../router/Router'
import PageTransition from './PageTransition'
import BottomNavigation from './BottomNavigation'
import GestureHandler from './GestureHandler'
import NotificationHub from './NotificationHub'
import CityPicker from './location/CityPicker'
import MobileProfileDrawer from './MobileProfileDrawer'
import { useNavigationPreferences } from '../hooks/useNavigationState'
import { Users, LogOut, ChevronDown, MapPin } from 'lucide-react'
import { FollowerNotificationBell } from './following'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, initialized, profile, signOut } = useAuthStore()
  const { preferences } = useNavigationPreferences()

  // State for sidebar and notifications
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showMobileProfileDrawer, setShowMobileProfileDrawer] = useState(false)
  const selectedCity = profile?.city || 'Select City'

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
      {/* GLOBAL DEBUG BANNER */}
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
              {/* Left side - Profile Avatar (Mobile) or Logo (Desktop) */}
              <div className="flex items-center space-x-3">
                {/* Mobile: Profile Avatar */}
                {user && (
                  <button
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setShowMobileProfileDrawer(true)
                      } else {
                        navigate('/profile')
                      }
                    }}
                    className="md:hidden w-9 h-9 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center hover:from-indigo-200 hover:to-purple-200 transition-all duration-300"
                    title="Open Profile Menu"
                  >
                    <span className="text-indigo-600 font-medium text-sm">
                      {(profile?.full_name?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0])?.toUpperCase()}
                    </span>
                  </button>
                )}

                {/* Logo and App Name */}
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-base">S</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h1 className="text-xl font-semibold text-gray-900">SynC</h1>
                  </div>
                </div>
              </div>

              {/* Right side actions */}
              <div className="flex items-center space-x-2">
                {/* City Selector - show on dashboard */}
                {location.pathname === '/dashboard' && (
                  <button
                    onClick={() => setShowCityPicker(true)}
                    className="flex items-center text-gray-700 hover:text-gray-900 bg-gray-100/50 px-3 py-2 rounded-xl transition-all duration-300 hover:bg-gray-200/50"
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="font-medium text-sm hidden sm:inline">{selectedCity}</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                )}

                {/* Contacts Sidebar Toggle - Navigates to Friends Page - Desktop Only */}
                <Link
                  to="/friends"
                  className="hidden md:block p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-300"
                  title="Friends & Contacts"
                >
                  <Users className="w-5 h-5" />
                </Link>

                {/* Notifications */}
                <FollowerNotificationBell />

                {/* Desktop: User Profile & Actions */}
                {user && (
                  <div className="hidden md:flex items-center space-x-2">
                    {/* Profile Avatar Button - Desktop only */}
                    <Link
                      to="/profile"
                      className="w-9 h-9 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center hover:from-indigo-200 hover:to-purple-200 transition-all duration-300 hidden md:flex"
                      title="View Profile"
                    >
                      <span className="text-indigo-600 font-medium text-sm">
                        {(profile?.full_name?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0])?.toUpperCase()}
                      </span>
                    </Link>

                    {/* Logout Button - Desktop only */}
                    <button
                      onClick={() => signOut()}
                      className="p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                      title="Sign Out"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main content area with proper spacing */}
      <main id="main-content" className="flex-1 min-h-screen">
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

        {/* Page content with transitions and proper padding to prevent overlap */}
        <div className="pb-32 sm:pb-28 md:pb-24"> {/* Increased bottom padding significantly for bottom navigation */}
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>

      {/* Enhanced Bottom Navigation for protected pages */}
      {isProtectedPage && (
        <BottomNavigation currentRoute={location.pathname} />
      )}

      {/* Contacts Sidebar - REMOVED */}

      {/* Notification Hub */}
      <NotificationHub
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* City Picker Modal */}
      <CityPicker
        isOpen={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onCitySelect={(city) => {
          console.log('City selected:', city.name);
          // Profile update is handled automatically in CityPicker
        }}
      />

      {/* Mobile Profile Drawer */}
      <MobileProfileDrawer
        isOpen={showMobileProfileDrawer}
        onClose={() => setShowMobileProfileDrawer(false)}
      />

    </div>
  )

  // Wrap with gesture handler for protected pages with gesture support enabled
  // DEBUG LOGGING
  console.log('[Layout] Checking Gestures:', { isProtectedPage, enabled: preferences.swipeGesturesEnabled });

  if (isProtectedPage && preferences.swipeGesturesEnabled) {
    return (
      <GestureHandler
        enableTabSwitching={false}
        onSwipeRight={() => navigate(-1)}
        enableHaptics={preferences.enableHapticFeedback}
        className="min-h-screen"
      >
        {layoutContent}
      </GestureHandler>
    )
  }

  return layoutContent
}