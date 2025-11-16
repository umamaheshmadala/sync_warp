/**
 * Friends Page
 * Story 9.3.1: Friends List Component
 * 
 * Main friends page at /friends route
 */

import React from 'react';
import { Users } from 'lucide-react';
import { FriendsList } from '../components/friends/FriendsList';

export function FriendsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Friends</h1>
          </div>
          <p className="text-gray-600">Stay connected with your friends</p>
        </div>

        {/* Friends List */}
        <FriendsList />
      </div>
    </div>
  );
}

export default FriendsPage;
