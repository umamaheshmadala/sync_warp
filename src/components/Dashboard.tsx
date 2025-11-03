// src/pages/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ContactsSidebar from './ContactsSidebarWithTabs';
// BottomNavigation is now handled by AppLayout
import NotificationHub from './NotificationHub';
import AdCarousel from './ads/AdCarousel';
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { user, profile } = useAuthStore();
  const [selectedCity] = useState(profile?.city || 'Select City');
  const [showContactsSidebar, setShowContactsSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    favoritesCount: 0,
    reviewsCount: 0,
    collectedCouponsCount: 0,
    followingCount: 0,
  });
  const [spotlightBusinesses, setSpotlightBusinesses] = useState<SpotlightBusiness[]>([]);
  const [hotOffers, setHotOffers] = useState<HotOffer[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);

  // Dummy data as fallback
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

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // Fetch real data from Supabase
        const [statsData, businessesData, offersData, productsData] = await Promise.all([
          dashboardService.getDashboardStats(user.id),
          dashboardService.getSpotlightBusinesses(3),
          dashboardService.getHotOffers(2),
          dashboardService.getTrendingProducts(3),
        ]);

        setStats(statsData);
        
        // Use real data if available, otherwise use dummy data with [Demo] prefix
        setSpotlightBusinesses(businessesData.length > 0 ? businessesData : dummySpotlightBusinesses);
        setHotOffers(offersData.length > 0 ? offersData : dummyHotOffers);
        setTrendingProducts(productsData.length > 0 ? productsData : dummyTrendingProducts);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Use dummy data on error
        setSpotlightBusinesses(dummySpotlightBusinesses);
        setHotOffers(dummyHotOffers);
        setTrendingProducts(dummyTrendingProducts);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

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
        {/* Ad Carousel Section */}
        <section className="mb-8">
          <AdCarousel />
        </section>

        {/* Dashboard Grid - Full Width */}
        <section className="mb-8">
          {/* Stats and Actions Grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-6 mb-4 md:mb-6">
            {/* Quick Actions */}
            <button
              onClick={() => navigate('/business/register')}
              className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-2 md:p-6 rounded-xl md:rounded-2xl shadow-sm md:shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              {/* Mobile: Horizontal single line */}
              <div className="flex md:hidden items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <p className="font-semibold text-sm">Register</p>
              </div>
              {/* Desktop: Vertical layout */}
              <div className="hidden md:block text-center">
                <TrendingUp className="w-8 h-8 mb-3 mx-auto" />
                <p className="font-semibold text-base">Register</p>
                <p className="text-sm opacity-90">Business</p>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/business/dashboard')}
              className="bg-white border-2 border-indigo-200 text-indigo-600 p-2 md:p-6 rounded-xl md:rounded-2xl shadow-sm md:shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              {/* Mobile: Horizontal single line */}
              <div className="flex md:hidden items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                <p className="font-semibold text-sm">Manage</p>
              </div>
              {/* Desktop: Vertical layout */}
              <div className="hidden md:block text-center">
                <Users className="w-8 h-8 mb-3 mx-auto" />
                <p className="font-semibold text-base">Manage</p>
                <p className="text-sm opacity-70">Business</p>
              </div>
            </button>
          </div>
          
          {/* Special Offer Banner */}
          <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl md:rounded-2xl p-3 md:p-6 text-white shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm md:text-xl truncate">Weekend Deal! 🔥</h3>
                <p className="text-xs md:text-base opacity-90 truncate">Up to 60% off at restaurants</p>
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
                    <div className="text-4xl mb-2">{index === 0 ? '☕' : '🍰'}</div>
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
                      {index === 0 ? '☕' : '🍰'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-1 md:mb-2 truncate">{business.name}</h3>
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
                      <div className="text-lg font-bold">{offer.discount}</div>
                      <div className="text-xs opacity-90">OFF</div>
                    </div>
                  </div>
                  <div className="flex-1 p-4 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-base mb-2 truncate">{offer.title}</h3>
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
          limit={12}
          daysThreshold={30}
          showLoadMore={true}
        />

        {/* Trending Products */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Trending Now 📈</h2>
              <p className="text-base text-gray-600">What's popular this week</p>
            </div>
          </div>
          
          {/* Mobile: 2-column compact grid, Desktop: 3-column horizontal cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
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
                    <span className="text-xl">{index === 0 ? '🎆' : index === 1 ? '🍰' : '🧼'}</span>
                  </div>
                  <div className="w-full min-w-0">
                    <h3 className="font-semibold text-gray-900 text-xs truncate">{product.name}</h3>
                    <p className="text-xs text-gray-600 truncate">{product.business}</p>
                    <p className="font-bold text-gray-900 text-sm mt-1">{product.price}</p>
                  </div>
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    #{index + 1}
                  </span>
                </div>
                
                {/* Desktop: Horizontal layout */}
                <div className="hidden md:flex items-center justify-between">
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

      {/* Bottom Navigation is now handled by AppLayout */}
    </div>
  );
};

export default Dashboard;