/**
 * Test Page: Deal Sharing Flow
 * Story 9.2.6: Deal Sharing Integration
 * 
 * Tests the FriendPickerModal with:
 * - Search for friends
 * - Multi-select functionality
 * - PYMK suggestions (placeholder)
 * - Recently shared with
 * - Share deal notifications
 */

import React, { useState } from 'react';
import { FriendPickerModal } from '../components/sharing';
import { Share2, CheckCircle, Users } from 'lucide-react';

export function TestDealSharing() {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [shareHistory, setShareHistory] = useState<Array<{
    dealId: string;
    friendCount: number;
    timestamp: number;
  }>>([]);

  // Mock deal data
  const mockDeals = [
    {
      id: '1',
      title: '50% Off Pizza Special',
      description: 'Get 50% off any large pizza',
      business: "Mario's Pizzeria",
      category: 'Food & Dining',
    },
    {
      id: '2',
      title: 'Buy 1 Get 1 Free Coffee',
      description: 'Morning special on all coffee drinks',
      business: 'Coffee Haven',
      category: 'Cafe',
    },
    {
      id: '3',
      title: '30% Off Spa Services',
      description: 'Relax and rejuvenate with our spa package',
      business: 'Serenity Spa',
      category: 'Wellness',
    },
  ];

  const [selectedDealId, setSelectedDealId] = useState(mockDeals[0].id);
  const selectedDeal = mockDeals.find(d => d.id === selectedDealId);

  const handleShareSuccess = (friendIds: string[]) => {
    console.log(`Successfully shared deal ${selectedDealId} with`, friendIds);
    
    // Add to history
    setShareHistory(prev => [
      {
        dealId: selectedDealId,
        friendCount: friendIds.length,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 9), // Keep last 10
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Story 9.2.6: Deal Sharing Test
          </h1>
          <p className="text-gray-600 mt-2">
            Test the FriendPickerModal with search, multi-select, and deal sharing
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🧪 Test Instructions</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Select a deal from the list below</li>
            <li>Click "Share Deal" to open the friend picker</li>
            <li>Search for friends (try "user" to see results)</li>
            <li>Select multiple friends using checkboxes</li>
            <li>Click "Share with X friends" to send notifications</li>
            <li>Check sharing history below to verify success</li>
          </ol>
        </div>

        {/* Deal Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Deal to Share</h2>
          <div className="space-y-3">
            {mockDeals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => setSelectedDealId(deal.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  selectedDealId === deal.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{deal.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{deal.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{deal.business}</span>
                      <span>•</span>
                      <span>{deal.category}</span>
                    </div>
                  </div>
                  {selectedDealId === deal.id && (
                    <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 ml-3" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Share Button */}
        {selectedDeal && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Share Selected Deal</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Selected Deal:</p>
                <p className="text-lg font-semibold text-gray-900">{selectedDeal.title}</p>
                <p className="text-sm text-gray-600">{selectedDeal.business}</p>
              </div>
              <button
                onClick={() => setIsPickerOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
              >
                <Share2 className="w-5 h-5" />
                Share Deal
              </button>
            </div>
          </div>
        )}

        {/* Sharing History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sharing History</h2>
          {shareHistory.length > 0 ? (
            <div className="space-y-3">
              {shareHistory.map((share, idx) => {
                const deal = mockDeals.find(d => d.id === share.dealId);
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Shared "{deal?.title}" with {share.friendCount} friend{share.friendCount > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(share.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No shares yet. Share a deal to see history here.</p>
            </div>
          )}
        </div>

        {/* Feature Checklist */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Checklist</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Friend picker modal with search bar</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Multi-select with checkboxes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Search integration (Story 9.2.1 + 9.2.5)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Recently shared with section (localStorage)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Share button sends notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Selected friends counter</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Responsive design (mobile + desktop)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-yellow-500 rounded flex items-center justify-center">
                <span className="text-yellow-600 text-xs">!</span>
              </div>
              <span className="text-gray-600">PYMK suggestions (Story 9.2.2 pending)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Friend Picker Modal */}
      <FriendPickerModal
        dealId={selectedDealId}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSuccess={handleShareSuccess}
      />
    </div>
  );
}
