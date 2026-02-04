// src/router/Router.tsx
// Centralized routing configuration for the SynC app

import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuthStore } from '../store/authStore'
import ProtectedRoute from './ProtectedRoute'
import ChatScreen from '../components/messaging/ChatScreen'
import { SelectConversationPlaceholder } from '../components/messaging/SelectConversationPlaceholder'

// All components are lazy-loaded for optimal bundle splitting and performance

// Lazy load ALL components for optimal performance and code splitting

// Core components
const Dashboard = lazy(() => import('../components/Dashboard'))
const Login = lazy(() => import('../components/Login'))
const SignUp = lazy(() => import('../components/SignUp'))
const Onboarding = lazy(() => import('../components/Onboarding'))
const ForgotPassword = lazy(() => import('../components/ForgotPassword'))
const ResetPassword = lazy(() => import('../components/ResetPassword'))

// Business components
const BusinessRegistration = lazy(() => import('../components/business/BusinessRegistration'))
const BusinessDashboard = lazy(() => import('../components/business/BusinessDashboard'))
const BusinessOnboardingPage = lazy(() => import('../components/business/BusinessOnboardingPage'))
const BusinessProfile = lazy(() => import('../components/business/BusinessProfile'))
const BusinessAnalyticsPage = lazy(() => import('../components/business/BusinessAnalyticsPage'))
const BusinessQRCodePage = lazy(() => import('../components/business/BusinessQRCodePage'))

const CouponManagerPage = lazy(() => import('../components/business/CouponManagerPage'))
const OfferManagerPage = lazy(() => import('../components/business/OfferManagerPage'))
const CampaignManagerPage = lazy(() => import('../components/business/CampaignManagerPage'))
const CampaignWizard = lazy(() => import('../components/business/CampaignWizard'))
const CampaignAnalyticsPage = lazy(() => import('../components/business/CampaignAnalyticsPage'))
const FollowerAnalyticsDashboard = lazy(() => import('../components/business/FollowerAnalyticsDashboard'))
const FollowerList = lazy(() => import('../components/business/FollowerList'))
const BusinessCheckinsPage = lazy(() => import('../components/checkins/BusinessCheckinsPage'))
const MobileProductCreation = lazy(() => import('../components/products/creation/MobileProductCreation').then(m => ({ default: m.MobileProductCreation })))

// Admin Components
// Admin Components
const AdminLayout = lazy(() => import('../components/layout/AdminLayout'))
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'))
const ReviewModerationPage = lazy(() => import('../pages/admin/ReviewModerationPage'))
const ReviewAnalyticsDashboard = lazy(() => import('../pages/admin/ReviewAnalyticsDashboard').then(m => ({ default: m.ReviewAnalyticsDashboard })))
const AdminAuditLogPage = lazy(() => import('../pages/admin/AdminAuditLogPage'))
const BusinessManagementPage = lazy(() => import('../pages/admin/BusinessManagementPage'))
const UserManagementPage = lazy(() => import('../pages/admin/UserManagementPage'))
const ApiInfrastructurePage = lazy(() => import('../pages/admin/ApiInfrastructurePage'))
const PlatformSettingsPage = lazy(() => import('../pages/admin/PlatformSettingsPage'))
const DataRetentionPage = lazy(() => import('../pages/admin/DataRetentionPage'))

// Product components
const ProductDetails = lazy(() => import('../components/products').then(m => ({ default: m.ProductDetails })))
const AllProducts = lazy(() => import('../components/products').then(m => ({ default: m.AllProducts })))

// Friend and social components
const FriendsPage = lazy(() => import('../pages/Friends').then(m => ({ default: m.FriendsPage })))
const FriendSearchPage = lazy(() => import('../pages/FriendSearchPage').then(m => ({ default: m.FriendSearchPage })))
const PYMKPage = lazy(() => import('../pages/PYMKPage').then(m => ({ default: m.PYMKPage })))
const FriendsManagementPage = lazy(() => import('../components/FriendsManagementPage'))
const FriendRequestsList = lazy(() => import('../components/friends/FriendRequestsList').then(m => ({ default: m.FriendRequestsList })))
const FriendsPrivacySettings = lazy(() => import('../pages/settings/FriendsPrivacySettings').then(m => ({ default: m.FriendsPrivacySettings })))
const NotificationSettings = lazy(() => import('../pages/settings/NotificationSettings'))

// Messaging components (Epic 8.2)
const MessagingLayout = lazy(() => import('../components/messaging/MessagingLayout').then(m => ({ default: m.MessagingLayout })))
// const SelectConversationPlaceholder = lazy(() => import('../components/messaging/SelectConversationPlaceholder').then(m => ({ default: m.SelectConversationPlaceholder })))
// const ChatScreen = lazy(() => import('../components/messaging/ChatScreen').then(m => ({ default: m.ChatScreen })))

// Test and demo components (development only)
const TestProfileModal = lazy(() => import('../pages/TestProfileModal'))
const TestActivityFeed = lazy(() => import('../pages/TestActivityFeed'))
const TestSearchFilters = lazy(() => import('../pages/TestSearchFilters').then(m => ({ default: m.TestSearchFilters })))
const TestDealComments = lazy(() => import('../pages/TestDealComments').then(m => ({ default: m.TestDealComments })))

const TestSearchPerformance = lazy(() => import('../pages/TestSearchPerformance').then(m => ({ default: m.TestSearchPerformance })))
const FollowerTargetingDemo = lazy(() => import('../pages/FollowerTargetingDemo'))
const StandardDesignsPage = lazy(() => import('../pages/test/StandardDesignsPage'))

// Other lazy-loaded components
const NotFound = lazy(() => import('../components/NotFound'))
const Profile = lazy(() => import('../components/Profile'))
const Search = lazy(() => import('../components/Search'))
const SearchAnalyticsDashboard = lazy(() => import('../components/SearchAnalyticsDashboard'))
const LocationManager = lazy(() => import('../components/LocationManager'))

const Wallet = lazy(() => import('../components/Wallet'))

const AdvancedSearchPage = lazy(() => import('../components/search/AdvancedSearchPage'))
const BusinessDiscoveryPage = lazy(() => import('../components/discovery/BusinessDiscoveryPage'))
const CategoryBrowserPage = lazy(() => import('../components/categories/CategoryBrowserPage'))
const TrendingCouponsPage = lazy(() => import('../components/coupons/TrendingCouponsPage'))
const UnifiedFavoritesPage = lazy(() => import('../components/favorites/UnifiedFavoritesPage'))
const FavoritesPage = lazy(() => import('../components/favorites/FavoritesPage'))
const FollowingPage = lazy(() => import('../components/following/FollowingPage'))
const FollowerFeed = lazy(() => import('../components/following/FollowerFeed'))
const MyReviewsPage = lazy(() => import('../pages/MyReviewsPage'))

const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const StorageTest = lazy(() => import('../pages/test/StorageTest'))
const ContactSyncTestPage = lazy(() => import('../pages/ContactSyncTestPage'))

// Development mode flag
const isDevelopment = import.meta.env.MODE === 'development'

// Story 5.5: Test Sharing Limits (excluded from production)

// Loading component for lazy-loaded routes
const RouteLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="min-h-screen bg-gray-50 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="max-w-4xl mx-auto">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6"></div>

        {/* Content skeleton */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  }>
    {children}
  </Suspense>
)

// Route definitions
export interface RouteConfig {
  path?: string
  element: React.ReactElement
  protected?: boolean
  title?: string
  description?: string
  children?: RouteConfig[]
  index?: boolean
}

// Root Redirect Component
const RootRedirect = () => {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth/login" replace />
}

export const routes: RouteConfig[] = [
  // Home / Root Redirect
  {
    path: '/',
    element: <RootRedirect />,
    protected: false,
    title: 'SynC',
    description: 'Redirecting...'
  },

  // Dashboard (Protected)
  {
    path: '/dashboard',
    element: (
      <RouteLoader>
        <Dashboard />
      </RouteLoader>
    ),
    protected: true,
    title: 'Dashboard - SynC',
    description: 'Your personalized dashboard'
  },

  // Authentication Routes
  {
    path: '/auth/login',
    element: (
      <RouteLoader>
        <Login />
      </RouteLoader>
    ),
    protected: false,
    title: 'Login - SynC',
    description: 'Login to your SynC account'
  },
  {
    path: '/auth/signup',
    element: (
      <RouteLoader>
        <SignUp />
      </RouteLoader>
    ),
    protected: false,
    title: 'Sign Up - SynC',
    description: 'Create your SynC account'
  },
  {
    path: '/auth/forgot-password',
    element: (
      <RouteLoader>
        <ForgotPassword />
      </RouteLoader>
    ),
    protected: false,
    title: 'Forgot Password - SynC',
    description: 'Reset your password'
  },
  {
    path: '/auth/reset-password',
    element: (
      <RouteLoader>
        <ResetPassword />
      </RouteLoader>
    ),
    protected: false,
    title: 'Reset Password - SynC',
    description: 'Set a new password'
  },
  {
    path: '/onboarding',
    element: (
      <RouteLoader>
        <Onboarding />
      </RouteLoader>
    ),
    protected: true,
    title: 'Onboarding - SynC',
    description: 'Complete your profile setup'
  },

  // Epic 8.2: Messaging Routes
  {
    path: '/messages',
    element: (
      <RouteLoader>
        <MessagingLayout />
      </RouteLoader>
    ),
    protected: true,
    title: 'Messages - SynC',
    description: 'Your conversations and direct messages',
    children: [
      {
        path: '',
        index: true,
        element: (
          <RouteLoader>
            <SelectConversationPlaceholder />
          </RouteLoader>
        ),
        title: 'Messages - SynC'
      },
      {
        path: ':conversationId',
        element: (
          <RouteLoader>
            <ChatScreen />
          </RouteLoader>
        ),
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
      <ProtectedRoute>
        <FavoritesPage />
      </ProtectedRoute>
    ),
    protected: true,
    title: 'Favorites - SynC',
    description: 'Your favorite businesses and deals'
  },

  // Friends Page (Protected)
  {
    path: '/friends',
    element: (
      <RouteLoader>
        <FriendsPage />
      </RouteLoader>
    ),
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
    element: (
      <RouteLoader>
        <BusinessDashboard />
      </RouteLoader>
    ),
    protected: true,
    title: 'Business Dashboard - SynC',
    description: 'Manage your business'
  },

  // Business Registration (Protected)
  {
    path: '/business/register',
    element: (
      <RouteLoader>
        <BusinessRegistration />
      </RouteLoader>
    ),
    protected: true,
    title: 'Register Business - SynC',
    description: 'Register your business on SynC'
  },

  // Business Profile (Public)
  {
    path: '/business/:slug',
    element: (
      <RouteLoader>
        <BusinessProfile />
      </RouteLoader>
    ),
    protected: false,
    title: 'Business Profile - SynC',
    description: 'View business details and offers'
  },
  {
    path: '/business/:slug/coupons',
    element: (
      <RouteLoader>
        <BusinessProfile />
      </RouteLoader>
    ),
    protected: false,
    title: 'Business Coupons - SynC'
  },
  {
    path: '/business/:slug/products',
    element: (
      <RouteLoader>
        <BusinessProfile />
      </RouteLoader>
    ),
    protected: false,
    title: 'Business Products - SynC'
  },
  // Business Offers - SynC
  {
    path: '/business/:slug/offers',
    element: (
      <RouteLoader>
        <BusinessProfile />
      </RouteLoader>
    ),
    protected: false,
    title: 'Business Offers - SynC'
  },


  // Admin Routes (Protected, with Layout)
  {
    path: '/admin',
    element: (
      <RouteLoader>
        <AdminLayout />
      </RouteLoader>
    ),
    protected: true,
    children: [
      {
        index: true,
        element: (
          <RouteLoader>
            <AdminDashboard />
          </RouteLoader>
        ),
        title: 'System Admin - SynC'
      },
      {
        path: 'users',
        element: (
          <RouteLoader>
            <UserManagementPage />
          </RouteLoader>
        ),
        title: 'User Management - SynC'
      },
      {
        path: 'businesses',
        element: (
          <RouteLoader>
            <BusinessManagementPage />
          </RouteLoader>
        ),
        title: 'Manage Businesses - SynC'
      },
      {
        path: 'moderation',
        element: (
          <RouteLoader>
            <ReviewModerationPage />
          </RouteLoader>
        ),
        title: 'Review Moderation - SynC'
      },
      {
        path: 'audit-log',
        element: (
          <RouteLoader>
            <AdminAuditLogPage />
          </RouteLoader>
        ),
        title: 'Audit Log - SynC'
      },
      {
        path: 'analytics/reviews',
        element: (
          <RouteLoader>
            <ReviewAnalyticsDashboard />
          </RouteLoader>
        ),
        title: 'Review Analytics - SynC'
      },
      {
        path: 'api',
        element: (
          <RouteLoader>
            <ApiInfrastructurePage />
          </RouteLoader>
        ),
        title: 'API Infrastructure - SynC'
      },
      {
        path: 'settings',
        element: (
          <RouteLoader>
            <PlatformSettingsPage />
          </RouteLoader>
        ),
        title: 'Platform Settings - SynC'
      },
      {
        path: 'retention',
        element: (
          <RouteLoader>
            <DataRetentionPage />
          </RouteLoader>
        ),
        title: 'Data Retention - SynC'
      },
      {
        path: 'dashboard',
        element: <Navigate to="/admin" replace />,
      }
    ]
  },

  // Business Tools (Protected)
  {
    path: '/business/onboarding',
    element: (
      <RouteLoader>
        <BusinessOnboardingPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Business Onboarding - SynC'
  },
  {
    path: '/business/analytics',
    element: (
      <RouteLoader>
        <BusinessAnalyticsPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Business Analytics - SynC'
  },
  {
    path: '/business/qr-code',
    element: (
      <RouteLoader>
        <BusinessQRCodePage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Business QR Code - SynC'
  },

  {
    path: '/business/products/create',
    element: (
      <RouteLoader>
        <MobileProductCreation />
      </RouteLoader>
    ),
    protected: true,
    title: 'Create Product - SynC'
  },

  {
    path: '/business/:businessId/manage/coupons',
    element: (
      <RouteLoader>
        <CouponManagerPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Coupon Manager - SynC'
  },
  {
    path: '/business/:businessId/manage/offers',
    element: (
      <RouteLoader>
        <OfferManagerPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Offer Manager - SynC'
  },
  {
    path: '/business/:businessId/manage/campaigns',
    element: (
      <RouteLoader>
        <CampaignManagerPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Campaign Manager - SynC'
  },
  {
    path: '/business/campaigns/new',
    element: (
      <RouteLoader>
        <CampaignWizard />
      </RouteLoader>
    ),
    protected: true,
    title: 'Create Campaign - SynC'
  },
  {
    path: '/business/campaigns/:id/analytics',
    element: (
      <RouteLoader>
        <CampaignAnalyticsPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Campaign Analytics - SynC'
  },
  {
    path: '/business/followers',
    element: (
      <RouteLoader>
        <FollowerList />
      </RouteLoader>
    ),
    protected: true,
    title: 'Followers - SynC'
  },
  {
    path: '/business/followers/analytics',
    element: (
      <RouteLoader>
        <FollowerAnalyticsDashboard />
      </RouteLoader>
    ),
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
    element: (
      <RouteLoader>
        <AllProducts />
      </RouteLoader>
    ),
    protected: false,
    title: 'Products - SynC'
  },
  {
    path: '/products/:id',
    element: (
      <RouteLoader>
        <ProductDetails />
      </RouteLoader>
    ),
    protected: false,
    title: 'Product Details - SynC'
  },

  // Social & Friends (Protected)
  {
    path: '/friends/search',
    element: (
      <RouteLoader>
        <FriendSearchPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Find Friends - SynC'
  },
  {
    path: '/friends/pymk',
    element: (
      <RouteLoader>
        <PYMKPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'People You May Know - SynC'
  },
  {
    path: '/friends/requests',
    element: (
      <RouteLoader>
        <FriendRequestsList />
      </RouteLoader>
    ),
    protected: true,
    title: 'Friend Requests - SynC'
  },
  {
    path: '/friends/manage',
    element: (
      <RouteLoader>
        <FriendsManagementPage />
      </RouteLoader>
    ),
    protected: true,
    title: 'Manage Friends - SynC'
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


  {
    path: '/settings/privacy/friends',
    element: (
      <RouteLoader>
        <FriendsPrivacySettings />
      </RouteLoader>
    ),
    protected: true,
    title: 'Friend Privacy Settings - SynC'
  },
  {
    path: '/settings/notifications',
    element: (
      <RouteLoader>
        <NotificationSettings />
      </RouteLoader>
    ),
    protected: true,
    title: 'Notification Settings - SynC'
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
      element: (
        <RouteLoader>
          <TestProfileModal />
        </RouteLoader>
      ),
      protected: true,
      title: 'Test Profile Modal'
    },
    {
      path: '/test/activity-feed',
      element: (
        <RouteLoader>
          <TestActivityFeed />
        </RouteLoader>
      ),
      protected: true,
      title: 'Test Activity Feed'
    },
    {
      path: '/test/search-filters',
      element: (
        <RouteLoader>
          <TestSearchFilters />
        </RouteLoader>
      ),
      protected: true,
      title: 'Test Search Filters'
    },
    {
      path: '/test/deal-comments',
      element: (
        <RouteLoader>
          <TestDealComments />
        </RouteLoader>
      ),
      protected: true,
      title: 'Test Deal Comments'
    },

    {
      path: '/test/standard-designs',
      element: (
        <RouteLoader>
          <StandardDesignsPage />
        </RouteLoader>
      ),
      protected: true,
      title: 'Standard Designs'
    },
    {
      path: '/test/search-performance',
      element: (
        <RouteLoader>
          <TestSearchPerformance />
        </RouteLoader>
      ),
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

    const path = route.path || '';

    if (route.protected) {
      const requireOnboarding = !['/', '/onboarding', '/auth/login', '/auth/signup'].includes(path)
      element = (
        <ProtectedRoute
          requireAuth={true}
          requireOnboarding={requireOnboarding}
          debugMode={isDevelopment}
        >
          {route.element}
        </ProtectedRoute>
      )
    } else if (path.startsWith('/auth/') || path === '/') {
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
