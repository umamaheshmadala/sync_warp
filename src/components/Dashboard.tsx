// src/pages/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  MapPin, 
  ChevronDown,
  Users,
  User,
  Heart,
  Star,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import ContactsSidebar from './ContactsSidebarWithTabs';
import BottomNavigation from './BottomNavigation';
import NotificationHub from './NotificationHub';

interface BusinessCard {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isPromoted?: boolean;
}

interface OfferCard {
  id: string;
  title: string;
  businessName: string;
  discount: string;
  expiresIn: string;
  imageUrl: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [selectedCity] = useState(profile?.city || 'Select City');
  const [showContactsSidebar, setShowContactsSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock data - Replace with real API calls
  const [spotlightBusinesses] = useState<BusinessCard[]>([
    {
      id: '1',
      name: 'Urban Coffee Roasters',
      category: 'Cafe',
      location: 'Banjara Hills',
      rating: 4.8,
      reviewCount: 124,
      imageUrl: '/placeholder-cafe.jpg',
      isPromoted: true
    },
    {
      id: '2',
      name: 'Artisan Bakery',
      category: 'Bakery',
      location: 'Jubilee Hills',
      rating: 4.6,
      reviewCount: 89,
      imageUrl: '/placeholder-bakery.jpg'
    }
  ]);

  const [hotOffers] = useState<OfferCard[]>([
    {
      id: '1',
      title: '50% off on Weekend Brunch',
      businessName: 'Breakfast Club',
      discount: '50%',
      expiresIn: '2 days',
      imageUrl: '/placeholder-offer.jpg'
    },
    {
      id: '2',
      title: 'Buy 2 Get 1 Free Pizza',
      businessName: 'Pizza Corner',
      discount: 'BOGO',
      expiresIn: '5 days',
      imageUrl: '/placeholder-pizza.jpg'
    }
  ]);

  const [trendingProducts] = useState([
    { id: '1', name: 'Artisan Coffee Beans', business: 'Urban Coffee', price: '₹450' },
    { id: '2', name: 'Chocolate Croissant', business: 'French Bakery', price: '₹120' },
    { id: '3', name: 'Handmade Soap', business: 'Natural Care', price: '₹85' }
  ]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top App Bar */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and City Selector */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <button
                onClick={() => {/* Open city selector */}}
                className="flex items-center text-gray-700 hover:text-gray-900"
              >
                <MapPin className="w-4 h-4 mr-1" />
                <span className="font-medium text-sm">{selectedCity}</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3">
              {/* Contacts Sidebar Toggle */}
              <button
                onClick={() => setShowContactsSidebar(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
              >
                <Users className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile */}
              <button
                onClick={() => navigate('/profile')}
                className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center"
              >
                <User className="w-4 h-4 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20"> {/* Extra padding for bottom nav */}
        {/* Welcome Banner */}
        <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-6">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {profile?.full_name || user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-indigo-100">Discover amazing deals and connect with local businesses</p>
        </section>

        {/* Search Bar */}
        <section className="px-4 -mt-6 mb-6">
          <button
            onClick={() => navigate('/search')}
            className="w-full bg-white rounded-lg shadow-md p-4 flex items-center text-gray-500 hover:shadow-lg transition-shadow"
          >
            <Search className="w-5 h-5 mr-3" />
            <span>Search businesses, products, or offers...</span>
          </button>
        </section>

        {/* Ads Carousel */}
        <section className="px-4 mb-6">
          <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Special Weekend Offer!</h3>
            <p className="text-orange-100 mb-3">Get up to 60% off at premium restaurants</p>
            <button className="bg-white text-orange-500 px-4 py-2 rounded-lg font-medium hover:bg-orange-50">
              Explore Deals
            </button>
          </div>
        </section>

        {/* Businesses in Spotlight */}
        <section className="mb-6">
          <div className="px-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Businesses in Spotlight</h2>
            <p className="text-gray-600 text-sm">Highly recommended in your area</p>
          </div>
          <div className="px-4 overflow-x-auto">
            <div className="flex space-x-4">
              {spotlightBusinesses.map((business) => (
                <div
                  key={business.id}
                  onClick={() => navigate(`/business/${business.id}`)}
                  className="flex-shrink-0 w-64 bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="h-40 bg-gray-200 relative">
                    {business.isPromoted && (
                      <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-medium">
                        Promoted
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{business.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{business.category} • {business.location}</p>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                      <span className="text-sm font-medium">{business.rating}</span>
                      <span className="text-sm text-gray-500 ml-1">({business.reviewCount})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hot Offers */}
        <section className="mb-6">
          <div className="px-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Hot Offers</h2>
            <p className="text-gray-600 text-sm">Limited time deals you can't miss</p>
          </div>
          <div className="px-4 overflow-x-auto">
            <div className="flex space-x-4">
              {hotOffers.map((offer) => (
                <div
                  key={offer.id}
                  onClick={() => navigate(`/offer/${offer.id}`)}
                  className="flex-shrink-0 w-72 bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="h-32 bg-gradient-to-r from-red-400 to-pink-500 relative flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-3xl font-bold">{offer.discount}</div>
                      <div className="text-sm">OFF</div>
                    </div>
                    <span className="absolute top-2 right-2 bg-white text-red-500 px-2 py-1 rounded text-xs font-medium">
                      {offer.expiresIn} left
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{offer.title}</h3>
                    <p className="text-sm text-gray-600">{offer.businessName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trending Products */}
        <section className="mb-6">
          <div className="px-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Trending Products</h2>
            <p className="text-gray-600 text-sm">What's popular this week</p>
          </div>
          <div className="px-4">
            <div className="space-y-3">
              {trendingProducts.map((product, index) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg mr-3 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.business}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-indigo-600">{product.price}</p>
                      <p className="text-xs text-gray-500">#{index + 1} trending</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* User Activity Card */}
        <section className="px-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Your Activity This Week</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Heart className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-600">Favorites</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-sm text-gray-600">Reviews</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Contacts Sidebar */}
      <ContactsSidebar 
        isOpen={showContactsSidebar}
        onClose={() => setShowContactsSidebar(false)}
      />

      {/* Notification Hub */}
      <NotificationHub 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Bottom Navigation */}
      <BottomNavigation currentRoute="/dashboard" />
    </div>
  );
};

export default Dashboard;