// src/examples/FriendSystemExample.tsx
// This file demonstrates how to integrate the friend management system

import React, { useState } from 'react';
import { Users, UserPlus, Activity } from 'lucide-react';

// Import the friend management components
import { 
  FriendManagement,
  ContactsSidebar,
  AddFriend,
  FriendActivityFeed
} from '../components';

// Example 1: Complete Friend Management Dashboard
export const CompleteFriendDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Friend Management</h1>
      <FriendManagement />
    </div>
  );
};

// Example 2: Individual Components Integration
export const IndividualComponentsExample: React.FC = () => {
  const [showContacts, setShowContacts] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Social Dashboard
          </h1>
          
          {/* Action Buttons */}
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => setShowContacts(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Users className="h-5 w-5" />
              <span>View Friends</span>
            </button>
            
            <button
              onClick={() => setShowAddFriend(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              <span>Add Friend</span>
            </button>
          </div>
          
          {/* Activity Feed */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Friend Activity
              </h2>
            </div>
            <FriendActivityFeed 
              className="max-w-2xl" 
              limit={10} 
              showFilters={true} 
            />
          </div>
        </div>
        
        {/* Modals */}
        <ContactsSidebar 
          isOpen={showContacts}
          onClose={() => setShowContacts(false)}
        />
        
        <AddFriend 
          isOpen={showAddFriend}
          onClose={() => setShowAddFriend(false)}
        />
      </div>
    </div>
  );
};

// Example 3: Embedded in Existing Layout
export const EmbeddedFriendFeatures: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'friends' | 'activity'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'friends'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Activity
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
            <p className="text-gray-600 mb-8">Welcome to your social dashboard!</p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-indigo-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">12</p>
                    <p className="text-sm text-gray-500">Friends</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">24</p>
                    <p className="text-sm text-gray-500">Activities</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <UserPlus className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">3</p>
                    <p className="text-sm text-gray-500">Requests</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Friend Management</h1>
            <FriendManagement />
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Friend Activity</h1>
            <FriendActivityFeed className="w-full" limit={20} showFilters={true} />
          </div>
        )}
      </main>
    </div>
  );
};

// Example 4: Mobile-First Friend Interface
export const MobileFriendInterface: React.FC = () => {
  const [showContacts, setShowContacts] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Friends</h1>
          <button
            onClick={() => setShowContacts(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
          >
            <Users className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile Content */}
      <main className="p-4">
        <FriendActivityFeed 
          className="w-full" 
          limit={15} 
          showFilters={false} 
        />
      </main>

      {/* Mobile Sidebar */}
      <ContactsSidebar 
        isOpen={showContacts}
        onClose={() => setShowContacts(false)}
      />
    </div>
  );
};

// Export all examples
export default {
  CompleteFriendDashboard,
  IndividualComponentsExample,
  EmbeddedFriendFeatures,
  MobileFriendInterface
};