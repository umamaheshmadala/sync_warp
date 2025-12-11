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

import { FriendsPage } from '../pages/Friends'
import { FriendSearchPage } from '../pages/FriendSearchPage'
import { PYMKPage } from '../pages/PYMKPage'
import FriendsManagementPage from '../components/FriendsManagementPage'
import { FriendRequestsList } from '../components/friends/FriendRequestsList'
import TestProfileModal from '../pages/TestProfileModal'
// Story 9.5.6: Privacy Dashboard
import { FriendsPrivacySettings } from '../pages/settings/FriendsPrivacySettings'
import NotificationSettings from '../pages/settings/NotificationSettings'
import BlockedUsersPage from '../pages/BlockedUsersPage'

// Story 9.6.2: Activity Feed UI
import TestActivityFeed from '../pages/TestActivityFeed'
import { TestSearchFilters } from '../pages/TestSearchFilters'
import { TestDealComments } from '../pages/TestDealComments'
import ShareDealDemo from '../pages/ShareDealDemo'
import SharingAnalyticsDemo from '../pages/SharingAnalyticsDemo'
import { TestSearchPerformance } from '../pages/TestSearchPerformance'

// Import messaging components (Epic 8.2)
import { MessagingLayout } from '../components/messaging/MessagingLayout'
import { SelectConversationPlaceholder } from '../components/messaging/SelectConversationPlaceholder'
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

// Route definitions
export interface RouteConfig {
  path: string
  element: React.ReactElement
  protected?: boolean
  title?: string
  description?: string
  children?: RouteConfig[]
  index?: boolean
}

export const routes: RouteConfig[] = [
  // Home / Landing Page
  {
    path: '/',
    element: <Landing />,
    protected: false,
    title: 'SynC - Connect, Collaborate, Create',
    description: 'Discover local businesses and share amazing deals'
  },

  // Dashboard (Protected)
  {
    path: '/dashboard',
    element: <Dashboard />,
    protected: true,
    title: 'Dashboard - SynC',
    description: 'Your personalized dashboard'
  },

  // Authentication Routes
  {
    path: '/auth/login',
    element: <Login />,
    protected: false,
    title: 'Login - SynC',
    description: 'Login to your SynC account'
  },
  {
    path: '/auth/signup',
    element: <SignUp />,
    protected: false,
    title: 'Sign Up - SynC',
    description: 'Create your SynC account'
  },
  {
    path: '/auth/forgot-password',
    element: <ForgotPassword />,
    protected: false,
    title: 'Forgot Password - SynC',
    description: 'Reset your password'
  },
  {
    path: '/auth/reset-password',
    element: <ResetPassword />,
    protected: false,
    title: 'Reset Password - SynC',
    description: 'Set a new password'
  },
  {
    path: '/onboarding',
    element: <Onboarding />,
    protected: true,
    title: 'Onboarding - SynC',
    description: 'Complete your profile setup'
  },

  // Epic 8.2: Messaging Routes
  {
    path: '/messages',
    element: <MessagingLayout />,
    protected: true,
    title: 'Messages - SynC',
    description: 'Your conversations and direct messages',
    children: [
      {
        path: '',
        index: true,
        element: <SelectConversationPlaceholder />,
        title: 'Messages - SynC'
      },
      {
        path: ':conversationId',
        element: <ChatScreen />,
        title: 'Chat - SynC'
      }
    ]
  },

  // Wallet Page (Protected)
  {
    path: '/wallet',
    element: (
      <RouteLoader>
        <Wallet />
      </RouteLoader>
    ),
    protected: true,
    title: 'My Wallet - SynC',
    description: 'View and manage your saved coupons'
  },

  // Following Page (Protected)
  {
    path: '/following',
    element: (
      <RouteLoader>
        <FollowingPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Following - SynC',
    description: 'Businesses you follow'
  },

  // Favorites Page (Protected)
  {
    path: '/favorites',
    element: (
      <RouteLoader>
        <UnifiedFavoritesPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Favorites - SynC',
    description: 'Your favorite businesses and deals'
  },

  // Friends Page (Protected)
  {
    path: '/friends',
    element: <FriendsPage />,
    protected: true,
    title: 'Friends - SynC',
    description: 'Manage your friends and connections'
  },

  // Notifications Page (Protected)
  {
    path: '/notifications',
    element: (
      <RouteLoader>
        <NotificationsPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Notifications - SynC',
    description: 'Your notifications and alerts'
  },

  // Business Dashboard (Protected)
  {
    path: '/business/dashboard',
    element: <BusinessDashboard />,
    protected: true,
    title: 'Business Dashboard - SynC',
    description: 'Manage your business'
  },

  // Business Registration (Protected)
  {
    path: '/business/register',
    element: <BusinessRegistration />,
    protected: true,
    title: 'Register Business - SynC',
    description: 'Register your business on SynC'
  },

  // Business Profile (Public)
  {
    path: '/business/:slug',
    element: <BusinessProfile />,
    protected: false,
    title: 'Business Profile - SynC',
    description: 'View business details and offers'
  },
  {
    path: '/business/:slug/coupons',
    element: <BusinessProfile />,
    protected: false,
    title: 'Business Coupons - SynC'
  },
  {
    path: '/business/:slug/products',
    element: <BusinessProfile />,
    protected: false,
    title: 'Business Products - SynC'
  },

  // Business Tools (Protected)
  {
    path: '/business/onboarding',
    element: <BusinessOnboardingPage />,
    protected: true,
    title: 'Business Onboarding - SynC'
  },
  {
    path: '/business/analytics',
    element: <BusinessAnalyticsPage />,
    protected: true,
    title: 'Business Analytics - SynC'
  },
  {
    path: '/business/qr-code',
    element: <BusinessQRCodePage />,
    protected: true,
    title: 'Business QR Code - SynC'
  },
  {
    path: '/business/:businessId/manage/products',
    element: <ProductManagerPage />,
    protected: true,
    title: 'Product Manager - SynC'
  },
  {
    path: '/business/:businessId/manage/coupons',
    element: <CouponManagerPage />,
    protected: true,
    title: 'Coupon Manager - SynC'
  },
  {
    path: '/business/:businessId/manage/offers',
    element: <OfferManagerPage />,
    protected: true,
    title: 'Offer Manager - SynC'
  },
  {
    path: '/business/:businessId/manage/campaigns',
    element: <CampaignManagerPage />,
    protected: true,
    title: 'Campaign Manager - SynC'
  },
  {
    path: '/business/campaigns/new',
    element: <CampaignWizard />,
    protected: true,
    title: 'Create Campaign - SynC'
  },
  {
    path: '/business/campaigns/:id/analytics',
    element: <CampaignAnalyticsPage />,
    protected: true,
    title: 'Campaign Analytics - SynC'
  },
  {
    path: '/business/followers',
    element: <FollowerList />,
    protected: true,
    title: 'Followers - SynC'
  },
  {
    path: '/business/followers/analytics',
    element: <FollowerAnalyticsDashboard />,
    protected: true,
    title: 'Follower Analytics - SynC'
  },
  {
    path: '/business/checkins',
    element: (
      <RouteLoader>
        <BusinessCheckinsPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Check-ins - SynC'
  },

  // Products (Public/Protected)
  {
    path: '/products',
    element: <AllProducts />,
    protected: false,
    title: 'Products - SynC'
  },
  {
    path: '/products/:id',
    element: <ProductDetails />,
    protected: false,
    title: 'Product Details - SynC'
  },

  // Social & Friends (Protected)
  {
    path: '/friends/search',
    element: <FriendSearchPage />,
    protected: true,
    title: 'Find Friends - SynC'
  },
  {
    path: '/friends/pymk',
    element: <PYMKPage />,
    protected: true,
    title: 'People You May Know - SynC'
  },
  {
    path: '/friends/requests',
    element: <FriendRequestsList />,
    protected: true,
    title: 'Friend Requests - SynC'
  },
  {
    path: '/friends/manage',
    element: <FriendsManagementPage />,
    protected: true,
    title: 'Manage Friends - SynC'
  },
  {
    path: '/social',
    element: (
      <RouteLoader>
        <Social />
      </RouteLoader>
    ),
    protected: true,
    title: 'Social - SynC'
  },
  {
    path: '/wishlist',
    element: (
      <RouteLoader>
        <WishlistPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Wishlist - SynC'
  },
  {
    path: '/reviews',
    element: (
      <RouteLoader>
        <MyReviewsPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'My Reviews - SynC'
  },

  // Settings (Protected)
  {
    path: '/settings',
    element: (
      <RouteLoader>
        <Settings />
      </RouteLoader>
    ),
    protected: true,
    title: 'Settings - SynC'
  },
  {
    path: '/settings/privacy/friends',
    element: <FriendsPrivacySettings />,
    protected: true,
    title: 'Friend Privacy Settings - SynC'
  },
  {
    path: '/settings/notifications',
    element: <NotificationSettings />,
    protected: true,
    title: 'Notification Settings - SynC'
  },
  {
    path: '/settings/blocked-users',
    element: <BlockedUsersPage />,
    protected: true,
    title: 'Blocked Users - SynC'
  },
  {
    path: '/profile',
    element: (
      <RouteLoader>
        <Profile />
      </RouteLoader>
    ),
    protected: true,
    title: 'My Profile - SynC'
  },

  // Discovery & Search (Public/Protected)
  {
    path: '/search',
    element: (
      <RouteLoader>
        <Search />
      </RouteLoader>
    ),
    protected: false,
    title: 'Search - SynC'
  },
  {
    path: '/search/advanced',
    element: (
      <RouteLoader>
        <AdvancedSearchPage />
      </RouteLoader>
    ),
    protected: false,
    title: 'Advanced Search - SynC'
  },
  {
    path: '/discovery',
    element: (
      <RouteLoader>
        <BusinessDiscoveryPage />
      </RouteLoader>
    ),
    protected: false,
    title: 'Discover - SynC'
  },
  {
    path: '/categories',
    element: (
      <RouteLoader>
        <CategoryBrowserPage />
      </RouteLoader>
    ),
    protected: false,
    title: 'Categories - SynC'
  },
  {
    path: '/trending',
    element: (
      <RouteLoader>
        <TrendingCouponsPage />
      </RouteLoader>
    ),
    protected: false,
    title: 'Trending - SynC'
  },
  {
    path: '/locations',
    element: (
      <RouteLoader>
        <LocationManager />
      </RouteLoader>
    ),
    protected: true,
    title: 'Locations - SynC'
  },

  // Test Pages (Development Only)
  ...(isDevelopment ? [
    {
      path: '/test/profile-modal',
      element: <TestProfileModal />,
      protected: true,
      title: 'Test Profile Modal'
    },
    {
      path: '/test/activity-feed',
      element: <TestActivityFeed />,
      protected: true,
      title: 'Test Activity Feed'
    },
    {
      path: '/test/search-filters',
      element: <TestSearchFilters />,
      protected: true,
      title: 'Test Search Filters'
    },
    {
      path: '/test/deal-comments',
      element: <TestDealComments />,
      protected: true,
      title: 'Test Deal Comments'
    },
    {
      path: '/test/share-deal',
      element: <ShareDealDemo />,
      protected: true,
      title: 'Test Share Deal'
    },
    {
      path: '/test/sharing-analytics',
      element: <SharingAnalyticsDemo />,
      protected: true,
      title: 'Test Sharing Analytics'
    },
    {
      path: '/test/search-performance',
      element: <TestSearchPerformance />,
      protected: true,
      title: 'Test Search Performance'
    },
    {
      path: '/test/search-analytics',
      element: (
        <RouteLoader>
          <SearchAnalyticsDashboard />
        </RouteLoader>
      ),
      protected: true,
      title: 'Test Search Analytics'
    },
    {
      path: '/test/follower-targeting',
      element: (
        <RouteLoader>
          <FollowerTargetingDemo />
        </RouteLoader>
      ),
      protected: true,
      title: 'Test Follower Targeting'
    },
    {
      path: '/test/storage',
      element: (
        <RouteLoader>
          <StorageTest />
        </RouteLoader>
      ),
      protected: true,
      title: 'Test Storage'
    },
    {
      path: '/test/contact-sync',
      element: (
        <RouteLoader>
          <ContactSyncTestPage />
        </RouteLoader>
      ),
      protected: true,
      title: 'Test Contact Sync'
    }
  ] : []),

  // ... (other routes)
]

// Main router component
export default function AppRouter() {
  const allRoutes = routes

  const renderRoute = (route: RouteConfig) => {
    // Logic to wrap protected/public routes
    let element = route.element

    if (route.protected) {
      const requireOnboarding = !['/', '/onboarding', '/auth/login', '/auth/signup'].includes(route.path)
      element = (
        <ProtectedRoute
          requireAuth={true}
          requireOnboarding={requireOnboarding}
          debugMode={isDevelopment}
        >
          {route.element}
        </ProtectedRoute>
      )
    } else if (route.path.startsWith('/auth/') || route.path === '/') {
      element = (
        <ProtectedRoute
          requireAuth={false}
          debugMode={isDevelopment}
        >
          {route.element}
        </ProtectedRoute>
      )
    }

    if (route.index) {
      return (
        <Route
          key={route.path || 'index'}
          index
          element={element}
        />
      )
    }

    return (
      <Route
        key={route.path || 'index'}
        path={route.path}
        element={element}
      >
        {route.children?.map(renderRoute)}
      </Route>
    )
  }

  return (
    <Routes>
      {allRoutes.map(renderRoute)}

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
