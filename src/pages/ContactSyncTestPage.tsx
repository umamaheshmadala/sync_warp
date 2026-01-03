/**
 * Contact Sync Test Page
 * Story 9.3.6: Contact Sync Permission Flow
 * 
 * Test page to trigger and verify contact sync functionality
 */

import { useState } from 'react';
import { ContactSyncModal } from '../components/contacts/ContactSyncModal';
import { useContactsPermission, useHasContactsSynced, useContactMatches } from '../hooks/useContactSync';
import { Capacitor } from '@capacitor/core';

export default function ContactSyncTestPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { data: hasPermission } = useContactsPermission();
    const { data: hasSynced } = useHasContactsSynced();
    const { data: matches } = useContactMatches();

    const isMobile = Capacitor.isNativePlatform();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Contact Sync Test Page
                    </h1>
                    <p className="text-gray-600">
                        Story 9.3.6: Contact Sync Permission Flow
                    </p>
                </div>

                {/* Platform Check */}
                <div className={`rounded-lg shadow p-6 mb-6 ${isMobile ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <h2 className="text-lg font-semibold mb-2">
                        Platform: {isMobile ? '📱 Mobile (Capacitor)' : '💻 Web Browser'}
                    </h2>
                    {!isMobile && (
                        <p className="text-sm text-yellow-800">
                            ⚠️ Contact sync is only available on mobile devices. This page will show limited functionality on web.
                        </p>
                    )}
                </div>

                {/* Status */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium text-gray-700">Contacts Permission</span>
                            <span className={`text-sm font-semibold ${hasPermission ? 'text-green-600' : 'text-gray-400'}`}>
                                {hasPermission ? '✅ Granted' : '❌ Not Granted'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium text-gray-700">Has Synced Before</span>
                            <span className={`text-sm font-semibold ${hasSynced ? 'text-green-600' : 'text-gray-400'}`}>
                                {hasSynced ? '✅ Yes' : '❌ No'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium text-gray-700">Contact Matches Found</span>
                            <span className="text-sm font-semibold text-blue-600">
                                {matches?.length || 0} matches
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                    <div className="space-y-3">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            🚀 Open Contact Sync Modal
                        </button>

                        {!isMobile && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                                💡 <strong>Note:</strong> The modal will appear but contact sync won't work on web.
                                Test on a mobile device for full functionality.
                            </div>
                        )}
                    </div>
                </div>

                {/* Matched Contacts */}
                {matches && matches.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Matched Contacts ({matches.length})
                        </h2>
                        <div className="space-y-2">
                            {matches.map((match, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                        <span className="text-indigo-600 font-semibold">
                                            {match.full_name?.charAt(0) || '?'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{match.full_name}</div>
                                        <div className="text-sm text-gray-500">{match.username}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Testing Instructions</h3>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Click "Open Contact Sync Modal" button</li>
                        <li>Read the explainer and check the consent checkbox</li>
                        <li>Click "Sync Contacts" to trigger permission request</li>
                        <li>Grant permission when Android asks</li>
                        <li>Watch the sync progress</li>
                        <li>Verify matches appear above</li>
                    </ol>
                </div>
            </div>

            {/* Contact Sync Modal */}
            <ContactSyncModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
