/**
 * Friends Page
 * Story 9.3.1: Friends List Component
 * 
 * Main friends page at /friends route
 */

import React, { useState, useRef } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { FriendsList } from '../components/friends/FriendsList';
import { FriendSearchBar } from '../components/friends/FriendSearchBar';
import { useDrag } from '@use-gesture/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeOnlineStatus } from '../hooks/friends/useRealtimeOnlineStatus';

import { PYMKCarousel } from '../components/pymk/PYMKCarousel';

export function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to realtime online status
  useRealtimeOnlineStatus();

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
    <div className="min-h-screen bg-gray-50" {...bind()} ref={containerRef}>
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

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Friends</h1>
          </div>
          <p className="text-gray-600">Stay connected with your friends</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <FriendSearchBar
            onSearch={setSearchQuery}
          />
        </div>

        {/* People You May Know */}
        <div className="mb-8">
          <PYMKCarousel />
        </div>

        {/* Friends List */}
        <FriendsList searchQuery={searchQuery} />
      </div>
    </div>
  );
}

export default FriendsPage;
