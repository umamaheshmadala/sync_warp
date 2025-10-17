// CouponDetailsModal.tsx
// Comprehensive modal component for displaying all coupon details
// Shows full information including T&C, validity, description, business info, etc.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  Calendar,
  MapPin,
  Star,
  Store,
  Tag,
  Gift,
  AlertCircle,
  CheckCircle,
  Share2,
  Copy,
  QrCode,
  Info,
  Heart,
  ExternalLink,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import SimpleSaveButton from '../favorites/SimpleSaveButton';

interface CouponDetailsModalProps {
  coupon: any;
  isOpen: boolean;
  onClose: () => void;
  onCollect?: (couponId: string) => Promise<boolean>;
  onShare?: (couponId: string) => void;
  onAddToFavorites?: (couponId: string) => void;
  onRedeem?: (couponId: string) => void;
  onRemove?: (collectionId: string) => void;
  showCollectButton?: boolean;
  showShareButton?: boolean;
  showRedeemButton?: boolean;
  showRemoveButton?: boolean;
  collectionId?: string; // Needed for removal
  isRedeemed?: boolean; // Track if coupon is already redeemed
}

export const CouponDetailsModal: React.FC<CouponDetailsModalProps> = ({
  coupon,
  isOpen,
  onClose,
  onCollect,
  onShare,
  onAddToFavorites,
  onRedeem,
  onRemove,
  showCollectButton = true,
  showShareButton = true,
  showRedeemButton = false,
  showRemoveButton = false,
  collectionId,
  isRedeemed = false
}) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!coupon) return null;

  // Calculate discount display
  const getDiscountDisplay = () => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}% OFF`;
      case 'fixed_amount':
        return `₹${coupon.discount_value} OFF`;
      case 'buy_x_get_y':
        return 'BOGO';
      case 'free_item':
        return 'FREE';
      default:
        return `₹${coupon.discount_value} OFF`;
    }
  };

  // Calculate time remaining
  const getTimeStatus = () => {
    const now = new Date();
    const validFrom = new Date(coupon.valid_from || coupon.created_at);
    const validUntil = new Date(coupon.valid_until || coupon.expires_at);
    
    if (now < validFrom) {
      return { text: 'Not yet valid', isUrgent: false, isExpired: false, status: 'upcoming' };
    }
    
    if (validUntil <= now) {
      return { text: 'Expired', isUrgent: true, isExpired: true, status: 'expired' };
    }

    const diffInHours = Math.floor((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return { 
        text: diffInHours === 1 ? '1 hour left' : `${diffInHours} hours left`, 
        isUrgent: true,
        isExpired: false,
        status: 'expiring'
      };
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return { 
        text: diffInDays === 1 ? '1 day left' : `${diffInDays} days left`, 
        isUrgent: diffInDays <= 3,
        isExpired: false,
        status: 'active'
      };
    }

    return { 
      text: `${diffInDays} days left`, 
      isUrgent: false,
      isExpired: false,
      status: 'active'
    };
  };

  // Handle collect
  const handleCollect = async () => {
    if (!onCollect || isCollecting || coupon.isCollected) return;

    setIsCollecting(true);
    try {
      const success = await onCollect(coupon.id);
      if (success) {
        toast.success('Coupon collected successfully!');
      }
    } catch (error) {
      console.error('Collection error:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  // Handle redeem
  const handleRedeem = async () => {
    if (!onRedeem || isRedeeming || isRedeemed || timeStatus.isExpired) return;

    setIsRedeeming(true);
    try {
      await onRedeem(coupon.id);
      toast.success('Coupon redeemed successfully!');
      // Close modal after successful redemption
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Redemption error:', error);
      toast.error('Failed to redeem coupon');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Handle remove
  const handleRemove = async () => {
    if (!onRemove || !collectionId || isRemoving) return;

    setIsRemoving(true);
    try {
      await onRemove(collectionId);
      toast.success('Coupon removed from wallet');
      // Close modal after successful removal
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error('Removal error:', error);
      toast.error('Failed to remove coupon');
    } finally {
      setIsRemoving(false);
    }
  };

  // Handle copy code
  const handleCopyCode = () => {
    if (coupon.coupon_code) {
      navigator.clipboard.writeText(coupon.coupon_code);
      setCopiedCode(true);
      toast.success('Coupon code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const timeStatus = getTimeStatus();
  const discountDisplay = getDiscountDisplay();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Header with Image */}
              <div className="relative h-48 bg-gradient-to-r from-indigo-500 to-purple-600">
                {coupon.image_url && (
                  <img
                    src={coupon.image_url}
                    alt={coupon.title}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Status and Time Badge */}
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  {coupon.category && (
                    <span className="px-3 py-1 bg-white bg-opacity-90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-800">
                      {coupon.category.toUpperCase()}
                    </span>
                  )}
                  <span className={`px-3 py-1 backdrop-blur-sm rounded-full text-xs font-medium ${
                    timeStatus.isExpired 
                      ? 'bg-red-500 bg-opacity-90 text-white' 
                      : timeStatus.isUrgent 
                      ? 'bg-orange-500 bg-opacity-90 text-white' 
                      : 'bg-green-500 bg-opacity-90 text-white'
                  }`}>
                    <Clock className="inline w-3 h-3 mr-1" />
                    {timeStatus.text}
                  </span>
                </div>

                {/* Discount Badge */}
                <div className="absolute -bottom-6 left-6">
                  <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl shadow-lg">
                    <div className="text-3xl font-bold">{discountDisplay}</div>
                  </div>
                </div>

                {/* Collected Indicator */}
                {coupon.isCollected && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 pt-12 space-y-6">
                {/* Title and Description */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{coupon.title}</h2>
                  <p className="text-gray-600 leading-relaxed">{coupon.description}</p>
                </div>

                {/* Business Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center text-gray-700">
                    <Store className="w-5 h-5 mr-2 text-indigo-600" />
                    <span className="font-medium">
                      {coupon.business?.business_name || coupon.business_name || 'Business Name'}
                    </span>
                  </div>
                  
                  {(coupon.business?.address || coupon.address) && (
                    <div className="flex items-start text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{coupon.business?.address || coupon.address}</span>
                    </div>
                  )}
                  
                  {(coupon.business?.rating || coupon.business_rating) && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                      <span>{coupon.business?.rating || coupon.business_rating} rating</span>
                    </div>
                  )}
                </div>

                {/* Coupon Code */}
                {coupon.coupon_code && (
                  <div className="bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Coupon Code</p>
                        <p className="text-2xl font-bold text-indigo-600 font-mono tracking-wider">
                          {coupon.coupon_code}
                        </p>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                      >
                        {copiedCode ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 text-sm mb-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>Valid From</span>
                    </div>
                    <p className="text-gray-900 font-medium">
                      {format(new Date(coupon.valid_from || coupon.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 text-sm mb-1">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Valid Until</span>
                    </div>
                    <p className={`font-medium ${timeStatus.isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                      {format(new Date(coupon.valid_until || coupon.expires_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Terms & Conditions */}
                {(coupon.min_purchase_amount || coupon.minimum_purchase || 
                  coupon.max_discount_amount || coupon.maximum_discount || 
                  coupon.usage_limit || coupon.terms_conditions) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center text-yellow-800 font-medium mb-3">
                      <Info className="w-5 h-5 mr-2" />
                      <span>Terms & Conditions</span>
                    </div>
                    
                    <ul className="space-y-2 text-sm text-gray-700">
                      {(coupon.min_purchase_amount || coupon.minimum_purchase) && (
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Minimum purchase: ₹{coupon.min_purchase_amount || coupon.minimum_purchase}</span>
                        </li>
                      )}
                      
                      {coupon.discount_type === 'percentage' && (coupon.max_discount_amount || coupon.maximum_discount) && (
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Maximum discount: ₹{coupon.max_discount_amount || coupon.maximum_discount}</span>
                        </li>
                      )}
                      
                      {coupon.usage_limit && (
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>Usage limit: {coupon.usage_limit} per user</span>
                        </li>
                      )}
                      
                      {coupon.terms_conditions && coupon.terms_conditions !== 'N/A' && (
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{coupon.terms_conditions}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                  {/* Primary Action Row */}
                  <div className="flex items-center space-x-3">
                    {/* Collect Button (for search/discovery flow) */}
                    {showCollectButton && !coupon.isCollected && !timeStatus.isExpired && (
                      <button
                        onClick={handleCollect}
                        disabled={isCollecting}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center"
                      >
                        {isCollecting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Collecting...
                          </>
                        ) : (
                          <>
                            <Gift className="w-5 h-5 mr-2" />
                            Collect Coupon
                          </>
                        )}
                      </button>
                    )}

                    {/* Redeem Button (for wallet flow) */}
                    {showRedeemButton && !isRedeemed && !timeStatus.isExpired && (
                      <button
                        onClick={handleRedeem}
                        disabled={isRedeeming}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center"
                      >
                        {isRedeeming ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-5 h-5 mr-2" />
                            Redeem Now
                          </>
                        )}
                      </button>
                    )}

                    {/* Already Collected Status */}
                    {coupon.isCollected && !showRedeemButton && (
                      <div className="flex-1 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl font-medium flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Already Collected
                      </div>
                    )}

                    {/* Already Redeemed Status */}
                    {isRedeemed && (
                      <div className="flex-1 bg-blue-50 border border-blue-200 text-blue-700 px-6 py-3 rounded-xl font-medium flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Redeemed
                      </div>
                    )}

                    {/* Expired Status */}
                    {timeStatus.isExpired && (
                      <div className="flex-1 bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl font-medium flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Expired
                      </div>
                    )}
                  </div>

                  {/* Secondary Action Row */}
                  <div className="flex items-center space-x-3">
                    {showShareButton && (
                      <button
                        onClick={() => onShare?.(coupon.id)}
                        className="flex-1 px-6 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                      >
                        <Share2 className="w-5 h-5 mr-2" />
                        Share
                      </button>
                    )}

                    {onAddToFavorites && (
                      <SimpleSaveButton
                        itemId={coupon.id}
                        itemType="coupon"
                        size="lg"
                        itemData={{
                          title: coupon.title,
                          description: coupon.description,
                          discount_type: coupon.discount_type,
                          discount_value: coupon.discount_value,
                          business_name: businessName
                        }}
                      />
                    )}

                    {showRemoveButton && (
                      <button
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="px-6 py-3 bg-white border border-red-300 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        {isRemoving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-5 h-5 mr-2" />
                            Remove
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Usage Stats */}
                {(coupon.usage_count > 0 || coupon.collection_count > 0) && (
                  <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 pt-4 border-t border-gray-200">
                    {coupon.collection_count > 0 && (
                      <div className="flex items-center">
                        <Gift className="w-4 h-4 mr-1" />
                        <span>{coupon.collection_count} collected</span>
                      </div>
                    )}
                    {coupon.usage_count > 0 && (
                      <div className="flex items-center">
                        <Tag className="w-4 h-4 mr-1" />
                        <span>{coupon.usage_count} used</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CouponDetailsModal;
