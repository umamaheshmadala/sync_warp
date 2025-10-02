import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Gift,
  Users,
  Share2,
  CheckCircle,
  AlertCircle,
  Loader,
  Tag,
  Store,
  Calendar,
  TrendingUp,
  Heart,
  Sparkles
} from 'lucide-react';
import { Coupon } from '../../types/coupon';
import FriendSelector from './FriendSelector';
import SharingStatsCard from './SharingStatsCard';
import LimitExceededModal from './LimitExceededModal';
import { useSharingLimits } from '../../hooks/useSharingLimits';
import { toast } from 'react-hot-toast';

export interface ShareCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon;
  couponId: string;
  collectionId: string;
  currentUserId: string;
  onShareSuccess?: () => void;
}

type ShareStep = 'select-friend' | 'confirm' | 'sharing' | 'success' | 'error';

const ShareCouponModal: React.FC<ShareCouponModalProps> = ({
  isOpen,
  onClose,
  coupon,
  couponId,
  collectionId,
  currentUserId,
  onShareSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<ShareStep>('select-friend');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedFriendEmail, setSelectedFriendEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLimitExceeded, setShowLimitExceeded] = useState(false);

  const {
    shareWithValidation,
    stats,
    limits,
    loading: sharingLoading,
    canShareMore,
    remainingTotal,
    refreshStats
  } = useSharingLimits();

  // Handle friend selection
  const handleFriendSelect = (friendId: string, friendEmail: string) => {
    setSelectedFriendId(friendId);
    setSelectedFriendEmail(friendEmail);
    setCurrentStep('confirm');
  };

  // Handle cancel
  const handleCancel = () => {
    setCurrentStep('select-friend');
    setSelectedFriendId(null);
    setSelectedFriendEmail(null);
    onClose();
  };

  // Handle back to friend selection
  const handleBack = () => {
    setCurrentStep('select-friend');
    setSelectedFriendId(null);
    setSelectedFriendEmail(null);
  };

  // Handle share confirmation
  const handleConfirmShare = async () => {
    if (!selectedFriendId) return;

    try {
      setCurrentStep('sharing');
      setErrorMessage(null);

      // Call shareWithValidation with all three parameters
      await shareWithValidation(selectedFriendId, couponId, collectionId);

      // Success!
      setCurrentStep('success');
      
      // Refresh stats
      await refreshStats();

      // Call success callback
      setTimeout(() => {
        onShareSuccess?.();
        handleCancel();
      }, 2000);

    } catch (error: any) {
      console.error('Error sharing coupon:', error);
      
      // Check if it's a limit exceeded error
      if (error.message?.includes('limit') || error.message?.includes('Limit')) {
        setShowLimitExceeded(true);
      } else {
        setErrorMessage(error.message || 'Failed to share coupon. Please try again.');
        setCurrentStep('error');
      }
    }
  };

  // Format discount display
  const formatDiscount = (coupon: Coupon): string => {
    if (coupon.type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `₹${coupon.discount_value} OFF`;
  };

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-friend':
        return 'Share Coupon';
      case 'confirm':
        return 'Confirm Sharing';
      case 'sharing':
        return 'Sharing...';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error';
      default:
        return 'Share Coupon';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={handleCancel}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{getStepTitle()}</h2>
                      <p className="text-sm text-gray-600">
                        {canShareMore 
                          ? `${remainingTotal || 0} shares remaining today`
                          : 'Daily limit reached'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {/* Coupon Preview - Always visible */}
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-sm">
                      <div className="flex items-start space-x-4">
                        {/* Coupon Image */}
                        {coupon.image_url && (
                          <img
                            src={coupon.image_url}
                            alt={coupon.title}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        )}

                        {/* Coupon Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{coupon.title}</h3>
                            <div className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-bold text-sm whitespace-nowrap ml-2">
                              {formatDiscount(coupon)}
                            </div>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Store className="w-4 h-4 mr-2 text-gray-400" />
                              {coupon.business_name}
                            </div>
                            {coupon.expires_at && (
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                Valid until {new Date(coupon.expires_at).toLocaleDateString()}
                              </div>
                            )}
                            {coupon.minimum_purchase && (
                              <div className="flex items-center">
                                <Tag className="w-4 h-4 mr-2 text-gray-400" />
                                Min. purchase: ₹{coupon.minimum_purchase}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sharing Stats Card */}
                    {stats && (
                      <div className="mt-4">
                        <SharingStatsCard stats={stats} compact={true} />
                      </div>
                    )}
                  </div>

                  {/* Step Content */}
                  <AnimatePresence mode="wait">
                    {currentStep === 'select-friend' && (
                      <motion.div
                        key="select-friend"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <FriendSelector
                          onSelect={handleFriendSelect}
                          onCancel={handleCancel}
                          currentUserId={currentUserId}
                        />
                      </motion.div>
                    )}

                    {currentStep === 'confirm' && (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-6"
                      >
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Ready to Share?
                          </h3>
                          <p className="text-sm text-gray-600">
                            You're about to share this coupon with{' '}
                            <span className="font-medium text-gray-900">{selectedFriendEmail}</span>
                          </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start">
                              <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                              <span>This coupon will be removed from your wallet</span>
                            </li>
                            <li className="flex items-start">
                              <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                              <span>Your friend will receive it in their wallet instantly</span>
                            </li>
                            <li className="flex items-start">
                              <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                              <span>You can share up to {limits?.per_friend_limit || 3} coupons per friend per day</span>
                            </li>
                          </ul>
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={handleBack}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleConfirmShare}
                            disabled={!canShareMore}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            <Share2 className="w-5 h-5" />
                            <span>Confirm & Share</span>
                          </button>
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sharing Coupon...</h3>
                        <p className="text-sm text-gray-600">Please wait while we transfer the coupon</p>
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
                          Coupon shared successfully with{' '}
                          <span className="font-medium text-gray-900">{selectedFriendEmail}</span>
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <Sparkles className="w-4 h-4" />
                          <span>They'll love this surprise!</span>
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
                          {errorMessage || 'Something went wrong while sharing the coupon'}
                        </p>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleBack}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                          >
                            Try Again
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Limit Exceeded Modal */}
      <LimitExceededModal
        isOpen={showLimitExceeded}
        onClose={() => {
          setShowLimitExceeded(false);
          handleCancel();
        }}
        stats={stats}
        limits={limits}
      />
    </>
  );
};

export default ShareCouponModal;
