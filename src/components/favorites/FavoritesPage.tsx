// FavoritesPage.tsx
// Story 4.13: Refactored favorites page for Offers and Products only
// Features: Tabs for Offers/Products, search, and unfavorite actions

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Search as SearchIcon,
  RefreshCw,
  Tag,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFavoritesContext } from '../../contexts/FavoritesContext';
// Using storefront OfferCard for visual consistency
import { OfferCard } from '../offers/OfferCard';
// Replaced FavoriteProductCard with ProductCard for consistency
import ProductCard from '../business/ProductCard';
import OfferDetailModal from '../offers/OfferDetailModal';
import type { Product } from '../../types/product';
import type { Offer } from '../../types/offers';
import type { FavoriteOffer, FavoriteProduct } from '../../services/favoritesService';

type ActiveTab = 'offers' | 'products';

// Helper to map FavoriteProduct to Product for the card component
const mapFavoriteToProduct = (fav: FavoriteProduct): Product => {
  return {
    id: fav.id,
    business_id: fav.business_id,
    name: fav.name,
    description: fav.description,
    price: fav.price,
    currency: 'INR', // Default to INR as it's missing in favorite
    image_urls: fav.image_urls,
    is_available: fav.is_available,
    is_featured: fav.is_featured,
    display_order: 0,
    created_at: fav.favorited_at,
    updated_at: fav.favorited_at,
    business: {
      name: fav.business_name
    }
  };
};

// Helper to map FavoriteOffer to Offer for the OfferCard component
const mapFavoriteToOffer = (fav: FavoriteOffer): Offer => {
  // Determine if expired
  const isExpired = new Date(fav.valid_until) < new Date();

  return {
    id: fav.id,
    business_id: fav.business_id,
    title: fav.title,
    description: fav.description || null,
    terms_conditions: null,
    valid_from: fav.valid_from,
    valid_until: fav.valid_until,
    created_at: fav.favorited_at,
    status: isExpired ? 'expired' : 'active',
    offer_code: fav.offer_code,
    icon_image_url: fav.icon_image_url || null,
    view_count: fav.view_count,
    share_count: fav.share_count,
    click_count: 0,
    created_by: null,
    updated_at: null,
    activated_at: null,
    expired_at: isExpired ? fav.valid_until : null,
    business: {
      id: fav.business_id,
      business_name: fav.business_name,
      business_image: fav.business_logo || null
    }
  };
};

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const favorites = useFavoritesContext();

  // Local state
  const [activeTab, setActiveTab] = useState<ActiveTab>('offers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  // Refresh favorites data when page is visited
  React.useEffect(() => {
    favorites.refresh();
  }, []);

  // Loading and error states
  if (!favorites.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view favorites</h2>
          <p className="text-gray-600 mb-6">Save your favorite offers and products</p>
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

  // Filter functions
  const filteredOffers = useMemo(() => {
    let filtered = [...favorites.offers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        offer =>
          offer.title.toLowerCase().includes(query) ||
          offer.business_name.toLowerCase().includes(query) ||
          offer.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [favorites.offers, searchQuery]);

  const filteredProducts = useMemo(() => {
    let filtered = [...favorites.products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.business_name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [favorites.products, searchQuery]);

  // Get current data based on active tab
  const { data: currentData, count: currentCount } =
    activeTab === 'offers'
      ? { data: filteredOffers, count: favorites.counts.offers }
      : { data: filteredProducts, count: favorites.counts.products };

  // Handle remove favorite
  const handleRemoveFavorite = async (itemId: string) => {
    await favorites.removeFavorite(activeTab === 'offers' ? 'offer' : 'product', itemId);
  };

  // Tab configuration
  const tabs = [
    { id: 'offers' as const, label: 'Offers', count: favorites.counts.offers, icon: Tag },
    { id: 'products' as const, label: 'Products', count: favorites.counts.products, icon: Package }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-indigo-600 fill-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
                <p className="text-sm text-gray-600">
                  {favorites.totalFavorites} {favorites.totalFavorites === 1 ? 'item' : 'items'} saved
                </p>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => favorites.refresh()}
              disabled={favorites.isRefetching}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh favorites"
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-600 ${favorites.isRefetching ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favorites.isLoading ? (
          // Loading state
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
          </div>
        ) : favorites.error ? (
          // Error state
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{favorites.error}</p>
            <button
              onClick={() => favorites.refresh()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : currentData.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              {activeTab === 'offers' ? (
                <Tag className="h-8 w-8 text-gray-400" />
              ) : (
                <Package className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab} favorited yet
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery.trim()
                ? `No ${activeTab} match your search "${searchQuery}"`
                : `Start favoriting ${activeTab} to see them here`}
            </p>
            {!searchQuery.trim() && (
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Browse {activeTab === 'offers' ? 'Offers' : 'Products'}
              </button>
            )}
          </motion.div>
        ) : (
          // Grid of items
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`grid gap-4 ${activeTab === 'offers'
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              }`}
          >
            {activeTab === 'offers'
              ? filteredOffers.map(offer => (
                <OfferCard
                  key={offer.id}
                  offer={mapFavoriteToOffer(offer)}
                  showActions={false}
                  showStats={false}
                  onViewDetails={(o) => setSelectedOffer(o)}
                />
              ))
              : filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={mapFavoriteToProduct(product)}
                  viewMode="grid"
                  isOwner={false}
                  onEdit={() => { }}
                  onDelete={() => { }}
                />
              ))}
          </motion.div>
        )}
      </div>

      {/* Offer Detail Modal */}
      <AnimatePresence>
        {selectedOffer && (
          <OfferDetailModal
            offer={selectedOffer}
            onClose={() => setSelectedOffer(null)}
            showStats={false}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FavoritesPage;