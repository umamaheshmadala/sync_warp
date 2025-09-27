// src/pages/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
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

      {/* Main Content */}
      <main className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white rounded-3xl p-8 mb-8 relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <h1 className="text-xl font-bold mb-2">
              Welcome back, {profile?.full_name || user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-indigo-100 text-base opacity-90">Discover amazing deals and connect with local businesses</p>
          </div>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white bg-opacity-10 rounded-full"></div>
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white bg-opacity-5 rounded-full"></div>
        </section>

        {/* Dashboard Grid - Full Width */}
        <section className="mb-8">
          {/* Stats and Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Heart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                    <p className="text-sm text-gray-600">Favorites</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">5</p>
                    <p className="text-sm text-gray-600">Reviews</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => navigate('/business/register')}
              className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-2xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mb-3 mx-auto" />
                <p className="font-semibold text-base">Register</p>
                <p className="text-sm opacity-90">Business</p>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/business/dashboard')}
              className="bg-white border-2 border-indigo-200 text-indigo-600 p-6 rounded-2xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <div className="text-center">
                <Users className="w-8 h-8 mb-3 mx-auto" />
                <p className="font-semibold text-base">Manage</p>
                <p className="text-sm opacity-70">Business</p>
              </div>
            </button>
          </div>

          {/* Special Offer Banner */}
          <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl p-6 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl">Weekend Deal! 🔥</h3>
                <p className="text-base opacity-90">Up to 60% off at premium restaurants</p>
              </div>
              <button 
                onClick={() => navigate('/search')}
                className="bg-white text-orange-500 px-6 py-3 rounded-xl font-medium hover:bg-orange-50 transition-colors text-base"
              >
                Explore Deals
              </button>
            </div>
          </div>
        </section>

        {/* Businesses in Spotlight */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Spotlight Businesses</h2>
              <p className="text-base text-gray-600">Top picks in your area</p>
            </div>
            <button 
              onClick={() => navigate('/search')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
            >
              View All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {spotlightBusinesses.map((business, index) => (
              <div
                key={business.id}
                onClick={() => navigate(`/business/${business.id}`)}
                className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 relative"
              >
                {business.isPromoted && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                      ✨ Featured
                    </span>
                  </div>
                )}
                
                <div className="h-32 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">{index === 0 ? '☕' : '🍰'}</div>
                    <p className="text-sm text-gray-600 font-medium">{business.category}</p>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-base mb-2 truncate">{business.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 truncate">{business.location}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                      <span className="text-sm font-medium">{business.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">({business.reviewCount})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hot Offers */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Hot Offers 🔥</h2>
              <p className="text-base text-gray-600">Limited time deals you can't miss</p>
            </div>
            <button 
              onClick={() => navigate('/wallet')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
            >
              My Wallet
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {hotOffers.map((offer, index) => (
              <div
                key={offer.id}
                onClick={() => navigate(`/offer/${offer.id}`)}
                className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white m-4 rounded-xl">
                    <div className="text-center">
                      <div className="text-lg font-bold">{offer.discount}</div>
                      <div className="text-xs opacity-90">OFF</div>
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <h3 className="font-semibold text-gray-900 text-base mb-2 truncate">{offer.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 truncate">{offer.businessName}</p>
                        <span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                          {offer.expiresIn} left
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Products */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Trending Now 📈</h2>
              <p className="text-base text-gray-600">What's popular this week</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingProducts.map((product, index) => (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg">{index === 0 ? '🎆' : index === 1 ? '🍰' : '🧼'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base truncate">{product.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{product.business}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      #{index + 1}
                    </span>
                    <p className="font-bold text-gray-900 text-base">{product.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        </div>
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