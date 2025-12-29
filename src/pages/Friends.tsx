/**
 * Friends Page
 * Story 9.3.1: Friends List Component
 * Story 9.6.2: Activity Feed UI Component
 * 
 * Main friends page at /friends route
 */

import React, { useState, useRef } from 'react';
import { Users, RefreshCw, User, Check, X, ArrowRight, ChevronDown } from 'lucide-react';
import { FriendsList } from '../components/friends/FriendsList';
import { FriendSearchBar } from '../components/friends/FriendSearchBar';
import { FriendActivityFeed } from '../components/friends/FriendActivityFeed';
import { FriendRequestsList } from '../components/friends/FriendRequestsList';
import { FriendRequestGridCard } from '../components/friends/FriendRequestGridCard';
import { BlockedUsersList } from '../components/BlockedUsersList';
// Tabs removed
import { useDrag } from '@use-gesture/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeOnlineStatus } from '../hooks/friends/useRealtimeOnlineStatus';
import { useReceivedFriendRequests } from '../hooks/friends/useFriendRequests';
import { useFriendActions } from '../hooks/friends/useFriendActions';

import { PYMKCarousel } from '../components/pymk/PYMKCarousel';
import { FriendProfileModal } from '../components/friends/FriendProfileModal';

export function FriendsPage() {
  const [currentView, setCurrentView] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  // Profile Modal State
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Data hooks
  // Cast to any to bypass inference issue, or define interface. 
  // The hook returns { ...req, sender: ... } but TS might miss it.
  const { data: rawRequests = [] } = useReceivedFriendRequests();
  const receivedRequests = rawRequests as any[]; // simple fix for now to unblock
  const { acceptRequest, rejectRequest } = useFriendActions();

  // Subscribe to realtime online status
  useRealtimeOnlineStatus();

  // Handler for opening profile
  const handleProfileClick = (userId: string) => {
    setSelectedProfileId(userId);
  };

  // Pull-to-refresh gesture
  const bind = useDrag(
    ({ movement: [, my], last, memo = window.scrollY }) => {
      // Only trigger if at top of page and pulling down
      if (memo > 10) return;

      if (!last && my > 0) {
        setPullDistance(Math.min(my, 80));
      } else if (last) {
        if (my > 60) {
          // Trigger refresh
          setIsRefreshing(true);
          queryClient.invalidateQueries({ queryKey: ['friends-list'] }).then(() => {
            setTimeout(() => {
              setIsRefreshing(false);
              setPullDistance(0);
            }, 500);
          });
        } else {
          setPullDistance(0);
        }
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      pointer: { touch: true }
    }
  );

  return (
    <div className="min-h-screen bg-gray-50" ref={containerRef}>
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex justify-center items-center transition-all duration-200"
          style={{
            height: isRefreshing ? '60px' : `${pullDistance}px`,
            opacity: Math.min(pullDistance / 60, 1)
          }}
        >
          <RefreshCw
            className={`w-6 h-6 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
        {/* Header Control Row: Search + View Filter */}
        <div className="flex flex-row items-center gap-2 mb-6">
          {/* Search Bar - Global */}
          <div className="flex-1">
            <FriendSearchBar
              onSearch={setSearchQuery}
              placeholder="Search friends..."
            />
          </div>

          {/* View Selection Dropdown */}
          <div className="relative">
            <select
              value={currentView}
              onChange={(e) => setCurrentView(e.target.value)}
              className="appearance-none bg-white w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[120px] shadow-sm cursor-pointer"
            >
              <option value="friends">Friends</option>
              <option value="requests">Requests</option>
              <option value="blocked">Blocked</option>
              <option value="activity">Activity</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* View Content */}
        <div className="space-y-6">

          {currentView === 'friends' && (
            <div className="space-y-5">
              {/* Received Friend Requests (Preview in Main View) */}
              {receivedRequests.length > 0 && !searchQuery && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      Friend Requests <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{receivedRequests.length}</span>
                    </h3>
                    <button
                      onClick={() => setCurrentView('requests')}
                      className="text-xs text-blue-600 font-medium hover:underline"
                    >
                      See All
                    </button>
                  </div>

                  <div className="flex overflow-x-auto pb-4 space-x-4 px-1 -mx-1 scrollbar-hide snap-x snap-mandatory">
                    {receivedRequests.map((req: any) => (
                      <div key={req.id} className="snap-center">
                        <FriendRequestGridCard
                          request={req}
                          onProfileClick={handleProfileClick}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* People You May Know */}
              {!searchQuery && (
                <PYMKCarousel onProfileClick={handleProfileClick} />
              )}

              {/* Friends List */}
              <FriendsList
                searchQuery={searchQuery}
                onProfileClick={handleProfileClick}
              />
            </div>
          )}

          {currentView === 'requests' && (
            <div className="space-y-6">
              <FriendRequestsList onProfileClick={handleProfileClick} />
            </div>
          )}

          {currentView === 'blocked' && (
            <div className="space-y-6">
              <BlockedUsersList />
            </div>
          )}

          {currentView === 'activity' && (
            <FriendActivityFeed />
          )}

        </div>
      </div>

      {/* Shared Friend Profile Modal */}
      {selectedProfileId && (
        <FriendProfileModal
          friendId={selectedProfileId}
          isOpen={!!selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
    </div>
  );
}

export default FriendsPage;
