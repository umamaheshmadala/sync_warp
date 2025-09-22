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

// Lazy load components for better performance
const NotFound = lazy(() => import('../components/NotFound'))
const Profile = lazy(() => import('../components/Profile'))
const Search = lazy(() => import('../components/Search'))
const Settings = lazy(() => import('../components/Settings'))
const Wallet = lazy(() => import('../components/Wallet'))
const Social = lazy(() => import('../components/Social'))

// Debug components (only in development)
const SignUpDebug = lazy(() => import('../components/SignUpDebug'))
const AuthStoreTest = lazy(() => import('../components/AuthStoreTest'))

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
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute requireAuth={true}>
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
                <ProtectedRoute requireAuth={false}>
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
