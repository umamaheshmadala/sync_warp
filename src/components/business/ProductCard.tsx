import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Edit3,
  Trash2,
  Star,
  Eye,
  EyeOff,
  MoreVertical,
  DollarSign,
  Tag,
  ImageIcon
} from 'lucide-react';
import { Product, CURRENCIES } from '../../types/product';
import ProductView from './ProductView';
import { AnimatePresence } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  viewMode,
  isOwner,
  onEdit,
  onDelete
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
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

  // Get the first available image
  const getImageUrl = (): string | undefined => {
    if (product.image_urls && product.image_urls.length > 0) {
      return product.image_urls[0];
    }
    return undefined;
  };

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleDropdownAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    action();
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
            contain: 'layout style paint',
            transform: 'translateZ(0)',
            contentVisibility: 'auto'
          }}
        >
          <div className="flex items-center space-x-4">
            {/* Product Image */}
            <div className="flex-shrink-0 w-20 h-20">
              {getImageUrl() && !imageError ? (
                <img
                  src={getImageUrl()}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                  onError={() => setImageError(true)}
                  decoding="async"
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
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-gray-900">
                        {formatPrice(product.price, product.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isOwner && (
                  <div className="relative">
                    <button
                      onClick={handleDropdownToggle}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                          <button
                            onClick={handleDropdownAction(onEdit)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            <Edit3 className="w-4 h-4 mr-3" />
                            Edit Product
                          </button>
                          <button
                            onClick={handleDropdownAction(onDelete)}
                            className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Delete Product
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.03]"
        onClick={handleProductClick}
        style={{
          contain: 'layout style paint',
          transform: 'translateZ(0)',
          contentVisibility: 'auto'
        }}
      >
        {/* Product Image */}
        <div className="aspect-w-16 aspect-h-12 relative">
          {getImageUrl() && !imageError ? (
            <img
              src={getImageUrl()}
              alt={product.name}
              className="w-full h-48 object-cover"
              onError={() => setImageError(true)}
              decoding="async"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* Status Badges */}
          <div className="absolute top-2 left-2 flex space-x-2">
            {product.is_featured && (
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Featured
              </div>
            )}
          </div>

          <div className="absolute top-2 right-2">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${product.is_available
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}>
              {product.is_available ? (
                <Eye className="w-3 h-3 mr-1" />
              ) : (
                <EyeOff className="w-3 h-3 mr-1" />
              )}
              {product.is_available ? 'Available' : 'Unavailable'}
            </div>
          </div>

          {/* Actions Dropdown */}
          {isOwner && (
            <div className="absolute bottom-2 right-2">
              <div className="relative">
                <button
                  onClick={handleDropdownToggle}
                  className="p-2 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full backdrop-blur-sm"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                      <button
                        onClick={handleDropdownAction(onEdit)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Edit3 className="w-4 h-4 mr-3" />
                        Edit Product
                      </button>
                      <button
                        onClick={handleDropdownAction(onDelete)}
                        className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Delete Product
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {product.name}
            </h3>
          </div>

          {product.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          {product.category && (
            <div className="flex items-center space-x-1 mb-3">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{product.category}</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center space-x-1 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.price, product.currency)}
            </span>
          </div>

          {/* Additional Images Count */}
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <ImageIcon className="w-4 h-4" />
                <span>{product.image_urls.length} images</span>
              </div>
            </div>
          )}
        </div>

        {/* Click overlay to close dropdown */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowDropdown(false)}
          />
        )}
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
};

export default ProductCard;