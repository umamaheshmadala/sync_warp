/**
 * EmptyState Component
 * Story 9.3.1: Friends List Component
 * 
 * Shows when user has no friends yet
 */

import React from 'react';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NoFriendsEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 mb-6 text-gray-300">
        <Users className="w-full h-full" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Friends Yet</h3>
      <p className="text-gray-600 mb-8 max-w-sm">
        Start building your network by finding and adding friends
      </p>
      <button
        onClick={() => navigate('/friends/search')}
        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-lg hover:shadow-xl"
      >
        Find Friends
      </button>
    </div>
  );
}
