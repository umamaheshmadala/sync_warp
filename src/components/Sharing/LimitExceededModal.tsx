/**
 * LimitExceededModal Component
 * Story 5.5: Enhanced Sharing Limits
 * 
 * Modal shown when a user attempts to share but has exceeded their limits.
 * Provides clear messaging about which limit was hit and suggests actions.
 */

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertCircle, Users, TrendingUp, Clock, Star, X } from 'lucide-react';
import type { SharingPermissionCheck } from '../types/sharingLimits';

interface LimitExceededModalProps {
  open: boolean;
  onClose: () => void;
  permissionCheck: SharingPermissionCheck | null;
  isDriver?: boolean;
  onUpgradeClick?: () => void;
}

export const LimitExceededModal: React.FC<LimitExceededModalProps> = ({
  open,
  onClose,
  permissionCheck,
  isDriver = false,
  onUpgradeClick,
}) => {
  if (!permissionCheck || permissionCheck.can_share) {
    return null;
  }

  const isPerFriendLimit = permissionCheck.reason.includes('friend');
  const isTotalLimit = permissionCheck.reason.includes('total');

  const getIcon = () => {
    if (isPerFriendLimit) return <Users className="h-8 w-8 text-amber-500" />;
    if (isTotalLimit) return <TrendingUp className="h-8 w-8 text-red-500" />;
    return <AlertCircle className="h-8 w-8 text-gray-500" />;
  };

  const getTitle = () => {
    if (isPerFriendLimit) return 'Per-Friend Limit Reached';
    if (isTotalLimit) return 'Daily Limit Reached';
    return 'Sharing Limit Reached';
  };

  const getDescription = () => {
    if (isPerFriendLimit) {
      return `You've already shared ${permissionCheck.per_friend_limit} coupons with this friend today. You can share more coupons with other friends or wait until tomorrow.`;
    }
    if (isTotalLimit) {
      return `You've reached your daily sharing limit of ${permissionCheck.total_daily_limit} coupons. Your limit will reset tomorrow.`;
    }
    return permissionCheck.reason;
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white px-6 py-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                {/* Close button */}
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  {getIcon()}
                  <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900">
                    {getTitle()}
                  </Dialog.Title>
                </div>
                <p className="text-base text-gray-600 mb-4">
                  {getDescription()}
                </p>

        {/* Current Usage Stats */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Today's Total</span>
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-gray-50 text-gray-700 border border-gray-300">
              {permissionCheck.total_shares_today} / {permissionCheck.total_daily_limit}
            </span>
          </div>

          {isPerFriendLimit && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">To This Friend</span>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-gray-50 text-gray-700 border border-gray-300">
                {permissionCheck.shares_to_friend_today} / {permissionCheck.per_friend_limit}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-gray-600">
              Limits reset daily at midnight
            </span>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">What you can do:</h4>
          
          <ul className="space-y-2 text-sm text-gray-600">
            {isPerFriendLimit && (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">•</span>
                  <span>Share this coupon with a different friend ({permissionCheck.remaining_total} shares left today)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>Come back tomorrow to share more with this friend</span>
                </li>
              </>
            )}
            
            {isTotalLimit && (
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Come back tomorrow - your limit will reset at midnight</span>
              </li>
            )}
          </ul>
        </div>

        {/* Driver Upgrade CTA (only for non-Drivers) */}
        {!isDriver && onUpgradeClick && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Star className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Want Higher Limits?
                </h4>
                <p className="text-xs text-blue-800 mb-3">
                  Become a Driver and unlock:
                </p>
                <ul className="text-xs text-blue-800 space-y-1 mb-3">
                  <li>• <strong>5 coupons per friend/day</strong> (vs {permissionCheck.per_friend_limit})</li>
                  <li>• <strong>30 total coupons/day</strong> (vs {permissionCheck.total_daily_limit})</li>
                  <li>• Priority support & exclusive features</li>
                </ul>
                <button
                  onClick={onUpgradeClick}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Learn About Driving
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Driver Message (for Drivers who hit limit) */}
        {isDriver && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">Driver</span>
              <span>You already have the highest sharing limits available!</span>
            </p>
          </div>
        )}

                {/* Footer */}
                <div className="mt-6">
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Got It
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default LimitExceededModal;
