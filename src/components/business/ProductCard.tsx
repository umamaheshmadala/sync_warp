import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Edit3,
  Trash2,
  Star,
  Eye,
  EyeOff,
  MoreVertical,
  IndianRupee,
  Tag,
  ImageIcon,
  Layers
} from 'lucide-react';
import { Product, CURRENCIES } from '../../types/product';
import ProductView from './ProductView';
import { AnimatePresence } from 'framer-motion';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { FavoriteProductButton } from '../favorites/FavoriteProductButton';

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const ProductCardBase: React.FC<ProductCardProps> = ({
  product,
  viewMode,
  isOwner,
  onEdit,
  onDelete
}) => {
  const [imageError, setImageError] = useState(false);
  const [showProductView, setShowProductView] = useState(false);

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    const currencyInfo = CURRENCIES.find(c => c.value === currency);
    return currencyInfo?.symbol || currency;
  };

  // Format price display
  const formatPrice = (price?: number, currency = 'INR') => {
    if (!price || price === 0) return 'Price not set';

    const symbol = getCurrencySymbol(currency);
    return `${symbol}${price.toLocaleString()}`;
  };

  // Get the first available image with optimization
  const getImageUrl = (): string | undefined => {
    if (product.image_urls && product.image_urls.length > 0) {
      // Use 300px width for grid thumbnails (was loading full-res before!)
      return getOptimizedImageUrl(product.image_urls[0], 300);
    }
    return undefined;
  };

  const handleProductClick = () => {
    setShowProductView(true);
  };

  const handleCloseProductView = () => {
    setShowProductView(false);
  };

  if (viewMode === 'list') {
    return (
      <>
        <div
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
          onClick={handleProductClick}
          style={{
            transform: 'translateZ(0)',
          }}
        >
          <div className="flex items-center space-x-4">
            {/* Product Image - Portrait */}
            <div className="flex-shrink-0 w-24 aspect-[9/16] overflow-hidden rounded-lg bg-gray-100">
              {getImageUrl() && !imageError ? (
                <img
                  src={getImageUrl()}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                  onError={() => setImageError(true)}
                  decoding="async"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {product.name}
                    </h3>
                    {product.is_featured && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                    )}
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.is_available
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {product.is_available ? 'Available' : 'Unavailable'}
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {product.category && (
                      <div className="flex items-center space-x-1">
                        <Tag className="w-4 h-4" />
                        <span>{product.category}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <IndianRupee className="w-4 h-4" />
                      <span className="font-semibold text-gray-900">
                        {formatPrice(product.price, product.currency)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Product View Modal */}
        <AnimatePresence>
          {showProductView && (
            <ProductView
              product={product}
              isOwner={isOwner}
              isModal={true}
              onClose={handleCloseProductView}
              onEdit={onEdit}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Grid view
  return (
    <>
      <div
        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.03] flex flex-col h-full"
        onClick={handleProductClick}
        style={{
          transform: 'translateZ(0)',
        }}
      >
        {/* Product Image - Aspect Ratio */}
        <div className="relative bg-gray-100 overflow-hidden aspect-[4/5] sm:aspect-[1/1]">
          {getImageUrl() && !imageError ? (
            <img
              src={getImageUrl()}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              decoding="async"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* Featured Star - Top Left */}
          {product.is_featured && (
            <div className="absolute top-2 left-2 z-10">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
            </div>
          )}

          {/* Multiple Images Indicator - Top Right */}
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-black/50 backdrop-blur-sm rounded-full p-1.5 text-white">
                <Layers className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* Product Details Footer */}
        <div className="p-3 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug" title={product.name}>
              {product.name}
            </h3>
          </div>

          <div className="mt-auto space-y-2">
            {/* Category & Availability */}
            <div className="flex items-center justify-between text-xs">
              {product.category && (
                <div className="flex items-center text-gray-500">
                  <Tag className="w-3 h-3 mr-1" />
                  <span className="truncate max-w-[80px]">{product.category}</span>
                </div>
              )}
              <div className={`px-1.5 py-0.5 rounded-full font-medium ${product.is_available
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}>
                {product.is_available ? 'Available' : 'Unavailable'}
              </div>
            </div>

            {/* Price and Favorite Action */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <div className="font-bold text-gray-900">
                {formatPrice(product.price, product.currency)}
              </div>

              {/* Favorite Button - Story 4.13 - Shows "Favorite"/"Favorited" like Offer cards */}
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <FavoriteProductButton productId={product.id} iconOnly={false} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product View Modal */}
      <AnimatePresence>
        {
          showProductView && (
            <ProductView
              product={product}
              isOwner={isOwner}
              isModal={true}
              onClose={handleCloseProductView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )
        }
      </AnimatePresence >
    </>
  );
};

const ProductCard = React.memo(ProductCardBase, (prevProps, nextProps) => {
  return prevProps.product.id === nextProps.product.id &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isOwner === nextProps.isOwner;
});

export default ProductCard;