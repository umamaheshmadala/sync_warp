// FollowPromptModal.tsx
// Modal to prompt users to follow a business after viewing a shared offer

import React from 'react';
import { X, Bell, TrendingUp } from 'lucide-react';

interface Business {
  id: string;
  business_name: string;
  logo_url?: string;
}

interface FollowPromptModalProps {
  business: Business;
  onFollow: () => void;
  onClose: () => void;
}

export const FollowPromptModal: React.FC<FollowPromptModalProps> = ({
  business,
  onFollow,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Business logo */}
        <div className="flex justify-center mb-4">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.business_name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {business.business_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
          Stay Updated!
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          Follow <span className="font-semibold">{business.business_name}</span> to get notified about new offers, products, and promotions.
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Bell className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Get Notified</p>
              <p className="text-sm text-gray-600">Be the first to know about new offers</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Never Miss a Deal</p>
              <p className="text-sm text-gray-600">Get updates on exclusive promotions</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onFollow}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Follow Business
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Maybe Later
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          You can customize notification preferences anytime in settings
        </p>
      </div>
    </div>
  );
};

export default FollowPromptModal;
