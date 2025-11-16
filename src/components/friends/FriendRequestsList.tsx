/**
 * Friend Requests List Component
 * Story 9.3.2: Friend Requests UI
 * 
 * Displays friend requests with Received/Sent tabs
 */

import React, { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { FriendRequestCard } from './FriendRequestCard';
import { useFriendRequests } from '../../hooks/friends/useFriendRequests';
import { cn } from '../../lib/utils';

export function FriendRequestsList() {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  
  const { 
    requests, 
    isLoading, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage 
  } = useFriendRequests(activeTab);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              'flex-1 px-6 py-4 font-medium transition-all relative',
              activeTab === 'received'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              <span>Received</span>
              {activeTab === 'received' && requests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                  {requests.length}
                </span>
              )}
            </div>
            {activeTab === 'received' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              'flex-1 px-6 py-4 font-medium transition-all relative',
              activeTab === 'sent'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              <span>Sent</span>
            </div>
            {activeTab === 'sent' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {activeTab} requests
          </h3>
          <p className="text-gray-600">
            {activeTab === 'received'
              ? "You don't have any pending friend requests"
              : "You haven't sent any friend requests"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <FriendRequestCard 
              key={request.id} 
              request={request} 
              type={activeTab}
            />
          ))}

          {/* Load More */}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-3 text-blue-600 hover:text-blue-700 font-medium transition disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
