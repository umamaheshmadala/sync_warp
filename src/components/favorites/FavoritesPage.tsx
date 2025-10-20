// FavoritesPage.tsx
// Main favorites page displaying saved businesses and coupons
// Features tabs, grid/list view, search, and sorting options

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Search as SearchIcon, 
  Grid, 
  List, 
  Trash2,
  Star,
  Package,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import useFavorites, { FavoriteBusiness, FavoriteCoupon } from '../../hooks/useFavorites';
import { FollowButton } from '../following/FollowButton';
import { cn } from '../../lib/utils';
import { UnifiedCouponCard } from '../common/UnifiedCouponCard';
import { StandardBusinessCard, type StandardBusinessCardData } from '../common';

// SaveButton component for backward compatibility
const SaveButton = FollowButton;

type ActiveTab = 'businesses' | 'coupons' | 'wishlist';
type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'name' | 'rating' | 'expiry';

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const favorites = useFavorites();
  
  // Refresh favorites data when page is visited
  React.useEffect(() => {
    favorites.refresh();
  }, [favorites.refresh]);
  
  // Local state
  const [activeTab, setActiveTab] = useState<ActiveTab>('businesses');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showFilters, setShowFilters] = useState(false);

  // Loading and error states
  if (!favorites.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view favorites</h2>
          <p className="text-gray-600 mb-6">Save your favorite businesses and coupons</p>
          <button
            onClick={() => navigate('/auth/login')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Filter and sort functions
  const filteredBusinesses = useMemo(() => {
    let filtered = [...favorites.businesses];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(business => 
        business.business_name.toLowerCase().includes(query) ||
        business.business_type?.toLowerCase().includes(query) ||
        business.address?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.business_name.localeCompare(b.business_name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'date':
        default:
          return new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime();
      }
    });

    return filtered;
  }, [favorites.businesses, searchQuery, sortBy]);

  const filteredCoupons = useMemo(() => {
    let filtered = [...favorites.coupons];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(coupon => 
        coupon.title.toLowerCase().includes(query) ||
        coupon.business_name.toLowerCase().includes(query) ||
        coupon.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'expiry':
          return new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime();
        case 'date':
        default:
          return new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime();
      }
    });

    return filtered;
  }, [favorites.coupons, searchQuery, sortBy]);

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'businesses':
        return { data: filteredBusinesses, count: favorites.counts.businesses };
      case 'coupons':
        return { data: filteredCoupons, count: favorites.counts.coupons };
      case 'wishlist':
        return { data: favorites.wishlist, count: favorites.counts.wishlist };
      default:
        return { data: [], count: 0 };
    }
  };

  const { data: currentData, count: currentCount } = getCurrentData();

  // Handle clear all favorites
  const handleClearAll = async () => {
    if (window.confirm(`Are you sure you want to clear all ${activeTab}?`)) {
      await favorites.clearAllFavorites(activeTab);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Heart className="h-8 w-8 text-red-500 mr-3" />
                My Favorites
              </h1>
              <p className="mt-2 text-gray-600">
                Your saved businesses, coupons, and wishlist items
              </p>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{favorites.counts.businesses}</div>
                <div className="text-sm text-gray-600">Businesses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{favorites.counts.coupons}</div>
                <div className="text-sm text-gray-600">Coupons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{favorites.counts.wishlist}</div>
                <div className="text-sm text-gray-600">Wishlist</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'businesses', label: 'Businesses', count: favorites.counts.businesses },
                { id: 'coupons', label: 'Coupons', count: favorites.counts.coupons },
                { id: 'wishlist', label: 'Wishlist', count: favorites.counts.wishlist }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={cn(
                    "flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "ml-2 px-2.5 py-0.5 rounded-full text-xs",
                    activeTab === tab.id
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-gray-100 text-gray-600"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date">Most Recent</option>
              <option value="name">Name</option>
              {activeTab === 'businesses' && <option value="rating">Rating</option>}
              {activeTab === 'coupons' && <option value="expiry">Expiring Soon</option>}
            </select>

            {/* View Mode */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'grid' ? "bg-indigo-100 text-indigo-600" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 transition-colors border-l border-gray-300",
                  viewMode === 'list' ? "bg-indigo-100 text-indigo-600" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Clear All */}
            {currentCount > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {favorites.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading favorites...</span>
          </div>
        ) : favorites.error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading favorites</h3>
            <p className="text-gray-600 mb-4">{favorites.error}</p>
            <button
              onClick={() => favorites.refresh()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : currentCount === 0 ? (
          <EmptyState activeTab={activeTab} onExplore={() => navigate('/search')} />
        ) : (
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
          )}>
            {activeTab === 'businesses' && 
              (filteredBusinesses as FavoriteBusiness[]).map((business) => (
                <BusinessCard
                  key={business.business_id}
                  business={business}
                  viewMode={viewMode}
                  onNavigate={(id) => navigate(`/business/${id}`)}
                />
              ))}

            {activeTab === 'coupons' && 
              (filteredCoupons as FavoriteCoupon[]).map((coupon) => (
                <CouponCard
                  key={coupon.coupon_id}
                  coupon={coupon}
                  viewMode={viewMode}
                  onNavigate={(id) => navigate(`/coupon/${id}`)}
                  onBusinessNavigate={(id) => navigate(`/business/${id}`)}
                />
              ))}

            {activeTab === 'wishlist' &&
              favorites.wishlist.map((item) => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  onRemove={() => favorites.removeFromWishlist(item.id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ activeTab: ActiveTab; onExplore: () => void }> = ({ activeTab, onExplore }) => {
  const getEmptyStateContent = () => {
    switch (activeTab) {
      case 'businesses':
        return {
          icon: <Package className="h-16 w-16 text-gray-300" />,
          title: 'No favorite businesses yet',
          description: 'Start exploring and save your favorite local businesses',
          actionText: 'Explore Businesses'
        };
      case 'coupons':
        return {
          icon: <Heart className="h-16 w-16 text-gray-300" />,
          title: 'No favorite coupons yet',
          description: 'Find amazing deals and save them for later',
          actionText: 'Browse Coupons'
        };
      case 'wishlist':
        return {
          icon: <Star className="h-16 w-16 text-gray-300" />,
          title: 'Your wishlist is empty',
          description: 'Add items to your wishlist to save them for later',
          actionText: 'Start Shopping'
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        {content.icon}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
          {content.title}
        </h3>
        <p className="text-gray-600 mb-8">
          {content.description}
        </p>
        <button
          onClick={onExplore}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {content.actionText}
        </button>
      </div>
    </div>
  );
};

// Business Card Component
const BusinessCard: React.FC<{
  business: FavoriteBusiness;
  viewMode: ViewMode;
  onNavigate: (id: string) => void;
}> = ({ business, viewMode, onNavigate }) => {
  const businessData: StandardBusinessCardData = {
    id: business.business_id,
    business_name: business.business_name,
    business_type: business.business_type,
    address: business.address,
    rating: business.rating,
    review_count: business.review_count,
    follower_count: business.follower_count,
    active_coupons_count: business.active_coupons_count,
    logo_url: business.logo_url,
    cover_image_url: business.cover_image_url,
    description: business.description,
  };

  if (viewMode === 'list') {
    return (
      <StandardBusinessCard
        business={businessData}
        onCardClick={onNavigate}
        variant="compact"
        showChevron={false}
        actionButton={
          <FollowButton
            businessId={business.business_id}
            businessName={business.business_name}
            variant="ghost"
            size="sm"
            showLabel={false}
            className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-sm hover:bg-green-50"
          />
        }
      />
    );
  }

  return (
    <StandardBusinessCard
      business={businessData}
      onCardClick={onNavigate}
      showChevron={false}
      actionButton={
        <FollowButton
          businessId={business.business_id}
          businessName={business.business_name}
          variant="ghost"
          size="sm"
          showLabel={false}
          className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-green-50"
        />
      }
    />
  );
};

// Coupon Card Component
const CouponCard: React.FC<{
  coupon: FavoriteCoupon;
  viewMode: ViewMode;
  onNavigate: (id: string) => void;
  onBusinessNavigate: (id: string) => void;
}> = ({ coupon, viewMode, onNavigate, onBusinessNavigate }) => {
  const now = Date.now();
  const expiryTime = new Date(coupon.valid_until).getTime();
  const isExpired = expiryTime < now;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <UnifiedCouponCard
        coupon={{
          id: coupon.coupon_id,
          title: coupon.title,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          valid_until: coupon.valid_until,
          business_name: coupon.business_name,
          isCollected: coupon.is_collected
        }}
        onClick={() => onNavigate(coupon.coupon_id)}
        isExpired={isExpired}
      />
    </motion.div>
  );
};

// Wishlist Card Component  
const WishlistCard: React.FC<{
  item: any;
  viewMode: ViewMode;
  onRemove: () => void;
}> = ({ item, viewMode, onRemove }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {item.item_type} - {item.item_id}
          </h3>
          
          {item.notes && (
            <p className="text-sm text-gray-600 mb-4">{item.notes}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                Priority {item.priority}
              </span>
            </div>
            
            <button
              onClick={onRemove}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FavoritesPage;