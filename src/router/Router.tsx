// src/router/Router.tsx
// Centralized routing configuration for the SynC app

import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from './ProtectedRoute'

// Import components
import Landing from '../components/Landing'
import Dashboard from '../components/Dashboard'
import Login from '../components/Login'
import SignUp from '../components/SignUp'
import Onboarding from '../components/Onboarding'
import ForgotPassword from '../components/ForgotPassword'
import ResetPassword from '../components/ResetPassword'

// Import business components
import BusinessRegistration from '../components/business/BusinessRegistration'
import BusinessDashboard from '../components/business/BusinessDashboard'
import BusinessProfile from '../components/business/BusinessProfile'
import ProductManagerPage from '../components/business/ProductManagerPage'
import CouponManagerPage from '../components/business/CouponManagerPage'

// Import social components
import FriendsManagementPage from '../components/FriendsManagementPage'

// Lazy load components for better performance
const NotFound = lazy(() => import('../components/NotFound'))
const Profile = lazy(() => import('../components/Profile'))
const Search = lazy(() => import('../components/Search'))
const SearchAnalyticsDashboard = lazy(() => import('../components/SearchAnalyticsDashboard'))
const LocationManager = lazy(() => import('../components/LocationManager'))
const Settings = lazy(() => import('../components/Settings'))
const Wallet = lazy(() => import('../components/Wallet'))
const Social = lazy(() => import('../components/Social'))
const SimpleFavoritesPage = lazy(() => import('../components/favorites/SimpleFavoritesPage'))

// Story 4.4 components
const AdvancedSearchPage = lazy(() => import('../components/search/AdvancedSearchPage'))
const BusinessDiscoveryPage = lazy(() => import('../components/discovery/BusinessDiscoveryPage'))
const CategoryBrowserPage = lazy(() => import('../components/categories/CategoryBrowserPage'))
const TrendingCouponsPage = lazy(() => import('../components/coupons/TrendingCouponsPage'))
const FallbackEnhancedFavoritesPage = lazy(() => import('../components/favorites/FallbackEnhancedFavoritesPage'));
const UnifiedFavoritesPage = lazy(() => import('../components/favorites/UnifiedFavoritesPage'));

// Debug components (only in development)
const SignUpDebug = lazy(() => import('../components/SignUpDebug'))
const AuthStoreTest = lazy(() => import('../components/AuthStoreTest'))
const RouteProtectionTest = lazy(() => import('../components/RouteProtectionTest'))
const ProductsDebug = lazy(() => import('../components/debug/ProductsDebug'))
const FavoritesLocationDebug = lazy(() => import('../components/debug/FavoritesLocationDebug'))
const FavoritesSystemTest = lazy(() => import('../components/debug/FavoritesSystemTest'))

// Route definitions
export interface RouteConfig {
  path: string
  element: React.ReactElement
  protected?: boolean
  title?: string
  description?: string
}

export const routes: RouteConfig[] = [
  // Public routes
  {
    path: '/',
    element: <Landing />,
    title: 'SynC - Find Local Deals & Connect',
    description: 'Discover amazing deals and connect with local businesses'
  },
  {
    path: '/auth/login',
    element: <Login />,
    title: 'Login - SynC',
    description: 'Sign in to your account'
  },
  {
    path: '/auth/signup',
    element: <SignUp />,
    title: 'Sign Up - SynC',
    description: 'Create your account'
  },
  {
    path: '/auth/forgot-password',
    element: <ForgotPassword />,
    title: 'Reset Password - SynC',
    description: 'Reset your password'
  },
  {
    path: '/auth/reset-password',
    element: <ResetPassword />,
    title: 'Set New Password - SynC',
    description: 'Set your new password'
  },

  // Protected routes (require authentication)
  {
    path: '/dashboard',
    element: <Dashboard />,
    protected: true,
    title: 'Dashboard - SynC',
    description: 'Your personal dashboard with deals and recommendations'
  },
  {
    path: '/onboarding',
    element: <Onboarding />,
    protected: true,
    title: 'Welcome - SynC',
    description: 'Complete your profile setup'
  },
  {
    path: '/search',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><Search /></Suspense>,
    protected: true,
    title: 'Search - SynC',
    description: 'Find businesses, products, and deals'
  },
  {
    path: '/search/advanced',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><AdvancedSearchPage /></Suspense>,
    protected: true,
    title: 'Advanced Search - SynC',
    description: 'Advanced search with filters and location-based discovery'
  },
  {
    path: '/discovery',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><BusinessDiscoveryPage /></Suspense>,
    protected: true,
    title: 'Discover Businesses - SynC',
    description: 'Explore local businesses, trending deals, and personalized recommendations'
  },
  {
    path: '/categories',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><CategoryBrowserPage /></Suspense>,
    protected: true,
    title: 'Browse Categories - SynC',
    description: 'Explore businesses organized by category'
  },
  {
    path: '/coupons/trending',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><TrendingCouponsPage /></Suspense>,
    protected: true,
    title: 'Trending Coupons - SynC',
    description: 'Discover the hottest deals and most popular offers'
  },
  {
    path: '/analytics/search',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><SearchAnalyticsDashboard /></Suspense>,
    protected: true,
    title: 'Search Analytics - SynC',
    description: 'Search insights and analytics dashboard'
  },
  {
    path: '/locations',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><LocationManager /></Suspense>,
    protected: true,
    title: 'Location Manager - SynC',
    description: 'Manage your saved locations and location history'
  },
  {
    path: '/profile',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><Profile /></Suspense>,
    protected: true,
    title: 'Profile - SynC',
    description: 'Manage your profile and preferences'
  },
  {
    path: '/settings',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><Settings /></Suspense>,
    protected: true,
    title: 'Settings - SynC',
    description: 'Manage your account settings'
  },
  {
    path: '/wallet',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><Wallet /></Suspense>,
    protected: true,
    title: 'Wallet - SynC',
    description: 'Manage your coupons and deals'
  },
  {
    path: '/social',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><Social /></Suspense>,
    protected: true,
    title: 'Social - SynC',
    description: 'Connect with friends and share deals'
  },
  {
    path: '/favorites',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><UnifiedFavoritesPage /></Suspense>,
    protected: true,
    title: 'Favorites - SynC',
    description: 'Your saved businesses, coupons, and deals with unified state management'
  },
  {
    path: '/favorites/simple',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><SimpleFavoritesPage /></Suspense>,
    protected: true,
    title: 'Simple Favorites - SynC',
    description: 'Basic favorites management'
  },
  {
    path: '/favorites/unified',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><UnifiedFavoritesPage /></Suspense>,
    protected: true,
    title: 'Unified Favorites - SynC',
    description: 'Advanced favorites with unified state management and real-time synchronization'
  },
  {
    path: '/favorites/fallback',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><FallbackEnhancedFavoritesPage /></Suspense>,
    protected: true,
    title: 'Fallback Favorites - SynC',
    description: 'Fallback favorites page using the original system'
  },
  {
    path: '/friends',
    element: <FriendsManagementPage />,
    protected: true,
    title: 'Friends - SynC',
    description: 'Manage your friends and connections'
  },
  // Business Routes
  {
    path: '/business/register',
    element: <BusinessRegistration />,
    protected: true,
    title: 'Register Business - SynC',
    description: 'Register your business on SynC'
  },
  {
    path: '/business/dashboard',
    element: <BusinessDashboard />,
    protected: true,
    title: 'Business Dashboard - SynC',
    description: 'Manage your businesses on SynC'
  },
  {
    path: '/business/:businessId',
    element: <BusinessProfile />,
    protected: true,
    title: 'Business Profile - SynC',
    description: 'View and manage your business profile'
  },
  {
    path: '/business/:businessId/edit',
    element: <BusinessProfile />,
    protected: true,
    title: 'Edit Business - SynC',
    description: 'Edit your business profile'
  },
  {
    path: '/business/:businessId/products',
    element: <ProductManagerPage />,
    protected: true,
    title: 'Product Catalog - SynC',
    description: 'Manage your business product catalog'
  },
  {
    path: '/business/:businessId/coupons',
    element: <CouponManagerPage />,
    protected: true,
    title: 'Coupon Manager - SynC',
    description: 'Create and manage business coupons'
  }
]

// Debug routes (only in development)
const debugRoutes: RouteConfig[] = [
  {
    path: '/debug/signup',
    element: <Suspense fallback={<div>Loading...</div>}><SignUpDebug /></Suspense>,
    title: 'Debug - Sign Up'
  },
  {
    path: '/debug/auth',
    element: <Suspense fallback={<div>Loading...</div>}><AuthStoreTest /></Suspense>,
    title: 'Debug - Auth Store'
  },
  {
    path: '/debug/routes',
    element: <Suspense fallback={<div>Loading...</div>}><RouteProtectionTest /></Suspense>,
    title: 'Debug - Route Protection Tests'
  },
  {
    path: '/debug/products',
    element: <Suspense fallback={<div>Loading...</div>}><ProductsDebug /></Suspense>,
    protected: true,
    title: 'Debug - Products & Database'
  },
  {
    path: '/debug/favorites',
    element: <Suspense fallback={<div>Loading...</div>}><FavoritesLocationDebug /></Suspense>,
    protected: true,
    title: 'Debug - Favorites & Location'
  },
  {
    path: '/debug/favorites/test',
    element: <Suspense fallback={<div>Loading...</div>}><FavoritesSystemTest /></Suspense>,
    protected: true,
    title: 'Debug - Favorites System Test Suite'
  }
]

// Loading component for lazy-loaded routes
const RouteLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
    </div>
  }>
    {children}
  </Suspense>
)

// Main router component
export default function AppRouter() {
  // Show debug routes only in development
  const isDevelopment = import.meta.env.MODE === 'development'
  const allRoutes = isDevelopment ? [...routes, ...debugRoutes] : routes

  return (
    <Routes>
      {allRoutes.map((route) => {
        // Wrap protected routes with ProtectedRoute component
        if (route.protected) {
          // Determine if this route requires completed onboarding
          const requireOnboarding = !['/', '/onboarding', '/auth/login', '/auth/signup'].includes(route.path)
          
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute 
                  requireAuth={true}
                  requireOnboarding={requireOnboarding}
                  debugMode={isDevelopment}
                >
                  {route.element}
                </ProtectedRoute>
              }
            />
          )
        }
        
        // For public routes, wrap auth pages to redirect if already logged in
        if (route.path.startsWith('/auth/')) {
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute 
                  requireAuth={false}
                  debugMode={isDevelopment}
                >
                  {route.element}
                </ProtectedRoute>
              }
            />
          )
        }
        
        // Regular public routes
        return (
          <Route
            key={route.path}
            path={route.path}
            element={route.element}
          />
        )
      })}
      
      {/* Catch-all route for 404 */}
      <Route 
        path="*" 
        element={
          <RouteLoader>
            <NotFound />
          </RouteLoader>
        } 
      />
    </Routes>
  )
}
