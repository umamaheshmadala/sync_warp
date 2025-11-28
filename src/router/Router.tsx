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
import BusinessOnboardingPage from '../components/business/BusinessOnboardingPage'
import BusinessProfile from '../components/business/BusinessProfile'
import BusinessAnalyticsPage from '../components/business/BusinessAnalyticsPage'
import BusinessQRCodePage from '../components/business/BusinessQRCodePage'
import ProductManagerPage from '../components/business/ProductManagerPage'
import CouponManagerPage from '../components/business/CouponManagerPage'
import OfferManagerPage from '../components/business/OfferManagerPage'
import CampaignManagerPage from '../components/business/CampaignManagerPage'
import CampaignWizard from '../components/business/CampaignWizard'
import CampaignAnalyticsPage from '../components/business/CampaignAnalyticsPage'

// Import product components (Story 4.7)
import { ProductDetails, AllProducts } from '../components/products'

// Import social components
import FriendsManagementPage from '../components/FriendsManagementPage'
import { FriendSearchPage } from '../pages/FriendSearchPage'
import { PYMKPage } from '../pages/PYMKPage'
import { TestSearchFilters } from '../pages/TestSearchFilters'
import { TestSearchPerformance } from '../pages/TestSearchPerformance'
import { TestDealSharing } from '../pages/TestDealSharing'
import { TestDealComments } from '../pages/TestDealComments'
import { ShareDealDemo } from '../pages/ShareDealDemo'
// Story 9.3.1: Friends List Component
import { FriendsPage } from '../pages/Friends'
// Story 9.3.2: Friend Requests UI
import { FriendRequestsList } from '../components/friends/FriendRequestsList'
import TestProfileModal from '../pages/TestProfileModal'
// Story 9.5.6: Privacy Dashboard
import { FriendsPrivacySettings } from '../pages/settings/FriendsPrivacySettings'
import NotificationSettings from '../pages/settings/NotificationSettings'
// Story 9.6.2: Activity Feed UI
import TestActivityFeed from '../pages/TestActivityFeed'


// Import messaging components (Epic 8.2)
import { ConversationListPage } from '../components/messaging/ConversationListPage'
import { ChatScreen } from '../components/messaging/ChatScreen'

// Lazy load components for better performance
const NotFound = lazy(() => import('../components/NotFound'))
const Profile = lazy(() => import('../components/Profile'))
const Search = lazy(() => import('../components/Search'))
const SearchAnalyticsDashboard = lazy(() => import('../components/SearchAnalyticsDashboard'))
const LocationManager = lazy(() => import('../components/LocationManager'))
const Settings = lazy(() => import('../components/Settings'))
const Wallet = lazy(() => import('../components/Wallet'))
const Social = lazy(() => import('../components/Social'))
const WishlistPage = lazy(() => import('../pages/WishlistPage'))
// Story 4.4 components
const AdvancedSearchPage = lazy(() => import('../components/search/AdvancedSearchPage'))
const BusinessDiscoveryPage = lazy(() => import('../components/discovery/BusinessDiscoveryPage'))
const CategoryBrowserPage = lazy(() => import('../components/categories/CategoryBrowserPage'))
const TrendingCouponsPage = lazy(() => import('../components/coupons/TrendingCouponsPage'))
const UnifiedFavoritesPage = lazy(() => import('../components/favorites/UnifiedFavoritesPage'));
const FollowingPage = lazy(() => import('../components/following/FollowingPage'));
const FollowerFeed = lazy(() => import('../components/following/FollowerFeed'));
const FollowerAnalyticsDashboard = lazy(() => import('../components/business/FollowerAnalyticsDashboard'));
const FollowerList = lazy(() => import('../components/business/FollowerList'));
const FollowerTargetingDemo = lazy(() => import('../pages/FollowerTargetingDemo'));

// Debug components are removed from production build

// Development mode flag
const isDevelopment = import.meta.env.MODE === 'development'

// Check-in components
const BusinessCheckinsPage = lazy(() => import('../components/checkins/BusinessCheckinsPage'))

// Story 5.2: Review System
const MyReviewsPage = lazy(() => import('../pages/MyReviewsPage'))

// Notifications redirect page
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))

// Story 8.1.3: Storage Test
const StorageTest = lazy(() => import('../pages/test/StorageTest'))

// Story 9.3.6: Contact Sync Test
const ContactSyncTestPage = lazy(() => import('../pages/ContactSyncTestPage'))

// Story 5.5: Test Sharing Limits (excluded from production)

// Route definitions
export interface RouteConfig {
  path: string
  element: React.ReactElement
  protected?: boolean
  title?: string
  description?: string
}

export const routes: RouteConfig[] = [
  // Redirect root to dashboard (mobile-first approach)
  {
    path: '/',
    element: <Dashboard />,
    protected: true,
    title: 'Dashboard - SynC',
    description: 'Your personal dashboard with deals and recommendations'
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
    path: '/notifications',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><NotificationsPage /></Suspense>,
    protected: true,
    title: 'Notifications - SynC',
    description: 'Notification system has moved to the header bell icon'
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
    path: '/businesses',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><BusinessDiscoveryPage /></Suspense>,
    protected: true,
    title: 'Browse Businesses - SynC',
    description: 'Browse and discover local businesses near you'
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
    path: '/settings/privacy',
    element: <FriendsPrivacySettings />,
    protected: true,
    title: 'Privacy Settings - SynC',
    description: 'Manage privacy and blocking settings'
  },
  {
    path: '/settings/notifications',
    element: <NotificationSettings />,
    protected: true,
    title: 'Notification Settings - SynC',
    description: 'Manage your notification preferences'
  },
  {
    path: '/test/activity-feed',
    element: <TestActivityFeed />,
    protected: true,
    title: 'Activity Feed Test - SynC',
    description: 'Test page for friend activity feed'
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
    path: '/following',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><FollowingPage /></Suspense>,
    protected: true,
    title: 'Following - SynC',
    description: 'Businesses you follow with instant updates and notifications'
  },
  {
    path: '/following/feed',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><FollowerFeed /></Suspense>,
    protected: true,
    title: 'Updates Feed - SynC',
    description: 'See latest updates from businesses you follow'
  },
  {
    path: '/wishlist',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><WishlistPage /></Suspense>,
    protected: true,
    title: 'My Wishlist - SynC',
    description: 'View your wishlist products'
  },
  {
    path: '/friends',
    element: <FriendsPage />,
    protected: true,
    title: 'Friends - SynC',
    description: 'View and manage your friends list with online status'
  },
  {
    path: '/friends/manage',
    element: <FriendsManagementPage />,
    protected: true,
    title: 'Manage Friends - SynC',
    description: 'Manage friend requests and connections'
  },
  {
    path: '/friends/search',
    element: <FriendSearchPage />,
    protected: true,
    title: 'Find Friends - SynC',
    description: 'Search for friends with intelligent fuzzy matching'
  },
  {
    path: '/friends/requests',
    element: <FriendRequestsList />,
    protected: true,
    title: 'Friend Requests - SynC',
    description: 'Manage received and sent friend requests'
  },
  {
    path: '/friends/recommendations',
    element: <PYMKPage />,
    protected: true,
    title: 'People You May Know - SynC',
    description: 'Discover friends based on mutual connections and contacts'
  },
  {
    path: '/test/search-filters',
    element: <TestSearchFilters />,
    protected: true,
    title: 'Test Search Filters - SynC (STORY 9.2.4)',
    description: 'Test page for search filters with location, mutual friends, and shared interests'
  },
  {
    path: '/checkins',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><BusinessCheckinsPage /></Suspense>,
    protected: true,
    title: 'Business Check-ins - SynC',
    description: 'Discover nearby businesses and check in to earn rewards'
  },
  // Story 5.2: My Reviews
  {
    path: '/my-reviews',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><MyReviewsPage /></Suspense>,
    protected: true,
    title: 'My Reviews - SynC',
    description: 'Manage your reviews and see your review history'
  },
  // Follower Targeting Demo
  {
    path: '/demo/follower-targeting',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><FollowerTargetingDemo /></Suspense>,
    protected: true,
    title: 'Follower Targeting Demo - SynC',
    description: 'Interactive demo of follower targeting and campaign features'
  },
  // Story 8.1.3: Storage Test
  {
    path: '/test/storage',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><StorageTest /></Suspense>,
    protected: true,
    title: 'Storage Test - SynC (STORY 8.1.3)',
    description: 'Test message attachments upload, signed URLs, and CORS behavior'
  },
  // Story 9.3.6: Contact Sync Test
  {
    path: '/test/contact-sync',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><ContactSyncTestPage /></Suspense>,
    protected: true,
    title: 'Contact Sync Test - SynC (STORY 9.3.6)',
    description: 'Test contact sync permission flow and modal functionality'
  },
  // Story 9.2.5: Search Performance Test
  {
    path: '/test/search-performance',
    element: <TestSearchPerformance />,
    protected: true,
    title: 'Search Performance Test - SynC (STORY 9.2.5)',
    description: 'Test search performance optimizations with metrics dashboard'
  },
  // Story 9.2.6: Deal Sharing Test
  {
    path: '/test/deal-sharing',
    element: <TestDealSharing />,
    protected: true,
    title: 'Deal Sharing Test - SynC (STORY 9.2.6)',
    description: 'Test FriendPickerModal with search, multi-select, and notifications'
  },
  // Story 9.7.5: ShareDeal Integration Test
  {
    path: '/test/share-deal',
    element: <ShareDealDemo />,
    protected: true,
    title: 'ShareDeal Component Test - SynC (STORY 9.7.5)',
    description: 'Test unified ShareDeal component with Friends, Link, and Email tabs'
  },
  // Story 9.3.3: Friend Profile Modal Test
  {
    path: '/test/profile-modal',
    element: <TestProfileModal />,
    protected: true,
    title: 'Profile Modal Test - SynC (STORY 9.3.3)',
    description: 'Test FriendProfileModal with mock data'
  },
  // Story 9.7.2: Deal Comments Test
  {
    path: '/test/deal-comments',
    element: <TestDealComments />,
    protected: true,
    title: 'Deal Comments Test - SynC (STORY 9.7.2)',
    description: 'Test comments with friend mentions'
  },

  // Epic 8.2: Messaging Routes
  {
    path: '/messages',
    element: <ConversationListPage />,
    protected: true,
    title: 'Messages - SynC',
    description: 'Your conversations and direct messages'
  },
  {
    path: '/messages/:conversationId',
    element: <ChatScreen />,
    protected: true,
    title: 'Chat - SynC',
    description: 'Chat conversation'
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
    path: '/business/onboarding',
    element: <BusinessOnboardingPage />,
    protected: true,
    title: 'Business Onboarding - SynC',
    description: 'Complete your business profile setup'
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
    path: '/business/:businessId/analytics',
    element: <BusinessAnalyticsPage />,
    protected: true,
    title: 'Business Analytics - SynC',
    description: 'View detailed business analytics and check-in statistics'
  },
  {
    path: '/business/:businessId/qr-code',
    element: <BusinessQRCodePage />,
    protected: true,
    title: 'QR Code Generator - SynC',
    description: 'Generate QR codes for customer check-ins'
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
  },
  {
    path: '/business/:businessId/offers',
    element: <OfferManagerPage />,
    protected: true,
    title: 'Offer Manager - SynC',
    description: 'Create and manage promotional offers'
  },
  {
    path: '/business/:businessId/campaigns',
    element: <CampaignManagerPage />,
    protected: true,
    title: 'Campaign Manager - SynC',
    description: 'Manage marketing campaigns for your business'
  },
  {
    path: '/business/:businessId/campaigns/create',
    element: <CampaignWizard />,
    protected: true,
    title: 'Create Campaign - SynC',
    description: 'Create a new marketing campaign'
  },
  {
    path: '/business/:businessId/campaigns/:campaignId/analytics',
    element: <CampaignAnalyticsPage />,
    protected: true,
    title: 'Campaign Analytics - SynC',
    description: 'View detailed campaign performance metrics'
  },
  {
    path: '/business/:businessId/followers/analytics',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><FollowerAnalyticsDashboard /></Suspense>,
    protected: true,
    title: 'Follower Analytics - SynC',
    description: 'View follower demographics and engagement analytics'
  },
  {
    path: '/business/:businessId/followers/list',
    element: <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div></div>}><FollowerList /></Suspense>,
    protected: true,
    title: 'Followers - SynC',
    description: 'View and manage your followers'
  },
  // Story 4.7: Product Detail Routes (customer-facing)
  {
    path: '/business/:businessId/product/:productId',
    element: <ProductDetails />,
    protected: true,
    title: 'Product Details - SynC',
    description: 'View product information and details'
  },
  {
    path: '/business/:businessId/products/catalog',
    element: <AllProducts />,
    protected: true,
    title: 'All Products - SynC',
    description: 'Browse all products from this business'
  }
]

// Debug routes removed for production build

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
  // Debug routes removed for production build
  const allRoutes = routes

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

        // For public routes, wrap auth pages and landing to redirect if already logged in
        if (route.path.startsWith('/auth/') || route.path === '/') {
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
