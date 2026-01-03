/**
 * Contact Sync Settings Component
 * Story 9.2.7: Settings UI for Contact Sync
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, Trash2, Shield } from 'lucide-react';
import { 
  useHasContactsSynced, 
  useSyncContacts, 
  useDisableContactSync 
} from '../../hooks/useContactSync';
import { getLastSyncTime } from '../../services/contactSyncService';
import { Capacitor } from '@capacitor/core';
import { formatDistanceToNow } from 'date-fns';

export function ContactSyncSettings() {
  const { data: hasSynced } = useHasContactsSynced();
  const syncContacts = useSyncContacts();
  const disableSync = useDisableContactSync();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Load last sync time
  useEffect(() => {
    getLastSyncTime().then(setLastSync);
  }, [syncContacts.isSuccess]);

  if (!Capacitor.isNativePlatform()) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          Contact sync is only available on iOS and Android apps.
        </p>
      </div>
    );
  }

  const handleSyncNow = async () => {
    try {
      const matches = await syncContacts.mutateAsync();
      alert(`Found ${matches.length} friends from your contacts!`);
    } catch (error: any) {
      alert(error.message || 'Failed to sync contacts');
    }
  };

  const handleDisableSync = async () => {
    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    try {
      await disableSync.mutateAsync();
      setShowConfirmDelete(false);
      setLastSync(null);
      alert('Contact sync disabled. All contact data has been removed.');
    } catch (error: any) {
      alert(error.message || 'Failed to disable sync');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Smartphone className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Contact Sync</h3>
      </div>

      {/* Status */}
      <div className="p-4 bg-gray-50 rounded-lg">
        {!hasSynced && (
          <p className="text-sm text-gray-600">Never synced</p>
        )}
        {hasSynced && lastSync && (
          <p className="text-sm text-gray-600">
            Last synced {formatDistanceToNow(lastSync, { addSuffix: true })}
          </p>
        )}
        {syncContacts.isPending && (
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-sm text-blue-600">Syncing...</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleSyncNow}
          disabled={syncContacts.isPending}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncContacts.isPending ? 'animate-spin' : ''}`} />
          <span>{syncContacts.isPending ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        {hasSynced && (
          <button
            onClick={handleDisableSync}
            disabled={disableSync.isPending}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showConfirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {showConfirmDelete ? 'Confirm: Remove All Contacts' : 'Remove Contacts'}
            </span>
          </button>
        )}

        {showConfirmDelete && (
          <button
            onClick={() => setShowConfirmDelete(false)}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Privacy info */}
      <div className="p-4 bg-blue-50 rounded-lg flex items-start space-x-2">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Your privacy is protected</p>
          <p>
            Phone numbers are hashed before upload. We never store plain phone numbers.
            You can remove all contact data anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
