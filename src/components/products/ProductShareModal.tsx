// ProductShareModal.tsx
// Modal for sharing products with friends
// Adapted from ShareCouponModal pattern

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Package,
  Users,
  Share2,
  CheckCircle,
  AlertCircle,
  Loader,
  Tag,
  Sparkles,
  Copy
} from 'lucide-react';
import { Product } from '../../types/product';
import { toast } from 'react-hot-toast';

export interface ProductShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onShareSuccess?: () => void;
}

type ShareStep = 'share-options' | 'sharing' | 'success' | 'error';

const ProductShareModal: React.FC<ProductShareModalProps> = ({
  isOpen,
  onClose,
  product,
  onShareSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<ShareStep>('share-options');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle cancel
  const handleCancel = () => {
    setCurrentStep('share-options');
    onClose();
  };

  // Copy product link to clipboard
  const handleCopyLink = async () => {
    try {
      const productUrl = `${window.location.origin}/products/${product.id}`;
      await navigator.clipboard.writeText(productUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  // Share via Web Share API
  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error('Sharing not supported on this device');
      return;
    }

    try {
      setCurrentStep('sharing');
      
      const shareData = {
        title: product.name,
        text: `Check out ${product.name}${product.price ? ` - ${product.currency} ${product.price}` : ''}`,
        url: `${window.location.origin}/products/${product.id}`
      };

      await navigator.share(shareData);
      
      setCurrentStep('success');
      
      // Call success callback after a delay
      setTimeout(() => {
        onShareSuccess?.();
        handleCancel();
      }, 2000);
      
    } catch (error: any) {
      // User cancelled the share
      if (error.name === 'AbortError') {
        setCurrentStep('share-options');
        return;
      }
      
      console.error('Error sharing product:', error);
      setErrorMessage(error.message || 'Failed to share product');
      setCurrentStep('error');
    }
  };

  // Format price display
  const formatPrice = (): string => {
    if (!product.price) return 'Price on request';
    const symbol = product.currency === 'INR' ? '₹' : product.currency === 'USD' ? '$' : '€';
    return `${symbol}${product.price.toLocaleString()}`;
  };

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 'share-options':
        return 'Share Product';
      case 'sharing':
        return 'Sharing...';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error';
      default:
        return 'Share Product';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={handleCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{getStepTitle()}</h2>
                    <p className="text-sm text-gray-600">Share with friends and family</p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Product Preview - Always visible */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-sm">
                    <div className="flex items-start space-x-4">
                      {/* Product Image */}
                      {product.image_urls?.[0] && (
                        <img
                          src={product.image_urls[0]}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      )}

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                            {product.name}
                          </h3>
                          {product.price && (
                            <div className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold text-sm whitespace-nowrap ml-2">
                              {formatPrice()}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          {product.category && (
                            <div className="flex items-center">
                              <Tag className="w-4 h-4 mr-2 text-gray-400" />
                              {product.category}
                            </div>
                          )}
                          {product.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                  {currentStep === 'share-options' && (
                    <motion.div
                      key="share-options"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-6"
                    >
                      <div className="space-y-3">
                        {/* Native Share Button */}
                        {navigator.share && (
                          <button
                            onClick={handleNativeShare}
                            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-3"
                          >
                            <Share2 className="w-5 h-5" />
                            <span>Share via Apps</span>
                          </button>
                        )}

                        {/* Copy Link Button */}
                        <button
                          onClick={handleCopyLink}
                          className="w-full px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center space-x-3"
                        >
                          <Copy className="w-5 h-5" />
                          <span>Copy Link</span>
                        </button>
                      </div>

                      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            Share this product with friends to help them discover great items!
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 'sharing' && (
                    <motion.div
                      key="sharing"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 flex flex-col items-center justify-center py-12"
                    >
                      <Loader className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Sharing Product...</h3>
                      <p className="text-sm text-gray-600">Please wait</p>
                    </motion.div>
                  )}

                  {currentStep === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 flex flex-col items-center justify-center py-12"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', duration: 0.6 }}
                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4"
                      >
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
                      <p className="text-sm text-gray-600 text-center mb-2">
                        Product shared successfully
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <Sparkles className="w-4 h-4" />
                        <span>Thanks for spreading the word!</span>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 flex flex-col items-center justify-center py-12"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', duration: 0.6 }}
                        className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4"
                      >
                        <AlertCircle className="w-12 h-12 text-red-600" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h3>
                      <p className="text-sm text-gray-600 text-center mb-6">
                        {errorMessage || 'Something went wrong while sharing'}
                      </p>
                      <button
                        onClick={handleCancel}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                      >
                        Close
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ProductShareModal;
