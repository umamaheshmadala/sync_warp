// UnifiedFavoritesPage.tsx
// Unified favorites page that works with the new unified favorites system

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search as SearchIcon, Package, AlertCircle, RefreshCw, X, ShoppingBag, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavoriteProducts } from '../../hooks/useFavoriteProducts';
import { FavoriteProductButton } from '../products/FavoriteProductButton';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const UnifiedFavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { products: favoriteProducts, loading: productsLoading, error: productsError, removeFavorite } = useFavoriteProducts();
  const { getBusinessUrl } = useBusinessUrl();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name');

  // Loading and error states
  if (!favoriteProducts && !productsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view favorites</h2>
          <p className="text-gray-600 mb-6">Save your favorite products</p>
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

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!favoriteProducts) return [];

    let result = favoriteProducts;

    // Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.business_name.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'price_asc') {
        return a.price - b.price;
      } else if (sortBy === 'price_desc') {
        return b.price - a.price;
      }
      return 0;
    });
  }, [favoriteProducts, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* Search and Sort */}
        <div className="flex flex-row items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-0">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="relative shrink-0">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as any)}
            >
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {productsLoading && (!favoriteProducts || favoriteProducts.length === 0) ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading products...</span>
          </div>
        ) : productsError ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading favorites</h3>
            <p className="text-gray-600 mb-4">{productsError}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No matching products found' : 'No favorite products yet'}
            </h3>
            <p className="text-gray-600 mb-8">
              {searchQuery ? 'Try adjusting your search terms' : 'Start exploring and save your favorite products'}
            </p>
            <button
              onClick={() => searchQuery ? setSearchQuery('') : navigate('/search')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {searchQuery ? 'Clear Search' : 'Explore Products'}
            </button>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all overflow-hidden group cursor-pointer"
                onClick={() => navigate(`${getBusinessUrl(product.business_id, product.business_name)}/product/${product.id}`)}
              >
                {/* Product Image */}
                <div className="relative h-48 bg-gray-100">
                  {product.image_urls && product.image_urls.length > 0 ? (
                    <img
                      src={product.image_urls[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-300" />
                    </div>
                  )}

                  {/* Favorite Button */}
                  <div className="absolute top-2 right-2">
                    <FavoriteProductButton
                      productId={product.id}
                      productName={product.name}
                      variant="icon"
                      size="icon"
                      className="bg-white/90 backdrop-blur shadow-md"
                    />
                  </div>

                  {!product.is_available && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                      Out of Stock
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-indigo-600">
                        {product.currency} {product.price.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {product.business_name}
                      </div>
                    </div>

                    {product.category && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.category}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedFavoritesPage;