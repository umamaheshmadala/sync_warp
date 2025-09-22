// src/pages/TestFriendManagement.tsx
// Test page to demonstrate friend management functionality

import React from 'react';
import { FriendIntegration, FriendHeaderButton } from '../components/FriendIntegration';
import { useAuthStore } from '../store/authStore';

const TestFriendManagement: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to test the friend management system.
          </p>
          <p className="text-sm text-gray-500">
            You can sign in with one of the test accounts:
            <br />• testuser1@gmail.com
            <br />• testuser2@gmail.com 
            <br />• testuser3@gmail.com
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Friend Button */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Friend Management Test</h1>
              <p className="text-sm text-gray-500">
                Logged in as: {user.email} ({user.user_metadata?.full_name || 'No name'})
              </p>
            </div>
            <FriendHeaderButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              🧪 Friend Management Testing Instructions
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Database Setup:</strong></p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Go to your Supabase project dashboard</li>
                <li>Navigate to SQL Editor</li>
                <li>Copy and run the SQL from <code>setup-friend-database.sql</code></li>
                <li>This will create all necessary tables and set up your test users</li>
              </ol>
              
              <p className="pt-2"><strong>Testing Steps:</strong></p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Click the "Friends" button in the header above</li>
                <li>Try "Find Friends" to search for other test users</li>
                <li>Search for "Test User 1", "Test User 2", or "Test User 3"</li>
                <li>Send friend requests and test the functionality</li>
                <li>Log in as different test users to accept/reject requests</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Available Test Users */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Test Users</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-medium text-gray-900">Test User 1</h4>
              <p className="text-sm text-gray-500">testuser1@gmail.com</p>
              <p className="text-xs text-green-600 mt-1">🟢 Online</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-medium text-gray-900">Test User 2</h4>
              <p className="text-sm text-gray-500">testuser2@gmail.com</p>
              <p className="text-xs text-green-600 mt-1">🟢 Online</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-medium text-gray-900">Test User 3</h4>
              <p className="text-sm text-gray-500">testuser3@gmail.com</p>
              <p className="text-xs text-gray-500 mt-1">⚪ Offline (1h ago)</p>
            </div>
          </div>
        </div>

        {/* Friend Management Interface */}
        <FriendIntegration />

        {/* Feature Status */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Friend Management Features Status</h3>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 mb-2">
                    <span className="text-green-600 font-semibold text-sm">✓</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">User Search</p>
                  <p className="text-xs text-gray-500">Find users by name/email</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 mb-2">
                    <span className="text-green-600 font-semibold text-sm">✓</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Friend Requests</p>
                  <p className="text-xs text-gray-500">Send/accept/reject requests</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 mb-2">
                    <span className="text-green-600 font-semibold text-sm">✓</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Friends List</p>
                  <p className="text-xs text-gray-500">View and manage friends</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 mb-2">
                    <span className="text-green-600 font-semibold text-sm">✓</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Activity Feed</p>
                  <p className="text-xs text-gray-500">Real-time friend activities</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Debug Information</h4>
          <div className="text-xs text-gray-600 font-mono">
            <p>User ID: {user.id}</p>
            <p>Email: {user.email}</p>
            <p>Name: {user.user_metadata?.full_name || 'Not set'}</p>
            <p>Authenticated: {user.aud === 'authenticated' ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TestFriendManagement;