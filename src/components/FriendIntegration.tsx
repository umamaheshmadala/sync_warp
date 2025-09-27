// src/components/FriendIntegration.tsx
// Quick integration component to add friend management to your app

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, UserPlus, Activity, MessageCircle } from 'lucide-react';
import AddFriend from './AddFriend';

// Simple integration component that can be added anywhere in your app
export const FriendIntegration: React.FC = () => {
  const [showAddFriend, setShowAddFriend] = useState(false);
  const location = useLocation();
  
  // Only show on social page
  const shouldShow = location.pathname === '/social';
  
  // Don't render on other pages
  if (!shouldShow) {
    return null;
  }

  if (showAddFriend) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-auto relative">
          <button
            onClick={() => setShowAddFriend(false)}
            className="absolute top-4 right-4 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="p-6">
            <AddFriend isOpen={true} onClose={() => setShowAddFriend(false)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 m-4">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
          <Users className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Friend Management System</h3>
        <p className="text-sm text-gray-500 mb-6">
          Connect with Test User 1, Test User 2, and Test User 3. 
          Search, add friends, and manage your social connections.
        </p>
        <button
          onClick={() => setShowAddFriend(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Test Friend Search
        </button>
      </div>

      {/* Feature Preview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <UserPlus className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <h4 className="font-medium text-gray-900 text-sm">Add Friends</h4>
          <p className="text-xs text-gray-500">Search and send friend requests</p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <MessageCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <h4 className="font-medium text-gray-900 text-sm">Share Deals</h4>
          <p className="text-xs text-gray-500">Share deals with friends</p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <Activity className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <h4 className="font-medium text-gray-900 text-sm">Activity Feed</h4>
          <p className="text-xs text-gray-500">See friend activities</p>
        </div>
      </div>
    </div>
  );
};

// Alternative: Simple header integration
export const FriendHeaderButton: React.FC = () => {
  const [showFriendManagement, setShowFriendManagement] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowFriendManagement(true)}
        className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Users className="h-4 w-4 mr-2" />
        Friends
        <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          3
        </span>
      </button>

      {showFriendManagement && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-screen overflow-auto relative">
            <button
              onClick={() => setShowFriendManagement(false)}
              className="absolute top-4 right-4 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-2"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-6">
              <FriendManagement />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FriendIntegration;