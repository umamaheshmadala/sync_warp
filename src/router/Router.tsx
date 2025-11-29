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
  // ... (existing routes)

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

    return (
      <Route
        key={route.path || 'index'}
        path={route.index ? undefined : route.path}
        index={route.index}
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
