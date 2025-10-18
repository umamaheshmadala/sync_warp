// UnifiedFavoritesPage.tsx
// Unified favorites page that works with the new unified favorites system

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search as SearchIcon, Star, MapPin, Calendar, Package, AlertCircle, Ticket, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import useUnifiedFavorites from '../../hooks/useUnifiedFavorites';
import { useFavoriteProducts } from '../../hooks/useFavoriteProducts';
import { SimpleSaveButton } from './SimpleSaveButton';
import { FavoriteProductButton } from '../products/FavoriteProductButton';
import { cn } from '../../lib/utils';

type ActiveTab = 'all' | 'businesses' | 'coupons' | 'products';

const UnifiedFavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const favorites = useUnifiedFavorites();
  const { products: favoriteProducts, loading: productsLoading, error: productsError } = useFavoriteProducts();
  
  // Local state
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Note: Removed periodic refresh - realtime subscriptions handle updates automatically
  // No need for polling when we have Supabase realtime enabled

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

  // Merge products from both sources (unified favorites + dedicated favorite_products table)
  const mergedFavorites = useMemo(() => {
    const allFavorites = [...favorites.favorites];
    
    // Add products from dedicated table if not already present
    if (favoriteProducts && favoriteProducts.length > 0) {
      for (const product of favoriteProducts) {
        // Check if product is already in unified favorites
        const existsInUnified = allFavorites.some(
          f => f.type === 'product' && f.id === product.product_id
        );
        
        if (!existsInUnified) {
          allFavorites.push({
            id: product.id,
            type: 'product' as const,
            timestamp: new Date(product.favorited_at).getTime(),
            synced: true,
            itemData: {
              name: product.name,
              description: product.description || '',
              price: product.price,
              currency: product.currency || 'INR',
              image_url: product.image_urls?.[0] || '',
              business_name: product.business_name,
              business_id: product.business_id,
              is_available: product.is_available
            }
          });
        }
      }
    }
    
    return allFavorites;
  }, [favorites.favorites, favoriteProducts]);

  // Filter favorites based on active tab and search
  const filteredFavorites = useMemo(() => {
    let filtered = mergedFavorites;

    // Filter by tab
    if (activeTab === 'businesses') {
      filtered = filtered.filter(f => f.type === 'business');
    } else if (activeTab === 'coupons') {
      filtered = filtered.filter(f => f.type === 'coupon');
    } else if (activeTab === 'products') {
      filtered = filtered.filter(f => f.type === 'product');
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const itemData = item.itemData;
        if (!itemData) return item.id.toLowerCase().includes(query);
        
        if (item.type === 'business') {
          return itemData.business_name?.toLowerCase().includes(query) ||
                 itemData.business_type?.toLowerCase().includes(query) ||
                 itemData.address?.toLowerCase().includes(query);
        } else if (item.type === 'coupon') {
          return itemData.title?.toLowerCase().includes(query) ||
                 itemData.description?.toLowerCase().includes(query) ||
                 itemData.business_name?.toLowerCase().includes(query);
        } else if (item.type === 'product') {
          return itemData.name?.toLowerCase().includes(query) ||
                 itemData.description?.toLowerCase().includes(query) ||
                 itemData.business_name?.toLowerCase().includes(query);
        }
        return false;
      });
    }

    return filtered;
  }, [mergedFavorites, activeTab, searchQuery]);

  // Get tab counts from merged data
  const tabCounts = useMemo(() => {
    const counts = mergedFavorites.reduce(
      (acc, fav) => {
        if (fav.type === 'business') acc.businesses++;
        else if (fav.type === 'coupon') acc.coupons++;
        else if (fav.type === 'product') acc.products++;
        acc.total++;
        return acc;
      },
      { businesses: 0, coupons: 0, products: 0, total: 0 }
    );
    
    return {
      all: counts.total,
      businesses: counts.businesses,
      coupons: counts.coupons,
      products: counts.products
    };
  }, [mergedFavorites]);

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
                <div className="text-2xl font-bold text-indigo-600">{tabCounts.businesses}</div>
                <div className="text-sm text-gray-600">Businesses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{tabCounts.coupons}</div>
                <div className="text-sm text-gray-600">Coupons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{tabCounts.products}</div>
                <div className="text-sm text-gray-600">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{tabCounts.all}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>

          {/* Debug controls (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-yellow-800">Debug Controls:</span>
                <button
                  onClick={favorites.seedTestData}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  Seed Test Data
                </button>
                <button
                  onClick={favorites.clearAllFavorites}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Clear All
                </button>
                <button
                  onClick={favorites.refresh}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4 inline mr-1" />
                  Refresh
                </button>
                <button
                  onClick={favorites.clearOldFavorites}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                >
                  Clear Old Favorites
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'all', label: 'All', count: tabCounts.all },
                { id: 'businesses', label: 'Businesses', count: tabCounts.businesses },
                { id: 'coupons', label: 'Coupons', count: tabCounts.coupons },
                { id: 'products', label: 'Products', count: tabCounts.products }
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
              placeholder="Search favorites..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Content */}
        {favorites.isLoading || productsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading favorites...</span>
          </div>
        ) : favorites.error || productsError ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading favorites</h3>
            <p className="text-gray-600 mb-4">{favorites.error || productsError}</p>
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
            onSeedTestData={favorites.seedTestData}
          />
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFavorites.map((item) => (
              <FavoriteItemCard
                key={`${item.type}-${item.id}`}
                item={item}
                onNavigate={(id, type) => {
                  if (type === 'business') {
                    navigate(`/business/${id}`);
                  } else if (type === 'coupon') {
                    navigate(`/coupon/${id}`);
                  } else if (type === 'product') {
                    navigate(`/product/${id}`);
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
  onSeedTestData: () => void;
}> = ({ activeTab, hasSearch, onExplore, onClearSearch, onSeedTestData }) => {
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
          icon: <Ticket className="h-16 w-16 text-gray-300" />,
          title: 'No favorite coupons yet',
          description: 'Find amazing deals and save them for later',
          actionText: 'Browse Coupons',
          action: onExplore
        };
      case 'products':
        return {
          icon: <Package className="h-16 w-16 text-gray-300" />,
          title: 'No favorite products yet',
          description: 'Browse products and add them to your favorites',
          actionText: 'Browse Products',
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
        <div className="space-y-3">
          <button
            onClick={content.action}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {content.actionText}
          </button>
          
          {/* Show test data button in development */}
          {process.env.NODE_ENV === 'development' && !hasSearch && (
            <button
              onClick={onSeedTestData}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Add Test Favorites
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Individual favorite item card
const FavoriteItemCard: React.FC<{
  item: any;
  onNavigate: (id: string, type: 'business' | 'coupon' | 'product') => void;
}> = ({ item, onNavigate }) => {
  const itemData = item.itemData;
  
  if (item.type === 'business') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer group relative"
        onClick={() => onNavigate(item.id, 'business')}
      >
        <div className="absolute top-3 right-3 z-10">
          <SimpleSaveButton
            itemId={item.id}
            itemType="business"
            itemData={itemData}
            size="sm"
          />
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2 mb-2">
            {itemData?.business_name || `Business ${item.id.substring(0, 8)}...`}
          </h3>
          
          {!itemData?.business_name && (
            <div className="text-xs text-orange-600 mb-2 bg-orange-50 px-2 py-1 rounded">
              ⚠️ Legacy favorite - business name not available
            </div>
          )}
          
          {itemData?.business_type && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Package className="w-4 h-4 mr-2" />
              <span>{itemData.business_type}</span>
            </div>
          )}
          
          {itemData?.address && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="line-clamp-1">{itemData.address}</span>
            </div>
          )}
          
          <div className="flex items-center text-xs text-gray-500 mt-4">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Added {new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (item.type === 'coupon') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer group relative"
        onClick={() => onNavigate(item.id, 'coupon')}
      >
        <div className="absolute top-3 right-3 z-10">
          <SimpleSaveButton
            itemId={item.id}
            itemType="coupon"
            itemData={itemData}
            size="sm"
          />
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2 mb-2">
            {itemData?.title || `Coupon ${item.id.substring(0, 8)}...`}
          </h3>
          
          {!itemData?.title && (
            <div className="text-xs text-orange-600 mb-2 bg-orange-50 px-2 py-1 rounded">
              ⚠️ Legacy favorite - coupon details not available
            </div>
          )}
          
          {itemData?.business_name && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Package className="w-4 h-4 mr-2" />
              <span>{itemData.business_name}</span>
            </div>
          )}
          
          {itemData?.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {itemData.description}
            </p>
          )}
          
          <div className="flex items-center text-xs text-gray-500 mt-4">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Added {new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (item.type === 'product') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer group relative"
        onClick={() => onNavigate(item.id, 'product')}
      >
        <div className="absolute top-3 right-3 z-10">
          <FavoriteProductButton
            productId={item.id}
            variant="icon"
            size="md"
          />
        </div>
        
        {itemData?.image_url && (
          <div className="aspect-square overflow-hidden rounded-t-lg bg-gray-100">
            <img 
              src={itemData.image_url} 
              alt={itemData.name || 'Product'} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
        )}
        
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2 mb-2">
            {itemData?.name || `Product ${item.id.substring(0, 8)}...`}
          </h3>
          
          {!itemData?.name && (
            <div className="text-xs text-orange-600 mb-2 bg-orange-50 px-2 py-1 rounded">
              ⚠️ Legacy favorite - product details not available
            </div>
          )}
          
          {itemData?.price && (
            <div className="text-lg font-bold text-indigo-600 mb-2">
              ${itemData.price}
            </div>
          )}
          
          {itemData?.business_name && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Package className="w-4 h-4 mr-2" />
              <span>{itemData.business_name}</span>
            </div>
          )}
          
          {itemData?.rating && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
              <span>{itemData.rating}</span>
            </div>
          )}
          
          <div className="flex items-center text-xs text-gray-500 mt-4">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Added {new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Fallback for unknown types
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="text-gray-600">
        Unknown favorite type: {item.type}
      </div>
    </div>
  );
};

export default UnifiedFavoritesPage;