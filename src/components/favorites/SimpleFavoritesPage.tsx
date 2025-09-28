// SimpleFavoritesPage.tsx
// Simple, reliable favorites page

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search as SearchIcon, Star, MapPin, Calendar, Package, AlertCircle, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import useSimpleFavorites, { FavoriteItem } from '../../hooks/useSimpleFavorites';
import SimpleSaveButton from './SimpleSaveButton';
import { cn } from '../../lib/utils';

type ActiveTab = 'all' | 'businesses' | 'coupons';

const SimpleFavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const favorites = useSimpleFavorites();
  
  // Local state
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter favorites based on active tab and search
  const filteredFavorites = useMemo(() => {
    let filtered = favorites.favorites;

    // Filter by tab
    if (activeTab === 'businesses') {
      filtered = filtered.filter(f => f.type === 'business');
    } else if (activeTab === 'coupons') {
      filtered = filtered.filter(f => f.type === 'coupon');
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        if (item.type === 'business') {
          const business = item.item_data;
          return business?.business_name?.toLowerCase().includes(query) ||
                 business?.business_type?.toLowerCase().includes(query) ||
                 business?.address?.toLowerCase().includes(query);
        } else if (item.type === 'coupon') {
          const coupon = item.item_data;
          return coupon?.title?.toLowerCase().includes(query) ||
                 coupon?.description?.toLowerCase().includes(query) ||
                 coupon?.businesses?.business_name?.toLowerCase().includes(query);
        }
        return false;
      });
    }

    return filtered;
  }, [favorites.favorites, activeTab, searchQuery]);

  // Get tab counts
  const tabCounts = useMemo(() => {
    return {
      all: favorites.favorites.length,
      businesses: favorites.counts.businesses,
      coupons: favorites.counts.coupons
    };
  }, [favorites.favorites.length, favorites.counts]);

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
                Your saved businesses and coupons
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
                <div className="text-2xl font-bold text-purple-600">{favorites.counts.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'all', label: 'All', count: tabCounts.all },
                { id: 'businesses', label: 'Businesses', count: tabCounts.businesses },
                { id: 'coupons', label: 'Coupons', count: tabCounts.coupons }
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

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search favorites...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
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
        ) : filteredFavorites.length === 0 ? (
          <EmptyState 
            activeTab={activeTab} 
            hasSearch={searchQuery.trim().length > 0}
            onExplore={() => navigate('/search')} 
            onClearSearch={() => setSearchQuery('')}
          />
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFavorites.map((item) => (
              <FavoriteItemCard
                key={`${item.type}-${item.item_id}`}
                item={item}
                onNavigate={(id, type) => {
                  if (type === 'business') {
                    navigate(`/business/${id}`);
                  } else if (type === 'coupon') {
                    navigate(`/coupon/${id}`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ 
  activeTab: ActiveTab; 
  hasSearch: boolean;
  onExplore: () => void;
  onClearSearch: () => void;
}> = ({ activeTab, hasSearch, onExplore, onClearSearch }) => {
  const getEmptyStateContent = () => {
    if (hasSearch) {
      return {
        icon: <SearchIcon className="h-16 w-16 text-gray-300" />,
        title: 'No matching favorites found',
        description: 'Try adjusting your search terms',
        actionText: 'Clear Search',
        action: onClearSearch
      };
    }

    switch (activeTab) {
      case 'businesses':
        return {
          icon: <Package className="h-16 w-16 text-gray-300" />,
          title: 'No favorite businesses yet',
          description: 'Start exploring and save your favorite local businesses',
          actionText: 'Explore Businesses',
          action: onExplore
        };
      case 'coupons':
        return {
          icon: <Heart className="h-16 w-16 text-gray-300" />,
          title: 'No favorite coupons yet',
          description: 'Find amazing deals and save them for later',
          actionText: 'Browse Coupons',
          action: onExplore
        };
      default:
        return {
          icon: <Heart className="h-16 w-16 text-gray-300" />,
          title: 'No favorites yet',
          description: 'Start exploring and save businesses and coupons you love',
          actionText: 'Start Exploring',
          action: onExplore
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
          onClick={content.action}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {content.actionText}
        </button>
      </div>
    </div>
  );
};

// Individual favorite item card
const FavoriteItemCard: React.FC<{
  item: FavoriteItem;
  onNavigate: (id: string, type: 'business' | 'coupon') => void;
}> = ({ item, onNavigate }) => {
  if (item.type === 'business') {
    const business = item.item_data;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer group"
        onClick={() => onNavigate(item.item_id, 'business')}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">
              {business?.business_name || 'Unknown Business'}
            </h3>
            <SimpleSaveButton itemId={item.item_id} itemType="business" variant="compact" />
          </div>
          
          {business?.business_type && (
            <p className="text-sm text-gray-600 mb-4">{business.business_type}</p>
          )}
          
          {business?.address && (
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="line-clamp-1">{business.address}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            {business?.rating && (
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                <span className="text-sm font-medium">{business.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Saved {new Date(item.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </motion.div>
    );
  } else if (item.type === 'coupon') {
    const coupon = item.item_data;
    const isExpiringSoon = coupon?.valid_until && 
      new Date(coupon.valid_until).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer group"
        onClick={() => onNavigate(item.item_id, 'coupon')}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">
              {coupon?.title || 'Unknown Coupon'}
            </h3>
            <SimpleSaveButton itemId={item.item_id} itemType="coupon" variant="compact" />
          </div>
          
          {coupon?.businesses?.business_name && (
            <p className="text-sm text-indigo-600 mb-2">{coupon.businesses.business_name}</p>
          )}
          
          {coupon?.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{coupon.description}</p>
          )}
          
          <div className="mb-4">
            <div className="text-xl font-bold text-green-600">
              {coupon?.discount_type === 'percentage' 
                ? `${coupon.discount_value}%` 
                : `$${coupon.discount_value}`} OFF
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            {isExpiringSoon && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                Expires Soon
              </span>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Saved {new Date(item.created_at).toLocaleDateString()}
              </div>
              {coupon?.valid_until && (
                <div>
                  Expires {new Date(coupon.valid_until).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default SimpleFavoritesPage;