// src/pages/Landing.tsx
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user, initialized, profile } = useAuthStore();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (initialized && user) {
      // Check if onboarding is complete
      const hasCompletedOnboarding = profile && profile.city && profile.interests?.length > 0;
      const redirectPath = hasCompletedOnboarding ? '/dashboard' : '/onboarding';
      navigate(redirectPath, { replace: true });
    }
  }, [user, initialized, profile, navigate]);

  // Show loading while checking authentication
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    );
  }

  // Don't render landing page if user is logged in (prevent flash)
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Redirecting...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <img 
              src="/Logo/Sync Logo Text Transparent SVG.svg" 
              alt="Sync" 
              className="h-8"
            />
          </div>
          <div className="flex space-x-4">
            <Link 
              to="/auth/login" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
            >
              Login
            </Link>
            <Link 
              to="/auth/signup" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12 lg:py-20">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Discover Local Businesses
            <span className="text-indigo-600 block">Share Amazing Deals</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect with hyperlocal businesses through social, coupon-driven experiences. 
            Turn real visits into measurable growth.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              to="/browse" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Search className="w-5 h-5 mr-2" />
              Browse Businesses
            </Link>
            <Link 
              to="/auth/signup" 
              className="inline-flex items-center px-6 py-3 border-2 border-indigo-600 text-base font-medium rounded-lg text-indigo-600 hover:bg-indigo-50"
            >
              <Users className="w-5 h-5 mr-2" />
              Join Community
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Local Discovery</h3>
              <p className="text-gray-600">Find businesses in your neighborhood with personalized recommendations</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Exclusive Deals</h3>
              <p className="text-gray-600">Collect and share coupons with friends for amazing savings</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Social Sharing</h3>
              <p className="text-gray-600">Share experiences with friends and become a local influencer</p>
            </div>
          </div>
        </div>

        {/* Public Business Preview */}
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Businesses</h2>
            <p className="text-gray-600">Discover what's trending in your area</p>
          </div>
          
          {/* Business Cards Grid - Placeholder for now */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Business Name {i}</h3>
                  <p className="text-gray-600 text-sm mb-2">Category • Location</p>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.5 (123 reviews)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Link 
              to="/browse" 
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all businesses →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p>&copy; 2025 SynC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;