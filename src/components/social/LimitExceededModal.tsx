// =====================================================
// Story 5.5: Enhanced Sharing Limits - Limit Exceeded Modal
// =====================================================

import React from 'react';
import { X, AlertCircle, Users, Clock } from 'lucide-react';
import type { LimitExceededModalProps } from '../../types/sharingLimits';

/**
 * Modal displayed when user exceeds daily sharing limits
 */
export const LimitExceededModal: React.FC<LimitExceededModalProps> = ({
  isOpen,
  onClose,
  limitType,
  currentCount,
  limitValue,
  friendName,
  isDriver,
}) => {
  if (!isOpen) return null;

  const limitTypeText = limitType === 'per_friend'
    ? `shares to ${friendName || 'this friend'}`
    : 'total shares';

  const driverText = isDriver ? ' (Driver)' : '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Daily Limit Reached
          </h2>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">
              {limitType === 'per_friend' ? (
                <>
                  You've reached your daily limit of <span className="font-semibold text-gray-900">{limitValue} coupons</span> to{' '}
                  {friendName ? (
                    <span className="font-semibold text-gray-900">{friendName}</span>
                  ) : (
                    <span className="font-semibold text-gray-900">this friend</span>
                  )}.
                </>
              ) : (
                <>
                  You've reached your daily limit of <span className="font-semibold text-gray-900">{limitValue} total coupons</span> shared.
                </>
              )}
            </p>

            {/* Current count */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">
                  Today's {limitTypeText}{driverText}
                </span>
              </div>
              <div className="text-3xl font-bold text-amber-600">
                {currentCount} / {limitValue}
              </div>
            </div>

            {/* Reset time */}
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Resets at midnight in your timezone</span>
            </div>
          </div>

          {/* Driver info (if applicable) */}
          {isDriver && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 text-center">
                🚗 <span className="font-semibold">Driver Status:</span> You have enhanced sharing limits!
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">💡 Tips:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {limitType === 'per_friend' ? (
                <>
                  <li>• Try sharing to other friends</li>
                  <li>• Come back tomorrow to share more</li>
                  <li>• Save this coupon to your wallet</li>
                </>
              ) : (
                <>
                  <li>• Your limit resets at midnight</li>
                  <li>• {isDriver ? 'As a Driver, you have higher limits!' : 'Become a Driver to get higher limits!'}</li>
                  <li>• Save coupons to share tomorrow</li>
                </>
              )}
            </ul>
          </div>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </>
  );
};

export default LimitExceededModal;
