// src/pages/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBusinessUrl } from '../hooks/useBusinessUrl';
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
// BottomNavigation is now handled by AppLayout
import NotificationHub from './NotificationHub';
import AdCarousel from './ads/AdCarousel';
import { FriendLikedDealsSection } from './deals/FriendLikedDealsSection';
import { NewBusinesses } from './business';
import { dashboardService, DashboardStats, SpotlightBusiness, HotOffer, TrendingProduct } from '../services/dashboardService';

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

// Dummy data as fallback - defined outside component for immediate initialization
const dummySpotlightBusinesses: SpotlightBusiness[] = [
  {
    id: 'dummy-1',
    name: '[Demo] Urban Coffee Roasters',
    category: 'Cafe',
    location: 'Banjara Hills',
    rating: 4.8,
    reviewCount: 124,
    imageUrl: null,
    isPromoted: true,
    city: 'Hyderabad'
  },
  {
    id: 'dummy-2',
    name: '[Demo] Artisan Bakery',
    category: 'Bakery',
    location: 'Jubilee Hills',
    rating: 4.6,
    reviewCount: 89,
    imageUrl: null,
    isPromoted: false,
    city: 'Hyderabad'
  }
];

const dummyHotOffers: HotOffer[] = [
  {
    id: 'dummy-offer-1',
    title: '[Demo] 50% off on Weekend Brunch',
    businessName: 'Breakfast Club',
    discount: '50%',
    expiresIn: '2 days',
    imageUrl: null,
    validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    discountValue: 50,
    businessId: 'dummy-business-1'
  },
  {
    id: 'dummy-offer-2',
    title: '[Demo] Buy 2 Get 1 Free Pizza',
    businessName: 'Pizza Corner',
    discount: 'BOGO',
    expiresIn: '5 days',
    imageUrl: null,
    validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    discountValue: 0,
    businessId: 'dummy-business-2'
  }
];

const dummyTrendingProducts: TrendingProduct[] = [
  { id: 'dummy-prod-1', name: '[Demo] Artisan Coffee Beans', business: 'Urban Coffee', price: '₹450', category: 'Food', isTrending: true },
  { id: 'dummy-prod-2', name: '[Demo] Chocolate Croissant', business: 'French Bakery', price: '₹120', category: 'Food', isTrending: true },
  { id: 'dummy-prod-3', name: '[Demo] Handmade Soap', business: 'Natural Care', price: '₹85', category: 'Beauty', isTrending: true }
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { user, profile } = useAuthStore();
  const [selectedCity] = useState(profile?.city || 'Select City');
  const [showNotifications, setShowNotifications] = useState(false);
  // Use React Query for automatic caching and background updates
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [statsData, businessesData, offersData, productsData] = await Promise.all([
        dashboardService.getDashboardStats(user.id),
        dashboardService.getSpotlightBusinesses(3),
        dashboardService.getHotOffers(2),
        dashboardService.getTrendingProducts(3),
      ]);

      return { statsData, businessesData, offersData, productsData };
    },
    enabled: !!user, // Only run query if user is logged in
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  });

  // Use cached data or fallback to dummy data
  const spotlightBusinesses = dashboardData?.businessesData?.length > 0
    ? dashboardData.businessesData
    : dummySpotlightBusinesses;

  const hotOffers = dashboardData?.offersData?.length > 0
    ? dashboardData.offersData
    : dummyHotOffers;

  const trendingProducts = dashboardData?.productsData?.length > 0
    ? dashboardData.productsData
    : dummyTrendingProducts;

  const stats = dashboardData?.statsData || {
    favoritesCount: 0,
    reviewsCount: 0,
    collectedCouponsCount: 0,
    followingCount: 0,
  };

  // Don't show loading screen - splash screen handles initial load
  // Dashboard will show with loading states for individual sections

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-4 pb-2">
          {/* Ad Carousel Section */}
          <section className="mb-4">
            <AdCarousel />
          </section>

          {/* Friend Liked Deals Section */}
          <section className="mb-4">
            <FriendLikedDealsSection />
          </section>

          {/* Dashboard Grid - Full Width */}
          <section className="mb-4">


            {/* Special Offer Banner */}
            <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl md:rounded-2xl p-3 md:p-6 text-white shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base md:text-lg truncate">Weekend Deal! 🔥</h3>
                  <p className="text-xs opacity-90 truncate">Up to 60% off at restaurants</p>
                </div>
                <button
                  onClick={() => navigate('/search')}
                  className="bg-white text-orange-500 px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl font-medium hover:bg-orange-50 transition-colors text-xs md:text-base whitespace-nowrap flex-shrink-0"
                >
                  Explore
                </button>
              </div>
            </div>
          </section>

          {/* Businesses in Spotlight */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Spotlight Businesses</h2>
              </div>
              <button
                onClick={() => navigate('/search')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
              >
                View All
              </button>
            </div>

            {/* Mobile: 2-column compact grid, Desktop: 3-column cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {spotlightBusinesses.length === 0 ? (
                <div className="col-span-2 md:col-span-3 text-center py-8 text-gray-500">
                  <p className="text-lg font-medium">No businesses to spotlight yet</p>
                  <p className="text-sm">Businesses will appear here as they join!</p>
                </div>
              ) : spotlightBusinesses.map((business, index) => (
                <div
                  key={business.id}
                  onClick={() => navigate(getBusinessUrl(business.id, business.name))}
                  className="bg-white rounded-xl md:rounded-2xl shadow-sm md:shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 relative"
                >
                  {/* Desktop only: Show cover image */}
                  <div className="hidden md:flex h-32 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 items-center justify-center relative">
                    {business.isPromoted && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          ✨ Featured
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-2xl mb-2">{index === 0 ? '🏢' : '🏪'}</div>
                      <p className="text-sm text-gray-600 font-medium">{business.category}</p>
                    </div>
                  </div>

                  {/* Mobile and Desktop: Content section */}
                  <div className="p-3 md:p-4">
                    <div className="flex md:block items-start gap-2 md:gap-0">
                      {/* Mobile only: Icon */}
                      <div className="md:hidden flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center text-xl relative">
                        {business.isPromoted && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                        )}
                        {index === 0 ? '🏢' : '🏪'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{business.name}</h3>
                        <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 truncate">{business.location}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-current mr-1" />
                            <span className="text-xs md:text-sm font-medium">{business.rating}</span>
                          </div>
                          <span className="text-xs md:text-sm text-gray-500">({business.reviewCount})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Hot Offers */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Hot Offers 🔥</h2>
              </div>
              <button
                onClick={() => navigate('/wallet')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
              >
                My Wallet
              </button>
            </div>

            {/* Mobile: 2-column compact grid, Desktop: 2-column horizontal cards */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
              {hotOffers.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <p className="text-lg font-medium">No active offers at the moment</p>
                  <p className="text-sm">Check back soon for exciting deals!</p>
                </div>
              ) : hotOffers.map((offer, index) => (
                <div
                  key={offer.id}
                  onClick={() => navigate(`/offer/${offer.id}`)}
                  className="bg-white rounded-xl md:rounded-2xl shadow-sm md:shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  {/* Mobile: Vertical compact layout */}
                  <div className="md:hidden p-3 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white rounded-lg mb-2">
                      <div className="text-center">
                        <div className="text-sm font-bold">{offer.discount}</div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-xs mb-1 truncate w-full">{offer.title}</h3>
                    <p className="text-xs text-gray-600 mb-2 truncate w-full">{offer.businessName}</p>
                    <span className="inline-block bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">
                      {offer.expiresIn}
                    </span>
                  </div>

                  {/* Desktop: Horizontal layout */}
                  <div className="hidden md:flex items-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white m-4 rounded-xl flex-shrink-0">
                      <div className="text-center">
                        <div className="text-base font-semibold">{offer.discount}</div>
                        <div className="text-xs opacity-90">OFF</div>
                      </div>
                    </div>
                    <div className="flex-1 p-4 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{offer.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 truncate">{offer.businessName}</p>
                      <span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                        {offer.expiresIn} left
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* New Businesses Section */}
          <NewBusinesses
            limit={3}
            daysThreshold={30}
            showLoadMore={false}
          />

          {/* Trending Products */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Trending Now 📈</h2>
              </div>
            </div>

            {/* Mobile: 2-column compact grid, Desktop: 3-column horizontal cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-2">
              {trendingProducts.length === 0 ? (
                <div className="col-span-2 md:col-span-3 text-center py-8 text-gray-500">
                  <p className="text-lg font-medium">No trending products yet</p>
                  <p className="text-sm">Products will appear here as they gain popularity!</p>
                </div>
              ) : trendingProducts.map((product, index) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm md:shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  {/* Mobile: Vertical compact layout */}
                  <div className="md:hidden flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                    </div>
                    <div className="w-full min-w-0">
                      <h3 className="font-semibold text-gray-900 text-xs truncate">{product.name}</h3>
                      <p className="text-xs text-gray-600 truncate">{product.business}</p>
                      <p className="font-bold text-gray-900 text-sm mt-1">{product.price.replace('Γé╣', '₹')}</p>
                    </div>
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Desktop: Horizontal layout */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                        <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                        <p className="text-sm text-gray-600 truncate">{product.business}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        #{index + 1}
                      </span>
                      <p className="font-semibold text-gray-900 text-sm">{product.price.replace('Γé╣', '₹')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Contacts Sidebar - REMOVED */}

      {/* Notification Hub */}
      <NotificationHub
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Bottom Navigation is now handled by AppLayout */}
    </div>
  );
};

export default Dashboard;
