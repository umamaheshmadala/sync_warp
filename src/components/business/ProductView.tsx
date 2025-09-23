import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Star, 
  DollarSign, 
  Tag, 
  ImageIcon, 
  ChevronLeft, 
  ChevronRight,
  Edit3
} from 'lucide-react';
import { Product, CURRENCIES } from '../../types/product';
import { useNavigate } from 'react-router-dom';

interface ProductViewProps {
  product: Product;
  isOwner?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  onEdit?: () => void;
}

const ProductView: React.FC<ProductViewProps> = ({
  product,
  isOwner = false,
  isModal = false,
  onClose,
  onEdit
}) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    const currencyInfo = CURRENCIES.find(c => c.value === currency);
    return currencyInfo?.symbol || currency;
  };

  // Format price display
  const formatPrice = (price?: number, currency = 'INR') => {
    if (!price || price === 0) return 'Price not available';
    
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${price.toLocaleString()}`;
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? product.image_urls.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === product.image_urls.length - 1 ? 0 : prev + 1
    );
  };

  const handleEditProduct = () => {
    if (onEdit) {
      // Close modal first, then trigger edit
      if (isModal && onClose) {
        onClose();
      }
      onEdit();
    } else {
      // Navigate to products page for editing
      navigate(`/business/${product.business_id}/products`);
    }
  };

  const content = (
    <div className={`bg-white ${isModal ? 'rounded-lg' : ''} max-w-4xl mx-auto`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-6 ${isModal ? 'border-b border-gray-200' : ''}`}>
        <div className="flex items-center space-x-3">
          {product.is_featured && (
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Featured
            </div>
          )}
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            product.is_available
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {product.is_available ? 'Available' : 'Unavailable'}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isOwner && (
            <button
              onClick={handleEditProduct}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Product
            </button>
          )}
          
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Product Images */}
        {product.image_urls && product.image_urls.length > 0 ? (
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={product.image_urls[currentImageIndex]}
                alt={product.name}
                className="w-full h-96 object-cover"
              />
              
              {product.image_urls.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.image_urls.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {product.image_urls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex
                        ? 'border-blue-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No images available</p>
            </div>
          </div>
        )}

        {/* Product Details */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

          {product.description && (
            <div className="prose max-w-none">
              <p className="text-gray-700 text-lg leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Category and Price */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {product.category && (
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm">
                  {product.category}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(product.price, product.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Product Metadata */}
        <div className="border-t border-gray-200 pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Added:</span>
              <br />
              {new Date(product.created_at).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span>
              <br />
              {new Date(product.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {content}
      </div>
    </div>
  );
};

export default ProductView;