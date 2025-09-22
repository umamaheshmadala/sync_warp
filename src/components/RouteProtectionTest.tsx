// src/components/RouteProtectionTest.tsx
// Comprehensive testing component for route protection system

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRequireAuth } from '../router/ProtectedRoute';
import { Shield, User, Settings, Lock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const RouteProtectionTest: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading, initialized } = useAuthStore();
  const { authenticated, hasCompletedOnboarding } = useRequireAuth(true);
  const [testResults, setTestResults] = useState<{ [key: string]: 'pass' | 'fail' | 'pending' }>({});

  const testRoutes = [
    { path: '/', name: 'Landing Page', requiresAuth: false, requiresOnboarding: false },
    { path: '/auth/login', name: 'Login Page', requiresAuth: false, requiresOnboarding: false },
    { path: '/auth/signup', name: 'Signup Page', requiresAuth: false, requiresOnboarding: false },
    { path: '/auth/forgot-password', name: 'Forgot Password', requiresAuth: false, requiresOnboarding: false },
    { path: '/dashboard', name: 'Dashboard', requiresAuth: true, requiresOnboarding: true },
    { path: '/onboarding', name: 'Onboarding', requiresAuth: true, requiresOnboarding: false },
    { path: '/profile', name: 'Profile', requiresAuth: true, requiresOnboarding: true },
    { path: '/social', name: 'Social', requiresAuth: true, requiresOnboarding: true },
    { path: '/settings', name: 'Settings', requiresAuth: true, requiresOnboarding: true },
    { path: '/wallet', name: 'Wallet', requiresAuth: true, requiresOnboarding: true },
  ];

  const runAutomaticTests = () => {
    setTestResults({});
    
    testRoutes.forEach((route, index) => {
      setTimeout(() => {
        // Simulate navigation test
        const shouldHaveAccess = route.requiresAuth ? authenticated : true;
        const shouldCompleteOnboarding = route.requiresOnboarding ? hasCompletedOnboarding : true;
        
        const canAccess = shouldHaveAccess && shouldCompleteOnboarding;
        
        setTestResults(prev => ({
          ...prev,
          [route.path]: canAccess ? 'pass' : 'fail'
        }));
      }, index * 200);
    });
  };

  const testNavigation = (path: string) => {
    try {
      navigate(path);
      setTestResults(prev => ({
        ...prev,
        [path]: 'pass'
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [path]: 'fail'
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-6">
            <Shield className="w-8 h-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Route Protection Test Suite</h1>
          </div>

          {/* Current State */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center">
                <User className="w-5 h-5 text-indigo-600 mr-2" />
                <span className="font-medium text-indigo-900">Authentication</span>
              </div>
              <p className="mt-1 text-sm">
                Status: {authenticated ? (
                  <span className="text-green-600 font-medium">✅ Authenticated</span>
                ) : (
                  <span className="text-red-600 font-medium">❌ Not Authenticated</span>
                )}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Initialized: {initialized ? '✅' : '❌'} | Loading: {loading ? '⏳' : '✅'}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-purple-600 mr-2" />
                <span className="font-medium text-purple-900">Profile Status</span>
              </div>
              <p className="mt-1 text-sm">
                Onboarding: {hasCompletedOnboarding ? (
                  <span className="text-green-600 font-medium">✅ Complete</span>
                ) : (
                  <span className="text-orange-600 font-medium">⚠️ Incomplete</span>
                )}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Profile: {profile ? '✅ Loaded' : '❌ Missing'}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Lock className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Protection Level</span>
              </div>
              <p className="mt-1 text-sm">
                {authenticated ? (
                  hasCompletedOnboarding ? (
                    <span className="text-green-600 font-medium">🔓 Full Access</span>
                  ) : (
                    <span className="text-yellow-600 font-medium">🔒 Onboarding Required</span>
                  )
                ) : (
                  <span className="text-red-600 font-medium">🔐 Login Required</span>
                )}
              </p>
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={runAutomaticTests}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Run All Tests
            </button>
            
            {authenticated && (
              <button
                onClick={signOut}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sign Out (Test Unauth)
              </button>
            )}
          </div>

          {/* Route Tests */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Access Tests</h2>
            
            <div className="grid gap-3">
              {testRoutes.map((route) => (
                <div key={route.path} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">{route.name}</span>
                        <code className="ml-2 px-2 py-1 bg-gray-100 text-sm rounded text-gray-700">
                          {route.path}
                        </code>
                      </div>
                      
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span className={`mr-3 ${route.requiresAuth ? 'text-orange-600' : 'text-green-600'}`}>
                          {route.requiresAuth ? '🔐 Auth Required' : '🌍 Public'}
                        </span>
                        
                        {route.requiresOnboarding && (
                          <span className="text-purple-600">⚙️ Onboarding Required</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Test Result */}
                      <div className="w-6 h-6 flex items-center justify-center">
                        {testResults[route.path] === 'pass' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {testResults[route.path] === 'fail' && (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        {testResults[route.path] === 'pending' && (
                          <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
                        )}
                      </div>

                      {/* Manual Test Button */}
                      <Link
                        to={route.path}
                        onClick={() => testNavigation(route.path)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Test
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Scenarios */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Expected Behavior:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ <strong>Public routes</strong> (/, /auth/*) should be accessible without authentication</li>
              <li>✅ <strong>Auth pages</strong> should redirect to dashboard if user is already logged in</li>
              <li>✅ <strong>Protected routes</strong> should redirect to login if not authenticated</li>
              <li>✅ <strong>Onboarding-required routes</strong> should redirect to onboarding if profile incomplete</li>
              <li>✅ <strong>Session persistence</strong> should work across page refreshes</li>
              <li>✅ <strong>Loading states</strong> should be shown during authentication checks</li>
            </ul>
          </div>

          {/* Debug Information */}
          {import.meta.env.MODE === 'development' && (
            <details className="mt-6">
              <summary className="cursor-pointer font-medium text-gray-900 mb-2">
                Debug Information
              </summary>
              <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto">
                {JSON.stringify({
                  user: user ? { id: user.id, email: user.email } : null,
                  profile: profile ? { 
                    city: profile.city, 
                    interests: profile.interests?.length,
                    hasCompletedOnboarding 
                  } : null,
                  state: { authenticated, initialized, loading },
                  testResults
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteProtectionTest;