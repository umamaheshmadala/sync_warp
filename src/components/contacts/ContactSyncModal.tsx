/**
 * Contact Sync Modal - Explainer and Permission Request
 * Story 9.2.3: Contact Sync Integration
 */

import React, { useState } from 'react';
import { X, Users, Shield, Check, Loader2 } from 'lucide-react';
import { useSyncContacts } from '../../hooks/useContactSync';
import { Capacitor } from '@capacitor/core';

interface ContactSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactSyncModal({ isOpen, onClose }: ContactSyncModalProps) {
  const [hasConsent, setHasConsent] = useState(false);
  const syncContacts = useSyncContacts();

  if (!isOpen) return null;
  if (!Capacitor.isNativePlatform()) {
    return null; // Only show on mobile
  }

  const handleSync = async () => {
    if (!hasConsent) return;
    
    try {
      const matches = await syncContacts.mutateAsync();
      // Show success - matches will be displayed in PYMK
      alert(`Found ${matches.length} friends from your contacts!`);
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to sync contacts');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Find Friends from Contacts</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explainer */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-primary-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Connect with Friends</h3>
              <p className="text-sm text-gray-600">
                We'll help you find which of your contacts are already on SynC
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-green-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Your Privacy Matters</h3>
              <p className="text-sm text-gray-600">
                Phone numbers are hashed before upload. We never store plain phone numbers.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Check className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">You're in Control</h3>
              <p className="text-sm text-gray-600">
                You can disable contact sync anytime in Settings
              </p>
            </div>
          </div>
        </div>

        {/* Consent checkbox */}
        <label className="flex items-start space-x-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(e) => setHasConsent(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700">
            I agree to sync my contacts to find friends on SynC
          </span>
        </label>

        {/* Progress indicator */}
        {syncContacts.progress && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                Syncing contacts...
              </span>
              <span className="text-sm text-blue-700">
                {syncContacts.progress.synced}/{syncContacts.progress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(syncContacts.progress.synced / syncContacts.progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={syncContacts.isPending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Maybe Later
          </button>
          <button
            onClick={handleSync}
            disabled={!hasConsent || syncContacts.isPending}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {syncContacts.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync Contacts'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
