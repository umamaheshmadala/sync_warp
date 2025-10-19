// src/components/following/NotificationPreferencesModal.tsx
// Modal for users to customize notification preferences for a followed business

import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, Smartphone, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBusinessFollowing, NotificationPreferences } from '../../hooks/useBusinessFollowing';
import { cn } from '../../lib/utils';

interface NotificationPreferencesModalProps {
  businessId: string;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
  currentPreferences?: NotificationPreferences;
  currentChannel?: 'in_app' | 'push' | 'email' | 'sms' | 'all';
}

const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  businessId,
  businessName,
  isOpen,
  onClose,
  currentPreferences,
  currentChannel = 'in_app',
}) => {
  const { updateNotificationPreferences } = useBusinessFollowing();
  const [saving, setSaving] = useState(false);
  
  // Local state for preferences
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_products: true,
    new_offers: true,
    new_coupons: true,
    announcements: true,
  });

  const [channel, setChannel] = useState<'in_app' | 'push' | 'email' | 'sms' | 'all'>(currentChannel);

  // Initialize with current preferences
  useEffect(() => {
    if (currentPreferences) {
      setPreferences(currentPreferences);
    }
    if (currentChannel) {
      setChannel(currentChannel);
    }
  }, [currentPreferences, currentChannel]);

  // Handle preference toggle
  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateNotificationPreferences(businessId, preferences, channel);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  // Check if any preference is enabled
  const hasAnyEnabled = Object.values(preferences).some(v => v === true);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                <p className="text-sm text-gray-600 mt-1">{businessName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {/* What updates section */}
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-4">What updates do you want?</h3>
                <div className="space-y-3">
                  {/* New Products */}
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          preferences.new_products ? "bg-indigo-100" : "bg-gray-100"
                        )}>
                          <span className="text-xl">📦</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">New Products</div>
                        <div className="text-sm text-gray-500">When they add new products</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.new_products}
                      onChange={() => togglePreference('new_products')}
                      className="h-5 w-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>

                  {/* New Offers */}
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          preferences.new_offers ? "bg-green-100" : "bg-gray-100"
                        )}>
                          <span className="text-xl">🎉</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">New Offers & Deals</div>
                        <div className="text-sm text-gray-500">Special promotions and discounts</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.new_offers}
                      onChange={() => togglePreference('new_offers')}
                      className="h-5 w-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>

                  {/* New Coupons */}
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          preferences.new_coupons ? "bg-yellow-100" : "bg-gray-100"
                        )}>
                          <span className="text-xl">🎫</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">New Coupons</div>
                        <div className="text-sm text-gray-500">Redeemable coupons and vouchers</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.new_coupons}
                      onChange={() => togglePreference('new_coupons')}
                      className="h-5 w-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>

                  {/* Announcements */}
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          preferences.announcements ? "bg-purple-100" : "bg-gray-100"
                        )}>
                          <span className="text-xl">📢</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Important Announcements</div>
                        <div className="text-sm text-gray-500">Updates and news from the business</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.announcements}
                      onChange={() => togglePreference('announcements')}
                      className="h-5 w-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>

              {/* How to be notified section */}
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-4">How do you want to be notified?</h3>
                <div className="space-y-2">
                  {/* In-app */}
                  <label className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="channel"
                      checked={channel === 'in_app'}
                      onChange={() => setChannel('in_app')}
                      className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex items-center space-x-2">
                      <Bell className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-gray-900">In-app only</span>
                      <span className="text-sm text-gray-500">(Default)</span>
                    </div>
                  </label>

                  {/* Push - Coming soon */}
                  <label className="flex items-center p-3 rounded-lg bg-gray-50 cursor-not-allowed opacity-60">
                    <input
                      type="radio"
                      name="channel"
                      disabled
                      className="h-4 w-4 text-gray-400"
                    />
                    <div className="ml-3 flex items-center space-x-2">
                      <Smartphone className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-500">Push notifications</span>
                      <span className="text-sm text-gray-400">(Coming soon)</span>
                    </div>
                  </label>

                  {/* Email - Coming soon */}
                  <label className="flex items-center p-3 rounded-lg bg-gray-50 cursor-not-allowed opacity-60">
                    <input
                      type="radio"
                      name="channel"
                      disabled
                      className="h-4 w-4 text-gray-400"
                    />
                    <div className="ml-3 flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-500">Email</span>
                      <span className="text-sm text-gray-400">(Coming soon)</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Warning if nothing selected */}
              {!hasAnyEnabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <div className="text-yellow-600 text-xl">⚠️</div>
                  <div>
                    <div className="font-medium text-yellow-900">No updates selected</div>
                    <div className="text-sm text-yellow-700 mt-1">
                      You won't receive any updates from this business. Consider enabling at least one category.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end space-x-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center space-x-2"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPreferencesModal;
