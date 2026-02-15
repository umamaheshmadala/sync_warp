// src/pages/Dashboard/Dashboard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useBusinessUrl } from '../hooks/useBusinessUrl';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import {
  Star,
  TrendingUp,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
// BottomNavigation is now handled by AppLayout
import NotificationHub from './NotificationHub';
import AdCarousel from './ads/AdCarousel';
import { FriendLikedDealsSection } from './deals/FriendLikedDealsSection';
import { NewBusinesses } from './business';
import { SpotlightBusiness, HotOffer, TrendingProduct } from '../services/dashboardService';
import { OfferCard } from './offers/OfferCard';
import { StandardBusinessCard, type StandardBusinessCardData, BusinessActionMenu } from './common';

// Remove unused imports if they are not used elsewhere in the file
// import { StorefrontShareButton } from './Sharing/StorefrontShareButton';
// import { FollowButton } from './following/FollowButton';

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

            </div>

            {/* Mobile & Desktop: Single column list */}
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {spotlightBusinesses.length === 0 ? (
                <div className="col-span-1 text-center py-8 text-gray-500">
                  <p className="text-lg font-medium">No businesses to spotlight yet</p>
                  <p className="text-sm">Businesses will appear here as they join!</p>
                </div>
              ) : spotlightBusinesses.map((business, index) => {
                // Map SpotlightBusiness to StandardBusinessCardData
                const businessData: StandardBusinessCardData = {
                  id: business.id,
                  business_name: business.name,
                  business_type: business.category,
                  city: business.city,
                  rating: business.rating,
                  review_count: business.reviewCount,
                  logo_url: business.imageUrl || undefined,
                  // Spotlight data doesn't have all fields, but StandardBusinessCard handles optional props
                };

                return (
                  <StandardBusinessCard
                    key={business.id}
                    business={businessData}
                    onCardClick={(id) => navigate(getBusinessUrl(id, business.name))}
                    variant="search"
                    showChevron={false}
                    actionButton={
                      <BusinessActionMenu
                        businessId={business.id}
                        businessName={business.name}
                        businessImageUrl={business.imageUrl || undefined}
                        className="-mr-2"
                      />
                    }
                  />
                )
              })}
            </div>
          </section>

          {/* Hot Offers */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Hot Offers 🔥</h2>
              </div>

            </div>
            <p className="text-xs text-gray-500 mb-3 -mt-3 italic">
              Hot offers are the most viewed offers by the user as of now.
            </p>

            {/* Mobile: 1-column list, Tablet: 2-column, Desktop: 2-column (since we want them bigger/ticket style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hotOffers.length === 0 ? (
                <div className="col-span-1 md:col-span-2 text-center py-8 text-gray-500">
                  <p className="text-lg font-medium">No active offers at the moment</p>
                  <p className="text-sm">Check back soon for exciting deals!</p>
                </div>
              ) : hotOffers.map((offer: any) => (
                <div key={offer.id} className="w-full">
                  <OfferCard
                    offer={offer}
                    onViewDetails={(o) => navigate(`${getBusinessUrl(o.business?.id || o.business_id, o.business?.business_name || 'business')}/offers?offer=${o.id}`)}
                    showActions={false}
                  />
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
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 md:gap-2 mb-2">
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
                    navigate(`${businessUrl}?tab=products&productId=${product.id}`);
                  }}
                  className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm md:shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer flex flex-col h-full group"
                >
                  {/* Image Section - Full Card */}
                  <div className="aspect-[9/16] relative bg-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={getOptimizedImageUrl(product.imageUrl, 400)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        decoding="async"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-300">
                        <span className="text-4xl">🛍️</span>
                      </div>
                    )}
                    {/* Trending Icon - Top Left (just arrow, no circle) */}
                    <div className="absolute top-2 left-2">
                      <TrendingUp className="w-5 h-5 text-purple-600 drop-shadow-md" />
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
