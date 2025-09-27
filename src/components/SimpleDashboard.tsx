import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  Bell, 
  MapPin, 
  Users,
  User,
  Heart,
  Star,
  TrendingUp,
  MessageCircle,
  Sparkles,
  Gift,
  Building2,
  Plus,
  Coffee
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
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

const SimpleDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [selectedCity] = useState(profile?.city || 'Select City');
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock data
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
    },
    {
      id: '3',
      name: 'The Gourmet Kitchen',
      category: 'Restaurant',
      location: 'Hitech City',
      rating: 4.9,
      reviewCount: 156,
      imageUrl: '/placeholder-restaurant.jpg',
      isPromoted: true
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
    },
    {
      id: '3',
      title: 'Flat ₹200 off on Orders',
      businessName: 'Spice Garden',
      discount: '₹200',
      expiresIn: '3 days',
      imageUrl: '/placeholder-spice.jpg'
    }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-slate-600">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <motion.header 
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <motion.div 
                className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mr-3"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SynC</h1>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span>{selectedCity}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <motion.button
                onClick={() => setShowNotifications(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full relative transition-all"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </motion.button>

              <motion.button
                onClick={() => navigate('/profile')}
                className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <User className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Welcome Section */}
        <motion.section 
          className="py-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="text-center mb-8">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent mb-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Welcome back, {profile?.full_name || user?.email?.split('@')[0]}! 
              <motion.span
                className="inline-block ml-2"
                animate={{ rotate: [0, 20, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                👋
              </motion.span>
            </motion.h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Discover amazing deals, connect with local businesses, and manage your empire</p>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2 border border-white/50">
              <button
                onClick={() => navigate('/search')}
                className="w-full p-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors group bg-white/50 rounded-xl hover:bg-white/80"
              >
                <Search className="w-6 h-6 mr-4 group-hover:scale-110 transition-transform text-purple-500" />
                <span className="text-lg">Search businesses, products, or deals...</span>
              </button>
            </div>
          </motion.div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section 
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Actions</h2>
            <p className="text-gray-600">Everything you need at your fingertips</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Your Activity */}
            <div className="col-span-2 bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Your Activity</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-gray-700">Favorites</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageCircle className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm text-gray-700">Reviews</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Gift className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-700">Offers Used</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">8</span>
                </div>
              </div>
            </div>

            {/* Manage Businesses */}
            <motion.button
              onClick={() => navigate('/business/dashboard')}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl p-6 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Building2 className="w-8 h-8 mb-2" />
              <h3 className="font-semibold mb-1">Manage Businesses</h3>
              <p className="text-blue-100 text-sm">Your business dashboard</p>
            </motion.button>

            {/* Quick Search */}
            <motion.button
              onClick={() => navigate('/search')}
              className="bg-green-500 hover:bg-green-600 text-white rounded-2xl p-6 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Search className="w-8 h-8 mb-2" />
              <h3 className="font-semibold mb-1">Quick Search</h3>
              <p className="text-green-100 text-sm">Find businesses & deals</p>
            </motion.button>

            {/* Register Business */}
            <motion.button
              onClick={() => navigate('/business/register')}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-6 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-8 h-8 mb-2" />
              <h3 className="font-semibold mb-1">Register Business</h3>
              <p className="text-orange-100 text-sm">Start your journey</p>
            </motion.button>
          </div>
        </motion.section>

        {/* Spotlight Businesses */}
        <motion.section 
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
              <Sparkles className="w-6 h-6 mr-3 text-yellow-500" />
              Businesses in Spotlight
            </h2>
            <p className="text-gray-600">Highly recommended businesses in your area</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spotlightBusinesses.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/business/${business.id}`)}
                className="bg-white rounded-2xl p-6 cursor-pointer border border-gray-200 hover:shadow-lg transition-all duration-300 shadow-sm"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                    <Coffee className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{business.name}</h3>
                    <p className="text-gray-600 text-sm">{business.category} • {business.location}</p>
                  </div>
                  {business.isPromoted && (
                    <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 fill-current mr-1" />
                    <span className="text-gray-900 font-semibold">{business.rating}</span>
                    <span className="text-gray-600 ml-1">({business.reviewCount} reviews)</span>
                  </div>
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="text-gray-400"
                  >
                    →
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Hot Offers */}
        <motion.section 
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
              <Gift className="w-6 h-6 mr-3 text-red-500" />
              Hot Offers
            </h2>
            <p className="text-gray-600">Limited time deals you can't afford to miss</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotOffers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/offer/${offer.id}`)}
                className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 cursor-pointer border border-red-200 hover:shadow-lg transition-all duration-300 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-red-500 px-4 py-2 rounded-xl">
                    <div className="text-2xl font-bold text-white">{offer.discount}</div>
                    <div className="text-sm text-red-100">OFF</div>
                  </div>
                  <div className="text-right">
                    <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                      {offer.expiresIn} left
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{offer.title}</h3>
                  <p className="text-gray-600">{offer.businessName}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Notifications */}
      <NotificationHub 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <BottomNavigation currentRoute="/dashboard" />
    </div>
  );
};

export default SimpleDashboard;