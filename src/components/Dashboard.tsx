// src/pages/Dashboard/Dashboard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useBusinessUrl } from '../hooks/useBusinessUrl';
import {
  Star,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
// BottomNavigation is now handled by AppLayout
import NotificationHub from './NotificationHub';
import AdCarousel from './ads/AdCarousel';
import { FriendLikedDealsSection } from './deals/FriendLikedDealsSection';
import { NewBusinesses } from './business';
import { SpotlightBusiness, HotOffer, TrendingProduct } from '../services/dashboardService';

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
    businessId: 'ac269130-cfb0-4c36-b5ad-34931cd19b50'
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
    businessId: 'ac269130-cfb0-4c36-b5ad-34931cd19b50'
  }
];

const dummyTrendingProducts: TrendingProduct[] = [
  { id: 'aa200866-0a07-494a-a8a0-e1a4b1e961c8', name: '[Demo] Artisan Coffee Beans', business: 'Urban Coffee', price: '₹450', category: 'Food', isTrending: true, businessId: 'dummy-business-1' },
  { id: 'dummy-prod-2', name: '[Demo] Chocolate Croissant', business: 'French Bakery', price: '₹120', category: 'Food', isTrending: true, businessId: 'dummy-business-2' },
  { id: 'dummy-prod-3', name: '[Demo] Handmade Soap', business: 'Natural Care', price: '₹85', category: 'Beauty', isTrending: true, businessId: 'dummy-business-3' }
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { profile } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);

  // Use extracted hook for dashboard data with granular loading states
  const {
    businessesData,
    offersData,
    productsData,
    // We can use these loading states to show skeletons if needed
    // isLoadingBusinesses,
    // isLoadingOffers,
    // isLoadingProducts
  } = useDashboardData();

  // Use cached data or fallback to dummy data
  const spotlightBusinesses = businessesData && businessesData.length > 0
    ? businessesData
    : dummySpotlightBusinesses;

  const hotOffers = offersData && offersData.length > 0
    ? offersData
    : dummyHotOffers;

  const trendingProducts = productsData && productsData.length > 0
    ? productsData
    : dummyTrendingProducts;

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
                  <p className="text-xs opacity-90 truncate">Coming soon.</p>
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
            <p className="text-xs text-gray-500 mb-3 -mt-3 italic">
              Hot offers are the most viewed offers by the user as of now.
            </p>

            {/* Mobile: 2-column compact grid, Desktop: 3-column cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {hotOffers.length === 0 ? (
                <div className="col-span-2 md:col-span-3 text-center py-8 text-gray-500">
                  <p className="text-lg font-medium">No active offers at the moment</p>
                  <p className="text-sm">Check back soon for exciting deals!</p>
                </div>
              ) : hotOffers.map((offer, index) => (
                <div
                  key={offer.id}
                  onClick={() => navigate(`${getBusinessUrl(offer.businessId, offer.businessName)}/offers?offer=${offer.id}`)}
                  className="bg-white rounded-xl md:rounded-2xl shadow-sm md:shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 flex flex-col h-full"
                >
                  <div className="bg-gradient-to-br from-red-500 to-pink-600 p-4 text-white relative h-32 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-medium border border-white/30">
                        {offer.expiresIn}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                        <span className="text-xs">🔥</span>
                      </div>
                    </div>
                    {offer.imageUrl ? (
                      <img
                        src={offer.imageUrl}
                        alt={offer.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
                        decoding="async"
                      />
                    ) : null}
                    <div className="relative z-10">
                      <div className="font-bold text-2xl tracking-tight">{offer.discount}</div>
                    </div>
                  </div>

                  <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-1 line-clamp-2">{offer.title}</h3>
                      <p className="text-sm text-gray-600 mb-2 truncate">{offer.businessName}</p>
                    </div>
                    <button className="w-full mt-2 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                      View Offer
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty Slots for Hot Offers */}
              {[...Array(Math.max(0, 6 - hotOffers.length))].map((_, i) => (
                <div key={`empty-offer-${i}`} className="bg-gray-50 rounded-xl md:rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center h-full min-h-[160px]">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                    <Star className="w-5 h-5 text-gray-300" />
                  </div>
                  <span className="text-gray-400 text-sm font-medium">Coming Soon</span>
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
            <p className="text-xs text-gray-500 mb-3 -mt-3 italic">
              Trending products serve the most visited, liked, shared, and saved items.
            </p>

            {/* Mobile: 3-column grid, Tablet: 5-column, Desktop: 6-column */}
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4 mb-2">
              {trendingProducts.length === 0 ? (
                <div className="col-span-2 md:col-span-3 text-center py-8 text-gray-500">
                  <p className="text-lg font-medium">No trending products yet</p>
                  <p className="text-sm">Products will appear here as they gain popularity!</p>
                </div>
              ) : trendingProducts.map((product, index) => (
                <div
                  key={product.id}
                  onClick={() => {
                    const businessUrl = getBusinessUrl(product.businessId, product.business);
                    navigate(`${businessUrl}?tab=products`);
                  }}
                  className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm md:shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer flex flex-col h-full group"
                >
                  {/* Image Section */}
                  <div className="aspect-square relative bg-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-300">
                        <span className="text-4xl">🛍️</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                        #{index + 1} Trending
                      </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-3 md:p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base leading-tight mb-1 line-clamp-2" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2 truncate">{product.business}</p>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-bold text-gray-900">{product.price.replace('Γé╣', '₹')}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{product.category}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty Slots for Trending Products */}
              {[...Array(Math.max(0, 6 - trendingProducts.length))].map((_, i) => (
                <div key={`empty-prod-${i}`} className="bg-gray-50 rounded-xl md:rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center h-full min-h-[200px]">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                    <TrendingUp className="w-6 h-6 text-gray-300" />
                  </div>
                  <span className="text-gray-400 text-sm font-medium">Coming Soon</span>
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
